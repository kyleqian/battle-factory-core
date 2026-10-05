#!/usr/bin/env python3
"""Adapter so liveAdapterFramebuffer.ts (probe <scenario> <output> <rgbDir>) can drive the staged Faint Attack
boundary (tools/probe/stage-fire-punch-portable-on.py <output> <rgbDir> <side> <move>). The scenario argument is
ignored. Side/move come from POKEBENCH_STAGE_SIDE (default player) and fixed faint-attack."""
import os, runpy, sys
stage = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../probe/stage-fire-punch-portable-on.py")
_scenario, output, rgb = sys.argv[1:4]
sys.argv = [stage, output, rgb, os.environ.get("POKEBENCH_STAGE_SIDE", "player"), "faint-attack"]
runpy.run_path(stage, run_name="__main__")
