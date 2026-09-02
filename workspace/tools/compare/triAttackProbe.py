#!/usr/bin/env python3
"""Capture the complete dense Scene-ON MOVE_TRI_ATTACK source body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "161",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_TRI_ATTACK",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_WILL_O_WISP",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "tri-attack-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "IceCrystalEffectShort",
        "gTriAttackTriangleSpriteTemplate",
        "gLargeFlameScatterSpriteTemplate",
        "gLightningSpriteTemplate",
        "gIceCrystalHitLargeSpriteTemplate",
        "gIceCrystalHitSmallSpriteTemplate",
        "AnimTriAttackTriangle",
        "AnimLargeFlame",
        "AnimLargeFlame_Step",
        "AnimTask_ShakeTargetInPattern",
        "AnimLightning",
        "AnimLightning_Step",
        "AnimIceEffectParticle",
        "AnimFlickerIceEffectParticle",
        "SoundTask_LoopSEAdjustPanning",
        "SoundTask_LoopSEAdjustPanning_Step",
        "AnimSimplePaletteBlend",
        "AnimSimplePaletteBlend_Step",
        "Task_FadeToBg",
        "Task_UpdateMonBg",
        "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
