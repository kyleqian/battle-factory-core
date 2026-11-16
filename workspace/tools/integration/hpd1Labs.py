#!/usr/bin/env python3
"""hpd1: write the fixed-damage hit-hold labs + compare traces (docs/hpd1-hp-hold.md).

Player (Lv N Rattata) uses a fixed-damage move on the Lv100 Rattata that only uses Defense Curl (faster: it moves first, then the hit,
then the turn end -> action menu). Both scenes. Writes tools/battle-lab/hpd1-<case>-<scene>.json and tools/compare/traces/hpd1-<case>-<scene>.json.
"""
import json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/aud242o-rollout5-player-on.json")))
# case: (player level, move id, damage[, foe level]); the Lv100 foe (default) moves first, a Lv50 foe moves after the player's hit
CASES = {
    "sonicboom": (50, 49, 20),
    "dragonrage": (50, 82, 40),
    "toss10": (10, 69, 10),
    "toss30": (30, 69, 30),
    "toss50": (50, 69, 50),
    "toss80": (80, 69, 80),
    "a-sonicboom": (60, 49, 20, 50),
    "a-dragonrage": (60, 82, 40, 50),
    "a-toss60": (60, 69, 60, 50),
    "a-toss90": (90, 69, 90, 50),
}
FRAMES = 1000
for name, (level, move, _dmg, *foe) in CASES.items():
    for scene in ("on", "off"):
        lab = json.loads(json.dumps(tpl))
        lab["profile"] = f"battle-scene-{scene}"
        p = lab["overrides"]["parties"]["player"][0]
        p["level"] = level
        p["moves"] = [move] * 4
        if foe:
            lab["overrides"]["parties"]["opponent"][0]["level"] = foe[0]
        lab["trace"]["segments"][3]["frames"] = FRAMES
        sid = f"hpd1-{name}-{scene}"
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
