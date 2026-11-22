#!/usr/bin/env python3
"""hie6m: write tools/battle-lab/hie6m-sendin-leftovers-on.json, the player's faint replacement followed by the foe's end-turn Leftovers heal (t2k3 item 3, the +21 class).
Player lead Rattata lv 12 uses Quick Attack (priority: the foe, lv 50 + Leftovers, drops below full HP), then the foe's Seismic Toss faints it; the player picks
the second Rattata on the party screen (A on the faint box, DOWN, A, A) and the end-turn script heals the foe (ItemHealHP_End2 -> General_HeldItemEffect).
usage: hie6mMakeLab.py [PRE]   PRE = idle frames before the faint box's A (default 600); the later gaps are pic7's"""
import json
import sys
from pathlib import Path

LAB = Path(__file__).parent.parent / "battle-lab"
base = json.load(open(LAB / "pic7-player-faint-send-in-on.json"))
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
EV = {k: 0 for k in IV}

def mon(level, move, item=0):
    return {"species": 19, "level": level, "nature": 0, "ivs": IV, "evs": EV, "moves": [move] * 4, "ppUps": [0] * 4, "item": item, "abilitySlot": 0}

pre = int(sys.argv[1]) if len(sys.argv) > 1 else 600
lab = json.loads(json.dumps(base))
lab["overrides"]["parties"] = {"player": [mon(12, 98), mon(50, 69), mon(50, 69)], "opponent": [mon(50, 69, 200)] * 3}
lab["trace"]["segments"] = [
    {"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": pre, "buttons": []},
    {"frames": 2, "buttons": ["A"]}, {"frames": 148, "buttons": []}, {"frames": 2, "buttons": ["DOWN"]}, {"frames": 18, "buttons": []},
    {"frames": 2, "buttons": ["A"]}, {"frames": 28, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1500, "buttons": []},
]
json.dump(lab, open(LAB / "hie6m-sendin-leftovers-on.json", "w"))
print("hie6m-sendin-leftovers-on")
