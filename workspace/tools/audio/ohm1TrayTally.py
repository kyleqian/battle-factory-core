#!/usr/bin/env python3
"""ohm1: tally the AI tray (SE_BALL_TRAY_ENTER 114) -> next send-in row gap, ROM vs engine, per independent real-play observation.

usage: ohm1TrayTally.py CHAINDIR [--json OUT]
Per `<seed>-<scene>` (aligned runs only, as soundScoreboard.py): align each decision segment's engine / ROM sound rows (difflib, as score_run), then for every matched
SE 114 pair find the next matched row of kind cry / SE 15 (the send-in ball open or cry) in the same segment and report
  gapDiff = (engine next - engine 114) - (ROM next - ROM 114).
The engine keeps a 101-frame tray, so gapDiff 0 -> ROM 101, -1 -> ROM 102 (the 102 tray lags the send-in row one frame). Also prints the rows between (faint SE 16 before the tray = faint replacement)."""
import difflib, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from soundSegmentDiff import segments  # noqa: E402
from soundScoreboard import pick  # noqa: E402


def trays(engine, drive, rom, seed, scene):
    eng_a = [{"menuOpenFrame": d["menuOpenFrame"], "commitFrame": d["commitFrame"]} for d in engine["decisions"] if d["commitFrame"] is not None]
    rom_a = drive["drive"]["anchors"]
    n = min(len(eng_a), len(rom_a))
    e_rows = [(r[0], r[1], r[2], r[3]) for r in engine["sound"]]
    r_rows = [(e["frame"], e["kind"], e["id"], e["pan"]) for e in rom["events"]]
    e_end = max([r[0] for r in e_rows] + [a["commitFrame"] for a in eng_a]) + 1
    r_end = max([r[0] for r in r_rows] + [a["commitFrame"] for a in rom_a]) + 1
    out = []
    for si, ((name, elo, ehi), (_, rlo, rhi)) in enumerate(zip(segments(eng_a[:n], e_end), segments(rom_a[:n], r_end))):
        e, r = pick(e_rows, elo, ehi), pick(r_rows, rlo, rhi)
        sm = difflib.SequenceMatcher(None, [x[1:] for x in e], [x[1:] for x in r], autojunk=False)
        pairs = [(i, j) for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag == "equal" for i, j in zip(range(i1, i2), range(j1, j2))]
        for k, (i, j) in enumerate(pairs):
            if e[i][1] != "se" or e[i][2] != 114:
                continue
            nxt = next(((i2, j2) for i2, j2 in pairs[k + 1:] if e[i2][1] == "cry" or (e[i2][1] == "se" and e[i2][2] == 15)), None)
            if nxt is None:
                out.append(dict(seed=seed, scene=scene, si=si, seg=name, tray_rom=r[j][0], gapDiff=None))
                continue
            i2, j2 = nxt
            before = [(x[1], x[2], x[3]) for x in r[:j] if x[1] == "se" and x[2] in (16, 114)]
            out.append(dict(seed=seed, scene=scene, si=si, seg=name, tray_rom=r[j][0], tray_eng=e[i][0], rom_gap=r[j2][0] - r[j][0], eng_gap=e[i2][0] - e[i][0],
                            gapDiff=(e[i2][0] - e[i][0]) - (r[j2][0] - r[j][0]), nextkind=f"{e[i2][1]}:{e[i2][2]}", prior=before, trayoff=e[i][0] - r[j][0]))
    return out


def main(argv):
    d = Path(argv[0])
    res = []
    for scene in ("on", "off"):
        for eng_p in sorted(d.glob(f"*-{scene}.engine.json"), key=lambda p: int(p.name.split("-")[0])):
            stem = eng_p.name[: -len(".engine.json")]
            seed = int(stem.split("-")[0])
            try:
                cmp = json.load(open(d / f"{stem}.cmp.json"))
                engine, drive, rom = (json.load(open(d / f"{stem}.{k}.json")) for k in ("engine", "drive", "snd"))
            except FileNotFoundError:
                continue
            if not (cmp["divergence"] is None and cmp["matched"] == cmp["engineRows"] - 1 and drive["drive"]["stop"] == "outcome"):
                continue
            res += trays(engine, drive, rom, seed, scene)
    for r in res:
        print(r)
    if "--json" in argv:
        json.dump(res, open(argv[argv.index("--json") + 1], "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
