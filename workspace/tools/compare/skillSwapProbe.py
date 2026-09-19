#!/usr/bin/env python3
"""Complete dense bilateral Scene-ON MOVE_SKILL_SWAP evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "285",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SKILL_SWAP",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_IMPRISON",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "skill-swap-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_EXTRA_OWNED_RANGES": "SetPsychicBackground:SetSkyBg",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SetPsychicBackground", "UnsetPsychicBackground",
        "gSkillSwapOrbSpriteTemplate", "AnimSkillSwapOrb",
        "AnimTask_SkillSwap", "AnimTask_SkillSwap_Step",
        "AnimTask_BlendMonInAndOut", "AnimTask_BlendMonInAndOut_Step",
        "AnimTask_SetPsychicBackground", "Task_FadeToBg",
        "Task_UpdateMonBg", "Task_ClearMonBg", "SoundTask_LoopSEAdjustPanning",
        "gBattleAnimSpriteGfx_BluegreenOrb", "gBattleAnimSpritePal_BluegreenOrb",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
