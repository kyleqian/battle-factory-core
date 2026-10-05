#!/usr/bin/env python3
"""Adapter so liveAdapterFramebuffer.ts (probe <scenario> <output> <rgbDir>) can drive the staged Faint Attack
boundary (tools/probe/stage-fire-punch-portable-on.py <output> <rgbDir> <side> <move>). The scenario argument is
ignored. Side/move come from POKEBENCH_STAGE_SIDE (default player) and fixed faint-attack."""
import os, runpy, sys
stage = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../probe/stage-fire-punch-portable-on.py")
_scenario, output, rgb = sys.argv[1:4]
os.makedirs(rgb, exist_ok=True)
sys.argv = [stage, output, rgb, os.environ.get("POKEBENCH_STAGE_SIDE", "player"), "faint-attack"]
try:
    runpy.run_path(stage, run_name="__main__")
finally:
    # liveAdapterFramebuffer.ts reads `frames`; the staged probe records the same per-frame RGB receipts as `captures`.
    import json
    try:
        data = json.load(open(output))
        data["frames"] = [{"frame": c["tick"], "sha256": c["sha256"]} for c in data["captures"]]
        json.dump(data, open(output, "w"))
    except (OSError, KeyError, ValueError):
        pass
