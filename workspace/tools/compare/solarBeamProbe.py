#!/usr/bin/env python3
"""Capture dense Scene-ON MOVE_SOLAR_BEAM setup and unleash source rows."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "76",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SOLAR_BEAM",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_BLIZZARD",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "solar-beam-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_REPEATED_BODIES": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SolarBeamEnd", "SolarBeamSetUp", "SolarBeamAbsorbEffect", "SolarBeamUnleash",
        "SolarBeamUnleash1", "SetSolarBeamBg", "SetSolarBeamBgContinue", "SetSolarBeamBgContest",
        "SetSolarBeamBgPlayer", "SetSolarBeamBgOpponent", "UnsetSolarBeamBg",
        "gPowerAbsorptionOrbSpriteTemplate", "gSolarBeamBigOrbSpriteTemplate", "gSolarBeamSmallOrbSpriteTemplate",
        "AnimPowerAbsorptionOrb", "AnimSolarBeamBigOrb", "AnimSolarBeamSmallOrb", "AnimSolarBeamSmallOrb_Step",
        "AnimTask_CreateSmallSolarBeamOrbs", "AnimTask_BlendBattleAnimPal", "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step", "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
