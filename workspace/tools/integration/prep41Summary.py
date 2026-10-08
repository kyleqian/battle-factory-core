#!/usr/bin/env python3
"""prep41: compact receipt of two prep41Dense.sh passes. usage: prep41Summary.py <pass1Dir> <pass2Dir> <out.json> <move>
Per window (move = PURSUIT | HIDDEN_POWER): measured / policy phase, rows, live duration, per-pass px + digests of both fresh probe runs,
affected ages (range, count) + max px per row, violations. Asserts pass 1 == pass 2 (px, digests, affected rows)."""
import json, sys
from pathlib import Path

p1, p2, out, move = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
rows, ok = [], True
for f in sorted(p1.glob("*.json")):
    a, b = json.loads(f.read_text())[0], json.loads((p2 / f.name).read_text())[0]
    if a["move"] != move: continue
    key = lambda e: [(r["residualPixels"], r["digest"], r["affected"]) for r in e["runs"]]
    same = key(a) == key(b)
    ok &= same and not a["violations"] and not b["violations"]
    r0 = a["runs"][0]; ages = [x[0] for x in r0["affected"]]
    rows.append({"window": f.stem, "measuredPhase": a["measuredPhase"], "policyPhase": a["policyPhase"], "selectedPhase": a["selectedPhase"],
                 "rows": a["window"], "liveDuration": a["expectedDuration"], "px": [r["residualPixels"] for r in a["runs"] + b["runs"]],
                 "digests": sorted({r["digest"] for r in a["runs"] + b["runs"]}),
                 "affectedAges": [ages[0], ages[-1], len(ages)] if ages else None, "maxPixelsPerRow": r0["maxPixelsPerRow"],
                 "pxPerAffectedRow": sorted({x[1] for x in r0["affected"]}) if ages else [],
                 "documentedAges": a["documentedAges"], "passesIdentical": same, "violations": a["violations"] + b["violations"]})
res = {"schema": "prep41-d4-check/v1", "move": move,
       "method": "tools/integration/prep41Dense.sh x2 passes (each window = one prep41TimingCheck.ts process = 2 fresh probe processes, production live renderer with tools/integration/fixtures/prep41/prep41-d4-widening.diff applied)",
       "windows": len(rows), "policyPhaseWindows": sum(r["selectedPhase"] for r in rows),
       "policyPhaseZeroPx": sum(r["selectedPhase"] and not any(r["px"]) for r in rows),
       "otherPhaseWindows": sum(not r["selectedPhase"] for r in rows), "allPassesIdentical": all(r["passesIdentical"] for r in rows),
       "violations": sum(len(r["violations"]) for r in rows), "ok": ok, "table": rows}
out.write_text(json.dumps(res, indent=1) + "\n")
print(move, {k: v for k, v in res.items() if k not in ("table", "method", "schema")})
for r in rows:
    print(f"  {r['window']}: {r['measuredPhase']} sel={r['selectedPhase']} rows={r['rows']}/{r['liveDuration']} px={r['px'][0]} ages={r['affectedAges']} max={r['maxPixelsPerRow']}")
sys.exit(0 if ok else 1)
