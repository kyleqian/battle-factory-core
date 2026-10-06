#!/usr/bin/env python3
"""x2-history #148: fold /tmp/x2h/bodies/<run>/*.json (prep11Probe ALWAYS=1 raw) into compact receipts.
usage: x2HistoryAnalyze.py <run1dir> <run2dir> [tag]   -> tools/integration/fixtures/x2-history/<tag>.json (default bodies-x2; 'bodies-x2-onix-pairs' for the ONIX-vs-ONIX copies) (+ per-scenario summaries)
Series row layout (battlerSeries): [f, x2,y2,matrix,invisible,a,b,c,d (battler 0), x2,y2,... (battler 1)].  For every body (move id, start, end):
  atStart / atEnd1 / beforeNext (frame next-start-1; or end+60 for the last body): (x2,y2) of attacker and target, whether x2/y2 ever left the start value inside the body (window start..end+1),
  firstX2Change age.  ONIX (species 95) is the only non-zero rest x2 species, so 'idle'=1 / 'zeroed'=0 is read from the ONIX battler."""
import json, sys, glob, os
from pathlib import Path
R1, R2 = Path(sys.argv[1]), Path(sys.argv[2]); TAG = sys.argv[3] if len(sys.argv) > 3 else "bodies-x2"
OUT = Path("tools/integration/fixtures/x2-history")
res, same = {}, 0
for f in sorted(R1.glob("mechanic-*.json")):
    if (R2 / f.name).read_bytes() == f.read_bytes(): same += 1
    d = json.loads(f.read_text())
    ser = {r[0]: r for r in d["battlerSeries"]}
    bodies = d["bodies"]; out = []
    for i, b in enumerate(bodies):
        if b["end"] is None: continue
        at = b["atActivation"]; A, T = at["attacker"], at["target"]
        xy = lambda fr, bt: [ser[fr][1 + 8 * bt], ser[fr][2 + 8 * bt]] if fr in ser else None
        nxt = bodies[i + 1]["start"] - 1 if i + 1 < len(bodies) else min(b["end"] + 60, d["frames"])
        rec = {"move": b["move"], "start": b["start"], "end": b["end"], "attacker": A, "target": T, "species": [m["species"] for m in at["mons"]]}
        for role, bt in (("attacker", A), ("target", T)):
            s0 = xy(b["start"], bt); fr = [ser[k] for k in range(b["start"], b["end"] + 2) if k in ser]
            ch = [r[0] - b["start"] for r in fr if [r[1 + 8 * bt], r[2 + 8 * bt]] != s0]
            chx = [r[0] - b["start"] for r in fr if r[1 + 8 * bt] != s0[0]]
            rec[role] = {"battler": bt, "atStart": s0, "atEnd1": xy(b["end"] + 1, bt), "beforeNext": xy(nxt, bt), "beforeNextFrame": nxt, "leftStart": bool(ch), "firstXYChangeAge": ch[0] if ch else None, "firstX2ChangeAge": chx[0] if chx else None}
        out.append(rec)
    res[f.name] = {"frames": d["frames"], "bodies": out}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / f"{TAG}.json").write_text(json.dumps({"runs": "r1 == r2 byte-equal raw for %d/%d scenarios" % (same, len(res)), "scenarios": res}, separators=(",", ":")))
print(len(res), "scenarios;", same, "r1==r2")
