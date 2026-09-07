#!/usr/bin/env python3
"""Complete dense bilateral Scene-ON MOVE_AMNESIA evidence; invoke via run-mgba-probe.py."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "133",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_AMNESIA",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_KINESIS",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "amnesia-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "SetPsychicBackground", "UnsetPsychicBackground",
        "AnimTask_SetPsychicBackground", "SetPsychicBackground_Step",
        "gQuestionMarkSpriteTemplate", "AnimQuestionMark",
        "AnimQuestionMark_Step1", "AnimQuestionMark_Step2",
        "gBattleAnimSpriteGfx_Amnesia", "gBattleAnimSpritePal_Amnesia",
    )),
    "POKEBENCH_ANIM_PROBE_EXTRA_OWNED_RANGES": "SetPsychicBackground:SetSkyBg",
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
