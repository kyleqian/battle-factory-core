#!/usr/bin/env python3
"""Complete dense Scene-ON MOVE_SMELLING_SALT evidence."""
import os
import runpy

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "265",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_SMELLING_SALT",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_FOLLOW_ME",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "smelling-salt-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gSmellingSaltsHandSpriteTemplate",
        "gSmellingSaltExclamationSpriteTemplate",
        "AnimSmellingSaltsHand",
        "AnimSmellingSaltsHand_Step",
        "AnimSmellingSaltExclamation",
        "AnimSmellingSaltExclamation_Step",
        "AnimTask_SmellingSaltsSquish",
        "AnimTask_SmellingSaltsSquish_Step",
        "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step",
    )),
})
runpy.run_path(os.path.join(os.path.dirname(__file__), "sweetScentProbe.py"), run_name="__main__")
