#!/usr/bin/env python3
"""Generate the prep18 Dig live-adapter dense fixtures (accepted player/opponent + FLYGON -> GOLEM alternates on both attacker sides;
setup and unleash body each) from fresh direct-mGBA prep13Probe outputs (/tmp/p18w/a-<scenario>.json).  Window = [activation,
activation + rows - 1] (setup 195, unleash 68; prep18 s1.1, offset 0).  usage: prep17DigFixtures.py [DIR=/tmp/p18w]"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/p18w")
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
CASES = [("dig-player-vibrava-opponent-chansey", "mechanic-dig-player-vibrava-opponent-chansey", "player"),
         ("dig-opponent-vibrava-player-chansey", "mechanic-dig-opponent-vibrava-player-chansey", "opponent"),
         ("dig-alt-player-flygon-opponent-golem", "prep18-dig-alt-flygon-golem", "player"),
         ("dig-alt-opponent-flygon-player-golem", "prep18-dig-altopp-flygon-golem", "opponent")]
ROWS = [195, 68]
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/prep18-live"
out.mkdir(exist_ok=True)
for tag, scen, side in CASES:
    p = json.loads((D / f"a-{scen}.json").read_text())
    bodies = [b for b in p["bodies"] if b["move"] == 91]
    assert len(bodies) == 2
    for i, b in enumerate(bodies):
        A = b["start"]
        m = b["atActivation"]["mons"]
        foe = "opponent" if side == "player" else "player"
        sp = {"player": m[0], "opponent": m[1]}
        name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
        fx = {
            "schema": "prep18-live-adapter-fixture/v1", "move": "DIG", "bodyIndex": i,
            "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
            "denseWindow": {"startFrame": A, "endFrame": A + ROWS[i] - 1},
            "windowSource": "prep18 s1.1: window = [activation, activation + body rows - 1] (setup 195, unleash 68); activation from a fresh prep13Probe run",
            "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
            "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
            "attackerPersonality": sp[side]["personality"],
            "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
            "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                             "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
            "requestFields": {"turn": i},
        }
        if i == 0:
            # BattleScriptFirstChargingTurn prints STRINGID_EMPTYSTRING3 before attackanimation: the setup body shows a blank box.
            fx["messageLines"] = ["", ""]
        if i == 1:
            fx["precedingBodies"] = [{"moveId": 91, "side": side}]
            fx["digUnleashAfterSetup"] = True
        (out / f"{tag}-body{i}.json").write_text(json.dumps(fx, indent=1) + "\n")
        print(tag, i, fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"])
