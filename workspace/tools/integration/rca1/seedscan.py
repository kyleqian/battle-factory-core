#!/usr/bin/env python3
"""rca1: find lab seeds whose ROM run reaches a script label (e.g. a 10% secondary effect), with the script-row probe only (~9 s / seed).
python3 tools/integration/rca1/seedscan.py BASE_LAB.json OUTDIR LABEL FIRST LAST [--profile on|off]
Writes OUTDIR/<seed>.lab.json / .rom.json and prints 'HIT seed' for each seed whose rows contain LABEL."""
import json, subprocess, sys, os
base, out, label, first, last = sys.argv[1:6]
profile = sys.argv[sys.argv.index("--profile") + 1] if "--profile" in sys.argv else "on"
os.makedirs(out, exist_ok=True)
lab = json.load(open(base))
for seed in range(int(first), int(last) + 1):
    lab["seed"] = seed
    lp, rp = f"{out}/{seed}.lab.json", f"{out}/{seed}.rom.json"
    json.dump(lab, open(lp, "w"))
    subprocess.run(["python3", "tools/run-mgba-probe.py", rp, "--", "python3", "tools/integration/hcr3mProbe.py", rp, lp, "--profile", profile],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    hit = os.path.exists(rp) and label in open(rp).read()
    print(("HIT " if hit else "miss ") + str(seed), flush=True)
