#!/usr/bin/env python3
"""Per-turn player move slot from a probe run: the plan entry for each turn that opened the move menu, else 0.

    python3 tools/probe/derive-enc173-slots.py <run.json>      # prints {"portPlayerSlots": [...], "portPlayerTargets": [...]}
"""
import json
import sys

run = json.load(open(sys.argv[1]))
plan = run["slotPlan"]
turn_end_frames = [hit["frame"] for hit in run["attribution"]["hits"] if hit["caller"].split("+")[0] == "BattleTurnPassed"]
open_frames = [t["frame"] for t in run["transitions"] if t["changed"].get("playerController", [None, None])[1] == "HandleInputChooseMove"]
slots, previous, entry = [], 0, 0
for end in turn_end_frames:
    opened = [f for f in open_frames if previous < f <= end]
    if opened:
        entry += 1
        slots.append(plan[min(entry, len(plan)) - 1])
    else:
        slots.append(0)
    previous = end
print(json.dumps({"portPlayerSlots": slots, "portPlayerTargets": [1] * len(slots)}))
