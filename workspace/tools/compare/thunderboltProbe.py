#!/usr/bin/env python3
"""Capture the complete dense Scene-ON MOVE_THUNDERBOLT source body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "85",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_THUNDERBOLT",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_THUNDER_WAVE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "thunderbolt-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "ElectricityEffect", "gElectricitySpriteTemplate", "AnimElectricity",
        "WaitAnimForDuration", "AnimTask_ElectricBolt", "AnimTask_ElectricBolt_Step",
        "gElectricBoltSegmentSpriteTemplate", "AnimElectricBoltSegment",
        "gThunderboltOrbSpriteTemplate", "AnimThunderboltOrb",
        "AnimThunderboltOrb_Step", "gSparkElectricityFlashingSpriteTemplate",
        "AnimSparkElectricityFlashing", "AnimSparkElectricityFlashing_Step",
        "AnimTask_BlendBattleAnimPal", "AnimTask_BlendBattleAnimPal_Step",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
