#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_SHEER_COLD dense evidence.

Invoke only through tools/run-mgba-probe.py.  The shared collector begins at
the first active byte of Move_SHEER_COLD and retains the first fully inactive
cleanup row, including hardware transfer banks and immutable battle state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "329",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SHEER_COLD",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ARM_THRUST",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "sheer-cold-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "sFrozenIceCubeSpriteTemplate", "sFrozenIceCubeSubsprites",
        "sFrozenIceCubeSubspriteTable", "AnimTask_FrozenIceCube",
        "AnimTask_FrozenIceCube_Step1", "AnimTask_FrozenIceCube_Step2",
        "AnimTask_FrozenIceCube_Step3", "AnimTask_FrozenIceCube_Step4",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_IceCube", "gBattleAnimSpritePal_IceCube",
        "gBattleAnimBgImage_Ice", "gBattleAnimBgPalette_Ice",
        "gBattleAnimBgTilemap_Ice", "se_m_icy_wind", "se_m_hail",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
