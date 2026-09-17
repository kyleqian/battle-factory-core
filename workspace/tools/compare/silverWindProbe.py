#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_SILVER_WIND dense evidence.

Invoke only through tools/run-mgba-probe.py.  The shared collector retains the
pointer-owned root through its first inactive cleanup, including both display
stages, BG state, resources, audio, raw gameplay state, and RGB888 frames.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "318",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SILVER_WIND",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SNATCH",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "silver-wind-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gSilverWindBigSparkSpriteTemplate",
        "gSilverWindMediumSparkSpriteTemplate",
        "gSilverWindSmallSparkSpriteTemplate",
        "AnimFlyingParticle",
        "AnimTask_BlendBattleAnimPal",
        "AnimTask_BlendBattleAnimPalExclude",
        "AnimTask_GetTargetSide",
        "AnimTask_StartSlidingBg",
        "AnimTask_UpdateSlidingBg",
        "Task_UpdateMonBg",
        "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_Sparkle6",
        "gBattleAnimSpritePal_Sparkle6",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
