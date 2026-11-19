#!/usr/bin/env python3
"""ctl1: matched controller rows with engine / ROM anchors. usage: t2Anchor.py ENGDIR OUT.json [seeds...]"""
import bisect, difflib, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from soundSegmentDiff import segments
ROMDIR = Path("/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/t2r")
KINDS = {"se", "cry", "bgm", "fanfare"}
def pick(rows, lo, hi):
    return [(r[0], r[1], r[2], r[3], r[4] if len(r) > 4 else None) for r in rows if lo <= r[0] < hi and r[1] in KINDS and not (r[1] == "se" and r[2] == 5)]
def run(engdir, seed):
    stem = f"{seed}-on"
    eng = json.load(open(engdir / f"{stem}.engine.json"))
    drive = json.load(open(ROMDIR / f"{stem}.drive.json")); rom = json.load(open(ROMDIR / f"{stem}.snd.json"))
    tl = json.load(open(ROMDIR / f"{stem}.tl.json"))["rows"]
    cmds = eng["cmds"]
    eng_a = [{"menuOpenFrame": d["menuOpenFrame"], "commitFrame": d["commitFrame"]} for d in eng["decisions"] if d["commitFrame"] is not None]
    rom_a = drive["drive"]["anchors"]; n = min(len(eng_a), len(rom_a))
    e_rows = [tuple(r) for r in eng["sound"]]
    r_rows = [(e["frame"], e["kind"], e["id"], e["pan"], e.get("mode")) for e in rom["events"]]
    e_end = max([r[0] for r in e_rows] + [a["commitFrame"] for a in eng_a]) + 1
    r_end = max([r[0] for r in r_rows] + [a["commitFrame"] for a in rom_a]) + 1
    # ROM hp changes
    rhp = []
    for a, b in zip(tl, tl[1:]):
        for k in (0, 1):
            if b[2 + k] != a[2 + k]: rhp.append((b[0], k, b[2 + k]))
    ehp = []
    for i, c in enumerate(cmds):
        if c[3] == "hp":
            end = cmds[i + 1][0] if i + 1 < len(cmds) else None
            ehp.append((c[0], end, c[4], c[6]))
    rf = [x[0] for x in rhp]; ef = [x[0] for x in ehp]
    out = []
    for (name, elo, ehi), (_, rlo, rhi) in zip(segments(eng_a[:n], e_end), segments(rom_a[:n], r_end)):
        e, r = pick(e_rows, elo, ehi), pick(r_rows, rlo, rhi)
        # window hp anchors matched in order by (battler, to)
        rw = [x for x in rhp if rlo <= x[0] < rhi]; ew = [x for x in ehp if elo <= x[0] < ehi]
        pairs = []; j = 0
        for x in ew:
            for jj in range(j, len(rw)):
                if rw[jj][1] == x[2] and rw[jj][2] == x[3]:
                    pairs.append((x, rw[jj])); j = jj + 1; break
        sm = difflib.SequenceMatcher(None, [x[1:4] for x in e], [x[1:4] for x in r], autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag != "equal": continue
            for i, jx in zip(range(i1, i2), range(j1, j2)):
                te, tr = e[i][0] - elo, r[jx][0] - rlo
                # nearest hp pair whose ROM time is <= row (prev) / > row (next)
                prev = next_ = None
                for (x, y) in pairs:
                    if y[0] <= r[jx][0]: prev = (x, y)
                    elif next_ is None: next_ = (x, y)
                rec = dict(seed=seed, seg=name, kind=e[i][1], id=e[i][2], pan=e[i][3], mode=e[i][4], romMode=r[jx][4], te=te, tr=tr, off=te - tr, ef=e[i][0], rf=r[jx][0], elo=elo, rlo=rlo)
                if prev and prev[0][1] is not None: rec["dPrev"] = (te - (prev[0][1] - elo)) - (tr - (prev[1][0] - rlo)); rec["prevTr"] = tr - (prev[1][0] - rlo); rec["prevTo"] = prev[1][2]; rec["prevOff"] = (prev[0][1] - elo) - (prev[1][0] - rlo)
                if next_: rec["dNext"] = (te - (next_[0][0] - elo)) - (tr - (next_[1][0] - rlo)); rec["nextTr"] = tr - (next_[1][0] - rlo); rec["nextOff"] = (next_[0][1] - elo if next_[0][1] is not None else None)
                # engine cmd containing the row
                k = bisect.bisect_right([c[0] for c in cmds], e[i][0]) - 1
                if k >= 0: rec["cmd"] = [cmds[k][3], cmds[k][4], e[i][0] - cmds[k][0], k]
                out.append(rec)
    return out
if __name__ == "__main__":
    engdir = Path(sys.argv[1]); res = []
    seeds = [int(s) for s in sys.argv[3:]] or sorted(int(p.name.split("-")[0]) for p in engdir.glob("*-on.engine.json"))
    for s in seeds: res += run(engdir, s)
    json.dump(res, open(sys.argv[2], "w"))
    print(len(res))
