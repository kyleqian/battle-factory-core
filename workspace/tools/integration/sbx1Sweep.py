#!/usr/bin/env python3
"""sbx1: npm run compare over whole battle labs in 256-frame windows; prints matched / total per lab.
usage: sbx1Sweep.py OUTDIR LAB [LAB ...]   (LAB = tools/battle-lab name without .json, e.g. etp1-hail-on)"""
import json, pathlib, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)

def run(job):
    lab, s, e = job
    trace = out / f"{lab}-{s}.json"
    subprocess.run(["python3", str(root / "tools/integration/sbx1MakeTrace.py"), lab, str(s), str(e), str(trace)], check=True)
    r = subprocess.run(["npm", "run", "compare", "--", str(trace), str(out / f"{lab}-{s}-d"), "--summary"], cwd=root, capture_output=True, text=True)
    m = re.search(r"(\d+)/(\d+) frames matched", r.stdout)
    return lab, s, (int(m.group(1)), int(m.group(2))) if m else (0, 0), r.stdout[-300:] if not m else ""

jobs = []
for lab in sys.argv[2:]:
    d = json.load(open(root / "tools/battle-lab" / f"{lab}.json"))
    total = sum(x["frames"] for x in d["trace"]["segments"])
    for s in range(0, total, 256):
        jobs.append((lab, s, min(s + 255, total - 1)))
res = {}
with ThreadPoolExecutor(2) as ex:
    for lab, s, mt, err in ex.map(run, jobs):
        a = res.setdefault(lab, [0, 0]); a[0] += mt[0]; a[1] += mt[1]
        if err: print("ERR", lab, s, err)
for lab, (a, b) in res.items(): print(f"{lab}: {a}/{b} matched ({b - a} differ)")
