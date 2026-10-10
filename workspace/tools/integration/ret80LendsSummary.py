#!/usr/bin/env python3
"""ret80: tally audit20LendsPi.py output lines by whether a Return 216 body precedes the window in its history (docs/live-audit-20.md
s1.3's "any body with a Return 216 earlier in the history" row). usage: ret80LendsSummary.py <lends-pi.txt> <fixture-dir>"""
import json, sys
from collections import Counter
from pathlib import Path

pi, fx = Path(sys.argv[1]), Path(sys.argv[2])
count = Counter()
for line in pi.read_text().splitlines():
    if " live=" not in line or " pi-same=" not in line or not line.split()[0].endswith(".json"):  # detail lines only (not the tallies)
        continue
    name = line.split()[0]
    f = json.loads((fx / name).read_text())
    hist = [e for t in f["precedingTurns"] for e in t["events"]][:-1]
    ret = any(e.get("animationId") == "MOVE_ANIMATION" and e["arguments"][0] == "216" for e in hist)
    same = " pi-same=1 " in line
    count[("Return earlier" if ret else "no Return earlier", same)] += 1
    if ret:
        print(f"{name:<40} pi-same={int(same)}")
for key in ("Return earlier", "no Return earlier"):
    print(f"{key}: {count[(key, True)]} / {count[(key, True)] + count[(key, False)]} lend == ROM (pi)")
