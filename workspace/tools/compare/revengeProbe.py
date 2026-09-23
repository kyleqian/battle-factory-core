#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_REVENGE state and raw RGB evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "279",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_REVENGE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_POISON_FANG",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "revenge-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gRevengeSmallScratchSpriteTemplate", "gRevengeBigScratchSpriteTemplate", "AnimRevengeScratch",
        "gHorizontalLungeSpriteTemplate", "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "gPersistHitSplatSpriteTemplate", "AnimHitSplatPersistent", "Task_UpdateMonBg", "Task_ClearMonBg",
        "AnimTask_BlendColorCycle", "AnimTask_BlendColorCycleLoop",
        "gBattleAnimSpriteGfx_PurpleScratch", "gBattleAnimSpriteGfx_PurpleSwipe",
        "gBattleAnimSpriteGfx_Impact", "se_m_take_down", "se_m_swagger",
        "se_m_vital_throw2", "se_m_mega_kick2",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
