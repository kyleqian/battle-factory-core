#!/usr/bin/env python3
"""chg2: a Scene ON compare trace (tools/compare/traces/chg2-<name>.json) over a lab's first FRAMES frames, captures every frame from 24.
usage: chg2Trace.py LAB FRAMES"""
import json
import sys
from pathlib import Path

lab, frames = sys.argv[1], int(sys.argv[2])
segs = json.load(open(Path(__file__).parent.parent / f"battle-lab/{lab}.json"))["trace"]["segments"]
out, left = [], frames
for s in segs:
    if left <= 0:
        break
    out.append({**s, "frames": min(s["frames"], left)})
    left -= s["frames"]
trace = {"appRoute": "generated-orchestrator", "oracleProfile": "battle-scene-on", "appStage": {"id": "lab", "frame": 0},
         "oracleBattleLab": {"scenario": f"../../battle-lab/{lab}.json"}, "segments": out, "captureFrames": list(range(24, frames + 1))}
json.dump(trace, open(Path(__file__).parent.parent / f"compare/traces/{lab}.json", "w"))
print(lab, frames)
