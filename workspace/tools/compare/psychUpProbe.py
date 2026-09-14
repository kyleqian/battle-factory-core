#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_PSYCH_UP dense evidence.

Invoke only through tools/run-mgba-probe.py. The shared collector starts at
Move_PSYCH_UP root age zero and retains the first fully inactive cleanup row,
including software/hardware transfer banks and immutable battle state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "244",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_PSYCH_UP",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_DIZZY_PUNCH",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "psych-up-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gPsychUpSpiralSpriteTemplate", "sAffineAnim_PsychUpSpiral",
        "AnimSpriteOnMonPos", "AnimTask_SwayMon", "AnimTask_SwayMonStep",
        "AnimTask_ScaleMonAndRestore", "AnimTask_ScaleMonAndRestore_Step",
        "AnimTask_BlendColorCycleExclude", "BlendColorCycleExclude",
        "AnimTask_BlendColorCycleExcludeLoop", "AnimTask_BlendBattleAnimPal",
        "StartBlendAnimSpriteColor", "AnimTask_BlendSpriteColor_Step2",
        "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_Spiral", "gBattleAnimSpritePal_Spiral",
        "se_m_psybeam", "se_m_psybeam2",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
