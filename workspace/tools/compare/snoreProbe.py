#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_SNORE dense evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "173",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SNORE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_LIGHT_SCREEN",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "snore-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SnoreEffect", "gSnoreZSpriteTemplate", "AnimTravelDiagonally",
        "StartAnimLinearTranslation", "AnimTask_ScaleMonAndRestore",
        "AnimTask_ScaleMonAndRestore_Step", "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step", "gShakeMonOrPlatformSpriteTemplate",
        "AnimShakeMonOrPlatform", "AnimShakeMonOrPlatform_Step",
        "Task_UpdateMonBg", "Task_ClearMonBg", "gBattleAnimSpriteGfx_SnoreZ",
        "gBattleAnimSpritePal_SnoreZ",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
