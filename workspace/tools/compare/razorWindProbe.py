#!/usr/bin/env python3
"""Capture dense Scene-ON source rows for both Razor Wind turns."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "13",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_RAZOR_WIND",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_DISABLE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "razor-wind-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_REPEATED_BODIES": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "RazorWindEnd", "RazorWindSetUp", "RazorWindUnleash",
        "gAirWaveCrescentSpriteTemplate", "AnimAirWaveCrescent",
        "gRazorWindTornadoSpriteTemplate", "AnimRazorWindTornado",
        "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "TranslateSpriteInCircle", "StartAnimLinearTranslation",
        "DestroyAnimSprite", "clearmonbg", "blendoff",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
