#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_OVERHEAT dense evidence.

Invoke only through tools/run-mgba-probe.py. The shared collector starts at
the pointer-owned root and retains every semantic and RGB888 row through the
first fully inactive cleanup, including transfer banks, resources, audio, and
immutable battle state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "315",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_OVERHEAT",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_HYDRO_CANNON",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "overheat-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gOverheatFlameSpriteTemplate", "AnimOverheatFlame", "AnimOverheatFlame_Step",
        "gBasicHitSplatSpriteTemplate", "AnimHitSplatBasic",
        "gSimplePaletteBlendSpriteTemplate", "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step",
        "AnimTask_AllocBackupPalBuffer", "AnimTask_FreeBackupPalBuffer",
        "AnimTask_CopyPalUnfadedToBackup", "AnimTask_CopyPalUnfadedFromBackup",
        "AnimTask_CopyPalFadedToUnfaded", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_SmallEmber", "gBattleAnimSpritePal_SmallEmber",
        "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
