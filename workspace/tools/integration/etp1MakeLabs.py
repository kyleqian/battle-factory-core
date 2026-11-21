#!/usr/bin/env python3
"""etp1: write the end-turn print labs (tools/battle-lab/etp1-*-{on,off}.json): a Rattata (Gastly for Curse) user and a Rattata / Chansey target, from
wtl1-rain-player-on.json. Per scenario: user moves (slot order), target level / species / item, number of turns, and the per-turn slot to press.
usage: etp1MakeLabs.py [name ...]"""
import json
import sys
from pathlib import Path

LAB = Path(__file__).parent.parent / "battle-lab"
base_on = json.load(open(LAB / "wtl1-rain-player-on.json"))
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
EV = {k: 0 for k in IV}


def mon(species, level, moves, item=0):
    return {"species": species, "level": level, "nature": 0, "ivs": IV, "evs": EV, "moves": (moves + [moves[0]] * 4)[:4], "ppUps": [0] * 4, "item": item, "abilitySlot": 0}


# name: (user species, user level, user moves, user item, target species, target level, target moves, target item, slot per turn)
S = {
    "sandstorm": (19, 50, [201], 0, 19, 12, [69], 0, [0]),
    "hail": (19, 50, [258], 0, 19, 12, [69], 0, [0]),
    "sun": (19, 50, [241], 0, 19, 12, [69], 0, [0]),
    "sandstorm5": (19, 50, [201], 0, 19, 12, [69], 0, [0] * 5),
    "hail5": (19, 50, [258], 0, 19, 12, [69], 0, [0] * 5),
    "sun5": (19, 50, [241], 0, 19, 12, [69], 0, [0] * 5),
    "rain5": (19, 50, [240], 0, 19, 12, [69], 0, [0] * 5),
    "leechseed": (19, 50, [73], 0, 19, 12, [69], 0, [0]),
    "ingrain": (19, 50, [275], 0, 19, 12, [69], 0, [0]),
    "leftovers": (19, 50, [181], 200, 19, 12, [69], 0, [0]),
    "shellbell": (19, 50, [69], 219, 113, 50, [69], 0, [0]),
    "wrap": (19, 50, [35], 0, 19, 12, [69], 0, [0, 0]),
    "firespin": (19, 50, [83], 0, 19, 12, [69], 0, [0, 0]),
    "whirlpool": (19, 50, [250], 0, 19, 12, [69], 0, [0, 0]),
    "curse": (92, 50, [174], 0, 19, 12, [69], 0, [0]),
    "perish": (19, 50, [195], 0, 19, 12, [69], 0, [0] * 4),
    "futuresight": (19, 50, [248], 0, 19, 12, [69], 0, [0] * 3),
    "wish": (19, 50, [273], 0, 19, 12, [69], 0, [0] * 2),
    "uproar": (19, 50, [253], 0, 113, 50, [69], 0, [0] * 2),
    "taunt": (19, 50, [269], 0, 19, 12, [69], 0, [0] * 3),
    "disable": (19, 50, [50], 0, 19, 12, [69], 0, [0] * 6),
    "encore": (19, 50, [227], 0, 19, 12, [69], 0, [0] * 6),
    "toxic": (19, 50, [92], 0, 19, 12, [69], 0, [0]),
    "willowisp": (19, 50, [261], 0, 19, 12, [69], 0, [0]),
    "poison": (19, 50, [92], 0, 19, 12, [69], 0, [0]),
}
want = sys.argv[1:] or list(S)
for name in want:
    us, ul, um, ui, ts, tl, tm, ti, slots = S[name]
    for scene in ("on", "off"):
        lab = json.loads(json.dumps(base_on))
        lab["profile"] = f"battle-scene-{scene}"
        lab["overrides"]["parties"] = {"player": [mon(us, ul, um, ui)] * 3, "opponent": [mon(ts, tl, tm, ti)] * 3}
        seg = []
        for _ in slots:
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1100, "buttons": []}]
        lab["trace"]["segments"] = seg
        json.dump(lab, open(LAB / f"etp1-{name}-{scene}.json", "w"))
    print("etp1-" + name)
