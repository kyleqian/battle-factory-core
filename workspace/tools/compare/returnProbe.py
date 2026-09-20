#!/usr/bin/env python3
"""Capture one complete branch-specific Scene-ON MOVE_RETURN body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

branch = os.environ.get("POKEBENCH_RETURN_BRANCH", "strongest")
if branch not in {"weak", "medium", "strong", "strongest"}:
    raise SystemExit(f"unknown RETURN branch: {branch}")

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "216",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_RETURN",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_COSMIC_POWER",
    "POKEBENCH_ANIM_PROBE_SCHEMA": f"return-{branch}-dense-evidence/v1",
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
