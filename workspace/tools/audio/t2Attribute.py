#!/usr/bin/env python3
"""t2r: per-row T2 attribution. Aligns engine vs ROM sound rows exactly as soundScoreboard.py does and keeps every matched row with its cause.

usage: t2Attribute.py [--scene=on|off] ROMDIR OUT.json LABEL=ENGINEDIR [LABEL=ENGINEDIR ...]
  --scene=off (t2o): files are <seed>-off.*; Scene OFF has no move bodies, so a row is caused by the engine command it falls in (from an engine.json written with `soundCensusRomReplay.ts replay --cmdtrace=1`):
  "ctl:<id>@<cmd type>", "cry@<cmd type>", "bgm@<cmd type>", "stat:<id>@<cmd type>" (no cmds: no suffix).
  ROMDIR holds <seed>-on.{drive,snd,tl}.json (the ROM side); each ENGINEDIR holds <seed>-on.engine.json from one engine build. Output: {label: {key: [offset, family, cause]}} with
  key "seed|romFrame|kind|id|pan|n" (n = occurrence), offset = engine - ROM relative to the segment start, cause = "body:<move id>" (move-animation SE, ROM gCurrentMove from tl.json at the row),
  "gen:<se id>" (gCurrentMove 0 / 0xFFFF), "ctl:<id>", "stat:<id>", "cry", "bgm", "fanfare".
"""
import bisect, difflib, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from soundSegmentDiff import segments  # noqa: E402

CONTROLLER = {9, 12, 13, 14, 15, 16, 32, 55, 79, 90, 114, 115, 116}  # as soundScoreboard.py (it runs main on import)
STAT = {239, 245}
KINDS = {"se", "cry", "bgm", "fanfare"}


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
    return [(r[0] - lo, r[1], r[2], r[3], r[0]) for r in rows if lo <= r[0] < hi and r[1] in KINDS and not (r[1] == "se" and r[2] == 5)]


def rows_for(romdir, engdir, seed, scene="on"):
    stem = f"{seed}-{scene}"
    eng = json.load(open(engdir / f"{stem}.engine.json"))
    drive, rom = (json.load(open(romdir / f"{stem}.{k}.json")) for k in ("drive", "snd"))
    tl = json.load(open(romdir / f"{stem}.tl.json"))["rows"]
    tf = [r[0] for r in tl]
    eng_a = [{"menuOpenFrame": d["menuOpenFrame"], "commitFrame": d["commitFrame"]} for d in eng["decisions"] if d["commitFrame"] is not None]
    rom_a = drive["drive"]["anchors"]
    n = min(len(eng_a), len(rom_a))
    ecmd = eng.get("cmds") or []
    cf = [c[0] for c in ecmd]
    e_rows = [(r[0], r[1], r[2], r[3]) for r in eng["sound"]]
    r_rows = [(e["frame"], e["kind"], e["id"], e["pan"]) for e in rom["events"]]
    e_end = max([r[0] for r in e_rows] + [a["commitFrame"] for a in eng_a]) + 1
    r_end = max([r[0] for r in r_rows] + [a["commitFrame"] for a in rom_a]) + 1
    out, seen, miss, extra = {}, {}, 0, 0
    for (name, elo, ehi), (_, rlo, rhi) in zip(segments(eng_a[:n], e_end), segments(rom_a[:n], r_end)):
        e, r = pick(e_rows, elo, ehi), pick(r_rows, rlo, rhi)
        sm = difflib.SequenceMatcher(None, [x[1:4] for x in e], [x[1:4] for x in r], autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag != "equal":
                miss += j2 - j1
                extra += i2 - i1
                continue
            for i, j in zip(range(i1, i2), range(j1, j2)):
                kind, sid = e[i][1], e[i][2]
                fam = family(kind, sid, name)
                if fam == "move-animation SE":
                    k = bisect.bisect_right(tf, r[j][4]) - 1
                    mv = tl[k][1] if k >= 0 else 0
                    cause = f"body:{mv}" if mv not in (0, 0xFFFF) else f"gen:{sid}"
                elif fam == "stat-change SE":
                    cause = f"stat:{sid}"
                elif fam == "battle-controller SE":
                    cause = f"ctl:{sid}"
                else:
                    cause = fam
                if scene == "off" and fam != "move-animation SE" and ecmd:
                    k = bisect.bisect_right(cf, e[i][4]) - 1
                    cause += "@" + (ecmd[k][3] if k >= 0 else "pre")
                base = f"{seed}|{r[j][4]}|{kind}|{sid}|{r[j][3]}"
                c = seen.get(base, 0)
                seen[base] = c + 1
                out[f"{base}|{c}"] = [e[i][0] - r[j][0], fam, cause]
    return out, miss, extra


def main(argv):
    scene = "on"
    if argv and argv[0].startswith("--scene="):
        scene, argv = argv[0].split("=")[1], argv[1:]
    romdir, outp, specs = Path(argv[0]), argv[1], argv[2:]
    seeds = sorted(int(p.name.split("-")[0]) for p in romdir.glob(f"*-{scene}.snd.json"))
    res = {}
    for spec in specs:
        label, d = spec.split("=")
        res[label] = {"rows": {}, "missing": 0, "extra": 0}
        for s in seeds:
            if not (Path(d) / f"{s}-{scene}.engine.json").exists():
                continue
            rows, m, x = rows_for(romdir, Path(d), s, scene)
            res[label]["rows"].update(rows)
            res[label]["missing"] += m
            res[label]["extra"] += x
        print(label, len(res[label]["rows"]), "missing", res[label]["missing"], "extra", res[label]["extra"])
    json.dump(res, open(outp, "w"))


main(sys.argv[1:])
