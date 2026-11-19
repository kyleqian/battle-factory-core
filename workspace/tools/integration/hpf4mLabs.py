#!/usr/bin/env python3
"""hpf4m: one battle lab per end-turn hp shape that still sits on the fitted 28-row floor (docs/hpd1-hp-hold.md, hpf4m section).
Template = aud242b-hail-player-on (Lv50 player Rattata vs foe, overrides.parties). Writes tools/battle-lab/hpf4m-<case>-<scene>.json
usage: hpf4mLabs.py [case ...]   (no args = every case)
Turn script per case: list of (slot, dir) player picks; the foe's four slots are one move (constrains the Factory AI).
"""
import json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/aud242b-hail-player-on.json")))
SPLASH, HARDEN, TACKLE = 150, 106, 33
# case: (player species, player level, [player moves], foe species, foe level, foe move, [turn slots (1 or 2)], turn gap frames)
CASES = {
    "poison": (19, 50, [139, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "toxic": (19, 50, [92, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1, 1], 1100),
    "burn": (19, 50, [261, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "curse": (92, 50, [174, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "nightmare": (19, 50, [147, 171, 0, 0], 19, 50, SPLASH, [1, 2], 1100),
    "wrap": (19, 50, [35, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "bind": (19, 50, [20, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "firespin": (19, 50, [83, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "whirlpool": (19, 50, [250, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "sandtomb": (19, 50, [328, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "clamp": (19, 50, [128, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "sandstorm": (19, 50, [201, SPLASH, 0, 0], 19, 50, SPLASH, [1, 1], 1100),
    "faintpoison": (19, 50, [92, SPLASH, 0, 0], 19, 5, SPLASH, [1] * 7, 1100),
    "confuse": (19, 50, [109, SPLASH, 0, 0], 19, 50, TACKLE, [1, 1, 1, 1], 1100),
    "substitute": (19, 50, [164, SPLASH, 0, 0], 19, 50, TACKLE, [1, 2], 1100),
    "subhit": (19, 50, [164, SPLASH, 0, 0], 19, 12, TACKLE, [1, 2], 1100),
}


def build(case: str, scene: str, seed: int = 1) -> str:
    psp, plv, pmoves, fsp, flv, fmove, turns, gap = CASES[case]
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = f"battle-scene-{scene}"
    lab["seed"] = seed
    p = lab["overrides"]["parties"]["player"][0]
    p["species"], p["level"] = psp, plv
    p["moves"] = [m or pmoves[0] for m in pmoves]
    f = lab["overrides"]["parties"]["opponent"][0]
    f["species"], f["level"] = fsp, flv
    f["moves"] = [fmove] * 4
    segs = []
    prev = 1
    for i, slot in enumerate(turns):
        segs += [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}]
        if i > 0 and slot != prev:
            segs += [{"frames": 2, "buttons": ["RIGHT" if slot == 2 else "LEFT"]}, {"frames": 8, "buttons": []}]
        segs += [{"frames": 2, "buttons": ["A"]}, {"frames": gap, "buttons": []}]
        prev = slot
    lab["trace"]["segments"] = segs
    sid = f"hpf4m-{case}-{scene}" + ("" if seed == 1 else f"-s{seed}")
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
    return sid


if __name__ == "__main__":
    names = sys.argv[1:] or list(CASES)
    for n in names:
        for scene in ("on", "off"):
            print(build(n, scene))
