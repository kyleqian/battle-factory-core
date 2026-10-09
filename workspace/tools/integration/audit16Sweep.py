#!/usr/bin/env python3
"""Live audit 16: lab-seed sweep for chains whose unit is chance-based (Sludge Bomb's 30 % PSN, Ice Beam's 10 % FRZ) or whose ROM route
the AI changes (a sleeping opponent switching out). Writes <out-dir>/<base>~s<seed>.json = the committed audit-16 scenario <base> with only
the lab "seed" replaced; audit16Stage.py then pins the chosen seeds (ISSUES #154: every committed scenario carries an explicit seed).
usage: audit16Sweep.py <out-dir> <first-seed> <count> <base>...   (scenario names as in tools/integration/fixtures/audit-16/scenarios/)
"""
import json, sys
from pathlib import Path

out, first, count, bases = Path(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
out.mkdir(parents=True, exist_ok=True)
for base in bases:
    s = json.loads(Path(f"tools/integration/fixtures/audit-16/scenarios/{base}.json").read_text())
    for seed in range(first, first + count):
        s["seed"] = seed
        (out / f"{base}~s{seed}.json").write_text(json.dumps(s, indent=1) + "\n")
