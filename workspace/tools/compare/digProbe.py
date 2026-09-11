#!/usr/bin/env python3
"""Capture both complete legal Scene-ON MOVE_DIG bodies."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "91",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_DIG",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_MEDITATE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "dig-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_REPEATED_BODIES": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_SCANLINE": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "DigEnd", "DigSetUp", "DigUnleash", "DigThrowDirt",
        "gDirtMoundSpriteTemplate", "gDirtPlumeSpriteTemplate",
        "gBasicHitSplatSpriteTemplate", "AnimDigDirtMound",
        "AnimDirtPlumeParticle", "AnimDirtPlumeParticle_Step",
        "AnimTask_DigDownMovement", "AnimTask_DigBounceMovement",
        "AnimTask_DigEndBounceMovementSetInvisible", "AnimTask_DigUpMovement",
        "AnimTask_DigSetVisibleUnderground", "AnimTask_DigRiseUpFromHole",
        "SetDigScanlineEffect", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "Task_UpdateMonBg", "Task_ClearMonBg", "DestroyAnimSprite",
        "DestroyAnimVisualTask", "clearmonbg", "clearmonbg_static",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
