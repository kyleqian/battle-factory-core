#!/usr/bin/env python3
"""off148: stage the Scene OFF no-hit scenarios whose next receipt off108 left unmeasured (S10A timeline fidelity, ISSUES #167 remainder;
docs/off148-scene-off-pauses-remainder.md). Same accepted Bulk Up templates as off108Stage.py (the same parties of three, EV totals
<= 510); only the attacker lead's moves (x4), the explicit lab seed and the final idle segment change. Census 0..999 OFF classes
(off108Route.ts on the base): a stat-stage-change receipt next (Curse 238 / Swagger 127 / Flatter 34 / Tickle 2), a sprite-visibility
receipt next (Wish 155 / Roar 104 / Whirlwind 23 / an opponent Baton Pass 14), nothing next (a player Baton Pass 35: party menu, not
staged). Agility is a control (its next receipt is STATS_CHANGE, already paused). Rest's ROM rows are off108's banked probe.
usage: off148Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
S0 = 305419897
CASES = [  # (slug, move id, class, attacker side, seed, final idle frames)
    ("curse", 174, "stat-stage", "player", S0, 900),
    ("curse", 174, "stat-stage", "opponent", S0, 900),
    ("swagger", 207, "stat-stage", "player", S0, 900),
    ("flatter", 260, "stat-stage", "player", S0, 900),
    ("agility", 97, "control-stats-change", "player", S0, 700),
    ("wish", 273, "sprite-visibility", "player", S0, 700),
    ("wish", 273, "sprite-visibility", "opponent", S0, 700),
    ("roar", 46, "sprite-visibility", "player", S0, 1200),
    ("baton-pass", 226, "sprite-visibility", "opponent", S0, 1200),
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
    name = f"off148-{slug}-{'ply' if side == 'player' else 'opp'}.json"
    index[name] = {"move": move, "class": cls, "attackerSide": side, "attacker": "PRIMEAPE", "target": "ONIX", "seed": seed,
                   "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
