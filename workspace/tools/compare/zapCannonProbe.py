#!/usr/bin/env python3
"""Capture the complete dense Scene-ON MOVE_ZAP_CANNON source body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "192",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_ZAP_CANNON",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_STEEL_WING",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "zap-cannon-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "ElectricityEffect", "gElectricitySpriteTemplate", "AnimElectricity",
        "WaitAnimForDuration", "AnimZapCannonSpark", "AnimZapCannonSpark_Step",
        "gZapCannonBallSpriteTemplate", "gZapCannonSparkSpriteTemplate",
        "TranslateAnimSpriteToTargetMonLocation", "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step", "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
