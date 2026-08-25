#!/usr/bin/env python3
"""Complete dense Scene-ON MOVE_INGRAIN evidence; run via run-mgba-probe.py."""
import os
import runpy

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "275",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_INGRAIN",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_PRESENT",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "ingrain-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gIngrainRootAnimCmds1",
        "gIngrainRootAnimCmds2",
        "gIngrainRootAnimCmds3",
        "gIngrainRootAnimCmds4",
        "gIngrainRootAnimTable",
        "gIngrainRootSpriteTemplate",
        "gIngrainOrbAnimCmds",
        "gIngrainOrbAnimTable",
        "gIngrainOrbSpriteTemplate",
        "AnimIngrainRoot",
        "AnimRootFlickerOut",
        "AnimIngrainOrb",
    )),
})
runpy.run_path(os.path.join(os.path.dirname(__file__), "sweetScentProbe.py"), run_name="__main__")
