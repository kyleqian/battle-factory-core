#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_HIDDEN_POWER state and raw RGB evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path


os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "237",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_HIDDEN_POWER",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_REVERSAL",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "hidden-power-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gHiddenPowerOrbSpriteTemplate",
        "gHiddenPowerOrbScatterSpriteTemplate",
        "gHiddenPowerOrbAffineAnimCmds",
        "AnimOrbitFast",
        "AnimOrbitFast_Step",
        "AnimOrbitScatter",
        "AnimOrbitScatter_Step",
        "AnimTask_ScaleMonAndRestore",
        "AnimTask_ScaleMonAndRestore_Step",
        "AnimTask_BlendMonInAndOut",
        "AnimTask_BlendMonInAndOut_Step",
        "se_m_take_down",
        "se_m_reversal",
        "se_m_reflect",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
