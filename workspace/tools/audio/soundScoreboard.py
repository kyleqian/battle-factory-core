#!/usr/bin/env python3
"""aud248: S11 T2 scoreboard. Totals exact / offset / missing / extra sound rows by family over the ROM-aligned seeds of a chain directory.

usage: soundScoreboard.py CHAINDIR [--out FILE] [--per-seed]     (-h / --help prints this; importing the module runs nothing)
  cln10: every family row and a TOTAL row carry `mass` = sum of abs(engine - ROM offset) over the matched rows (exact rows add 0), the figure the t2n / hcr1c sections quote;
  `exact` is the matched rows at offset 0, so TOTAL exact + offset = matched rows. `totals[family].mass` is also in the --out JSON.
  per `<seed>-<scene>` with engine.json (soundCensusRomReplay replay), drive.json (`lab --drive`) and snd.json (`lab` hook run of the frozen trace):
  every decision segment (menu k = [menuOpen_k, commit_k), resolution k = [commit_k, menuOpen_k+1), as soundSegmentDiff.py) is aligned engine vs ROM as an ordered (kind, id, pan) list
  (difflib); matched rows are `exact` when their offset from the segment start is equal, `offset` when it differs; ROM-only rows are `missing`, engine-only rows `extra`.
  Menu SE_SELECT (id 5) is input-driven (soundSegmentDiff's --ignore-ids 5) and left out. Rows outside the decision window (pre-menu intro, post-last-resolution tail) are not compared.
  `pan` / `duck` / `stop` / fade / volume rows are not compared (kinds se, cry, bgm, fanfare only).
Families (by kind / SE id, ROM and engine rows alike): cry; bgm; fanfare; stat-change SE (SE_M_STAT_INCREASE 239 / SE_M_STAT_DECREASE 245 as the stat-stage script plays them);
  battle-controller SE (ids 9 12 13 14 15 16 32 55 79 90 114 115 116 = effectiveness, faint, HP / ball / tray / low-HP / intro family); screen SE (menu segments); every other SE = move-animation SE.
"""
import difflib, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from soundSegmentDiff import segments  # noqa: E402

CONTROLLER = {9, 12, 13, 14, 15, 16, 32, 55, 79, 90, 114, 115, 116}
STAT = {239, 245}
KINDS = {"se", "cry", "bgm", "fanfare"}
DELTAS = {}
ID_DELTAS = {}
FAMILIES = ["move-animation SE", "stat-change SE", "cry", "battle-controller SE", "bgm", "fanfare", "screen SE"]


def family(kind, sid, seg):
    if kind == "cry":
        return "cry"
    if kind in ("bgm", "fanfare"):
        return kind
    if seg.startswith("menu"):
        return "screen SE"
    if sid in STAT:
        return "stat-change SE"
    if sid in CONTROLLER:
        return "battle-controller SE"
    return "move-animation SE"


def pick(rows, lo, hi):
    return [(r[0] - lo, r[1], r[2], r[3]) for r in rows if lo <= r[0] < hi and r[1] in KINDS and not (r[1] == "se" and r[2] == 5)]


