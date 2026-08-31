#!/usr/bin/env python3
"""Capture complete pointer-bounded Scene-ON MOVE_SAFEGUARD evidence.

This wrapper keeps the generic dense capture's full RAM/OAM/matrix/palette/
register/audio/party/RNG/raw-RGB receipt while fixing the source owner to
Safeguard. It observes a legal mechanicLab route only; it injects no
transient battle or animation state.
"""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "219",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SAFEGUARD",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_PAIN_SPLIT",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "safeguard-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "AnimGuardRing",
        "gGuardRingSpriteTemplate",
        "AnimTranslateLinear_WithFollowup",
        "DestroyAnimSprite",
        "AnimTask_BlendColorCycleLoop",
        "Task_ClearMonBg",
        "Task_UpdateMonBg",
    )),
})

runpy.run_path(
    str(Path(__file__).with_name("sweetScentProbe.py")),
    run_name="__main__",
)
