#!/usr/bin/env python3
"""Every curse source body of a scenario (later-body evidence, lb26): curseProbe.py with REPEATED_BODIES (bodyWindows per body)."""
from __future__ import annotations

import os
import runpy
from pathlib import Path

os.environ.update({"POKEBENCH_ANIM_PROBE_REPEATED_BODIES": "1", "POKEBENCH_ANIM_PROBE_EXTRA_FRAMES": "240"})
runpy.run_path(str(Path(__file__).with_name("curseProbe.py")), run_name="__main__")
