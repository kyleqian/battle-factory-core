#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_NIGHTMARE dense evidence.

Invoke only through tools/run-mgba-probe.py. The shared collector retains the
unthinned root-to-first-inactive-cleanup window, raw RGB, transfer banks,
resources, audio, and immutable battle state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "171",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_NIGHTMARE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_FLAIL",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "nightmare-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "NightmareInContest",
        "AnimTask_NightmareClone", "AnimTask_NightmareClone_Step",
        "CloneBattlerSpriteWithBlend", "DestroySpriteWithActiveSheet",
        "TranslateSpriteLinearFixedPoint",
        "AnimTask_BlendMonInAndOut", "AnimTask_BlendMonInAndOut_Step",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "Task_FadeToBg", "Task_FadeToBg_Restore", "Task_FadeToBg_Clear",
        "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimBackgroundTable", "gBattleAnimBgImage_Ghost",
        "gBattleAnimBgPalette_Ghost", "gBattleAnimBgTilemap_Ghost",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
