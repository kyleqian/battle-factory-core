#!/usr/bin/env python3
"""Complete dense bilateral Scene-ON MOVE_EXTRASENSORY evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "326",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_EXTRASENSORY",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_AERIAL_ACE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "extrasensory-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_EXTRA_OWNED_RANGES": "SetPsychicBackground:SetSkyBg",
    "POKEBENCH_ANIM_PROBE_INCLUDE_SCANLINE": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SetPsychicBackground", "UnsetPsychicBackground",
        "AnimTask_ExtrasensoryDistortion", "AnimTask_ExtrasensoryDistortion_Step",
        "AnimTask_TransparentCloneGrowAndShrink", "AnimTask_TransparentCloneGrowAndShrink_Step",
        "AnimTask_BlendMonInAndOut", "AnimTask_BlendMonInAndOut_Step",
        "AnimTask_SetPsychicBackground", "SetPsychicBackground_Step",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
