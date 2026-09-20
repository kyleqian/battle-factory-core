#!/usr/bin/env python3
"""Capture a complete strongest-branch Scene-ON MOVE_RETURN body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "216",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_RETURN",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_COSMIC_POWER",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "return-strongest-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "ReturnContinue", "ReturnWeak", "ReturnMedium", "ReturnStrong",
        "ReturnStrongest", "ReturnStrongestHit", "AnimTask_GetReturnPowerLevel",
        "gHorizontalLungeSpriteTemplate", "gVerticalDipSpriteTemplate",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "AnimTask_TraceMonBlended", "AnimTask_TraceMonBlended_Step",
        "SoundTask_PlaySE1WithPanning", "SoundTask_PlaySE2WithPanning",
        "AnimBasicHitsplat", "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
