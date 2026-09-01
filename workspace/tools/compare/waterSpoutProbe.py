#!/usr/bin/env python3
"""Capture one complete dense Scene-ON MOVE_WATER_SPOUT source body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "323",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_WATER_SPOUT",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SHADOW_PUNCH",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "water-spout-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gSmallWaterOrbSpriteTemplate",
        "gWaterHitSplatSpriteTemplate",
        "AnimTask_WaterSpoutLaunch",
        "AnimTask_WaterSpoutLaunch_Step",
        "GetWaterSpoutPowerForAnim",
        "CreateWaterSpoutLaunchDroplets",
        "AnimSmallWaterOrb",
        "AnimTask_WaterSpoutRain",
        "AnimTask_WaterSpoutRain_Step",
        "CreateWaterSpoutRainDroplet",
        "AnimWaterSpoutRain",
        "AnimWaterSpoutRainHit",
        "AnimTask_HorizontalShake",
        "se_m_headbutt",
        "se_m_dive",
        "se_m_surf",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
