#!/usr/bin/env python3
"""Complete dense Scene-ON MOVE_MEAN_LOOK evidence; run via run-mgba-probe.py."""
import os
import runpy

os.environ.update({
    "POKEBENCH_ANIM_PROBE_MOVE_ID": "212",
    "POKEBENCH_ANIM_PROBE_MOVE_NAME": "Move_MEAN_LOOK",
    "POKEBENCH_ANIM_PROBE_END_NAME": "Move_ROCK_THROW",
    "POKEBENCH_ANIM_PROBE_SCHEMA": "mean-look-dense-evidence/v1",
    "POKEBENCH_ANIM_PROBE_SYMBOLS": ",".join((
        "gMeanLookEyeAffineAnimCmds1",
        "gMeanLookEyeAffineAnimCmds2",
        "gMeanLookEyeSpriteTemplate",
        "AnimMeanLookEye",
        "AnimMeanLookEye_Step1",
        "AnimMeanLookEye_Step2",
        "AnimMeanLookEye_Step3",
        "AnimMeanLookEye_Step4",
        "AnimTask_BlendBattleAnimPal",
    )),
})
runpy.run_path(os.path.join(os.path.dirname(__file__), "sweetScentProbe.py"), run_name="__main__")
