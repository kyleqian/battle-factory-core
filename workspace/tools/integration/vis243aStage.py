#!/usr/bin/env python3
"""vis243a: stage a Scene ON mechanicLab voluntary player switch (turn 2: FIGHT>POKEMON>slot 1>SEND OUT), every frame in a window captured.
usage: vis243aStage.py <out.json> <incoming-species> <incoming-nature> <lead-species> <opp-species> <cap-from> <cap-to> [--gender=genderless] [--ogender=genderless] [--step=N] [--profile=battle-scene-on]
Both sides use Splash x4 so no damage / AI choice is injected; the opponent's turn-2 move is 'Foe X used SPLASH!' right after the send-in."""
import json, sys
args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
out, inc, nat, lead, opp, cf, ct = args[0], int(args[1]), int(args[2]), int(args[3]), int(args[4]), int(args[5]), int(args[6])
def mon(species, nature, gender):
    return {"species": species, "level": 50, "nature": nature,
            "ivs": {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {k: 0 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "moves": [150, 150, 150, 150], "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0,
            "friendship": 0, "gender": gender, "shiny": False}
g = opts.get("gender", "male")
player = [mon(lead, 0, g if lead == inc else "male"), mon(inc, nat, g), mon(lead, 0, "male")]
opponent = [mon(opp, 0, opts.get("ogender", "male"))] * 3
segs = [(2, ["A"]), (18, []), (2, ["A"]), (700, []), (2, ["DOWN"]), (38, []), (2, ["A"]), (118, []), (2, ["RIGHT"]), (38, []),
        (2, ["A"]), (38, []), (2, ["A"]), (1300, [])]
d = {"schemaVersion": 1, "mode": "mechanicLab", "profile": opts.get("profile", "battle-scene-on"), "level": 50, "challengeNum": 0,
     "battleNum": 0, "trainerId": 50, "playerSetIds": [156, 157, 185], "opponentSetIds": [119, 122, 133], "seed": 1,
     "overrides": {"parties": {"player": player, "opponent": opponent}},
     "trace": {"segments": [{"frames": f, "buttons": b} for f, b in segs], "captureFrames": list(range(cf, ct, int(opts.get("step", 1))))}}
json.dump(d, open(out, "w"))
