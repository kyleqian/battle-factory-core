#!/usr/bin/env python3
"""Capture the complete legal Scene-ON MOVE_AIR_CUTTER source body.

Run only through tools/run-mgba-probe.py so an mGBA teardown crash cannot
masquerade as a valid or invalid evidence result.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "314",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_AIR_CUTTER",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ODOR_SLEUTH",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "air-cutter-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gAirWaveProjectileSpriteTemplate", "gAirCutterSliceSpriteTemplate",
        "AnimAirWaveProjectile", "AnimAirWaveProjectile_Step1", "AnimAirWaveProjectile_Step2",
        "AnimTask_AirCutterProjectile", "AirCutterProjectileStep1", "AirCutterProjectileStep2",
        "AnimAirCutterSlice", "AnimSlice_Step", "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_AirWave", "gBattleAnimSpritePal_AirWave",
        "gBattleAnimSpriteGfx_Cut", "gBattleAnimSpriteGfx_Impact", "se_m_cut", "se_m_blizzard2",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
