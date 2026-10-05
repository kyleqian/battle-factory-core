#!/usr/bin/env python3
"""Exports the OBSERVED per-frame sSpriteOrder (restricted to the effect-slot pool 3..23) over each target body's window, plus the
creation sequence, for the order-sensitivity comparison (orderConsumerTruth.mjs).  Pure python (reads committed raw rows).
usage (from workspace/): python3 tools/integration/orderConsumerObserved.py   -> fixtures/order-consumer-observed.json"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/integration"))
import spriteOrderEventModel as M
FIX = ROOT / "tools/integration/fixtures"
POOL = set(range(3, 24))
MOVES = {52: "ember", 82: "dragon-rage", 215: "heal-bell", 195: "perish-song", 348: "leaf-blade"}
out = {"schema": "order-consumer-observed/v1", "pool": sorted(POOL), "scenarios": {}}
seeds = json.loads((FIX / "order-consumer-seeds.json").read_text())["scenarios"]
for s in seeds:
    if s["move"] not in MOVES or not s.get("providerValid"): continue
    name = s["file"]
    for d in (FIX / "sprite-order-event-raw", FIX / "order-consumer-raw"):
        if (d / name).exists(): path = d / name
    dd, rows = M.load(path)
    seq = dict(M.frames_of(rows, dd["lastFrame"]))
    n0 = s["bodyFrame"]
    frames = {}
    for n in range(n0 - 2, n0 + 300):
        r = seq.get(n)
        if r is None: break
        frames[n - n0] = {"order": [x for x in r["order"] if x in POOL], "mask": [x for x in range(3, 24) if r["mask"] >> x & 1]}
    out["scenarios"][s["scenario"]] = {"move": s["move"], "bodyFrame": n0, "attackerSide": s["attackerSide"], "createFrames": s["createFrames"],
                                       "allocSlotsInCreationOrder": s["allocSlotsInCreationOrder"], "frames": frames}
(FIX / "order-consumer-observed.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
print({k: len(v["frames"]) for k, v in out["scenarios"].items()})
