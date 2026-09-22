#!/usr/bin/env python3
"""Complete dense bilateral Scene-ON MOVE_WILL_O_WISP evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "261",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_WILL_O_WISP",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ENCORE",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "will-o-wisp-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gWillOWispOrbSpriteTemplate", "gWillOWispFireSpriteTemplate",
        "AnimWillOWispOrb", "AnimWillOWispOrb_Step", "AnimWillOWispFire",
        "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
        "SoundTask_AdjustPanningVar", "SoundTask_AdjustPanningVar_Step",
        "Task_UpdateMonBg", "Task_ClearMonBg",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
