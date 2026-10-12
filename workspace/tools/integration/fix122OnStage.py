#!/usr/bin/env python3
"""fix122 (docs/fix122-audit26-defects.md): the Scene ON "But it failed!" hold classes aud118 left unproven, staged exactly as
aud118OffStage.py (off108's accepted Bulk Up template, parties of three, EV totals <= 510; only the player lead's species / moves, the
opponent lead's species (Tackle x4), the explicit lab seed 305419897 and the turn count change). Species are INTERNAL ids. Every turn is
the template's FIGHT -> A + `idle` frames (700; 1500 where Scene ON's weather / seed bodies and end-of-turn animations outlast 700 frames),
repeated `turns` times; the failing use takes Cmd_attackanimation's MOVE_RESULT_NO_EFFECT branch.
  protect-like (setprotectlike, repeated: 1/2, 1/4, ... success):  Protect 182, Detect 197, Endure 203   (4 turns)
  side status (setsafeguard, the second use while Safeguard is up):  Safeguard 219
  weather (set{sunny,sandstorm,hail}, the second use while it is active):  Sunny Day 241, Sandstorm 201, Hail 258
  stockpile (the 4th use):  Stockpile 254                        leech seed: Leech Seed 73 twice (already seeded), once on Grass ODDISH 43
  controls (aud118's ROM-proven classes):  Light Screen 113, Reflect 115, Rain Dance 240 twice
usage: fix122OnStage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json"
SP = {"PRIMEAPE": 57, "ONIX": 95, "ODDISH": 43}
S0 = 305419897
CASES = [  # (slug, move id, class, attacker, target, turns[, idle])
    ("protect", 182, "protect-like", "PRIMEAPE", "ONIX", 4),
    ("detect", 197, "protect-like", "PRIMEAPE", "ONIX", 4),
    ("endure", 203, "protect-like", "PRIMEAPE", "ONIX", 4),
    ("safeguard", 219, "side-status", "PRIMEAPE", "ONIX", 2),
    ("sunny-day", 241, "weather", "PRIMEAPE", "ONIX", 2),
    ("sandstorm", 201, "weather", "PRIMEAPE", "ONIX", 2, 1500),
    ("hail", 258, "weather", "PRIMEAPE", "ONIX", 2, 1500),
    ("stockpile", 254, "stockpile", "PRIMEAPE", "ONIX", 4),
    ("leech-seed", 73, "leech-seed", "PRIMEAPE", "ONIX", 2, 1500),
    ("leech-seed-grass", 73, "leech-seed", "PRIMEAPE", "ODDISH", 1),
    ("light-screen", 113, "control", "PRIMEAPE", "ONIX", 2),
    ("reflect", 115, "control", "PRIMEAPE", "ONIX", 2),
    ("rain-dance", 240, "control", "PRIMEAPE", "ONIX", 2),
]
index = {}
for slug, move, cls, atk, tgt, turns, *rest in CASES:
    idle = rest[0] if rest else 700
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE))))
    a, t = d["overrides"]["parties"]["player"][0], d["overrides"]["parties"]["opponent"][0]
    assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (a["moves"], t["moves"])
    a["species"], a["moves"], t["species"] = SP[atk], [move] * 4, SP[tgt]
    for p in d["overrides"]["parties"]["player"] + d["overrides"]["parties"]["opponent"]:
        assert sum(p["evs"].values()) <= 510
    segs = d["trace"]["segments"]
    assert segs[-1] == {"frames": 700, "buttons": []}, segs[-1]
    segs[-1]["frames"] = idle
    d["trace"]["segments"] = [copy.deepcopy(s) for _ in range(turns) for s in segs]
    d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in d["trace"]["segments"])]
    d["seed"] = S0
    name = f"fix122-{slug}-ply-{atk.lower()}-{tgt.lower()}.json"
    index[name] = {"move": move, "class": cls, "attackerSide": "player", "attacker": atk, "target": tgt, "seed": S0, "turns": turns, "idle": idle,
                   "template": TEMPLATE}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
