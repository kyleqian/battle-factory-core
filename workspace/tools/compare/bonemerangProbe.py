#!/usr/bin/env python3
"""Capture the complete legal Scene-ON MOVE_BONEMERANG source body.

Run only through tools/run-mgba-probe.py so an mGBA teardown crash cannot
masquerade as a valid or invalid evidence result.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "155",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_BONEMERANG",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_BONE_CLUB",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "bonemerang-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gBonemerangSpriteTemplate", "AnimBonemerangProjectile",
        "AnimBonemerangProjectile_Step", "AnimBonemerangProjectile_End",
        "gHorizontalLungeSpriteTemplate", "DoHorizontalLunge",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_Bone", "gBattleAnimSpritePal_Bone",
        "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact",
        "se_m_vital_throw", "se_m_horn_attack", "se_m_bonemerang",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
