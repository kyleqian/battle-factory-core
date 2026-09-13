#!/usr/bin/env python3
"""Complete legal bilateral Scene-ON MOVE_SIGNAL_BEAM dense evidence.

Invoke only through tools/run-mgba-probe.py. The shared collector retains the
complete pointer-owned root through the first fully inactive cleanup row.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "324",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SIGNAL_BEAM",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ABSORB",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "signal-beam-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SignalBeamOrbs",
        "gSignalBeamRedOrbSpriteTemplate", "gSignalBeamGreenOrbSpriteTemplate",
        "AnimToTargetInSinWave", "AnimToTargetInSinWave_Step",
        "AnimTask_StartSinAnimTimer", "AnimTask_RunSinAnimTimer",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "gComplexPaletteBlendSpriteTemplate", "AnimComplexPaletteBlend",
        "AnimComplexPaletteBlend_Step1", "AnimComplexPaletteBlend_Step2",
        "Task_PanFromInitialToTarget",
        "gBattleAnimSpriteGfx_Duck", "gBattleAnimSpritePal_Duck",
        "gBattleAnimSpriteGfx_GlowyRedOrb", "gBattleAnimSpritePal_GlowyRedOrb",
        "gBattleAnimSpritePal_GlowyGreenOrb", "se_m_bubble_beam",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
