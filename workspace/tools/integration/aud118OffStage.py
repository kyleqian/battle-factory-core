#!/usr/bin/env python3
"""aud118 (docs/aud118-live-audit-26.md): Scene OFF no-hit pause / hold routes for move classes NOT in off108's set, staged exactly as
off108Stage.py does (the accepted Bulk Up templates, parties of three, EV totals <= 510; only the attacker lead's species / moves, the target
lead's species (Tackle x4), the explicit lab seed 305419897 and the final idle change). Species are INTERNAL ids.
  stat self:   Swords Dance 14 (up2 ATK), Agility 97 (up2 SPEED)        stat target: Leer 43 (down1 DEF), Screech 103 (down2 DEF)
  screens:     Light Screen 113, Reflect 115                            field:       Haze 114, Mist 54
  sleep:       Spore 147 (100 % accurate)                               doll:        Substitute 164
  hold:        Light Screen / Reflect used on TWO turns: the second use runs BattleScript_ButItFailed (the MoveMissedPause-class hold,
               both scenes); turn 2 repeats the template's FIGHT -> A input
usage: aud118OffStage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "ONIX": 95, "SNORLAX": 143}
S0 = 305419897
CASES = [  # (slug, move id, class, attacker side, attacker, target, seed, final idle frames)
    ("swords-dance", 14, "stat", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("agility", 97, "stat", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("leer", 43, "stat", "player", "PRIMEAPE", "SNORLAX", S0, 700),
    ("screech", 103, "stat", "player", "PRIMEAPE", "SNORLAX", S0, 700),
    ("light-screen", 113, "screen", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("reflect", 115, "screen", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("haze", 114, "field", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("mist", 54, "field", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("spore", 147, "status", "player", "PRIMEAPE", "SNORLAX", S0, 700),
    ("substitute", 164, "doll", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("light-screen-twice", 113, "failed", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("reflect-twice", 115, "failed", "player", "PRIMEAPE", "ONIX", S0, 700),
]
index = {}
for slug, move, cls, side, atk, tgt, seed, idle in CASES:
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
    other = "opponent" if side == "player" else "player"
    a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
    assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (side, a["moves"], t["moves"])
    a["species"], a["moves"], t["species"] = SP[atk], [move] * 4, SP[tgt]
    for p in d["overrides"]["parties"]["player"] + d["overrides"]["parties"]["opponent"]:
        assert sum(p["evs"].values()) <= 510
    segs = d["trace"]["segments"]
    assert segs[-1] == {"frames": 700, "buttons": []}, segs[-1]
    segs[-1]["frames"] = idle
    if slug.endswith("-twice"):
        segs.extend(copy.deepcopy(segs))
    d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
    d["seed"] = seed
    name = f"aud118-{slug}-{'ply' if side == 'player' else 'opp'}-{atk.lower()}-{tgt.lower()}.json"
    index[name] = {"move": move, "class": cls, "attackerSide": side, "attacker": atk, "target": tgt, "seed": seed, "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
