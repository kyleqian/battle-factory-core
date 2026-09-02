#!/usr/bin/env python3
"""Capture the complete dense Scene-ON MOVE_AURORA_BEAM source body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "62",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_AURORA_BEAM",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SOLAR_BEAM",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "aurora-beam-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "AuroraBeamCreateRings", "gAuroraBeamRingSpriteTemplate",
        "AnimAuroraBeamRings", "AnimAuroraBeamRings_Step",
        "AnimTask_RotateAuroraRingColors", "AnimTask_RotateAuroraRingColors_Step",
        "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "SoundTask_LoopSEAdjustPanning", "SoundTask_LoopSEAdjustPanning_Step",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
