#!/usr/bin/env python3
"""prep34: complete dense Scene-ON MOVE_EXTREME_SPEED window from the activation frame (generic sweetScentProbe)."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "245",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_EXTREME_SPEED",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_UPROAR",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "prep34-extreme-speed-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "AnimTask_StartSlidingBg", "AnimTask_AttackerStretchAndDisappear", "AnimTask_SetAttackerInvisibleWaitForSignal",
        "AnimTask_ExtremeSpeedImpact", "AnimTask_SpeedDust", "AnimTask_ExtremeSpeedMonReappear",
        "Task_FadeToBg", "Task_UpdateMonBg", "Task_ClearMonBg", "gMonEdgeHitSplatSpriteTemplate",
    )),
})

runpy.run_path(str(Path(__file__).resolve().parents[1] / "compare" / "sweetScentProbe.py"), run_name="__main__")
