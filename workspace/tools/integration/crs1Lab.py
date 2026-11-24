#!/usr/bin/env python3
# crs1Lab: write tools/battle-lab/crs1-<kind>-s<seed>-off.json (Scene OFF, no items; high-crit move vs a resisting / weak foe, foe Seismic Toss only).
# Usage: crs1Lab.py KIND SEED  (KIND: slash = Snorlax Slash vs Onix (resisted); chop = Machamp Cross Chop vs Snorlax (super effective))
import json, sys
kind, seed = sys.argv[1], int(sys.argv[2])
base = json.load(open("tools/battle-lab/mechanic-slash-player-charmeleon-opponent-onix.json"))
SP = {"slash": ((143, 163), (95, 69)), "chop": ((68, 238), (143, 69))}[kind]
def mon(species, move):
    return {"species": species, "level": 50, "nature": 0, "ivs": {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {k: 0 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}, "moves": [move] * 4, "ppUps": [0] * 4,
            "item": 0, "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}
fill = lambda: mon(84, 33)
base["profile"] = "battle-scene-off"
base["seed"] = seed
base["overrides"]["parties"] = {"player": [mon(*SP[0]), fill(), fill()], "opponent": [mon(*SP[1]), fill(), fill()]}
turn = [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 480, "buttons": []}]
base["trace"] = {"segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 480, "buttons": []}] + turn * 2,
                 "captureFrames": [0, 1600]}
json.dump(base, open(f"tools/battle-lab/crs1-{kind}-s{seed}-off.json", "w"), indent=1)
