#!/usr/bin/env python3
"""fsc1: write the semi-invulnerable-target hit labs + compare traces (both scenes).

Lv100 foe Rattata with `charge` x4 (Dig / Fly / Dive) acts first; the Lv50 player Rattata answers with `hit` x4 (Earthquake / Gust / Surf / Twister / Thunder), which
hits the hidden foe (hit animation on an invisible sprite). Dense captures run from the move-menu A through the hit, the hp bar and the next prints.
Writes tools/battle-lab/fsc1-<case>-<scene>.json and tools/compare/traces/fsc1-<case>-<scene>.json (stages: FSC1_CASES in tools/compare/appTrace.ts).
"""
import json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/aud242o-rollout5-player-on.json")))
CASES = {"dig-eq": (91, 89), "fly-gust": (19, 16), "dive-surf": (291, 57)}
FRAMES = int(sys.argv[1]) if len(sys.argv) > 1 else 330
def build(case, scene):
    charge, hit = CASES[case]
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = f"battle-scene-{scene}"
    plr, foe = lab["overrides"]["parties"]["player"][0], lab["overrides"]["parties"]["opponent"][0]
    foe["level"], plr["level"] = 100, 50
    foe["moves"], plr["moves"] = [charge] * 4, [hit] * 4
    lab["trace"]["segments"][3]["frames"] = FRAMES
    sid = f"fsc1-{case}-{scene}"
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
    trace = {"appRoute": "generated-orchestrator", "oracleProfile": f"battle-scene-{scene}", "appStage": {"id": sid, "frame": 0},
             "oracleBattleLab": {"scenario": f"../../battle-lab/{sid}.json"}, "segments": lab["trace"]["segments"],
             "captureFrames": list(range(24, 2 + 18 + 2 + FRAMES + 1))}
    json.dump(trace, open(os.path.join(root, f"tools/compare/traces/{sid}.json"), "w"))
    print(sid, charge, hit)
def build_ko(scene):
    """c2: the Lv50 player's Earthquake KOs a Lv5 foe in the hit-all loop (no semi-invulnerable target)."""
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = f"battle-scene-{scene}"
    plr, foe = lab["overrides"]["parties"]["player"][0], lab["overrides"]["parties"]["opponent"][0]
    plr["level"], foe["level"] = 50, 5
    plr["moves"], foe["moves"] = [89] * 4, [69] * 4
    lab["trace"]["segments"][3]["frames"] = 900
    sid = f"fsc1-eqko-{scene}"
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
    trace = {"appRoute": "generated-orchestrator", "oracleProfile": f"battle-scene-{scene}", "appStage": {"id": sid, "frame": 0},
             "oracleBattleLab": {"scenario": f"../../battle-lab/{sid}.json"}, "segments": lab["trace"]["segments"],
             "captureFrames": list(range(24, 2 + 18 + 2 + 900 + 1))}
    json.dump(trace, open(os.path.join(root, f"tools/compare/traces/{sid}.json"), "w"))
    print(sid)
for scene in ("off", "on"):
    for case in ("dig-eq", "fly-gust", "dive-surf"):
        build(case, scene)
    build_ko(scene)
