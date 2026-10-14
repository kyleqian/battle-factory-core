#!/usr/bin/env python3
"""fpc177: stage the Focus Punch edge-route cards (ISSUES #139) from the R4 BRELOOM-vs-JOLTEON template, Scene OFF and ON.
  a-switch      player voluntary switch (Pokemon -> party slot 1 -> SHIFT) against an opponent BRELOOM that picks Focus Punch (x4 slots)
  b1-two-users  player BRELOOM (Focus Punch, slot 2) vs opponent HITMONLEE (Focus Punch x4): two pre-passes in one turn
  b2-*          R4 card (player BRELOOM Focus Punch vs faster JOLTEON) with Jolteon's action-1 move swapped: Scratch / Thunder Wave / Agility
usage: fpc177Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = os.path.join(ROOT, "tools/probe/rcp143/r4-focuspunch-breloom-jolteon-off.json")
base = json.load(open(TEMPLATE))
BREL, JOLT, MAGI, HITL = 307, 135, 129, 106
FOCUS = [202, 73, 264, 29]  # Giga Drain / Leech Seed / Focus Punch / Headbutt (slot 2 = Focus Punch)

def mon(species, moves):
    m = copy.deepcopy(base["overrides"]["parties"]["player"][0])
    m["species"], m["moves"] = species, moves
    return m

FP_TRACE = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["DOWN"]}, {"frames": 30, "buttons": []},
            {"frames": 2, "buttons": ["A"]}]
SWITCH_TRACE = [{"frames": 2, "buttons": ["DOWN"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 118, "buttons": []},
                {"frames": 2, "buttons": ["RIGHT"]}, {"frames": 38, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 38, "buttons": []},
                {"frames": 2, "buttons": ["A"]}]
bench = lambda: [mon(MAGI, [150] * 4), mon(MAGI, [150] * 4)]
CASES = {  # slug: (player party, opponent party, trace head, idle frames, description)
    "a-switch": ([mon(JOLT, [28] * 4)] + bench(), [mon(BREL, [264] * 4)] + bench(), SWITCH_TRACE, 1300,
                 "player JOLTEON voluntarily switches to MAGIKARP; opponent BRELOOM Focus Punch x4"),
    "b1-two-users": ([mon(BREL, FOCUS)] + bench(), [mon(HITL, [264] * 4)] + bench(), FP_TRACE, 1500,
                     "player BRELOOM Focus Punch + opponent HITMONLEE Focus Punch: two pre-passes"),
    "b2-hit-scratch": ([mon(BREL, FOCUS)] + bench(), [mon(JOLT, [10] * 4)] + bench(), FP_TRACE, 766, "action 1 = Jolteon Scratch (hit)"),
    "b2-status-thunder-wave": ([mon(BREL, FOCUS)] + bench(), [mon(JOLT, [86] * 4)] + bench(), FP_TRACE, 766, "action 1 = Jolteon Thunder Wave (status ailment)"),
    "b2-statup-agility": ([mon(BREL, FOCUS)] + bench(), [mon(JOLT, [97] * 4)] + bench(), FP_TRACE, 766, "action 1 = Jolteon Agility (self stat up)"),
}
index = {}
for slug, (player, opponent, head, idle, desc) in CASES.items():
    for scene in ("off", "on"):
        d = copy.deepcopy(base)
        d["profile"] = "battle-scene-" + scene
        d["overrides"]["parties"] = {"player": player, "opponent": opponent}
        segs = copy.deepcopy(head) + [{"frames": idle, "buttons": []}]
        d["trace"]["segments"] = segs
        d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
        name = f"fpc177-{slug}-{scene}.json"
        index[name] = {"case": slug, "scene": scene, "description": desc, "seed": d["seed"]}
        open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
        print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
