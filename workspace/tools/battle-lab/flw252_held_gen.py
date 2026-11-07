#!/usr/bin/env python3
"""flw252 #191: postwin question with one D-pad key held (JOY_NEW steps once; no JOY_REPEAT).

Usage: flw252_held_gen.py <name> <BUTTON> <hold_frames> <last_frame>
"""
import json, sys
name, button, hold, last = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
segments = [{"frames": 120, "buttons": []}, {"frames": hold, "buttons": [button]}, {"frames": last - 120 - hold, "buttons": []}]
cap = list(range(118, last))
base = json.load(open("tools/battle-lab/factory-brain-silver-walkup-askready-menu-retire-off.json"))
base["trace"] = {"segments": segments, "captureFrames": cap}
json.dump(base, open("tools/battle-lab/flw252-%s.json" % name, "w"), indent=1)
trace = json.load(open("tools/compare/traces/factory-brain-silver-walkup-askready-menu-retire-off.json"))
trace["oracleBattleLab"] = {"scenario": "../../battle-lab/flw252-%s.json" % name}
trace["segments"] = segments
trace["captureFrames"] = cap
json.dump(trace, open("tools/compare/traces/flw252-%s.json" % name, "w"), indent=1)
