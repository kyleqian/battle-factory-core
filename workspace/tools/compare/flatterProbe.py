#!/usr/bin/env python3
"""Capture a complete Scene-ON MOVE_FLATTER body from legal party staging."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "260",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_FLATTER",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ROLE_PLAY",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "flatter-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "CreateFlatterConfetti", "gFlatterConfettiSpriteTemplate",
        "gFlatterSpotlightSpriteTemplate", "gVerticalDipSpriteTemplate",
        "AnimTask_CreateSpotlight", "AnimTask_RemoveSpotlight",
        "AnimTask_HardwarePaletteFade", "SoundTask_PlaySE1WithPanning",
        "SoundTask_PlaySE2WithPanning",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
