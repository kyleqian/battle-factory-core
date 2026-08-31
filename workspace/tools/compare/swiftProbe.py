#!/usr/bin/env python3
"""Capture one complete dense Scene-ON MOVE_SWIFT source body."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "129",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SWIFT",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_STRENGTH",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "swift-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gSwiftStarSpriteTemplate",
        "AnimTranslateLinearSingleSineWave",
        "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step",
        "se_m_swift",
    )),
})

runpy.run_path(
    str(Path(__file__).with_name("sweetScentProbe.py")),
    run_name="__main__",
)
