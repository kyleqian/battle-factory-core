#!/usr/bin/env python3
"""Generate the prep17 live-adapter dense fixtures (Mud-Slap, Sand-Attack: player, opponent, alternate) from fresh direct-mGBA
prep13Probe outputs (prep17Run.sh TAG mud sand -> /tmp/p17/TAG/<scenario>.json).  Window = [activation, activation + body rows - 1]
(prep17 s0.2: the accepted fixtures' own windows were not activation-anchored); the pinned activation value is the Random2 state at
the activation frame (the value one LCG step before the first post-activation series entry), never a word array.
usage: prep17LiveFixtures.py [TAGDIR=/tmp/p17/r1]   -> tools/integration/fixtures/prep17-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
TAG = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/p17/r1")
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
INV = pow(1103515245, -1, 2**32)
ROWS = {"MUD_SLAP": 51, "SAND_ATTACK": 58}
CASES = [("MUD_SLAP", "mud-slap-player-pidgeotto-opponent-onix", "mechanic-mud-slap-player-pidgeotto-onix", "player"),
         ("MUD_SLAP", "mud-slap-opponent-pidgeotto-player-onix", "mechanic-mud-slap-pidgeotto-onix", "opponent"),
         ("MUD_SLAP", "mud-slap-alt-onix-nidorina", "prep12-mud-slap-alt-set156-set146", "player"),
         ("SAND_ATTACK", "sand-attack-player-pidgeotto-opponent-onix", "mechanic-sand-attack-player-pidgeotto-onix", "player"),
         ("SAND_ATTACK", "sand-attack-opponent-pidgeotto-player-onix", "mechanic-sand-attack-pidgeotto-onix", "opponent"),
         ("SAND_ATTACK", "sand-attack-alt-onix-nidorina", "prep12-sand-attack-alt-set156-set146", "player")]
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/prep17-live"
out.mkdir(exist_ok=True)
for move, tag, scen, side in CASES:
    p = json.loads((TAG / f"{scen}.json").read_text())
    body = p["bodies"][0]
    A = body["start"]
    m = body["atActivation"]["mons"]
    first = p["rng2Series"][0]
    assert first[0] == A + 1
    value = ((first[1] - 24691) * INV) & 0xFFFFFFFF
    foe = "opponent" if side == "player" else "player"
    sp = {"player": m[0], "opponent": m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    fx = {
        "schema": "prep17-live-adapter-fixture/v1", "move": move,
        "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
        "denseWindow": {"startFrame": A, "endFrame": A + ROWS[move] - 1},
        "windowSource": "prep17 s0.2: window = [activation, activation + body rows - 1] (Mud 51, Sand 58 rows); activation from a fresh prep13Probe run",
        "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
        "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
        "attackerPersonality": sp[side]["personality"],
        "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
        "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                         "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
        "presentationRngActivation": {"value": value, "source": f"prep13Probe {scen} rng2Series[0] (frame {A + 1}) one LCG step back = the value at activation frame {A}"},
    }
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"], hex(value))
