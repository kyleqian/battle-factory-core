#!/usr/bin/env python3
"""off121: stage the Scene OFF `status` command lab scenarios (S10A timeline fidelity; docs/off121-status-command.md) from the
accepted Bulk Up templates off108 / idle94 used (tools/battle-lab/mechanic-bulk-up-{player,opponent}-primeape-*-onix.json: the same
parties of three, EV totals <= 510). Only the attacker lead's species / moves, the target lead's species, the explicit lab seed and the
turn count change: every turn is the template's fight-menu press (A, 30 idle, A on slot 1) plus a fixed idle, so later turns repeat the
same move (the target lead keeps the template's Tackle x4). Species are INTERNAL ids (Kanto / Johto ids equal their national numbers).
usage: off121Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "ONIX": 95, "SNORLAX": 143}
S0 = 305419897
TURN_IDLE = 1400
CASES = [  # (slug, move id, classes, attacker side, attacker, target, seed, turns[, target held item])
    ("toxic", 92, "move-status psn + end-turn toxic tick", "player", "PRIMEAPE", "ONIX", S0, 2),
    ("toxic", 92, "move-status psn + end-turn toxic tick", "opponent", "PRIMEAPE", "ONIX", S0, 2),
    ("will-o-wisp", 261, "move-status brn + end-turn burn tick", "player", "PRIMEAPE", "ONIX", S0, 2),
    ("spore", 147, "move-status slp + sleep turns / wake", "player", "PRIMEAPE", "ONIX", S0, 4),
    ("spore", 147, "move-status slp + sleep turns / wake", "opponent", "PRIMEAPE", "ONIX", S0, 4),
    ("thunder-wave", 86, "move-status prz + paralysis turns", "player", "PRIMEAPE", "SNORLAX", S0, 4),
    ("self-destruct", 120, "faint (cleareffectsonfaint)", "player", "PRIMEAPE", "ONIX", S0, 1),
    ("rest", 156, "rest (trysetrest)", "player", "SNORLAX", "ONIX", S0, 1),
    ("spore-chesto", 147, "item cure (MOVEEND Chesto Berry)", "player", "PRIMEAPE", "ONIX", S0, 1, 134),
]
index = {}
for slug, move, cls, side, atk, tgt, seed, turns, *item in CASES:
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
    other = "opponent" if side == "player" else "player"
    a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
    assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (side, a["moves"], t["moves"])
    a["species"], a["moves"], t["species"] = SP[atk], [move] * 4, SP[tgt]
    if item:
        t["item"] = item[0]
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
    d["seed"] = seed
    name = f"off121-{slug}-{'ply' if side == 'player' else 'opp'}-{atk.lower()}-{tgt.lower()}.json"
    index[name] = {"move": move, "classes": cls, "attackerSide": side, "attacker": atk, "target": tgt, "seed": seed, "turns": turns,
                   "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
