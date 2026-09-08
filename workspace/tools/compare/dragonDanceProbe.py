#!/usr/bin/env python3
"""Complete dense bilateral Scene-ON MOVE_DRAGON_DANCE evidence.

Invoke only through tools/run-mgba-probe.py. The shared probe's optional
capture flags retain both scanline buffers and the complete sprite-resource
allocator state without changing any older probe schema.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "349",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_DRAGON_DANCE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SHOCK_WAVE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "dragon-dance-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_SCANLINE": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gDragonDanceOrbSpriteTemplate", "AnimDragonDanceOrb", "AnimDragonDanceOrb_Step",
        "AnimTask_BlendPalInAndOutByTag", "AnimTask_BlendPalInAndOutSetup",
        "AnimTask_DragonDanceWaver", "AnimTask_DragonDanceWaver_Step",
        "UpdateDragonDanceScanlineEffect", "gBattleAnimSpriteGfx_HollowOrb",
        "gBattleAnimSpritePal_HollowOrb", "se_m_teleport",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
