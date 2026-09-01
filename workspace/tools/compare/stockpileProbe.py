#!/usr/bin/env python3
"""Capture complete pointer-bounded Scene-ON MOVE_STOCKPILE evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "254",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_STOCKPILE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SPIT_UP",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "stockpile-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "StockpileAbsorb",
        "AnimTask_StockpileDeformMon",
        "gStockpileAbsorptionOrbSpriteTemplate",
        "AnimPowerAbsorptionOrb",
        "StartAnimLinearTranslation",
        "AnimTranslateLinear_WithFollowup",
        "DestroySpriteAndMatrix",
        "AnimTask_BlendColorCycle",
        "AnimTask_BlendColorCycleLoop",
        "AnimSimplePaletteBlend",
        "AnimSimplePaletteBlend_Step",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
