#!/usr/bin/env python3
"""Capture the complete dense Scene-ON Factory-legal Frustration body.

The probe is intentionally source/evidence-only.  It delegates the shared
full-state/RGB capture to ``sweetScentProbe.py`` and keeps the selected
Factory friendship-0 strongest branch explicit in the probe receipt.
Invoke through ``tools/run-mgba-probe.py``.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "218",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_FRUSTRATION",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_SAFEGUARD",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "frustration-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "Frustration_Continue",
        "Frustration_Strongest",
        "Frustration_Strong",
        "Frustration_Medium",
        "Frustration_Weak",
        "AnimTask_GetFrustrationPowerLevel",
        "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step",
        "AnimTask_SwayMon",
        "AnimTask_SwayMonStep",
        "AnimTask_BlendBattleAnimPal",
        "AnimTask_BlendSpriteColor_Step2",
        "Task_UpdateMonBg",
        "Task_ClearMonBg",
        "AnimAngerMark",
        "AnimHitSplatBasic",
        "DestroySpriteAndMatrix",
        "RunStoredCallbackWhenAffineAnimEnds",
        "gAngerMarkSpriteTemplate",
        "gBasicHitSplatSpriteTemplate",
        "gHorizontalLungeSpriteTemplate",
        "gWeakFrustrationAngerMarkSpriteTemplate",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
