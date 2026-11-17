#!/usr/bin/env python3
"""adp1: stage Withdraw / Rock Smash / Beat Up mechanicLab scenarios (Scene ON) from the trf174 template.
usage: adp1Scenarios.py  -> writes tools/battle-lab/adp1-<move>-<side>.json (attacker leads its side with the move x4)."""
import copy, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
tpl = json.loads((ROOT / "tools/battle-lab/trf174-on-player-ditto-golbat.json").read_text())
MOVES = {"withdraw": (110, 9, 95), "rock-smash": (249, 57, 95), "beat-up": (251, 57, 95)}
SIDES = ("player", "opponent")

def mon(species, move, fast):
    m = copy.deepcopy(tpl["overrides"]["parties"]["player"][0])
    m.update(species=species, moves=[move] * 4, gender="male")
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"].update(speed=252 if fast else 0, defense=0 if fast else 252)
    return m

for name, (move, att, tgt) in MOVES.items():
    for side in SIDES:
        s = copy.deepcopy(tpl)
        s["profile"] = "battle-scene-on"
        a, t = mon(att, move, True), mon(tgt, 33, False)
        p, o = (a, t) if side == "player" else (t, a)
        # the attacker uses the move; the other side Tackles; moves for the non-attacker stay Tackle x4
        s["overrides"]["parties"]["player"][0] = p
        s["overrides"]["parties"]["opponent"][0] = o
        (ROOT / f"tools/battle-lab/adp1-{name}-{side}.json").write_text(json.dumps(s, separators=(",", ":")))
        print(name, side)
