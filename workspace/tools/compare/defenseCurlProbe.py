#!/usr/bin/env python3
"""Complete dense Scene-ON MOVE_DEFENSE_CURL evidence; run via run-mgba-probe.py."""
import os
import runpy

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "111",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_DEFENSE_CURL",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_PROTECT",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "defense-curl-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gEclipsingOrbSpriteTemplate",
        "gEclipsingOrbAnimCmds",
        "AnimSpriteOnMonPos",
        "AnimTask_DefenseCurlDeformMon",
        "DefenseCurlDeformMonAffineAnimCmds",
    )),
})
runpy.run_path(os.path.join(os.path.dirname(__file__), "sweetScentProbe.py"), run_name="__main__")
