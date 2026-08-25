#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_RECYCLE state and raw RGB evidence."""
from __future__ import annotations

import os
import runpy
from pathlib import Path


# The shared probe reads every source-owned presentation surface: script/task/
# sprite state, software+hardware OAM and matrices, palettes/tags/registers,
# audio, immutable gameplay state, both RNG streams, and raw RGB.  This wrapper
# keeps Recycle's contract narrow without changing the generic collector.
os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "278",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_RECYCLE",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_BRICK_BREAK",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "recycle-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gRecycleSpriteTemplate",
        "gRecycleSpriteAffineAnimCmds",
        "AnimRecycle",
        "AnimRecycle_Step",
        "AnimTask_BlendMonInAndOut",
        "AnimTask_BlendMonInAndOut_Step",
        "Task_LoopAndPlaySE",
    )),
})

runpy.run_path(str(Path(__file__).with_name("sweetScentProbe.py")), run_name="__main__")
