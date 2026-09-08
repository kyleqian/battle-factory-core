#!/usr/bin/env python3
"""Capture one complete legal Scene-ON MOVE_MAGNITUDE branch window."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "222",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_MAGNITUDE",
    # The source interval ends at the next script label so the retained
    # first-active-through-first-inactive rows include both branch bodies.
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_RAPID_SPIN",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "magnitude-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_EXTRA_OWNED_RANGES": "",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "AnimTask_IsPowerOver99", "AnimTask_HorizontalShake", "AnimTask_ShakePlatforms", "AnimTask_ShakeBattlers",
        "AnimComplexPaletteBlend", "AnimComplexPaletteBlend_Step1", "AnimComplexPaletteBlend_Step2",
        "gComplexPaletteBlendSpriteTemplate", "se_m_strength",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
