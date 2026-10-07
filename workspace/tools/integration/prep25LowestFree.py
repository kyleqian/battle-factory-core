#!/usr/bin/env python3
"""prep25: measured allocator check over EVERY body of each prep25 move (copy of prep22LowestFree.py, bodies looped). A frame's sprite births must occupy exactly the k lowest
free slots (set equality), with that frame's frees applied before ('free-first') or after ('birth-first'); task creates are checked against lowest-free task slots.
usage: prep25LowestFree.py STATE_DIR OUT.json"""
import json, sys
from pathlib import Path
SD, OUT = Path(sys.argv[1]), Path(sys.argv[2])
MOVES = {"dive": 291, "mach-punch": 183, "extrasensory": 326, "ice-ball": 301, "flatter": 260, "nightmare": 171, "psywave": 149, "revenge": 279, "snore": 173, "smog": 123,
         "sand-tomb": 328, "hyper-voice": 304, "sky-attack": 143, "superpower": 276}
lowest = lambda used, k, lim: [s for s in range(lim) if s not in used][:k]
res = {}
def check(d, b):
    A, E = b["start"], b["end"]; used = set(b["atActivation"]["sprites"]); frames = {}
    for x in d["spawns"]:
        if A <= x["f"] <= E + 1: frames.setdefault(x["f"], {"+": [], "-": []})[x["ev"]].append(x["slot"])
    u1, u2, ff, bf, bad = set(used), set(used), 0, 0, []
    for fr in sorted(frames):
        ev = frames[fr]
        u1 -= set(ev["-"]); a = sorted(ev["+"]) == lowest(u1, len(ev["+"]), 64); u1 |= set(ev["+"])
        c = sorted(ev["+"]) == lowest(u2, len(ev["+"]), 64); u2 |= set(ev["+"]); u2 -= set(ev["-"])
        ff += a; bf += c
        if not (a or c): bad.append([fr - A, ev])
    prev, tn, tbad = set(b["atActivation"]["tasks"]), 0, 0
    for fr, tf, dat in d["taskEvents"]:
        if A - 1 <= fr <= E + 1:
            cur = {int(k) for k in tf}; new = sorted(cur - prev); tn += len(new)
            if new and new != lowest(prev & cur, len(new), 16): tbad += 1
            prev = cur
    return {"frames": len(frames), "freeFirstOk": ff, "birthFirstOk": bf, "eitherOk": len(frames) - len(bad), "bad": bad[:3], "taskBirths": tn, "taskNotLowestFree": tbad}
for mv, mid in MOVES.items():
    for f in sorted(SD.glob("*-r1.json")):
        name = f.name[:-8]
        if not (name.startswith(f"mechanic-{mv}-") or name.startswith(f"prep25-{mv}-alt-")): continue
        d = json.load(open(f))
        for bi, b in enumerate(x for x in d["bodies"] if x["move"] == mid):
            r = res[f"{name}#{bi}"] = check(d, b)
            print(name[-40:], bi, r["frames"], r["freeFirstOk"], r["birthFirstOk"], r["eitherOk"], "tasks", r["taskBirths"], r["taskNotLowestFree"])
json.dump(res, open(OUT, "w"), indent=0)
