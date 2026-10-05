#!/usr/bin/env python3
"""prep9: per move, across every prep9 scenario of that move aligned at activation, which palette banks (BG0..15 / OBJ0..15, unfaded and faded) ever differ at the same body age, and which banks change during the body in each scenario.
usage (workspace root): python3 tools/integration/prep9BankVariance.py [run=r1] > tools/integration/fixtures/prep9-bank-variance.json"""
import json, glob, sys, collections
from pathlib import Path
RUN = sys.argv[1] if len(sys.argv) > 1 else "r1"; FX = Path("tools/integration/fixtures")
by = collections.defaultdict(dict)
for f in glob.glob(str(FX / f"prep9-probes/{RUN}/*.json")):
    d = json.load(open(f))
    if d["activation"] is not None: by[d["move"]][Path(f).stem] = d
nm = lambda b: f"BG{b}" if b < 16 else f"OBJ{b - 16}"
out = {"run": RUN, "moves": {}}
for mv, runs in sorted(by.items()):
    L = min(d["end"] - d["activation"] for d in runs.values()); r = {"scenarios": len(runs), "alignedAges": L, "varyingAcrossScenarios": {}, "changedDuringBody": {}}
    for b in range(32):
        for kind in ("unfaded", "faded"):
            ages = [a for a in range(L) if len({runs_d["series"][str(runs_d["activation"] + a)][kind][b] for runs_d in runs.values()}) > 1]
            if ages: r["varyingAcrossScenarios"][f"{nm(b)}.{kind}"] = {"ages": len(ages), "first": ages[0], "last": ages[-1]}
    r["constantAcrossScenariosAtEveryAge"] = [nm(b) for b in range(32) if f"{nm(b)}.unfaded" not in r["varyingAcrossScenarios"] and f"{nm(b)}.faded" not in r["varyingAcrossScenarios"]]
    for n, d in runs.items():
        S = d["series"]; a0 = d["activation"]
        r["changedDuringBody"][n] = [nm(b) for b in range(32) if len({S[str(a0 + a)]["faded"][b] for a in range(d["end"] - a0)}) > 1]
    r["changedFadedUnionOverScenarios"] = sorted(set(sum(r["changedDuringBody"].values(), [])))
    out["moves"][str(mv)] = r
print(json.dumps(out, indent=1))
