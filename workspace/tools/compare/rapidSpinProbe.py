#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_RAPID_SPIN evidence.

This opt-in wrapper retains the full source-relative state and chronological
RGB rows for the unsupported Rapid Spin evidence receipt.  It is development
tooling only and is never imported by production animation.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "229",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_RAPID_SPIN",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_MOONLIGHT",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "rapid-spin-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_SCANLINE": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gRapidSpinSpriteTemplate", "AnimRapidSpin", "AnimRapidSpin_Step",
        "gBasicHitSplatSpriteTemplate", "AnimHitSplatBasic",
        "AnimTask_RapinSpinMonElevation", "RapinSpinMonElevation_Step",
        "AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
        "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
        "Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "Task_LoopAndPlaySE", "se_m_razor_wind2", "se_m_double_slap",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
