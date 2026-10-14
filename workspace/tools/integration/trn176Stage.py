#!/usr/bin/env python3
"""trn176: stage Scene OFF HIT-path scenarios (a damaging move that lands, then the next action's "used" print) for the action-transition
rule (docs/trn176-action-transition.md). Same accepted Bulk Up templates as off108Stage.py / off148Stage.py (parties of three, EV totals
<= 510); only the attacker lead's moves (x4) and the final idle segment change. Target Onix (Rock / Ground): Scratch is not very effective,
Karate Chop super effective, Double-Edge not very effective + recoil, Fire Punch not very effective.
usage: trn176Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
S0 = 305419897
CASES = [  # (slug, move id, class, attacker side, seed, final idle frames)
    ("scratch", 10, "hit", "player", S0, 900),
    ("scratch", 10, "hit", "opponent", S0, 900),
    ("karate-chop", 2, "hit-supereffective", "player", S0, 900),
    ("double-edge", 38, "hit-recoil", "player", S0, 1200),
    ("fire-punch", 7, "hit-secondary", "player", S0, 1200),
]
index = {}
for slug, move, cls, side, seed, idle in CASES:
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
    other = "opponent" if side == "player" else "player"
    a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
    assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (side, a["moves"], t["moves"])
    a["moves"] = [move] * 4
    for p in d["overrides"]["parties"]["player"] + d["overrides"]["parties"]["opponent"]:
        assert sum(p["evs"].values()) <= 510
    segs = d["trace"]["segments"]
    assert segs[-1] == {"frames": 700, "buttons": []}, segs[-1]
    segs[-1]["frames"] = idle
    d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
    d["seed"] = seed
    name = f"trn176-{slug}-{'ply' if side == 'player' else 'opp'}.json"
    index[name] = {"move": move, "class": cls, "attackerSide": side, "attacker": "PRIMEAPE", "target": "ONIX", "seed": seed,
                   "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
