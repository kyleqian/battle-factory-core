#!/usr/bin/env python3
"""Live audit 17: compare a fresh audit17Run.sh receipt dir with the committed receipts: per window, chain + entry digests / px / rows.
usage: audit17Compare.py <fresh-receipt-dir> <committed-receipts-dir>"""
import json, sys
from pathlib import Path

fresh, ref = Path(sys.argv[1]), Path(sys.argv[2])
committed = {}
for sub in ("main", "dt60"):
    for p in (ref / sub).glob("check-*.json"):
        for r in json.loads(p.read_text())["rows"]:
            committed[r["fixture"]] = r
same = diff = 0
for p in sorted(fresh.glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c = committed.get(r["fixture"])
        key = lambda x: (x["chain"]["digests"], x["chain"]["px"], x["chain"]["rows"], x["entry"]["digests"], x["entry"]["px"])
        if c is not None and key(c) == key(r):
            same += 1
        else:
            diff += 1
            print("DIFFERS", r["fixture"], key(r), key(c) if c else None)
print(f"{same} windows identical to the committed receipts, {diff} differ")
