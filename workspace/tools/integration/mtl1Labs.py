#!/usr/bin/env python3
# mtl1Labs: write tools/battle-lab/mtl1-<kind>-leech-s<seed>-<scene>.json (a Leech Seed tick behind a successful Confuse Ray / Pain Split / another script).
# Usage: mtl1Labs.py KIND SEED SCENE  (KIND: confray | painsplit; SCENE: on | off)
# Player Snorlax [Leech Seed, Confuse Ray, Pain Split, Pain Split] vs a faster level-50 Rattata that only knows Seismic Toss: turn 1 seeds the foe, turn 2's
# last action (the player's, the foe is faster) is the move under test, then the end-of-turn Leech Seed drain.
import json, sys
kind, seed, scene = sys.argv[1], int(sys.argv[2]), sys.argv[3]
base = json.load(open("tools/battle-lab/etk1-leech-hold-%s.json" % scene))
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
EV = {k: 0 for k in IV}
def mon(species, moves):
    return {"species": species, "level": 50, "nature": 0, "ivs": IV, "evs": EV, "moves": moves, "ppUps": [0] * 4, "item": 0, "abilitySlot": 0}
base["seed"] = seed
base["overrides"]["parties"] = {"player": [mon(143, [73, 109, 220, 220]), mon(143, [2] * 4), mon(143, [2] * 4)],
                                "opponent": [mon(19, [69] * 4), mon(19, [69] * 4), mon(19, [69] * 4)]}
move_buttons = {"confray": "RIGHT", "painsplit": "DOWN"}[kind]
seg = lambda f, b=(): {"frames": f, "buttons": list(b)}
turn1 = [seg(2, "A"), seg(18), seg(2, "A"), seg(1150)]
turn2 = [seg(2, "A"), seg(18), seg(2, [move_buttons]), seg(10), seg(2, "A"), seg(1300)]
base["trace"] = {"segments": turn1 + turn2}
json.dump(base, open("tools/battle-lab/mtl1-%s-leech-s%d-%s.json" % (kind, seed, scene), "w"), indent=1)
