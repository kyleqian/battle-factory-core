#!/usr/bin/env python3
"""Complete dense bilateral Scene-ON MOVE_DESTINY_BOND evidence.

Invoke only through tools/run-mgba-probe.py.  This wrapper selects the
authoritative pointer-owned root and retains the allocator and raw battle
state needed to distinguish animation resources/RNG from gameplay state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "194",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_DESTINY_BOND",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ENDURE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "destiny-bond-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gDestinyBondWhiteShadowSpriteTemplate",
        "AnimDestinyBondWhiteShadow", "AnimDestinyBondWhiteShadow_Step",
        "AnimTask_DestinyBondWhiteShadow", "AnimTask_DestinyBondWhiteShadow_Step",
        "AnimTask_BlendBattleAnimPalExclude", "AnimTask_BlendSpriteColor_Step2",
        "AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_WhiteShadow", "gBattleAnimSpritePal_WhiteShadow",
        "gBattleAnimBgImage_Ghost", "gBattleAnimBgPalette_Ghost", "gBattleAnimBgTilemap_Ghost",
        "se_m_psybeam", "se_m_confuse_ray", "se_m_nightmare",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
