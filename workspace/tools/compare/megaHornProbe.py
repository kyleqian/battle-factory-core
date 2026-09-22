#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_MEGAHORN state and chronological RGB."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "224",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_MEGAHORN",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_GUST",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "mega-horn-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "MegahornContinue", "MegahornInContest",
        "gMegahornHornSpriteTemplate", "AnimMegahornHorn",
        "gSlideMonToOffsetSpriteTemplate", "SlideMonToOffset",
        "gSlideMonToOriginalPosSpriteTemplate", "SlideMonToOriginalPos",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step",
        "AnimTask_StartSlidingBg", "AnimTask_UpdateSlidingBg",
        "gBasicHitSplatSpriteTemplate", "AnimHitSplatBasic",
        "AnimFlashingHitSplat", "Task_FadeToBg", "Task_RestoreBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
