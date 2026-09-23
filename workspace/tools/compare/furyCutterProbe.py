#!/usr/bin/env python3
"""Capture dense Scene-ON MOVE_FURY_CUTTER bodies through first cleanup."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "210",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_FURY_CUTTER",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SELF_DESTRUCT",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "fury-cutter-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_REPEATED_BODIES": "1",
    "POKEBENCH_ANIM_PROBE_EXTRA_FRAMES": "240",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gCuttingSliceSpriteTemplate", "gAirCutterSliceSpriteTemplate",
        "AnimCuttingSlice", "AnimSlice_Step", "AnimTask_IsFuryCutterHitRight",
        "AnimTask_GetFuryCutterHitCount", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "Task_UpdateMonBg", "Task_ClearMonBg", "DestroyAnimSprite", "DestroySpriteAndMatrix",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
