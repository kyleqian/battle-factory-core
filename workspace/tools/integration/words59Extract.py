#!/usr/bin/env python3
"""words59: words57Extract.py over words59Probe.JOBS (unchanged extraction). usage (from workspace/): words59Extract.py <out-dir> <units.json>"""
import runpy, sys

sys.path.insert(0, "tools/integration")
import words59Probe  # noqa: F401  (replaces words57Probe.JOBS in place)

runpy.run_path("tools/integration/words57Extract.py", run_name="__main__")
