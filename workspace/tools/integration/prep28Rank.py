#!/usr/bin/env python3
"""prep28: rank Factory moves whose (move, side) bodies are not in SPRITE_ORDER_PRODUCTION_BODIES by census weight (pure python3).
usage (from workspace/): python3 tools/integration/prep28Rank.py [OUT.json]"""
import json, re, sys
sys.path.insert(0, "tools/integration")
import spriteOrderPlanCoverageRank as R
src = (R.ROOT / "src/engine/spriteOrderProductionPlans.ts").read_text()
bodies = set(re.findall(r'"(\d+:(?:opponent|player))":\s*\d+', src[src.index("SPRITE_ORDER_PRODUCTION_BODIES"):src.index("SPRITE_ORDER_PRODUCTION_ANIMS")]))
plans = json.loads((R.FIX / "sprite-order-body-plans-ext.json").read_text())
w = R.weights(); names = {v: k for k, v in R.move_ids().items()}
# live adapter ids = LIVE_MOVE_ANIMATION_IDS of the plan json (liveIds)
live = set(plans["liveIds"])
rows = []
for m, x in w.items():
    for s in ("opponent", "player"):
        if f"{m}:{s}" in bodies: continue
        rows.append({"move": m, "name": names[m], "side": s, "weight": round(x, 5), "verdict": R.verdict(plans, m, s), "live": m in live,
                     "reason": (plans["bodies"].get(f"{m}:{s}") or {}).get("reason") or (plans["bodies"].get(f"{m}:{s}") or {}).get("why")})
rows.sort(key=lambda r: -r["weight"])
tot = sum(w.values()) * 2
out = {"unplannedWeightShare": round(sum(r["weight"] for r in rows) / tot, 4), "cells": len(rows), "rows": rows}
if len(sys.argv) > 1: open(sys.argv[1], "w").write(json.dumps(out, indent=1) + "\n")
print(out["unplannedWeightShare"], out["cells"])
for r in rows[:40]: print(r["move"], r["name"], r["side"], r["weight"], r["verdict"], r["live"], r["reason"])
