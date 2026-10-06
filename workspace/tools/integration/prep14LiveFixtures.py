#!/usr/bin/env python3
"""Generate the prep14 live-adapter dense fixtures (Rain Dance, Water Pulse, Hail: accepted + alternate) from prep14-analysis.json.
Window = the scenario's own activation + 0 (prep14 s2), never chosen by matching live output.
usage: prep14LiveFixtures.py   -> tools/integration/fixtures/prep14-live/*.json"""
import json, re
from pathlib import Path
R = Path(__file__).resolve().parents[2]
A = json.loads((R / "tools/integration/fixtures/prep14/prep14-analysis.json").read_text())
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
PROBE = {"RAIN_DANCE": "rainDanceProbe", "WATER_PULSE": "waterPulseProbe", "HAIL": "hailProbe"}
RANDOM2 = {"RAIN_DANCE", "WATER_PULSE"}
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/prep14-live"
out.mkdir(exist_ok=True)
for scen, bodies in A.items():
    for i, b in enumerate(bodies):
        if b["move"] not in PROBE or "factory" in scen: continue
        m = b["monsAtAct"]
        mm = re.match(r"(?:mechanic-[a-z-]+?-(player|opponent)-|prep14-[a-z-]+-alt-)", scen)
        side = mm.group(1) or "player"
        foe = "opponent" if side == "player" else "player"
        sp = {"player": m[0], "opponent": m[1]}
        name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
        fx = {
            "schema": "prep14-live-adapter-fixture/v1",
            "move": b["move"],
            "probe": f"tools/compare/{PROBE[b['move']]}.py",
            "scenario": f"tools/battle-lab/{scen}.json",
            "bodyIndex": i,
            "denseWindow": {"startFrame": b["act"], "endFrame": b["act"] + b["rows"] - 1},
            "windowSource": "prep14 s2: window start = the scenario's own activation frame + the accepted offset 0; rows = the probed first-inactive minus activation",
            "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
            "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
            "attackerPersonality": sp[side]["personality"],
            "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
            "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                             "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
        }
        if b["move"] in RANDOM2:
            fx["presentationRngActivation"] = {"value": b["rng2"], "source": f"tools/integration/fixtures/prep14/prep14-analysis.json {scen}[{i}].rng2 (activation frame {b['act']})"}
        tag = scen.replace("mechanic-", "").replace("prep14-", "")
        (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(tag, fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"])
