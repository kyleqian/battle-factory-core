#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_OUTRAGE state and chronological RGB."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "200",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_OUTRAGE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SPARK",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "outrage-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "OutrageFlames", "gOutrageFlameSpriteTemplate", "AnimOutrageFlame",
        "AnimTask_TranslateMonEllipticalRespectSide", "AnimTask_TranslateMonElliptical",
        "AnimTask_TranslateMonElliptical_Step", "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step", "AnimTask_BlendColorCycle",
        "AnimTask_BlendColorCycleLoop", "Task_LoopAndPlaySE",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
