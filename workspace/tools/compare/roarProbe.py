#!/usr/bin/env python3
"""Complete Scene-ON Roar source/hardware/audio/raw-RGB receipt.

The NOISE_LINE recorder is parameterized by the source body so this evidence
cannot be confused with the independently exact Howl implementation.
"""
import os

os.environ["POKEBENCH_ANIM_PROBE_MOVE"] = "46"
os.environ["POKEBENCH_ANIM_PROBE_MOVE_NAME"] = "Move_ROAR"
os.environ["POKEBENCH_ANIM_PROBE_END_NAME"] = "Move_GROWL"
os.environ["POKEBENCH_ANIM_PROBE_SCHEMA"] = "roar-dense-evidence/v1"

from howlProbe import main

main()
