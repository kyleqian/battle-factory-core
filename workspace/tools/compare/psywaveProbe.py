#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_PSYWAVE dense evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "149",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_PSYWAVE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ZAP_CANNON",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "psywave-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "PsywaveRings", "gPsywaveRingSpriteTemplate",
        "AnimToTargetInSinWave", "AnimToTargetInSinWave_Step",
        "AnimTask_StartSinAnimTimer", "AnimTask_RunSinAnimTimer",
        "AnimTask_BlendColorCycle", "AnimTask_BlendColorCycleLoop",
        "AnimTask_SetPsychicBackground", "SetPsychicBackground_Step",
        "SoundTask_LoopSEAdjustPanning", "SoundTask_LoopSEAdjustPanning_Step",
        "Task_FadeToBg", "gBattleAnimSpriteGfx_GoldRing",
        "gBattleAnimSpritePal_BlueRing", "gBattleAnimBgImage_Psychic",
        "gBattleAnimBgPalette_Psychic", "gBattleAnimBgTilemap_Psychic",
        "se_m_psybeam", "se_m_teleport",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
