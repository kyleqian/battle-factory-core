#!/usr/bin/env python3
"""ctl95: prep40Probe.py run UNCHANGED except for its raw-RGB tail: RGB is kept for every animation row and the <tail> rows after
each (prep40Probe.py keeps 6). The production accepted windows of GrassWhistle (225 rows) / Recover (activation + 10) / Focus Punch
reach past a 6-row tail when aligned at their accepted age 0 (docs/ctl95-doll-free-controls.md). Everything else (RAM rows, sha256 of
every frame, the scenario) is prep40Probe.py's own code, read from disk and executed with that one literal replaced.

usage: ctl95Probe.py <tail> <scenario.json> <output.json> <rgb-dir>
"""
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit("usage: ctl95Probe.py <tail> <scenario.json> <output.json> <rgb-dir>")
tail = int(sys.argv[1])
prep40 = Path(__file__).resolve().with_name("prep40Probe.py")
source = prep40.read_text()
if source.count("tail[0] = 6") != 1:
    raise SystemExit("prep40Probe.py tail literal moved; update ctl95Probe.py")
sys.argv = [str(prep40), *sys.argv[2:]]
exec(compile(source.replace("tail[0] = 6", f"tail[0] = {tail}"), str(prep40), "exec"), {"__name__": "__main__", "__file__": str(prep40)})
