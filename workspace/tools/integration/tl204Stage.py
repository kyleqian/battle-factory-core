#!/usr/bin/env python3
"""tl204: stage the zero-tail-move scenarios from the lsd194 Bulk Up scenario (PRIMEAPE vs ONIX, every ONIX slot Tackle): the player's four slot-0 moves
become one move and the closing wait is 960 frames; nothing else changes (same recipe as sst200Stage.py). usage: tl204Stage.py <outdir> [seed]"""
import copy, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BASE = json.load(open(os.path.join(ROOT, "tools/integration/fixtures/lsd194/scenarios/off108-bulk-up-ply-primeape-onix.json")))
MOVES = {"double-team": 104, "rain-dance": 240, "scary-face": 184, "light-screen": 113, "calm-mind": 347, "sunny-day": 241,
         "charm": 204, "fake-tears": 313, "leech-seed": 73, "hail": 258}
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
seed = int(sys.argv[2]) if len(sys.argv) > 2 else 11
for name, mv in MOVES.items():
    s = copy.deepcopy(BASE); s["overrides"]["parties"]["player"][0]["moves"] = [mv] * 4; s["seed"] = seed
    segs = s["trace"]["segments"]; segs[-1]["frames"] = 960; s["trace"]["captureFrames"] = [0, 994]
    json.dump(s, open(os.path.join(out, f"tl204-{name}-s{seed}.json"), "w"), indent=1)
