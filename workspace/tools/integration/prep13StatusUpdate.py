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
 "WATER_SPOUT": (323, ["dense 278/278 (accepted NOSEPASS -> SHUCKLE both orientations, first body) and KINGDRA -> GOLEM alternate (276 rows player-back = attackerSourceHeight 52, 278 opponent-front) zero residual twice fresh",
                       "HP tiers 0..3: body length equals the ROM rows at all 12 tier bodies (278/270/254/229|230/204|206/204|201); dense tier-0 bodies (HP 17/137) 201/201 + 204/204 zero residual twice fresh; tier 1/2 and the lower-HP tier-3 bodies (not first bodies, order lent from the first-body plan) keep 16..298 px residual in the launch-orb rows 55..71 (see receipt): not claimed",
                       "ordinary route 83/14 WAILMER (not a first body: order lent after the opponent's Flail): adapter active every age, following prompt reached, ON/OFF rules/RNG/boundary equal"],
                      ["declines unless the tracked sprite order is lent",
                       "dense proof of HP tiers 1-2 and lower-HP tier-3 bodies needs the true multi-body order lend (tier scenarios hold a Toxic body between each Water Spout)",
                       "independent arbitrary-species/history framebuffer comparison"]),
 "HIDDEN_POWER": (237, ["dense 180/180 zero residual twice fresh, all six Unown bodies: accepted UNOWN_H player / UNOWN_E opponent -> ONIX, UNOWN -> GOLEM alternates (both orientations), and a second personality (UNOWN_F player / UNOWN_G opponent -> ONIX); the attacker sprite origin and orbit centre come from the personality's LETTER-form pic coords (hiddenPowerUnownFormIndex), the eighth scatter orb y from the target's pic-offset anchor",
                         "no ordinary-input route: FRONTIER_MON_UNOWN is never a generated rental (prep13 s2); Unown opponents are not searched"],
                        ["Unown attacker only (the reducer's uninitialised eighth orb is Unown-specific; any other attacker declines to the scene-off view); letter forms 26/27 (!, ?) decline",
                         "declines unless the tracked sprite order is lent", "independent arbitrary-species/history framebuffer comparison"]),
}
for move in sys.argv[1:]:
    id_, live, remaining = E[move]
    d["implementedAdapters"] = [e for e in d["implementedAdapters"] if e["id"] != id_]
    d["implementedAdapters"].append({"move": "MOVE_" + move, "id": id_, "sourceFieldEvidence": REC, "liveEvidence": live, "remaining": remaining})
d["implementedCount"] = len(d["implementedAdapters"])
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
print(d["implementedCount"])
