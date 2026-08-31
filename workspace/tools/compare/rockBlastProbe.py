#!/usr/bin/env python3
"""Capture one complete pointer-owned Scene-ON MOVE_ROCK_BLAST body.

Rock Blast's battle effect can schedule two to five hits.  This wrapper stops
at the *first* source-owned body when its animation pointer becomes inactive;
later multi-hit bodies and battle-result presentation are intentionally out of
scope.  It stages only complete legal mechanicLab parties and injects no
transient battle or animation state.
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
