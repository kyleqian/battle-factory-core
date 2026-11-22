#!/usr/bin/env python3
"""hie5: write the held-item-effect-after-a-body labs (tools/battle-lab/hie5-*.json): a Rattata pair, the player (level 50) uses Seismic Toss first, the foe (level 40, Leftovers)
uses MOVE second, one turn; the end-turn Leftovers heal (General_HeldItemEffect) then follows MOVE's body.
usage: hie5MakeLabs.py"""
import json
from pathlib import Path

LAB = Path(__file__).parent.parent / "battle-lab"
base = json.load(open(LAB / "hie1-leftovers-on.json"))
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
EV = {k: 0 for k in IV}

def mon(level, move, item=0, gender=None):
    m = {"species": 19, "level": level, "nature": 0, "ivs": IV, "evs": EV, "moves": [move] * 4, "ppUps": [0] * 4, "item": item, "abilitySlot": 0}
    if gender:
        m["gender"] = gender
    return m

MOVES = {"yawn": 281, "curse": 174, "detect": 197, "doubleedge": 38, "bubblebeam": 61, "swordsdance": 14}
for name, mv in MOVES.items():
    lab = json.loads(json.dumps(base))
    lab["overrides"]["parties"] = {"player": [mon(50, 69)] * 3, "opponent": [mon(40, mv, 200)] * 3}
    lab["trace"]["segments"] = [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1500, "buttons": []}]
    json.dump(lab, open(LAB / f"hie5-{name}-foe-on.json", "w"))
    print(f"hie5-{name}-foe-on")
