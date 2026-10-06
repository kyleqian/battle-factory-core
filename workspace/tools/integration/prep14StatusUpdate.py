#!/usr/bin/env python3
"""Record the prep14 adapters in docs/animation-integration-live-status.json: Rain Dance 240 / Water Pulse 352 (faithful-random),
Hail 258 (exact; implementedCount). usage: prep14StatusUpdate.py"""
import json, pathlib
p = pathlib.Path(__file__).resolve().parents[2] / "docs/animation-integration-live-status.json"
d = json.loads(p.read_text())
REC = "tools/integration/fixtures/random2-r4-live-receipt.json"
T = "tests/animation/liveRandom2R4MoveAdapters.test.ts"
for id_, move, route in [(240, "MOVE_RAIN_DANCE", "random2-r4/rain-dance/seed2-streak21-slot1-1turn"),
                         (352, "MOVE_WATER_PULSE", "random2-r4/water-pulse/seed7-streak7-slot1-1turn")]:
    d["faithfulRandomAdapters"] = [e for e in d["faithfulRandomAdapters"] if e["id"] != id_]
    d["faithfulRandomAdapters"].append({"id": id_, "move": move, "policy": d["faithfulRandomClaim"]["policy"], "provenance": "surrogate",
        "pinnedProofs": [REC], "surrogateRoutes": [f"{route} ({T})"]})
d["faithfulRandomCount"] = len(d["faithfulRandomAdapters"])
d["implementedAdapters"] = [e for e in d["implementedAdapters"] if e["id"] != 258]
d["implementedAdapters"].append({"move": "MOVE_HAIL", "id": 258, "sourceFieldEvidence": "../" + REC,
    "liveEvidence": ["dense 158/158 zero residual twice fresh through the production live renderer: DELIBIRD -> ONIX accepted both orientations + GLALIE -> GOLEM alternate (window = each scenario's own activation + 0); the ten-entry target table is derived from the anchors (== the accepted literals both orientations), animationRngAtAge0 is an echo (any value renders identically, tested)",
                     "ordinary route 1/0 DELIBIRD slot 3: adapter active every age, following prompt reached, ON/OFF rules/RNG/boundary equal"],
    "remaining": ["a species whose front idle x2 is non-zero at ages 45-100 needs the idle phase (prep14 s1.7, not measured)",
                  "independent arbitrary-species/history framebuffer comparison"]})
d["implementedCount"] = len(d["implementedAdapters"])
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print(d["implementedCount"], d["faithfulRandomCount"])
