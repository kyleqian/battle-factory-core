#!/usr/bin/env python3
"""sst200: stage the second-stat-row scenarios from the lsd194 Bulk Up scenario (PRIMEAPE vs ONIX, every ONIX slot Tackle):
the player's four slot-0 moves become one move and the closing wait is 960 frames (the 5-stat chains outlast 734); nothing else changes. usage: sst200Stage.py <outdir> [seed ...]"""
import copy, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BASE = json.load(open(os.path.join(ROOT, "tools/integration/fixtures/lsd194/scenarios/off108-bulk-up-ply-primeape-onix.json")))
MOVES = {"tickle": 321, "memento": 262, "superpower": 276, "silver-wind": 318, "ancient-power": 246, "calm-mind": 347,
         "dragon-dance": 349, "cosmic-power": 322, "curse": 174}
FOE = ["tickle", "superpower", "calm-mind", "curse"]  # the same moves used by ONIX (slot 0); PRIMEAPE uses Tackle (moves first, then the foe's chain)
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
seeds = [int(s) for s in sys.argv[2:]] or [BASE["seed"]]
for name, mv in MOVES.items():
    for seed in seeds:
        s = copy.deepcopy(BASE); s["overrides"]["parties"]["player"][0]["moves"] = [mv] * 4; s["seed"] = seed
        segs = s["trace"]["segments"]; segs[-1]["frames"] = 960; s["trace"]["captureFrames"] = [0, 994]
        json.dump(s, open(os.path.join(out, f"sst200-{name}-s{seed}.json"), "w"), indent=1)
    if name in FOE:
        for seed in seeds:
            s = copy.deepcopy(BASE); s["overrides"]["parties"]["player"][0]["moves"] = [33] * 4; s["overrides"]["parties"]["opponent"][0]["moves"] = [mv] * 4; s["seed"] = seed
            segs = s["trace"]["segments"]; segs[-1]["frames"] = 960; s["trace"]["captureFrames"] = [0, 994]
            json.dump(s, open(os.path.join(out, f"sst200-foe-{name}-s{seed}.json"), "w"), indent=1)
