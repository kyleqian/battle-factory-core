#!/usr/bin/env python3
"""prep18: compact per-move receipts (fixtures/prep18/receipts/<move>.json) + drafted alternate fixtures (fixtures/prep18/drafts/<scenario>.json, draft: true,
consumedByTest: false) from plans.json / prep18-constants.json / prep18-crosscheck.json / prep18-geometry.json / prep18-activation.json.  No emulator, no RGB, no mGBA logs."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
F = ROOT / "tools/integration/fixtures/prep18"
plans, consts, cross, geo, act = (json.loads((F / n).read_text()) for n in ("plans.json", "prep18-constants.json", "prep18-crosscheck.json", "prep18-geometry.json", "prep18-activation.json"))
(F / "receipts").mkdir(exist_ok=True); (F / "drafts").mkdir(exist_ok=True)
FAM = {"dig": ["dig"], "megahorn": ["megahorn"], "will-o-wisp": ["will-o-wisp"], "fury-cutter": ["fury-cutter"], "return": ["return", "return-weak", "return-medium", "return-strong"], "pursuit": ["pursuit"]}
ALT = {"dig": "prep18-dig-alt-flygon-golem", "megahorn": "prep18-megahorn-alt-heracross-golem", "will-o-wisp": "prep18-will-o-wisp-alt-banette-golem", "fury-cutter": "prep18-fury-cutter-alt-scyther-golem",
       "return": "prep18-return-alt-snorlax-golem", "pursuit": "prep18-pursuit-alt-umbreon-golem"}
for move, variants in FAM.items():
    rec = {"schema": "prep18-receipt/v1", "move": move, "random2Draws": 0, "variants": {}}
    for v in variants:
        pv = {s: {"scenario": plans[f"{v}-{s}"]["scenario"], "probeRunsIdentical": plans[f"{v}-{s}"]["probeRunsIdentical"], "runsSha1": plans[f"{v}-{s}"]["runsSha1"], "callers": plans[f"{v}-{s}"]["callers"],
                  "bodies": [{k: b[k] for k in ("bodyIndex", "activationFrame", "rows", "label", "activationValueHex", "activationEqualsCorpusRow0", "lagAges", "planEqualsCorpusPerRow")} for b in plans[f"{v}-{s}"]["bodies"]]} for s in ("player", "opponent")}
        rec["variants"][v] = {"plans": pv, "allocator": {b: {"equalToPlayer": e["equalToPlayer"], "corpusCrossCheck": e["corpusCrossCheck"], "scenarios": e["scenarios"]} for b, e in consts[v].items()}}
    if move in plans and False: pass
    rec["alternate"] = plans[f"{move}-player"].get("alternate"); rec["alternateOpponent"] = plans[f"{move}-opponent"].get("alternateOpponent")
    rec["geometry"] = {sc: [{k: r[k] for k in ("move", "bodyIndex", "act", "spriteXYEqual", "idleEqual")} for r in rows] for sc, rows in geo.items() if sc.startswith((f"mechanic-{move}-", f"prep18-{move}-"))}
    (F / "receipts" / f"{move}.json").write_text(json.dumps(rec, indent=1))
    for side, key in (("player", "alternate"), ("opponent", "alternateOpponent")):
        a = rec[key]
        for b, ab in zip(plans[f"{move}-{side}"]["bodies"], a["bodies"]):
            draft = {"draft": True, "consumedByTest": False, "note": "unverified until an adapter exists; window = [activationFrame, activationFrame + rows - 1] (accepted windows start at the activation, offset 0)",
                     "move": move, "attackerSide": side, "bodyIndex": b["bodyIndex"], "scenario": f"tools/battle-lab/{a['scenario']}.json", "activationFrame": ab["activationFrame"], "activationValueHex": ab["activationValueHex"],
                     "window": {"startFrame": ab["activationFrame"], "frameCount": b["rows"]}, "plan": [], "drawsTotal": 0, "lagAges": ab["lagAges"], "expected": {"planShapeIdenticalToAccepted": ab["sameLagAgesAsAccepted"], "random2Draws": 0}}
            (F / "drafts" / f"{a['scenario']}-body{b['bodyIndex']}.json").write_text(json.dumps(draft, indent=1))
print("ok")
