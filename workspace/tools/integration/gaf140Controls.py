#!/usr/bin/env python3
"""gaf140: controls.json from the three gaf140Compare.ts control outputs (<dir>/compare-{prefix,gate-1,gate+1}.json) and probe-sha256.json
from gaf140Probes.sh's <rom-dir>/probes/r{1,2}.
usage: gaf140Controls.py <compare-dir> <rom-dir> <out-dir>
"""
import hashlib, json, os, sys

S, R, F = sys.argv[1:4]
sha = {}
for n in sorted(os.listdir(f"{R}/probes/r1")):
    if n.endswith(".json"):
        sha[n] = {r: hashlib.sha256(open(f"{R}/probes/{r}/{n}", "rb").read()).hexdigest() for r in ("r1", "r2")}
json.dump(sha, open(f"{F}/probe-sha256.json", "w"), indent=1)
open(f"{F}/probe-sha256.json", "a").write("\n")
ctl = {}
for n in ("prefix", "gate-1", "gate+1"):
    d = json.load(open(f"{S}/compare-{n}.json"))
    ctl[n] = {"summary": d["summary"], "windows": {k: {"px": v["fullScreen"]["px"], "gateRowsPx": v["gateRows"]["px"], "firstBad": v["rows"]["firstBad"]}
                                                   for k, v in d.items() if k != "summary"}}
json.dump(ctl, open(f"{F}/controls.json", "w"), indent=1)
open(f"{F}/controls.json", "a").write("\n")
print({k: (v["summary"]["zeroPxWindows"], v["summary"]["gateRowsZeroPxWindows"]) for k, v in ctl.items()})
