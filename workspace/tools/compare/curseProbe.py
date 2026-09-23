#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_CURSE branch evidence.

The shared probe retains every source-owned row, hardware/software buffers,
allocator/order, audio, opaque gameplay state, and chronological raw RGB. It
is intentionally evidence-only; no production animation module imports it.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "174",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_CURSE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SOFT_BOILED",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "curse-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_SCANLINE": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "AnimTask_CurseStretchingBlackBg",
        "AnimTask_CurseStretchingBlackBg_Step1",
        "AnimTask_CurseStretchingBlackBg_Step2",
        "AnimTask_DrawFallingWhiteLinesOnAttacker",
        "AnimTask_DrawFallingWhiteLinesOnAttacker_Step",
        "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step",
        "AnimTask_SwayMon",
        "AnimTask_SwayMonStep",
        "AnimTask_BlendColorCycleLoop",
        "AnimCurseNail",
        "AnimCurseNail_Step1",
        "AnimCurseNail_Step2",
        "AnimCurseNail_End",
        "AnimGhostStatusSprite",
        "AnimGhostStatusSprite_Step",
        "AnimTask_BlendColorCycleByTag",
        "AnimTask_BlendColorCycleByTagLoop",
        "Task_UpdateMonBg",
        "Task_ClearMonBg",
        "gCurseNailSpriteTemplate",
        "gCurseGhostSpriteTemplate",
        "se_m_bind",
        "se_m_nightmare",
        "se_m_dragon_rage",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
