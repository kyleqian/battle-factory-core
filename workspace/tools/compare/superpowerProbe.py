#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_SUPERPOWER state and raw RGB evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "276",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SUPERPOWER",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_RECYCLE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "superpower-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gSuperpowerOrbSpriteTemplate", "AnimSuperpowerOrb", "AnimSuperpowerOrb_Step",
        "gSuperpowerRockSpriteTemplate", "AnimSuperpowerRock", "AnimSuperpowerRock_Step1",
        "AnimSuperpowerRock_Step2", "gSuperpowerFireballSpriteTemplate", "AnimSuperpowerFireball",
        "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step", "SoundTask_PlaySE2WithPanning",
        "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
