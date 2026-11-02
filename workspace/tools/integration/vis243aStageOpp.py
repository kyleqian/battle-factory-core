#!/usr/bin/env python3
"""vis243a: stage a Scene ON mechanicLab opponent FAINT-REPLACEMENT send-in (turn 1: the player's Earthquake KOs a MAGIKARP lead; the next opponent mon is sent in).
usage: vis243aStageOpp.py <out.json> <incoming-opp-species> <cap-from> <cap-to> [--step=N] [--profile=battle-scene-on] [--ogender=male]"""
import json, sys
args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
out, opp, cf, ct = args[0], int(args[1]), int(args[2]), int(args[3])
def mon(species, moves, gender="male"):
    return {"species": species, "level": 50, "nature": 0,
            "ivs": {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {k: (252 if k == "attack" else 0) for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "moves": moves, "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 0, "gender": gender, "shiny": False}
player = [mon(68, [89] * 4), mon(19, [150] * 4), mon(19, [150] * 4)]
opponent = [mon(129, [150] * 4), mon(opp, [150] * 4, opts.get("ogender", "male")), mon(opp, [150] * 4, opts.get("ogender", "male"))]
segs = [(2, ["A"]), (18, []), (2, ["A"]), (880, []), (2, ["A"]), (int(opts.get("tail", 1100)), [])]
d = {"schemaVersion": 1, "mode": "mechanicLab", "profile": opts.get("profile", "battle-scene-on"), "level": 50, "challengeNum": 0,
     "battleNum": 0, "trainerId": 50, "playerSetIds": [156, 157, 185], "opponentSetIds": [119, 122, 133], "seed": 1,
     "overrides": {"parties": {"player": player, "opponent": opponent}},
     "trace": {"segments": [{"frames": f, "buttons": b} for f, b in segs], "captureFrames": list(range(cf, ct, int(opts.get("step", 1))))}}
json.dump(d, open(out, "w"))
