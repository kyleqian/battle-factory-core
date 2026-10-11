#!/usr/bin/env python3
"""idle94: stage the 16 battle-lab scenarios (Bulk Up 339 / Swagger 207 / Taunt 269 / Scary Face 184 x player / opponent attacker x two
species pairs) from the accepted Bulk Up templates (tools/battle-lab/mechanic-bulk-up-{player,opponent}-primeape-*-onix.json: the
same trace, parties of three, EV totals 510). Only the attacker lead's species / moves, the target lead's species and the explicit lab
seed change. Species are INTERNAL ids (Kanto / Johto ids equal their national numbers).
usage: idle94Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json: the per-scenario move / side / species / seed)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "HERACROSS": 214, "HYPNO": 97, "PERSIAN": 53, "MURKROW": 198, "RHYHORN": 111, "PUPITAR": 247,
      "ONIX": 95, "SNORLAX": 143, "SHUCKLE": 213, "SCYTHER": 123, "DODRIO": 85}
CASES = [  # (slug, move id, pair, attacker, target, seed)
    ("bulk-up", 339, "a", "PRIMEAPE", "ONIX", 305419897), ("bulk-up", 339, "b", "HERACROSS", "SNORLAX", 305420349),
    ("swagger", 207, "a", "HYPNO", "ONIX", 305419897), ("swagger", 207, "b", "PERSIAN", "SNORLAX", 305420349),
    ("taunt", 269, "a", "MURKROW", "SHUCKLE", 305419897), ("taunt", 269, "b", "MURKROW", "SNORLAX", 305420349),
    ("scary-face", 184, "a", "RHYHORN", "SHUCKLE", 305419897), ("scary-face", 184, "b", "PUPITAR", "SNORLAX", 305420349),
    # lead-0 controls (table: lead 0, trail -1), added after the 16-scenario comparison and before their own probes
    ("swords-dance", 14, "c", "SCYTHER", "ONIX", 305419897), ("agility", 97, "c", "DODRIO", "ONIX", 305419897),
]
index = {}
for slug, move, pair, atk, tgt, seed in CASES:
    for side in ("player", "opponent"):
        d = json.load(open(os.path.join(ROOT, TEMPLATE[side])))
        d = copy.deepcopy(d)
        other = "opponent" if side == "player" else "player"
        a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
        assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (side, a["moves"], t["moves"])
        a["species"], a["moves"], t["species"] = SP[atk], [move] * 4, SP[tgt]
        for p in d["overrides"]["parties"]["player"] + d["overrides"]["parties"]["opponent"]:
            assert sum(p["evs"].values()) <= 510
        d["seed"] = seed
        name = f"idle94-{slug}-{'ply' if side == 'player' else 'opp'}-{pair}-{atk.lower()}-{tgt.lower()}.json"
        index[name] = {"move": move, "attackerSide": side, "attacker": atk, "target": tgt, "pair": pair, "seed": seed, "template": TEMPLATE[side]}
        open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
        print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
