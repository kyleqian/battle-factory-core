#!/usr/bin/env python3
"""flat84: ice72Extract.py over flat84KoProbe.JOBS with Flatter 260 a words body too.
ice72: words57Extract.py over ice72Probe.JOBS, with Ice Ball 301 a words body (dense rows + RAM-read draws; prep46Extract.WORDS_MV),
then every body unit gets `bodySpecies` = [gBattleMons[0].species, gBattleMons[1].species] at its first frame (ice72OrderRngProbe.py's
per-frame `species`, run A) and every Ice Ball body `shards` (its second window's creates: 5 / 7 / 9 / 10 = rollout counter 1 / 2 / 3 / 4-5).
usage (from workspace/): flat84KoExtract.py <out-dir> <units.json>"""
import json, runpy, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import flat84KoProbe  # noqa: F401  (replaces words57Probe.JOBS in place)
import prep46Extract

prep46Extract.WORDS_MV.add(301)
prep46Extract.WORDS_MV.add(260)
runpy.run_path("tools/integration/words57Extract.py", run_name="__main__")
out, target = Path(sys.argv[1]), Path(sys.argv[2])
units = json.loads(target.read_text())
for ident, job in units["jobs"].items():
    raw = json.loads((out / "raw" / f"{ident}-A.json").read_text())
    species, first = raw["species"], raw["firstFrame"]
    for unit in job["units"]:
        if unit["kind"] != "body":
            continue
        k = 8 * (unit["frame"] - first)
        unit["bodySpecies"] = [int(species[k:k + 4], 16), int(species[k + 4:k + 8], 16)]
        if unit["mv"] == 301:
            unit["shards"] = len(unit["windows"][1]["C"]) if len(unit["windows"]) > 1 else 0
target.write_text(json.dumps(units, separators=(",", ":"), sort_keys=True) + "\n")
