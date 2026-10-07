#!/usr/bin/env python3
"""lb21 compact receipt from two dense passes. usage: lb21Receipt.py <pass1 dir> <pass2 dir> -> tools/integration/fixtures/later-bodies-bg-2-receipt.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]; fx = R / "tools/integration/fixtures/later-bodies-bg-2"; rows = {}
for f in sorted(fx.glob("*.json")):
    t = f.stem; fixture = json.loads(f.read_text()); runs = []
    for d in sys.argv[1:3]:
        o = Path(d) / f"{t}.out"
        if not o.exists() or not o.read_text().strip(): continue
        runs += [{"exactRows": r["exactRows"], "residualPixels": r["residualPixels"], "digest": r["digest"]} for r in json.loads(o.read_text())]
    if not runs: continue
    rows[t] = {"move": fixture["move"], "attackerSide": fixture["attacker"]["geometry"]["side"], "bodyIndex": fixture["bodyIndex"], "denseWindow": fixture["denseWindow"],
               "precedingBodies": [(u["moveId"], u["side"]) for u in fixture["precedingBodies"]], "rows": runs[0]["exactRows"],
               "freshRuns": runs, "identical": len({(r["exactRows"], r["residualPixels"], r["digest"]) for r in runs}) == 1, "residualPixels": sum(r["residualPixels"] for r in runs)}
out = {"schema": "later-bodies-bg-2-receipt/v1", "bypass": "tools/integration/fixtures/later-bodies-bg-2/lb21-temp-bypass.patch (applied to src for the runs, reverted before commit)",
       "runs": "each .out holds 2 renders (run 0/1) in one process; two separate processes (p1, p2) per fixture -> 4 renders", "fixtures": rows}
(R / "tools/integration/fixtures/later-bodies-bg-2-receipt.json").write_text(json.dumps(out, indent=1) + "\n")
print(len(rows), "fixtures", sum(r["residualPixels"] for r in rows.values()), "residual px", all(r["identical"] for r in rows.values()))
