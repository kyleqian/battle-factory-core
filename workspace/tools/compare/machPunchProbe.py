#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_MACH_PUNCH dense evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "183",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_MACH_PUNCH",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_FORESIGHT",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "mach-punch-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "MachPunchContinue", "MachPunchAgainstPlayer",
        "AnimTask_GetAttackerSide", "AnimTask_StartSlidingBg",
        "AnimTask_AttackerPunchWithTrace", "AnimTask_AttackerPunchWithTrace_Step",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBasicHitSplatSpriteTemplate", "gFistFootSpriteTemplate",
        "gBattleAnimSpriteGfx_HandsAndFeet", "gBattleAnimSpriteGfx_Impact",
        "gBattleAnimBgImage_Highspeed", "gBattleAnimBgPalette_Highspeed",
        "gBattleAnimBgTilemap_HighspeedOpponent", "gBattleAnimBgTilemap_HighspeedPlayer",
        "se_m_jump_kick", "se_m_comet_punch",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
