#!/usr/bin/env python3
"""idle98: stage the damaging-move battle-lab scenarios (S10A timing fidelity, universal pre / post rows; docs/next-adapters-idle98.md)
from the accepted Bulk Up templates idle94 used (tools/battle-lab/mechanic-bulk-up-{player,opponent}-primeape-*-onix.json: the same
parties of three, EV totals <= 510). Only the attacker lead's species / moves, the target lead's species, the explicit lab seed and
(two-turn only) the final idle segment change. The target lead keeps the template's Tackle x4, so every scenario also has a Tackle hit
body from the other side. Species are INTERNAL ids (Kanto / Johto ids equal their national numbers; Hoenn ids are internal).
usage: idle98Stage.py <out-dir> [--miss-search]   (also writes <out-dir>/../scenario-index.json)
--miss-search stages Dynamic Punch with seeds 305419897 + k (k = 0..7) for the seed search only (not committed).
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "ONIX": 95, "SNORLAX": 143, "MACHOKE": 67, "ALAKAZAM": 65, "HOUNDOOM": 229, "RHYDON": 112, "HITMONLEE": 106,
      "SCYTHER": 123, "MACHAMP": 68, "STARMIE": 121, "GOLEM": 76}
S0 = 305419897
CASES = [  # (slug, move id, class, attacker, target, seed, final idle frames)
    ("karate-chop", 2, "hit", "MACHOKE", "SNORLAX", S0, 700),
    ("psychic", 94, "hit", "ALAKAZAM", "SNORLAX", S0, 700),
    ("bite", 44, "hit", "HOUNDOOM", "SNORLAX", S0, 700),
    ("earthquake", 89, "hit", "RHYDON", "SNORLAX", S0, 700),
    ("double-kick", 24, "multi-hit", "HITMONLEE", "SNORLAX", S0, 900),
    ("razor-wind", 13, "two-turn", "SCYTHER", "SNORLAX", S0, 1500),
    ("water-pulse", 352, "ko", "STARMIE", "GOLEM", S0, 700),
    ("bulk-up", 339, "status-control", "PRIMEAPE", "ONIX", S0, 700),
]
# Dynamic Punch (50 % accuracy): the miss seeds found by the --miss-search probes (ON r1, Scene ON; see the doc), one per side.
MISS = {"player": None, "opponent": None}
if os.path.exists(os.path.join(ROOT, "tools/integration/fixtures/idle98/miss-seeds.json")):
    MISS = json.load(open(os.path.join(ROOT, "tools/integration/fixtures/idle98/miss-seeds.json")))["missSeed"]
index = {}


def stage(slug, move, cls, atk, tgt, seed, idle, side, tag=""):
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
    name = f"idle98-{slug}-{'ply' if side == 'player' else 'opp'}-{atk.lower()}-{tgt.lower()}{tag}.json"
    index[name] = {"move": move, "class": cls, "attackerSide": side, "attacker": atk, "target": tgt, "seed": seed, "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)


if "--miss-search" in sys.argv:
    for side in ("player", "opponent"):
        for k in range(8):
            stage("dynamic-punch", 223, "miss-search", "MACHAMP", "SNORLAX", S0 + k, 700, side, f"-k{k}")
else:
    for slug, move, cls, atk, tgt, seed, idle in CASES:
        for side in ("player", "opponent"):
            stage(slug, move, cls, atk, tgt, seed, idle, side)
    for side in ("player", "opponent"):
        if MISS[side] is not None:
            stage("dynamic-punch", 223, "miss", "MACHAMP", "SNORLAX", MISS[side], 700, side)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
