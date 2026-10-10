#!/usr/bin/env python3
"""prep64: check.json (prep64Check.ts) -> rows-v1 plan rows for spriteOrderProductionTable.ts's appended list (pure python3).

usage (from workspace/): prep64PlanRows.py <check.json> <plan-rows.json>
The row is written only when every instance is exact per frame, every order hand-off is exact, and both holder sides are proven.
"""
import json, sys

check = json.load(open(sys.argv[1]))
r = check["result"]
holders = {s.split(":")[1] for s in r["sides"]}
assert check["notIdenticalAB"] == 0 and r["matched"] == r["instances"] == r["handoffsExact"] > 0 and holders == {"player", "opponent"}, r
assert check["plans"]["general SUBSTITUTE_FADE"] == ""
rows = {"schema": "sprite-order-body-plans/rows-v1",
        "note": "prep64 EXACT plan (docs/next-adapters-prep64.md; receipts units.json / check.json / netzero.json in this directory).",
        "bodies": {},
        "anims": {"General:B_ANIM_SUBSTITUTE_FADE": {
            "verdict": "EXACT-PLAN",
            "rule": "General_SubstituteFade: monbg + AnimTask_SubstituteFadeToInvisible + AnimTask_BlendBattleAnimPal x2 + "
                    "AnimTask_SwapMonSpriteToFromSubstitute; no createsprite, no allocation window (empty plan), Scene ON and OFF",
            "tier": "confirmed",
            "evidence": f"{r['matched']}/{r['instances']} instances exact per frame, hand-offs exact {r['handoffsExact']}, "
                        f"{' '.join(r['sides'])} (prep64 check.json \"general SUBSTITUTE_FADE\")",
            "plan": []}}}
open(sys.argv[2], "w").write(json.dumps(rows, separators=(",", ":")) + "\n")
print("wrote", sys.argv[2])
