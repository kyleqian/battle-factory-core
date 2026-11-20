#!/usr/bin/env python3
"""chg1: write the Scene OFF two-turn-move labs + compare traces (charge turn, turn end, the unleash turn's first print).

Two Rattata (Lv100 vs Lv50) with the move x4 / Seismic Toss x4, as in hcr1bLabs.py. Turn 1 (the Lv100 side charges, the Lv50 side answers with
Seismic Toss), a second A, A at the ROM's menu (frame W1), turn 2 (the unleash). Writes tools/battle-lab/chg1-<case>-<side>-off.json and
tools/compare/traces/chg1-<case>-<side>-off.json (stages: CHG1_MOVES in tools/compare/appTrace.ts).
"""
import json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/aud242o-rollout5-player-on.json")))
MOVES = {"dig": 91, "fly": 19, "bounce": 340, "dive": 291, "solarbeam": 76, "razorwind": 13, "skullbash": 130, "skyattack": 143}
SEEDS = {}  # keep in step with CHG1_SEEDS in appTrace.ts
W1, W2 = 350, 300
def build(case, side, move, w1=W1, w2=W2):
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = "battle-scene-off"
    lab["seed"] = SEEDS.get(case, 1)
    plr, foe = lab["overrides"]["parties"]["player"][0], lab["overrides"]["parties"]["opponent"][0]
    first, second = (foe, plr) if side == "foe" else (plr, foe)
    first["level"], second["level"] = 100, 50
    first["moves"], second["moves"] = [MOVES[move]] * 4, [69] * 4
    segs = [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": w1, "buttons": []},
            {"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": w2, "buttons": []}]
    total = sum(s["frames"] for s in segs)
    lab["trace"]["segments"] = segs
    sid = f"chg1-{case}-{side}-off"
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
    trace = {"appRoute": "generated-orchestrator", "oracleProfile": "battle-scene-off", "appStage": {"id": sid, "frame": 0},
             "oracleBattleLab": {"scenario": f"../../battle-lab/{sid}.json"}, "segments": segs,
             "captureFrames": list(range(24, total + 1))}
    json.dump(trace, open(os.path.join(root, f"tools/compare/traces/{sid}.json"), "w"))
    print(sid, MOVES[move], total)
if __name__ == "__main__":
    names = sys.argv[1:] or list(MOVES)
    for name in names:
        build(name, "foe", name)
        build(name, "plr", name)
