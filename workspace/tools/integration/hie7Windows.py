#!/usr/bin/env python3
"""hie7: per-window before / after of the segments that follow a player's forced send-in.
usage: hie7Windows.py RESUME.txt DIR_A DIR_B   (RESUME.txt = lines `seed decision ...` from the cmdtrace resume list; DIR_x = rescoreAll output dirs, Scene ON)
prints per window: segment mass A / B, the first matched row offset A / B, and the matched-row count."""
import difflib, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "audio"))
from soundScoreboard import pick, segments  # noqa: E402


def seg_rows(d, seed, k):
    eng, drive, rom = (json.load(open(f"{d}/{seed}-on.{x}.json")) for x in ("engine", "drive", "snd"))
    ea = [{"menuOpenFrame": x["menuOpenFrame"], "commitFrame": x["commitFrame"]} for x in eng["decisions"] if x["commitFrame"] is not None]
    ra = drive["drive"]["anchors"]
    n = min(len(ea), len(ra))
    er = [(r[0], r[1], r[2], r[3]) for r in eng["sound"]]
    rr = [(e["frame"], e["kind"], e["id"], e["pan"]) for e in rom["events"]]
    ee = max([r[0] for r in er] + [a["commitFrame"] for a in ea]) + 1
    re_ = max([r[0] for r in rr] + [a["commitFrame"] for a in ra]) + 1
    for (name, elo, ehi), (_, rlo, rhi) in zip(segments(ea[:n], ee), segments(ra[:n], re_)):
        if name != f"res{k}":
            continue
        e, r = pick(er, elo, ehi), pick(rr, rlo, rhi)
        sm = difflib.SequenceMatcher(None, [x[1:] for x in e], [x[1:] for x in r], autojunk=False)
        out = []
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                out += [(e[i][0] - r[j][0], e[i][2]) for i, j in zip(range(i1, i2), range(j1, j2))]
        return out
    return []


def main():
    rows = [l.split() for l in open(sys.argv[1]) if l.strip()]
    ta = tb = 0
    for r in rows:
        seed, k = r[0], int(r[1])
        a, b = seg_rows(sys.argv[2], seed, k), seg_rows(sys.argv[3], seed, k)
        ma, mb = sum(abs(x[0]) for x in a), sum(abs(x[0]) for x in b)
        ta += ma; tb += mb
        fa = next(((x[1], x[0]) for x in a if x[0] != 0), None)
        fb = next(((x[1], x[0]) for x in b if x[0] != 0), None)
        print(f"s{seed} d{k:<3} mass {ma:>5} -> {mb:>5}  first nonzero {fa} -> {fb}  rows {len(a)}/{len(b)}  {' '.join(r[5:7])}")
    print(f"TOTAL {ta} -> {tb}")


main()
