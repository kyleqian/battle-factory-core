#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_UPROAR evidence.

This is an opt-in evidence wrapper around the shared source-relative probe.
It keeps the exact Move_UPROAR pointer interval and retains the full semantic
row, allocator, raw battle, and chronological RGB state for the strict
Uproar verifier; it is not imported by production animation.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "253",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_UPROAR",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_HEAT_WAVE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "uproar-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_EXTRA_OWNED_RANGES": "",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "AnimTask_UproarDistortion", "AnimTask_UproarDistortion_Step",
        "AnimUproarRing", "AnimSpriteOnMonPos", "AnimJaggedMusicNote",
        "AnimJaggedMusicNote_Step", "gUproarRingSpriteTemplate",
        "gJaggedMusicNoteSpriteTemplate", "se_m_uproar",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
