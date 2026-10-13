#!/usr/bin/env python3
"""aud129 (docs/aud129-live-audit-27.md s4): census exposure (base only) of the moves with a measured one-frame CPU phase in this audit, from
the merged commands jsonl of stg107Census.sh (liveShareCensus.ts --commands, seeds 0..999): per move the live commands / live frames, split
by the move's use in the battle (use1 = the battle's first command of that move, either side; use2+ = later), and per attacker side.
  MEGA_PUNCH 5   production 160 rows (the lag-present phase: 18 / 19 measured windows); the BG-write row 71 (17 / 19)
  CRUNCH 242     production 142 rows (a13fix policy, lag at 121); 13 / 15 measured windows
  SMOKESCREEN 108 production 125 rows: use1 measured 124 in 15 / 16 windows, use2+ 125 in 7 / 8
  SPARK 209      alignment only (0 px aligned, 8 / 8)
usage: aud129Exposure.py <merged.jsonl> <out.json>"""
import json, sys
from collections import Counter, defaultdict

MOVES = {5: "MEGA_PUNCH", 242: "CRUNCH", 108: "SMOKESCREEN", 209: "SPARK"}
seen = set()
out = {m: defaultdict(Counter) for m in MOVES.values()}
for line in open(sys.argv[1]):
    c = json.loads(line)
    if c.get("kind") != "move" or c.get("moveId") not in MOVES:
        continue
    name = MOVES[c["moveId"]]
    use = "use1" if (c["battle"], c["moveId"]) not in seen else "use2+"
    seen.add((c["battle"], c["moveId"]))
    for key in ("all", use, f"{use}:{c['side']}"):
        k = out[name][key]
        k["commands"] += 1
        k["live"] += int(c["status"] == "live")
        k["liveFrames"] += c["liveFrames"] if c["status"] == "live" else 0
        k["frames"] += c["frames"]
res = {m: {k: dict(sorted(v.items())) for k, v in sorted(d.items())} for m, d in out.items()}
open(sys.argv[2], "w").write(json.dumps(res, indent=1, sort_keys=True) + "\n")
for m, d in res.items():
    print(m, "all", d.get("all"), "use1", d.get("use1"))
