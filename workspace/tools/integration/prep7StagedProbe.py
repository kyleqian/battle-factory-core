#!/usr/bin/env python3
"""Adapter so liveAdapterFramebuffer.ts (probe <scenario> <output> <rgbDir> [probeArgs...]) can drive the staged boundary
tools/probe/stage-fire-punch-portable-on.py <output> <rgbDir> <side> <move> (prep6FaintAttackProbe.py generalised). The scenario
argument is ignored; the fixture's probeArgs are [side, move] (for example ["player", "ice-punch"])."""
import os, runpy, sys
stage = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../probe/stage-fire-punch-portable-on.py")
_scenario, output, rgb, side, move = sys.argv[1:6]
os.makedirs(rgb, exist_ok=True)
sys.argv = [stage, output, rgb, side, move]
try:
    runpy.run_path(stage, run_name="__main__")
finally:
    import json
    try:
        data = json.load(open(output))
        data["frames"] = [{"frame": c["tick"], "sha256": c["sha256"]} for c in data["captures"]]
        json.dump(data, open(output, "w"))
    except (OSError, KeyError, ValueError):
        pass
