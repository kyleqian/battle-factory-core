#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_SMOG dense evidence.

Invoke only through tools/run-mgba-probe.py. The shared collector starts at
Move_SMOG root age zero and retains the first fully inactive cleanup row,
including software/hardware transfer banks and immutable battle state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "123",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SMOG",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_FAINT_ATTACK",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "smog-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gSmogCloudSpriteTemplate", "sAnim_Cloud",
        "InitSwirlingFogAnim", "AnimSwirlingFogAnim",
        "AnimTask_BlendColorCycle", "AnimTask_BlendColorCycleLoop",
        "AnimTask_BlendColorCycleByTag", "AnimTask_BlendColorCycleByTagLoop",
        "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_MistCloud", "gBattleAnimSpritePal_PurpleGasCloud",
        "se_m_mist", "se_m_toxic",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
