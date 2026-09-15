#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_SHOCK_WAVE dense evidence.

Invoke only through tools/run-mgba-probe.py. The shared collector starts at
Move_SHOCK_WAVE root age zero and retains the first fully inactive cleanup
row, including transfer banks, resource allocators, audio, and immutable
battle state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "351",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SHOCK_WAVE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_HARDEN",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "shock-wave-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gElectricChargingParticlesSpriteTemplate",
        "AnimTask_ElectricChargingParticles",
        "AnimTask_ElectricChargingParticles_Step",
        "AnimElectricChargingParticles",
        "AnimElectricChargingParticles_Step",
        "gGrowingShockWaveOrbSpriteTemplate",
        "AnimGrowingShockWaveOrb",
        "gShockWaveProgressingBoltSpriteTemplate",
        "AnimTask_ShockWaveProgressingBolt",
        "CreateShockWaveBoltSprite",
        "AnimShockWaveProgressingBolt",
        "gLightningSpriteTemplate",
        "AnimTask_ShockWaveLightning",
        "CreateShockWaveLightningSprite",
        "AnimShockWaveLightning",
        "AnimTask_ShakeMon",
        "AnimTask_ShakeMon_Step",
        "AnimTask_BlendBattleAnimPal",
        "AnimTask_BlendBattleAnimPalStep",
        "gSimplePaletteBlendSpriteTemplate",
        "AnimSimplePaletteBlend",
        "AnimSimplePaletteBlend_Step",
        "Task_UpdateMonBg",
        "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_ElectricOrbs",
        "gBattleAnimSpritePal_ElectricOrbs",
        "gBattleAnimSpriteGfx_CircleOfLight",
        "gBattleAnimSpriteGfx_Spark",
        "gBattleAnimSpritePal_Spark",
        "gBattleAnimSpriteGfx_Lightning",
        "gBattleAnimSpritePal_Lightning2",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
