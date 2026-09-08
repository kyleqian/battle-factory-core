#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_SUNNY_DAY evidence.

This is an evidence-only wrapper around the shared source-relative probe.  It
keeps the odd-aligned Move_SUNNY_DAY interval intact, including the
pointer-owned SunnyDayLightRay subroutine, and retains allocator, raw battle,
and framebuffer state for the later hermetic verifier.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "241",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SUNNY_DAY",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_COTTON_SPORE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "sunny-day-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_EXTRA_OWNED_RANGES": "",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SunnyDayLightRay", "AnimSunlight", "gSunlightRaySpriteTemplate",
        "AnimTask_BlendBattleAnimPal", "StartBlendAnimSpriteColor",
        "AnimTask_BlendSpriteColor_Step2", "DestroyAnimVisualTask",
        "se_m_petal_dance",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
