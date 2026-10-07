#!/usr/bin/env python3
"""prep29: body length = main-loop iterations + lag frames (frames with no RfuMain1 step, 0 gRng2 steps). For every Dive/..../Superpower body of every scenario:
len, lag ages (0-step frames strictly inside A..E-1, age = frame - A), iterations = len - lags. If `iterations` is equal across the 4 scenarios of a move while `len` varies,
the +-1 body length is exactly one optional VBlank overrun (frame-phase) and not a script/duration difference. usage: prep29LagFrames.py STATE_DIR R2_DIR OUT.json"""
import json, sys
from pathlib import Path
SD, RD, OUT = map(Path, sys.argv[1:4])
IDS = {"bonemerang": 155, "eruption": 284, "rapid-spin": 229, "spit-up": 255, "luster-purge": 295, "outrage": 200}
res = {}
for mv, mid in IDS.items():
    rows = []
    for p in sorted(SD.glob("*-r1.json")):
        n = p.name[:-8]
        if not (n.startswith(f"mechanic-{mv}-") or n.startswith(f"prep29-{mv}-alt-")): continue
        d = json.loads(p.read_text()); r = json.loads((RD / p.name).read_text())
        steps = [0] * (r["frames"] + 2)
        for run in r["runs"]:
            for f in range(run["from"], run["to"] + 1): steps[f] = run["steps"]
        for bi, b in enumerate(x for x in d["bodies"] if x["move"] == mid):
            A, E = b["start"], b["end"]
            lags = [f - A for f in range(A, E) if steps[f] == 0]
            rows.append({"scenario": n, "body": bi, "len": E - A, "lagAges": lags, "iterations": E - A - len(lags)})
    res[mv] = rows
    byb = {}
    for x in rows: byb.setdefault(x["body"], []).append((x["len"], len(x["lagAges"]), x["iterations"]))
    print(mv, {b: (sorted({v[0] for v in vs}), sorted({v[1] for v in vs}), sorted({v[2] for v in vs})) for b, vs in byb.items()})
json.dump(res, open(OUT, "w"), indent=0)
