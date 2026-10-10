#!/usr/bin/env python3
"""st76: statused-battler scenarios for the Dive 291 (setup + attack) and Meteor Mash 309 live gates (docs/st76-status-gates.md).
Every status is staged by a REAL move before the body (no injected state): Toxic 92 / Will-O-Wisp 261 / Thunder Wave 86 by the foe on
the attacker, the attacker's own turn-1 Toxic on the target (move slot 0; the body's move is slot 1, picked with RIGHT), or the target's
own Rest 156 after the first hit (SLP; the Dive Rest user is SNORLAX: the attack KOs ONIX). The status-inflicting lead gets speed IV 31 / EV 252 ("fast") so it moves first. Lab seed pinned
(ISSUES #154). Bases: the accepted mechanic-dive-* / mechanic-meteor-mash-* lab scenarios.
usage: st76Scenarios.py  -> tools/integration/fixtures/st76/scenarios/<id>.json"""
import json
from pathlib import Path
LAB = Path("tools/battle-lab")
OUT = Path("tools/integration/fixtures/st76/scenarios")
SEED = 305420547
DP, DO = "mechanic-dive-player-chinchou-opponent-onix", "mechanic-dive-opponent-chinchou-player-onix"
MP, MO = "mechanic-meteor-mash-player-metang-opponent-onix", "mechanic-meteor-mash-opponent-metang-player-onix"
LANTURN, GOLEM, METAGROSS, SNORLAX = 171, 76, 400, 143
TOXIC, WILL_O_WISP, THUNDER_WAVE, REST, DIVE, METEOR_MASH = 92, 261, 86, 156, 291, 309
def turn(idle):
    return [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": idle, "buttons": []}]
def turn_slot1(idle):
    return [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["RIGHT"]}, {"frames": 10, "buttons": []},
            {"frames": 2, "buttons": ["A"]}, {"frames": idle, "buttons": []}]
IDLE = [{"frames": 1500, "buttons": []}]
# (id, base, ops, trace); ops: ("moves", side, [m0..m3]) / ("species", side, sp) / ("fast", side)
JOBS = [
    ("dive-ply-psn-atk", DP, [("moves", "opponent", [TOXIC] * 4), ("fast", "opponent")], turn(900) + IDLE),
    ("dive-opp-brn-atk", DO, [("moves", "player", [WILL_O_WISP] * 4), ("fast", "player")], turn(900) + turn(1500)),
    ("dive-ply-psn-tgt", DP, [("species", "player", LANTURN), ("species", "opponent", GOLEM), ("moves", "player", [TOXIC] + [DIVE] * 3)],
     turn(900) + turn_slot1(1800)),
    ("dive-opp-slp-tgt", DO, [("species", "player", SNORLAX), ("moves", "player", [REST] * 4), ("fast", "player")], turn(900) * 3 + turn(1500)),
    ("mm-ply-prz-atk", MP, [("moves", "opponent", [THUNDER_WAVE] * 4), ("fast", "opponent")], turn(900) + turn(1200)),
    ("mm-opp-brn-atk", MO, [("moves", "player", [WILL_O_WISP] * 4), ("fast", "player")], turn(900) + turn(1200)),
    ("mm-ply-psn-tgt", MP, [("species", "player", METAGROSS), ("species", "opponent", GOLEM), ("moves", "player", [TOXIC] + [METEOR_MASH] * 3)],
     turn(900) + turn_slot1(1200)),
    ("mm-opp-slp-tgt", MO, [("moves", "player", [REST] * 4), ("fast", "player")], turn(900) + turn(1200)),
]
OUT.mkdir(parents=True, exist_ok=True)
for ident, base, ops, trace in JOBS:
    data = json.loads((LAB / f"{base}.json").read_text())
    data["seed"] = SEED
    for op in ops:
        lead = data["overrides"]["parties"][op[1]][0]
        if op[0] == "moves":
            lead["moves"] = list(op[2])
        elif op[0] == "species":
            lead["species"] = op[2]
        elif op[0] == "fast":
            lead["ivs"]["speed"] = 31
            lead["evs"] = {"hp": 255, "attack": 0, "defense": 0, "speed": 252, "spAttack": 0, "spDefense": 0}
        else:
            raise ValueError(op)
    data["trace"] = {"segments": trace}
    path = OUT / f"{ident}.json"
    path.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    print(path)
