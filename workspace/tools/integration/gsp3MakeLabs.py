#!/usr/bin/env python3
# NOTE: superseded for new work by tools/integration/labCompare.sh (one ROM probe + engine + aligned SE table tool); kept because receipts reference it.
"""gsp3: write the status-script labs (tools/battle-lab/gsp3-*.json): a Rattata pair, one side uses a status move every turn, the other Seismic Toss (69).
The user is level 50 and the target level 12 (user first) or the user level 100 and the target level 50 (foe uses it, still first); 3 turns of A, 18, A, 1000.
usage: gsp3MakeLabs.py"""
import json
from pathlib import Path

base = json.load(open(Path(__file__).parent.parent / "battle-lab/bdt1-rest3-player-on.json"))
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
EV = {k: 0 for k in IV}

def mon(level, move, gender=None):
    m = {"species": 19, "level": level, "nature": 0, "ivs": IV, "evs": EV, "moves": [move] * 4, "ppUps": [0] * 4, "item": 0, "abilitySlot": 0}
    if gender:
        m["gender"] = gender
    return m

MOVES = {"toxic": (92, None, None), "willowisp": (261, None, None), "sleeppowder": (79, None, None), "attract": (213, "male", "female")}
for name, (mv, g_user, g_target) in MOVES.items():
    for side in ("player", "foe"):
        lab = json.loads(json.dumps(base))
        user_level, target_level = (50, 12) if side == "player" else (100, 50)
        user = [mon(user_level, mv, g_user)] + [mon(user_level, mv, g_user)] * 2
        target = [mon(target_level, 69, g_target)] + [mon(target_level, 69, g_target)] * 2
        lab["overrides"]["parties"] = {"player": user, "opponent": target} if side == "player" else {"player": target, "opponent": user}
        seg = []
        for _ in range(3):
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1000, "buttons": []}]
        lab["trace"]["segments"] = seg
        json.dump(lab, open(Path(__file__).parent.parent / f"battle-lab/gsp3-{name}-{side}-on.json", "w"))
        print(f"gsp3-{name}-{side}-on")
