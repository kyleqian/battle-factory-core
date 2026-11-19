#!/usr/bin/env python3
"""hpf1: fixed-damage hits ON THE PLAYER (the foe uses Sonic Boom / Dragon Rage / Seismic Toss; the player only Defense Curl), both scenes
(docs/hpd1-hp-hold.md, hpf1 section). Same template as hpd1Labs.py with the roles swapped. Writes tools/battle-lab/hpf1-<case>-<scene>.json and
tools/compare/traces/hpf1-<case>-<scene>.json (stages in tools/compare/appTrace.ts).
"""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/aud242o-rollout5-player-on.json")))
# case: (player level, foe level, foe move): c = the player (faster) uses Defense Curl, then the foe's hit ends the turn; a = the faster foe hits, then the player's Defense Curl follows; k = the level-5 player faints to the hit (hp -> faint, no print between)
CASES = {
    "pc-sonicboom": (100, 50, 49),
    "pc-dragonrage": (100, 50, 82),
    "pc-toss10": (100, 10, 69),
    "pa-sonicboom": (50, 100, 49),
    "pa-dragonrage": (50, 100, 82),
    "pk-dragonrage": (5, 50, 82),
}
FRAMES = 1000
for name, (plevel, flevel, move) in CASES.items():
    for scene in ("on", "off"):
        lab = json.loads(json.dumps(tpl))
        lab["profile"] = f"battle-scene-{scene}"
        p = lab["overrides"]["parties"]["player"][0]
        p["level"] = plevel
        p["moves"] = [111] * 4
        f = lab["overrides"]["parties"]["opponent"][0]
        f["level"] = flevel
        f["moves"] = [move] * 4
        lab["trace"]["segments"][3]["frames"] = FRAMES
        sid = f"hpf1-{name}-{scene}"
        json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
        trace = {
            "appRoute": "generated-orchestrator",
            "oracleProfile": f"battle-scene-{scene}",
            "appStage": {"id": sid, "frame": 0},
            "oracleBattleLab": {"scenario": f"../../battle-lab/{sid}.json"},
            "segments": lab["trace"]["segments"],
            "captureFrames": list(range(0, 2 + 18 + 2 + FRAMES + 1)),
        }
        json.dump(trace, open(os.path.join(root, f"tools/compare/traces/{sid}.json"), "w"))
        print(sid)
