#!/usr/bin/env python3
"""off108: stage the Scene OFF no-hit / miss battle-lab scenarios (S10A timeline fidelity, ISSUES #167; docs/off108-scene-off-pauses.md)
from the accepted Bulk Up templates idle94 / idle98 used (tools/battle-lab/mechanic-bulk-up-{player,opponent}-primeape-*-onix.json: the
same parties of three, EV totals <= 510). Only the attacker lead's species / moves, the target lead's species, the explicit lab seed and
the final idle segment change. The target lead keeps the template's Tackle x4 (so Protect / Detect also stage a Protect-blocked Tackle).
Species are INTERNAL ids (Kanto / Johto ids equal their national numbers).
usage: off108Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "ONIX": 95, "SNORLAX": 143, "MACHAMP": 68}
S0 = 305419897
CASES = [  # (slug, move id, class, attacker side, attacker, target, seed, final idle frames)
    ("bulk-up", 339, "stat", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("double-team", 104, "stat", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("sand-attack", 28, "stat", "player", "PRIMEAPE", "SNORLAX", S0, 700),  # a target stat drop with census exposure (Growl has none)
    ("confuse-ray", 109, "status", "player", "PRIMEAPE", "SNORLAX", S0, 700),
    ("toxic", 92, "status", "player", "PRIMEAPE", "ONIX", S0, 700),  # SNORLAX's Immunity would block it
    ("thunder-wave", 86, "status", "player", "PRIMEAPE", "SNORLAX", S0, 700),
    ("protect", 182, "protect", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("detect", 197, "protect", "player", "PRIMEAPE", "ONIX", S0, 700),
    ("rest", 156, "rest", "player", "SNORLAX", "ONIX", S0, 900),
    ("dig", 91, "two-turn", "player", "PRIMEAPE", "SNORLAX", S0, 1500),
    ("razor-wind", 13, "two-turn", "player", "PRIMEAPE", "SNORLAX", S0, 1500),
    ("solar-beam", 76, "two-turn", "player", "PRIMEAPE", "SNORLAX", S0, 1500),
    ("snore", 173, "failed", "player", "PRIMEAPE", "SNORLAX", S0, 700),
    # Dynamic Punch (50 % accuracy) misses: idle98's committed miss seeds (fixtures/idle98/miss-seeds.json), one per side.
    ("dynamic-punch", 223, "miss", "player", "MACHAMP", "SNORLAX", 305419897, 700),
    ("dynamic-punch", 223, "miss", "opponent", "MACHAMP", "SNORLAX", 305419898, 700),
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
    d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
    d["seed"] = seed
    name = f"off108-{slug}-{'ply' if side == 'player' else 'opp'}-{atk.lower()}-{tgt.lower()}.json"
    index[name] = {"move": move, "class": cls, "attackerSide": side, "attacker": atk, "target": tgt, "seed": seed, "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
