#!/usr/bin/env python3
"""speciesAudit3: lag frames (main-loop pass delta 0 = playTimeVBlanks unchanged, speciesAudit2Counters.py output) in [first,last] host frames.
usage: speciesAudit3Lag.py out.json first last"""
import json, sys
d = json.load(open(sys.argv[1])); a, b = int(sys.argv[2]), int(sys.argv[3]); c = d["cols"].index("playTimeVBlanks"); r = d["rows"]
lag = [i for i in range(max(1, a), min(len(r) - 1, b) + 1) if r[i][c] == r[i - 1][c]]
print(d["scenario"], "lag frames in", (a, b), lag, "ages", [i - a for i in lag])
