#!/usr/bin/env python3
"""Capture complete pointer-bounded Scene-ON MOVE_FORESIGHT evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "193",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_FORESIGHT",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_DESTINY_BOND",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "foresight-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gForesightMagnifyingGlassSpriteTemplate",
        "AnimForesightMagnifyingGlass",
        "AnimForesightMagnifyingGlass_Step",
        "AnimTask_BlendMonInAndOut",
        "AnimTask_BlendMonInAndOut_Step",
        "Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "Task_LoopAndPlaySE", "se_m_sketch", "se_m_detect",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
