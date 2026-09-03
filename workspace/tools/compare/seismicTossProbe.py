#!/usr/bin/env python3
"""Capture complete dense bilateral MOVE_SEISMIC_TOSS Scene-ON evidence.

The shared probe owns exhaustive state/RGB sampling; this wrapper fixes the
move interval and every Seismic Toss-specific callback/resource symbol.
Invoke through tools/run-mgba-probe.py.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "69",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SEISMIC_TOSS",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_MAGIC_COAT",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "seismic-toss-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SeismicTossContinue",
        "SeismicTossWeak",
        "SeismicTossMedium",
        "SeismicTossStrong",
        "SeismicTossRockScatter1",
        "SeismicTossRockScatter2",
        "AnimTask_GetSeismicTossDamageLevel",
        "AnimTask_MoveSeismicTossBg",
        "AnimTask_SeismicTossBgAccelerateDownAtEnd",
        "AnimTask_ShakeMon",
        "AnimTask_ShakeMon_Step",
        "AnimRockScatter",
        "AnimRockScatter_Step",
        "AnimHitSplatBasic",
        "Task_FadeToBg",
        "Task_UpdateMonBg",
        "Task_ClearMonBg",
        "UpdateAnimBg3ScreenSize",
        "gRockScatterSpriteTemplate",
        "gBasicHitSplatSpriteTemplate",
        "gBattleAnimBgImage_InAir",
        "gBattleAnimBgPalette_InAir",
        "gBattleAnimBgTilemap_InAir",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
