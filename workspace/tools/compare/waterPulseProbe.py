#!/usr/bin/env python3
"""Complete dense bilateral Scene-ON MOVE_WATER_PULSE evidence.

This wrapper selects Water Pulse's complete pointer-owned source body and
retains the shared probe's semantic, hardware, resource, audio, battle-state,
and chronological RGB rows.  Invoke it only through run-mgba-probe.py.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "352",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_WATER_PULSE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_PSYCHO_BOOST",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "water-pulse-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gWaterPulseBubbleSpriteTemplate", "gWaterPulseRingBubbleSpriteTemplate",
        "gWaterPulseRingSpriteTemplate", "AnimWaterPulseBubble", "AnimWaterPulseBubble_Step",
        "AnimWaterPulseRingBubble", "AnimWaterPulseRing", "AnimWaterPulseRing_Step",
        "CreateWaterPulseRingBubbles", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "gSimplePaletteBlendSpriteTemplate", "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step",
        "Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "gBattleAnimSpriteGfx_SmallBubbles", "gBattleAnimSpritePal_SmallBubbles",
        "gBattleAnimSpriteGfx_GoldRing", "gBattleAnimSpritePal_BlueRing2",
        "se_m_bubble3", "se_m_giga_drain",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
