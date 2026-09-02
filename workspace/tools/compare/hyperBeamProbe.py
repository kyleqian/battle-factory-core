#!/usr/bin/env python3
"""Capture the complete dense Scene-ON MOVE_HYPER_BEAM source body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "63",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_HYPER_BEAM",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_FLATTER",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "hyper-beam-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "HyperBeamOrbs", "gHyperBeamOrbSpriteTemplate",
        "AnimHyperBeamOrb", "AnimHyperBeamOrb_Step",
        "AnimTask_FlashAnimTagWithColor", "AnimTask_FlashAnimTagWithColor_Step1",
        "AnimTask_FlashAnimTagWithColor_Step2", "AnimTask_ShakeMon",
        "AnimTask_ShakeMon_Step", "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step", "AnimTask_BlendBattleAnimPal",
        "AnimTask_BlendBattleAnimPal_Step", "SoundTask_LoopSEAdjustPanning",
        "SoundTask_LoopSEAdjustPanning_Step", "Task_FadeToBg",
        "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
