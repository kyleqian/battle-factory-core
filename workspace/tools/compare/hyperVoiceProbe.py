#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_HYPER_VOICE dense evidence.

Invoke only through tools/run-mgba-probe.py. The shared collector starts at
Move_HYPER_VOICE root age zero and retains the first fully inactive cleanup
row, including transfer banks, resources, audio, and immutable battle state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "304",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_HYPER_VOICE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SAND_TOMB",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "hyper-voice-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "HyperVoiceEffect", "gHyperVoiceRingSpriteTemplate",
        "gHyperVoiceRingAffineAnimCmds", "gHyperVoiceRingAffineAnimTable",
        "AnimHyperVoiceRing", "AnimHyperVoiceRing_WaitEnd",
        "AnimTask_ScaleMonAndRestore", "AnimTask_ScaleMonAndRestore_Step",
        "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "AnimTask_ShakeBattlePlatforms", "AnimTask_ShakeBattlePlatforms_Step",
        "SoundTask_PlayCryWithEcho", "SoundTask_PlayCryWithEcho_Step",
        "SoundTask_WaitForCry", "gSimplePaletteBlendSpriteTemplate",
        "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step",
        "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_ThinRing", "gBattleAnimSpritePal_ThinRing",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