def score_run(engine, drive, rom):
    eng_a = [{"menuOpenFrame": d["menuOpenFrame"], "commitFrame": d["commitFrame"]} for d in engine["decisions"] if d["commitFrame"] is not None]
    rom_a = drive["drive"]["anchors"]
    n = min(len(eng_a), len(rom_a))
    e_rows = [(r[0], r[1], r[2], r[3]) for r in engine["sound"]]
    r_rows = [(e["frame"], e["kind"], e["id"], e["pan"]) for e in rom["events"]]
    e_end = max([r[0] for r in e_rows] + [a["commitFrame"] for a in eng_a]) + 1
    r_end = max([r[0] for r in r_rows] + [a["commitFrame"] for a in rom_a]) + 1
    out = {f: {"exact": 0, "offset": 0, "missing": 0, "extra": 0, "mass": 0} for f in FAMILIES}
    detail = []
    for (name, elo, ehi), (_, rlo, rhi) in zip(segments(eng_a[:n], e_end), segments(rom_a[:n], r_end)):
        e, r = pick(e_rows, elo, ehi), pick(r_rows, rlo, rhi)
        ek, rk = [x[1:] for x in e], [x[1:] for x in r]
        sm = difflib.SequenceMatcher(None, ek, rk, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                for i, j in zip(range(i1, i2), range(j1, j2)):
                    fam = family(e[i][1], e[i][2], name)
                    out[fam]["exact" if e[i][0] == r[j][0] else "offset"] += 1
                    out[fam]["mass"] += abs(e[i][0] - r[j][0])
                    DELTAS.setdefault(fam, []).append(e[i][0] - r[j][0])
                    if e[i][1] == "se":
                        ID_DELTAS.setdefault(e[i][2], []).append(e[i][0] - r[j][0])
            else:
                for j in range(j1, j2):
                    out[family(r[j][1], r[j][2], name)]["missing"] += 1
                    detail.append((name, "missing", r[j]))
                for i in range(i1, i2):
                    out[family(e[i][1], e[i][2], name)]["extra"] += 1
                    detail.append((name, "extra", e[i]))
    return out, detail


def main(argv):
    if "-h" in argv or "--help" in argv:
        print(__doc__)
        return
    args = [a for a in argv if not a.startswith("--")]
    flags = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i].startswith("--")}
    if not args:
        raise SystemExit(__doc__)
    d = Path(args[0])
    result = {}
    for scene in ("on", "off"):
        DELTAS.clear()
        ID_DELTAS.clear()
        tot = {f: {"exact": 0, "offset": 0, "missing": 0, "extra": 0, "mass": 0} for f in FAMILIES}
        seeds, per_seed, miss_ids = [], {}, {}
        eng_files = sorted(d.glob(f"*-{scene}.engine.json"), key=lambda p: int(p.name.split("-")[0]))
        for eng_p in eng_files:
            stem = eng_p.name[: -len(".engine.json")]
            seed = int(stem.split("-")[0])
            try:
                cmp = json.load(open(d / f"{stem}.cmp.json"))
                engine, drive, rom = (json.load(open(d / f"{stem}.{k}.json")) for k in ("engine", "drive", "snd"))
            except FileNotFoundError:
                continue
            aligned = cmp["divergence"] is None and cmp["matched"] == cmp["engineRows"] - 1 and drive["drive"]["stop"] == "outcome"
            if not aligned:
                per_seed[seed] = {"aligned": False, "matched": cmp["matched"], "of": cmp["engineRows"] - 1}
                continue
            res, detail = score_run(engine, drive, rom)
            seeds.append(seed)
            per_seed[seed] = {"aligned": True, "families": res}
            for f in FAMILIES:
                for k in tot[f]:
                    tot[f][k] += res[f][k]
            for seg, kind, row in detail:
                key = f"{kind} {row[1]}:{row[2]}"
                miss_ids[key] = miss_ids.get(key, 0) + 1
        deltas = {f: {"n": len(v), "median": sorted(v)[len(v) // 2], "p10": sorted(v)[len(v) // 10], "p90": sorted(v)[(len(v) * 9) // 10]} for f, v in DELTAS.items() if v}
        id_deltas = {str(k): sorted(v) for k, v in sorted(ID_DELTAS.items())}
        result[scene] = {"noSeeds": not eng_files, "idDeltas": id_deltas, "deltas": deltas, "seeds": seeds, "totals": tot, "idRows": dict(sorted(miss_ids.items(), key=lambda kv: -kv[1])), "perSeed": per_seed}
    for scene, r in result.items():
        if r["noSeeds"]:
            print(f"== Scene {scene.upper()}: no {scene} seeds (no *-{scene}.engine.json in {d})")
            continue
        print(f"== Scene {scene.upper()}: {len(r['seeds'])} aligned seeds {r['seeds']}")
        print(f"{'family':24}{'exact':>8}{'offset':>8}{'missing':>9}{'extra':>7}{'mass':>9}")
        for f in FAMILIES:
            t = r["totals"][f]
            print(f"{f:24}{t['exact']:>8}{t['offset']:>8}{t['missing']:>9}{t['extra']:>7}{t['mass']:>9}")
        all_t = {k: sum(r["totals"][f][k] for f in FAMILIES) for k in ("exact", "offset", "missing", "extra", "mass")}
        print(f"{'TOTAL':24}{all_t['exact']:>8}{all_t['offset']:>8}{all_t['missing']:>9}{all_t['extra']:>7}{all_t['mass']:>9}")
        print("matched-row frame delta (engine - ROM, relative to segment start):", r["deltas"])
        print("top differing rows (kind id:pan, count):", list(r["idRows"].items())[:14])
    if "--out" in flags:
        json.dump(result, open(flags["--out"], "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
