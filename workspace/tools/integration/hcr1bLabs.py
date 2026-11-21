#!/usr/bin/env python3
"""hcr1b: write the Scene OFF commit -> first-glyph labs + compare traces, one turn per first-print u class.

Two Rattata (Lv100 vs Lv50) with the move x4 each; the faster side acts first, so its move is the one whose commit -> first glyph window is
captured. `foe` cases: the Lv100 foe uses MOVE (the player's Seismic Toss follows); `plr` cases: the Lv100 player uses MOVE (the foe uses Seismic Toss).
Writes tools/battle-lab/hcr1b-<case>-off.json and tools/compare/traces/hcr1b-<case>-off.json (stages: HCR1B_CASES in tools/compare/appTrace.ts).
"""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/aud242o-rollout5-player-on.json")))
MOVES = {"defensecurl": 111, "growl": 45, "harden": 106, "recover": 105, "toxic": 92, "confuseray": 109, "earthquake": 89, "fissure": 90,
         "sonicboom": 49, "dragonrage": 82, "toss": 69, "lowkick": 67,
         "absorb": 71, "megadrain": 72, "curse": 174,
         "tackle": 33, "scratch": 10, "ember": 52, "bite": 44, "thunderbolt": 85, "takedown": 36, "doubleedge": 38}
FRAMES = 110
def build(case, side, move):
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = "battle-scene-off"
    plr, foe = lab["overrides"]["parties"]["player"][0], lab["overrides"]["parties"]["opponent"][0]
    first, second = (foe, plr) if side == "foe" else (plr, foe)
    first["level"], second["level"] = 100, 50
    first["moves"], second["moves"] = [MOVES[move]] * 4, [69] * 4
    lab["trace"]["segments"][3]["frames"] = FRAMES
    sid = f"hcr1b-{case}-{side}-off"
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
    trace = {"appRoute": "generated-orchestrator", "oracleProfile": "battle-scene-off", "appStage": {"id": sid, "frame": 0},
             "oracleBattleLab": {"scenario": f"../../battle-lab/{sid}.json"}, "segments": lab["trace"]["segments"],
             "captureFrames": list(range(24, 2 + 18 + 2 + FRAMES + 1))}
    json.dump(trace, open(os.path.join(root, f"tools/compare/traces/{sid}.json"), "w"))
    print(sid, MOVES[move])
for name in MOVES:
    build(name, "foe", name)
for name in ("growl", "tackle", "ember", "absorb", "doubleedge", "sonicboom"):
    build(name, "plr", name)
