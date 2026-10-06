#!/usr/bin/env python3
"""Record prep13 exact adapters in docs/animation-integration-live-status.json (implementedAdapters, implementedCount).
usage: prep13StatusUpdate.py ICE_BEAM|WATER_SPOUT|HIDDEN_POWER ...   (Hyper Beam is faithful-random: recorded by hand/other script)"""
import json, sys, pathlib
p = pathlib.Path(__file__).resolve().parents[2] / "docs/animation-integration-live-status.json"
d = json.loads(p.read_text())
REC = "../tools/integration/fixtures/prep13-live-adapter-receipt.json"
E = {
 "ICE_BEAM": (58, ["dense 203/203 zero residual twice fresh through the production live renderer: NINCADA -> SHUCKLE accepted both orientations + LAPRAS -> GOLEM alternate both orientations (window = each scenario's own activation + 0)",
                   "ordinary routes 0/14 DELCATTY slot 3 and 1/14 DUNSPARCE slot 0 (first body, order known): adapter active every age, following prompt reached, ON/OFF rules/RNG/boundary equal"],
              ["declines (scene-off fallback) unless the tracked sprite order is lent (first body / tracked)",
               "independent arbitrary-species/history framebuffer comparison"]),
 "WATER_SPOUT": (323, [], []),
 "HIDDEN_POWER": (237, [], []),
}
for move in sys.argv[1:]:
    id_, live, remaining = E[move]
    d["implementedAdapters"] = [e for e in d["implementedAdapters"] if e["id"] != id_]
    d["implementedAdapters"].append({"move": "MOVE_" + move, "id": id_, "sourceFieldEvidence": REC, "liveEvidence": live, "remaining": remaining})
d["implementedCount"] = len(d["implementedAdapters"])
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print(d["implementedCount"])
