#!/usr/bin/env python3
"""sgs134: stage the Scene ON IsBattleSEPlaying-gate lab scenarios for the OTHER controller requests (docs/sgs134-se-gate-other-requests.md)
— CONTROLLED LAB STAGING exactly as seg127Stage.py (the accepted Bulk Up templates tools/battle-lab/mechanic-bulk-up-{player,opponent}-
primeape-*-onix.json: legal parties of three, EV totals <= 510): only the attacker lead's species / moves (/ abilitySlot), the target
lead's species, the explicit lab seed and the turn count change; every turn is the template's fight-menu press (A, 30 idle, A on slot 1)
+ 1400 idle. Target Snorlax (abilitySlot 0 = Immunity) takes every move neutral. Species are INTERNAL ids (Kanto ids = national).
Classes: a stat DROP on the target (playanimation B_ANIM_STATS_CHANGE from a 100 % secondary: Mud-Slap ACC-1, Icy Wind SPD-1), a stat
RAISE on the attacker (Meteor Mash ATK+1 20 %, Chansey abilitySlot 1 = Serene Grace -> 40 %), and the 2nd+ hits of a multi-hit move
(attackanimation after the previous hit's SE with only printstring EMPTYSTRING3 + waitmessage 1 between: Bonemerang 2 hits, Pin
Missile 2..5). A weak attacker (Chansey, base Atk 5) keeps the HP drain small so the gate is nonzero; Primeape (the template's) drains more.
usage: sgs134Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "SNORLAX": 143, "CHANSEY": 113}
FEMALE_ONLY = {"CHANSEY"}
S0 = 305419897
# Meteor Mash's raise is a 40 % roll: sweep 305419898..305419905 x both sides (sgs134Run.sh does not rerun the sweep); 305419899 is the
# first seed with the raise on both sides (2 receipts each). Every other stem: S0.
SEEDS = {"sgs134-meteor-mash-chansey-ply": 305419899, "sgs134-meteor-mash-chansey-opp": 305419899}
TURN_IDLE = 1400
# (slug, class, move id, attacker, attacker abilitySlot, target, turns)
CASES = [
    ("mud-slap-primeape", "stat-drop target ACC-1 (Mud-Slap 100 %)", 189, "PRIMEAPE", 0, "SNORLAX", 3),
    ("icy-wind-primeape", "stat-drop target SPD-1 (Icy Wind 100 %)", 196, "PRIMEAPE", 0, "SNORLAX", 3),
    ("meteor-mash-chansey", "stat-raise attacker ATK+1 (Meteor Mash 20 %, Serene Grace)", 309, "CHANSEY", 1, "SNORLAX", 4),
    ("bonemerang-chansey", "multi-hit 2 (Bonemerang)", 155, "CHANSEY", 0, "SNORLAX", 3),
    ("pin-missile-primeape", "multi-hit 2..5 (Pin Missile)", 42, "PRIMEAPE", 0, "SNORLAX", 3),
]
species_info = open(os.path.join(ROOT, "reference/pokeemerald/src/data/pokemon/species_info.h")).read()
m = re.search(r"\[SPECIES_CHANSEY\] =.*?\.abilities = \{ABILITY_(\w+), ABILITY_(\w+)\}", species_info, re.S)
assert m and m.group(2) == "SERENE_GRACE", m and m.groups()
index = {}
for slug, cls, move, atk, slot, tgt, turns in CASES:
    for side in ("player", "opponent"):
        d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
        other = "opponent" if side == "player" else "player"
        a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
        assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4 and a["abilitySlot"] == 0 and t["abilitySlot"] == 0, side
        assert a.get("gender") == "male", a.get("gender")
        a["species"], a["moves"], a["abilitySlot"], t["species"] = SP[atk], [move] * 4, slot, SP[tgt]
        if atk in FEMALE_ONLY:
            a["gender"] = "female"  # battle_lab rejects a male Chansey (gender ratio MON_FEMALE)
        for p in d["overrides"]["parties"]["player"] + d["overrides"]["parties"]["opponent"]:
            assert sum(p["evs"].values()) <= 510
        segs = d["trace"]["segments"]
        assert segs[-1] == {"frames": 700, "buttons": []}, segs[-1]
        turn = segs[:-1]
        assert turn == [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}], turn
        segs = []
        for _ in range(turns):
            segs += copy.deepcopy(turn) + [{"frames": TURN_IDLE, "buttons": []}]
        d["trace"]["segments"] = segs
        d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
        stem = f"sgs134-{slug}-{'ply' if side == 'player' else 'opp'}"
        d["seed"] = SEEDS.get(stem, S0)
        index[stem + ".json"] = {"class": cls, "move": move, "attackerSide": side, "attacker": atk, "attackerAbilitySlot": slot,
                                 "target": tgt, "seed": d["seed"], "turns": turns, "template": TEMPLATE[side]}
        open(os.path.join(out, stem + ".json"), "w").write(json.dumps(d, indent=1) + "\n")
        print(stem)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
