#!/usr/bin/env python3
"""rst139: stage the ordinary-row idle-rest scenarios (docs/rst139-ordinary-row-rest.md). Template: stp128's accepted
stp128-confuse-ray-ply-primeape-onix.json (sta123's Bulk Up recipe: player PRIMEAPE lead, opponent ONIX lead with Tackle x4, parties of
three, EV totals <= 510, lab seed 305419897); only lead species / moves, two bench slots and the turn count change. Each turn is
A (FIGHT), 30 idle, A (slot 0), 1400 idle (no button: Scene ON battle messages auto-advance).
usage: rst139Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
T = json.load(open(os.path.join(ROOT, "tools/integration/fixtures/stp128/scenarios/stp128-confuse-ray-ply-primeape-onix.json")))
assert T["overrides"]["parties"]["player"][0]["species"] == 57 and T["overrides"]["parties"]["opponent"][0]["species"] == 95
assert T["overrides"]["parties"]["opponent"][0]["moves"] == [33] * 4
SP = {"PRIMEAPE": 57, "ONIX": 95, "RATTATA": 19, "SNORLAX": 143, "GOLBAT": 42}
# (slug, player lead species, player moves, opponent lead species, opponent moves, opponent bench override, turns, purpose)
S = [
    ("confuse-ray-ply-onix", "PRIMEAPE", 109, "ONIX", 33, None, 3, "a: Confuse Ray body (target keep); b: CONFUSION on ONIX; e: menus"),
    ("tail-whip-ply-onix", "PRIMEAPE", 39, "ONIX", 33, None, 3, "c: Tail Whip stats change on ONIX (target keep); e"),
    ("karate-chop-ply-onix", "PRIMEAPE", 2, "ONIX", 33, None, 2, "a: Karate Chop (target zeroed) -> ONIX x2 0 after; e"),
    ("harden-opp-onix", "PRIMEAPE", 150, "ONIX", 106, None, 2, "c: ONIX Harden (self stats change); Splash keeps; e"),
    ("roar-ply-snorlax", "PRIMEAPE", 46, "SNORLAX", 33, ("ONIX", "RATTATA"), 3, "d: Roar drags ONIX / RATTATA in (send-in rest); e"),
    ("confuse-ray-ply-rattata", "PRIMEAPE", 109, "RATTATA", 33, None, 3, "a / b / e on RATTATA (rest +1)"),
    ("confuse-ray-opp-onix", "ONIX", 33, "PRIMEAPE", 109, None, 3, "player-side ONIX (back sprite): CONFUSION on the player; e"),
    ("confuse-ray-ply-golbat", "PRIMEAPE", 109, "GOLBAT", 33, None, 2, "control: zero-rest elevated GOLBAT opponent"),
]
index = {}
for slug, ps, pm, os_, om, bench, turns, purpose in S:
    d = copy.deepcopy(T)
    p, o = d["overrides"]["parties"]["player"], d["overrides"]["parties"]["opponent"]
    p[0]["species"], p[0]["moves"] = SP[ps], [pm] * 4
    o[0]["species"], o[0]["moves"] = SP[os_], [om] * 4
    if bench:
        for k, sp in enumerate(bench, 1):
            o[k] = dict(copy.deepcopy(o[0]), species=SP[sp], moves=[33] * 4)
    for mon in p + o:
        assert sum(mon["evs"].values()) <= 510
    seg = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1400, "buttons": []}]
    d["trace"]["segments"] = seg * turns
    total = sum(s["frames"] for s in d["trace"]["segments"])
    d["trace"]["captureFrames"] = [0, total]
    name = f"rst139-{slug}.json"
    json.dump(d, open(os.path.join(out, name), "w"), indent=1)
    index[name] = {"player": ps, "playerMove": pm, "opponent": os_, "opponentMove": om, "opponentBench": bench, "turns": turns,
                   "purpose": purpose, "seed": d["seed"]}
    print(name)
json.dump(index, open(os.path.join(out, "..", "scenario-index.json"), "w"), indent=1)
