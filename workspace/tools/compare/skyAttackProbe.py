#!/usr/bin/env python3
"""Capture both complete legal Scene-ON MOVE_SKY_ATTACK source bodies."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "143",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SKY_ATTACK",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_FLASH",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "sky-attack-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_REPEATED_BODIES": "1",
    "POKEBENCH_ANIM_PROBE_EXTRA_OWNED_RANGES": "SetSkyBg:SetSolarBeamBg",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SkyAttackEnd", "SkyAttackSetUp", "SkyAttackSetUpAgainstOpponent",
        "SkyAttackSetUpAgainstPartner", "SkyAttackUnleash", "SetSkyBg",
        "SetSkyBgContinue", "SetSkyBgContest", "UnsetSkyBg",
        "gSkyAttackBirdSpriteTemplate", "AnimSkyAttackBird", "AnimSkyAttackBird_Step",
        "AnimTask_GetTargetIsAttackerPartner", "AnimTask_BlendBattleAnimPal",
        "AnimTask_BlendBattleAnimPalExclude", "AnimTask_HorizontalShake",
        "AnimTask_StartSlidingBg", "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "SoundTask_PlaySE1WithPanning", "SoundTask_PlaySE2WithPanning",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
