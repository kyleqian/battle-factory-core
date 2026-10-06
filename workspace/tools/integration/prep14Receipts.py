#!/usr/bin/env python3
"""prep14: compact per-move receipts (fixtures/prep14/receipts/<move>.json) + drafted alternate fixtures (fixtures/prep14/drafts/<scenario>.json, draft: true, consumedByTest: false)
from plans.json / prep14-constants.json / prep14-palette.json / prep14-crosscheck.json.  No emulator, no RGB, no mGBA logs.   usage: prep14Receipts.py"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
F = ROOT / "tools/integration/fixtures/prep14"
plans, consts, pal, cross = (json.loads((F / n).read_text()) for n in ("plans.json", "prep14-constants.json", "prep14-palette.json", "prep14-crosscheck.json"))
(F / "receipts").mkdir(exist_ok=True); (F / "drafts").mkdir(exist_ok=True)
def lcg(x): return (x * 1103515245 + 24691) & 0xFFFFFFFF
def lcgn(x, n):
    for _ in range(n): x = lcg(x)
    return x
for key, m in plans["moves"].items():
    acc = m["player"]
    rec = {"schema": "prep14-receipt/v1", "move": key, "bodyLabel": acc["bodyLabel"], "drawsPerBody": m["drawsPerBody"],
           "determinism": {s: m[s]["determinism"] for s in ("player", "opponent", "alternate")},
           "plan": {"drawsCompressed": acc["drawsCompressed"], "lagAges": acc["lagAges"], "lagFramesBeforeLastDraw": acc["lagFramesBeforeLastDraw"]},
           "accepted": {s: {"scenario": m[s]["scenario"], "activationFrame": m[s]["activationFrame"], "activationValueHex": m[s]["activationValueHex"], "acceptedWindow": m[s]["acceptedWindow"], "consumers": {k: v for k, v in m[s].get("consumers", {}).items() if k != "rows"}} for s in ("player", "opponent")},
           "alternate": {k: v for k, v in m["alternate"].items()},
           "allocator": {"scenarios": consts[key]["scenarios"], "equalToPlayer": consts[key]["equalToPlayer"], "corpusCrossCheck": consts[key]["corpusCrossCheck"]},
           "palette": pal[key]}
    (F / "receipts" / f"{key}.json").write_text(json.dumps(rec, indent=1))
    a = m["alternate"]
    draft = {"draft": True, "consumedByTest": False, "note": "unverified until an adapter exists; window = [activationFrame, activationFrame + rows - 1] (accepted windows start at the activation, offset 0 for all 8 accepted fixtures)",
             "move": key, "scenario": f"tools/battle-lab/{a['scenario']}.json", "activationFrame": a["activationFrame"], "activationValue": a["activationValue"], "activationValueHex": a["activationValueHex"],
             "window": {"startFrame": a["activationFrame"], "frameCount": acc["acceptedWindow"]["rows"]}, "plan": acc["drawsCompressed"], "drawsTotal": a["drawsTotal"], "lagAges": a["lagAges"],
             "expected": {"planShapeIdenticalToAccepted": a["planShapeIdenticalToAccepted"], "replayEqualsObservedWords": a["replayEqualsObservedWords"], "consumers": a.get("consumers")}}
    (F / "drafts" / f"{a['scenario']}.json").write_text(json.dumps(draft, indent=1))
print("ok")
