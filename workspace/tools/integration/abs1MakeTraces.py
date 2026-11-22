#!/usr/bin/env python3
"""abs1: derive A-held / A-mashed variants of existing compare traces (writes tools/compare/traces/abs1-*.json)."""
import json, os

T = os.path.join(os.path.dirname(__file__), "..", "compare", "traces")

def expand(trace):
    frames = []
    for s in trace["segments"]:
        frames += [tuple(s["buttons"])] * s["frames"]
    return frames

def compress(frames):
    segs = []
    for b in frames:
        if segs and segs[-1]["buttons"] == list(b):
            segs[-1]["frames"] += 1
        else:
            segs.append({"frames": 1, "buttons": list(b)})
    return segs

def variant(base, name, edits, capture=None):
    t = json.load(open(os.path.join(T, base + ".json")))
    f = expand(t)
    for lo, hi, pattern in edits:
        while len(f) < hi:
            f.append(())
        for i in range(lo, hi):
            f[i] = pattern(i - lo)
    t["segments"] = compress(f)
    if capture:
        t["captureFrames"] = list(range(capture[0], capture[1] + 1))
    t["oracleProfile"] = t.get("oracleProfile", "battle-scene-on")
    json.dump(t, open(os.path.join(T, name + ".json"), "w"), indent=1)
    print(name, sum(s["frames"] for s in t["segments"]), len(t.get("captureFrames", [])))

hold = lambda i: ("A",)
mash = lambda i: ("A",) if i % 2 == 0 else ()

variant("lbrb-happy-a-off", "abs1-lobby-hold-a-off",
        [(5152, 5250, hold), (5252, 5350, hold), (5352, 5395, hold)], (5140, 5395))
variant("lbrb-happy-a-off", "abs1-lobby-mash-a-off", [(5152, 5396, mash)], (5140, 5395))
variant("room-msgbox", "abs1-room-intro-hold-a-on", [(700, 836, hold)], (700, 851))
variant("room-msgbox", "abs1-room-intro-mash-a-on", [(700, 851, mash)], (700, 851))
variant("hcr1b-tackle-plr-off", "abs1-tackle-hold-a-off", [(20, 133, hold)])
variant("hcr1b-tackle-plr-off", "abs1-tackle-mash-a-off", [(22, 133, mash)])
variant("hcr2-tackle-plr-on", "abs1-tackle-hold-a-on", [(20, 253, hold)])
variant("hcr2-tackle-plr-on", "abs1-tackle-mash-a-on", [(22, 253, mash)])
variant("draft-menu", "abs1-draft-mash-a-on", [(0, 148, mash)])
variant("obr251-opponent-faint-off", "abs1-faint-hold-a-off", [(500, 800, hold)], (495, 750))
variant("obr251-opponent-faint-off", "abs1-faint-mash-a-off", [(500, 800, mash)], (495, 750))
