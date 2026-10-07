#!/usr/bin/env python3
"""prep22: measured allocator check. Replays each body's sprite birth/free stream (prep22Probe.py spawns) against a lowest-free-slot allocator seeded with the
in-use set at activation. A frame's births must occupy exactly the k lowest free slots (set equality), with that frame's frees applied BEFORE (order 'free-first')
or AFTER ('birth-first') the births. Also checks task slots: each Task create takes the lowest free slot (taskEvents streams).
usage: prep22LowestFree.py STATE_DIR OUT.json"""
import json, sys, glob
from pathlib import Path
SD, OUT = Path(sys.argv[1]), Path(sys.argv[2])
MOVES = {"signal-beam": 324, "lovely-kiss": 142, "sheer-cold": 329, "spikes": 191, "octazooka": 190, "skill-swap": 285, "shock-wave": 351}
res = {}
def lowest(used, k, lim):
    return [s for s in range(lim) if s not in used][:k]
for mv, mid in MOVES.items():
    for f in sorted(glob.glob(str(SD / f"*{mv}*-r1.json"))):
        name = Path(f).name[:-8]
        if not (name.startswith(f"mechanic-{mv}-") or name.startswith(f"prep22-{mv}-alt-")): continue
        d = json.load(open(f)); b = next(x for x in d["bodies"] if x["move"] == mid); A, E = b["start"], b["end"]
        used = set(b["atActivation"]["sprites"])
        frames = {}
        for x in d["spawns"]:
            if A <= x["f"] <= E + 1: frames.setdefault(x["f"], {"+": [], "-": []})[x["ev"]].append(x["slot"])
        ok_free_first = ok_birth_first = 0; bad = []
        u1, u2 = set(used), set(used)
        for fr in sorted(frames):
            ev = frames[fr]
            # free-first
            u1 -= set(ev["-"]); a = sorted(ev["+"]) == lowest(u1, len(ev["+"]), 64); u1 |= set(ev["+"])
            # birth-first
            c = sorted(ev["+"]) == lowest(u2, len(ev["+"]), 64); u2 |= set(ev["+"]); u2 -= set(ev["-"])
            ok_free_first += a; ok_birth_first += c
            if not (a or c): bad.append([fr - A, ev])
        nf = len(frames)
        # tasks
        tused = set(b["atActivation"]["tasks"]); tbad = 0; tn = 0; prev = set(tused)
        for fr, tf, dat in d["taskEvents"]:
            if A - 1 <= fr <= E + 1:
                cur = {int(k) for k in tf}; new = sorted(cur - prev); tn += len(new)
                if new and new != lowest(prev - (prev - cur) if False else (prev & cur), len(new), 16): tbad += 1
                prev = cur
        res[name] = {"frames": nf, "freeFirstOk": ok_free_first, "birthFirstOk": ok_birth_first, "eitherOk": nf - len(bad), "bad": bad[:3], "taskBirths": tn, "taskNotLowestFree": tbad}
        print(name[-42:], res[name]["frames"], ok_free_first, ok_birth_first, len(bad), "tasks", tn, tbad)
json.dump(res, open(OUT, "w"), indent=0)
