#!/usr/bin/env python3
"""prep17: drafted (NOT accepted, `draft: true`) alternate-species fixtures for Mud-Slap / Sand-Attack from the direct-mGBA track (first-row data[1..2] = xStep/yStep, slot) -- the
fields of tools/compare/fixtures/{mud-slap,sand-attack}-player-pidgeotto-onix.json `animationProfile`, plus the dense window in script rows. usage: prep17Draft.py [dir=/tmp/p17/r1]"""
import json, sys
from pathlib import Path
D = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/p17/r1")
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / "tools/integration/fixtures/prep17"
ORDER = json.load(open(OUT / "dirt-order-receipt.json"))
for move, key, scen, bodyLen in (("mud-slap", "mud", "prep12-mud-slap-alt-set156-set146", 51), ("sand-attack", "dirt", "prep12-sand-attack-alt-set156-set146", 58)):
    p = json.load(open(D / f"{scen}.json")); t = json.load(open(D / f"track-{scen}.json")); A = t["A"]
    dirt = sorted((e for e in p["spawns"] if e["ev"] == "+" and e["f"] >= A and e["attr"][0] != 160 and e["f"] <= A + 40), key=lambda e: (e["f"], e["slot"]))
    prof = [{"slot": e["slot"], "xStep": t["rows"][str(e["f"] - A)][str(e["slot"])][4][1], "yStep": t["rows"][str(e["f"] - A)][str(e["slot"])][4][2]} for e in dirt]
    seed = ORDER["preWave1Order"] if key == "mud" else ORDER["activationOrder"]
    (OUT / f"draft-{move}-alt-set156-set146.json").write_text(json.dumps({
        "draft": True, "schema": "prep17-draft-fixture/v1", "move": move.upper().replace("-", "_"), "scenario": f"tools/battle-lab/{scen}.json",
        "source": "direct mGBA (tools/integration/prep17Run.sh + prep17Draft.py), two fresh-process runs identical; NOT compared against production pixels",
        "activation": A, "bodyRows": bodyLen, "denseWindowScriptRows": {"startRow": 0, "endRow": bodyLen - 1}, "denseWindowAbsoluteFrames": {"startFrame": A, "endFrame": A + bodyLen - 1},
        "anchors": t["anchors"], "sourceMinusAttackerSprite": [15, 23], "targetMinusSource": [176 - 87, t["anchors"]["battlerXY"][1][1] - 103],
        "animationProfile": {"spriteOrderSeed": seed, key: prof}}, separators=(",", ":")) + "\n")
    print(move, A, len(prof), prof[:2])
