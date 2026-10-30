#!/usr/bin/env python3
"""pfb228: ours-vs-ROM mon-region pixel residual per send-in segment, from bso225Dense.ts --delta=0 outputs, relative to B.
usage: pfb228Segments.py <dense dir> <suffix e.g. d0> id=B ..."""
import json, sys
from pathlib import Path

D, SUF = Path(sys.argv[1]), sys.argv[2]
SEG = [("flight B+1..46", 1, 46), ("emerge B+47..62", 47, 62), ("backanim B+63..95", 63, 95), ("tail B+96..", 96, 400)]
print(f"{'window':10s} {'B':>3s} " + " ".join(f"{n:>20s}" for n, _, _ in SEG) + "   total")
for spec in sys.argv[3:]:
    wid, B = spec.split("="); B = int(B)
    d = json.loads((D / f"{wid}-{SUF}.json").read_text())
    pr = {r["e"]: r["mon"] for r in d["perRow"]}
    cells = []
    for _, a, b in SEG:
        v = [pr[e] for e in range(B + a, B + b + 1) if e in pr]
        cells.append(f"{sum(v):>9d}/{sum(1 for x in v if x):>2d}rows")
    print(f"{wid:10s} {B:3d} " + " ".join(f"{c:>20s}" for c in cells) + f"   {sum(r['mon'] for r in d['perRow'] if r['e'] > 90):d}")
