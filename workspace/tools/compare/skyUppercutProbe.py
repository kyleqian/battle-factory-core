#!/usr/bin/env python3
"""Capture complete dense Battle Scene-ON MOVE_SKY_UPPERCUT evidence.

The shared probe retains the complete source-pointer body, raw RGB888 rows,
hardware/software OAM and matrices, palette/register/audio/resource state,
parties, immutable gameplay state, animation RNG, and first inactive cleanup.
This wrapper is development evidence only and is never loaded by production.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "327",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SKY_UPPERCUT",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SECRET_POWER",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "sky-uppercut-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_SCANLINE": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gBasicHitSplatSpriteTemplate", "AnimHitSplatBasic",
        "gSlideMonToOffsetSpriteTemplate", "SlideMonToOffset", "SlideMonToOffset_Step",
        "gSlideMonToOriginalPosSpriteTemplate", "SlideMonToOriginalPos", "SlideMonToOriginalPos_Step",
        "AnimTask_MoveSkyUppercutBg", "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "Cmd_fadetobg", "Cmd_restorebg", "LoadMoveBg", "UpdateAnimBg3ScreenSize",
        "se_m_sky_uppercut", "se_m_vital_throw2",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
