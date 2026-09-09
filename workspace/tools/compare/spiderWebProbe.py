#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_SPIDER_WEB state and raw RGB evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "169",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SPIDER_WEB",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_RAZOR_WIND",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "spider-web-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RESOURCE_ALLOCATORS": "1",
    "POKEBENCH_ANIM_PROBE_INCLUDE_RAW_BATTLE_STATE": "1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gSpiderWebSpriteTemplate", "AnimSpiderWeb", "AnimSpiderWeb_Step", "AnimSpiderWeb_End",
        "gWebThreadSpriteTemplate", "AnimTranslateWebThread", "AnimTranslateWebThread_Step",
        "Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg",
        "Task_LoopAndPlaySE", "se_m_string_shot", "se_m_string_shot2",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
