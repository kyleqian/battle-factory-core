#!/usr/bin/env python3
"""Capture both complete Scene-ON MOVE_DIVE source bodies."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "291",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_DIVE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ROCK_BLAST",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "dive-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_REPEATED_BODIES": "1",
    "POKEBENCH_ANIM_PROBE_EXTRA_OWNED_RANGES": "RisingWaterHitEffect:Move_EXPLOSION",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "DiveSetUp", "DiveSetUpWaterDroplets", "DiveAttack",
        "DiveAttackWaterDroplets", "RisingWaterHitEffect",
        "gDiveBallSpriteTemplate", "AnimDiveBall", "AnimDiveBall_Step1",
        "AnimDiveBall_Step2", "gDiveWaterSplashSpriteTemplate",
        "AnimDiveWaterSplash", "gSprayWaterDropletSpriteTemplate",
        "AnimSprayWaterDroplet", "AnimSprayWaterDroplet_Step",
        "gWaterHitSplatSpriteTemplate", "gSmallDriftingBubblesSpriteTemplate",
        "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "DestroyAnimSprite", "clearmonbg", "blendoff",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
