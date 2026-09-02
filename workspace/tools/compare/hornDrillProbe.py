#!/usr/bin/env python3
"""Capture the complete dense Scene-ON MOVE_HORN_DRILL source body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "32",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_HORN_DRILL",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_THRASH",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "horn-drill-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "HornDrillContinue", "HornDrillInContest",
        "gBowMonSpriteTemplate", "AnimBowMon", "AnimBowMon_Step1",
        "AnimBowMon_Step1_Callback", "AnimBowMon_Step2", "AnimBowMon_Step3",
        "AnimBowMon_Step3_Callback", "AnimBowMon_Step4",
        "gHornHitSpriteTemplate", "AnimHornHit", "AnimHornHit_Step",
        "AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step",
        "AnimTask_StartSlidingBg", "AnimTask_UpdateSlidingBg",
        "gBasicHitSplatSpriteTemplate", "AnimFlashingHitSplat",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
