#!/usr/bin/env python3
"""Generate flw252 lab scenarios + compare traces (voluntary party menu input gating).

Usage: flw252_gen.py <name> <on|off> <last_frame> <FRAME:BUTTON>...   (1-frame pulses at absolute lab frames)
"""
import json, sys
name, scene, last = sys.argv[1], sys.argv[2], int(sys.argv[3])
presses = {}
for a in sys.argv[4:]:
    f, b = a.split(":")
    presses.setdefault(int(f), []).append(b)
segments, f = [], 0
for pf in sorted(presses):
    if pf > f:
        segments.append({"frames": pf - f, "buttons": []})
    segments.append({"frames": 2, "buttons": presses[pf]})
    f = pf + 2
if last > f:
    segments.append({"frames": last - f, "buttons": []})
cap = list(range(0, last))
base = json.load(open("tools/battle-lab/frf250a-bag-%s.json" % scene))
base["profile"] = "battle-scene-%s" % scene
base["trace"] = {"segments": segments, "captureFrames": cap}
json.dump(base, open("tools/battle-lab/flw252-%s.json" % name, "w"), indent=1)
trace = {
    "appRoute": "generated-orchestrator",
    "oracleProfile": "battle-scene-%s" % scene,
    "appStage": {"id": "frf250a-bagrun-%s" % scene, "frame": 0},
    "oracleBattleLab": {"scenario": "../../battle-lab/flw252-%s.json" % name},
    "segments": segments,
    "captureFrames": cap,
}
json.dump(trace, open("tools/compare/traces/flw252-%s.json" % name, "w"), indent=1)
