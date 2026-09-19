#!/usr/bin/env python3
"""Complete dense bilateral Scene-ON MOVE_PURSUIT evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "228",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_PURSUIT",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SPIKE_CANNON",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "pursuit-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "PursuitNormal", "PursuitOnSwitchout", "PursuitContinue",
        "gBasicHitSplatSpriteTemplate", "AnimHitSplatBasic",
        "AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
        "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimBackgroundTable", "gBattleAnimBgImage_Dark",
        "gBattleAnimBgPalette_Dark", "gBattleAnimBgTilemap_Dark",
        "se_m_comet_punch",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
