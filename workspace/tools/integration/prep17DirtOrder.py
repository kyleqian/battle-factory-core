#!/usr/bin/env python3
"""prep17: sSpriteOrder inputs for Mud-Slap / Sand-Attack: activation order, pre-wave-1 order, the fixture seed literals and where each equals; two fresh runs compared.
usage: prep17DirtOrder.py OUT.json [dirA dirB]"""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1]); DIRS = [Path(x) for x in (sys.argv[2:4] or ["/tmp/p17/r1", "/tmp/p17/r2"])]
ROOT = Path(__file__).resolve().parents[2]
FX = {"mechanic-mud-slap-player-pidgeotto-onix": "mud-slap-player-pidgeotto-onix", "mechanic-sand-attack-player-pidgeotto-onix": "sand-attack-player-pidgeotto-onix",
      "mechanic-mud-slap-pidgeotto-onix": "mud-slap-pidgeotto-onix", "mechanic-sand-attack-pidgeotto-onix": "sand-attack-pidgeotto-onix"}
SC = list(FX) + ["prep12-mud-slap-alt-set156-set146", "prep12-sand-attack-alt-set156-set146"]
runs = []
for D in DIRS:
    out = {}
    for n in SC:
        d = json.load(open(D / f"{n}.json")); b = next(x for x in d["bodies"] if x["move"] in (189, 28)); A = b["start"]
        w1 = min(e["f"] for e in d["spawns"] if e["ev"] == "+" and e["f"] >= A and e["attr"][0] != 160)
        pre = [od for f, od in d["orderSeries"] if f < w1][-1]
        seed = json.load(open(ROOT / f"tools/compare/fixtures/{FX[n]}.json"))["animationProfile"]["spriteOrderSeed"] if n in FX else None
        out[n] = {"A": A, "wave1Row": w1 - A, "activationOrder": b["atActivation"]["spriteOrder"], "preWave1Order": pre, "fixtureSeed": seed,
                  "seedEquals": None if seed is None else ("activation" if seed == b["atActivation"]["spriteOrder"] else "preWave1" if seed == pre else "neither")}
    runs.append(out)
acts = {tuple(c["activationOrder"]) for c in runs[0].values()}; pres = {tuple(c["preWave1Order"]) for c in runs[0].values()}
res = {"identicalAcrossFreshProcesses": runs[0] == runs[1], "activationOrderIdenticalAllSixBodies": len(acts) == 1, "preWave1OrderIdenticalAllSixBodies": len(pres) == 1,
       "activationOrder": list(next(iter(acts))), "preWave1Order": list(next(iter(pres))), "seedEquals": {n: c["seedEquals"] for n, c in runs[0].items()}, "wave1Row": {n: c["wave1Row"] for n, c in runs[0].items()}}
OUT.write_text(json.dumps(res, indent=1) + "\n"); print({k: v for k, v in res.items() if k not in ("activationOrder", "preWave1Order")})
print("diff activation vs preWave1 positions:", [(i, a, p) for i, (a, p) in enumerate(zip(res["activationOrder"], res["preWave1Order"])) if a != p])
