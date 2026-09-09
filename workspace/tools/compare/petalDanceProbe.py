#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_PETAL_DANCE evidence.

This development-only wrapper keeps the generic state/RGB probe honest while
pinning Petal Dance's exact source body and all animation-owned symbols.  It
is never imported by production animation code.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "80",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_PETAL_DANCE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_RAZOR_LEAF",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "petal-dance-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gPetalDanceBigFlowerSpriteTemplate", "gPetalDanceSmallFlowerSpriteTemplate",
        "AnimPetalDanceBigFlower", "AnimPetalDanceBigFlower_Step",
        "AnimPetalDanceSmallFlower", "AnimPetalDanceSmallFlower_Step",
        "gBasicHitSplatSpriteTemplate", "AnimHitSplatBasic",
        "AnimTask_TranslateMonEllipticalRespectSide", "AnimTask_ShakeMon",
        "AnimTask_ShakeMon_Step", "Task_InitUpdateMonBg", "Task_UpdateMonBg",
        "Task_ClearMonBg", "SlideMonToOffset", "SlideMonToOriginalPos",
        "se_m_petal_dance", "se_m_mega_kick2",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
