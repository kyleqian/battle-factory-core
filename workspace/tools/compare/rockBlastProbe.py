#!/usr/bin/env python3
"""Capture one complete natural Scene-ON MOVE_ROCK_BLAST visual execution.

Rock Blast's battle effect can schedule two to five hits.  This wrapper stops
at the first inactive row after the *last* naturally scheduled source-owned
body.  It observes the stock hit count without injecting or reproducing its
gameplay decision.  It stages only complete legal mechanicLab parties and
injects no transient battle or animation state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "350",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_ROCK_BLAST",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_OVERHEAT",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "rock-blast-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_REPEATED_BODIES": "1",
    "POKEBENCH_ANIM_PROBE_EXTRA_FRAMES": "400",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gHorizontalLungeSpriteTemplate",
        "gRockBlastRockSpriteTemplate",
        "gRockFragmentSpriteTemplate",
        "gBasicHitSplatSpriteTemplate",
        "AnimRockBlastRock",
        "AnimRockFragment",
        "AnimTask_ShakeMon",
        "AnimTask_ShakeMon_Step",
        "AnimHitSplatBasic",
        "se_m_swagger",
        "se_m_rock_throw",
    )),
})

runpy.run_path(
    str(Path(__file__).with_name("sweetScentProbe.py")),
    run_name="__main__",
)
