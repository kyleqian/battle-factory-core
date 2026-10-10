#!/usr/bin/env python3
"""Live audit 17 P2: prediction (dt60-grid.json, audit17Dt60Predict.ts) vs measurement for the dt60 grid scenarios:
  RAM  = the attacker battler sprite's data[3] on the frame before each Double Team activation (dt60Probe.py <scenario> <out> 2);
  px   = the audit17Check.ts receipts (production renderer, chain lend, two fresh probe processes, r1 == r2).
usage: audit17Dt60Measure.py <ram-dir> <check-dir>   (prints one line per window)"""
import json, sys
from pathlib import Path

ram_dir, check_dir = Path(sys.argv[1]), Path(sys.argv[2])
grid = json.loads(Path("tools/integration/fixtures/audit-17/dt60-grid.json").read_text())["grid"]
for g in grid:
    name = f"dt-{g['side'][:3]}-{g['species'].lower()}"
    ram = json.loads((ram_dir / f"{name}.json").read_text())
    check = json.loads((check_dir / f"check-{name}.json").read_text())
    for k, body in enumerate(ram["bodies"]):
        d3 = body["pre"]["battlers"][body["attacker"]]["data"][3]
        cls = "zero" if d3 == 0 else "one-call-ahead" if d3 >= 1 else "behind"
        row = next((r for r in check["rows"] if r["fixture"] == f"{name}-c{k}.json"), None)
        px = row["chain"]["px"] if row else None
        same = row["chain"]["digests"][0] == row["chain"]["digests"][1] if row else None
        print(f"{name}-c{k} {g['side']:<8} {g['species']:<9} {g['natureName']:<7} predicted data3={g['data3']:<4} {g['predicted']:<15} "
              f"RAM data3={d3:<4} {cls:<15} match={int(d3 == g['data3'])} px={px} r1==r2={int(bool(same))}")
