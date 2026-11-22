#!/usr/bin/env python3
"""drv2: per-window before / after of two T2 rescores (t2Attribute.py output with labels base= and after=).
usage: delta.py ATTR.json DRIVEDIR [SCENE=on|off]   -> per (seed, decision) the rows that got WORSE / BETTER (|offset| base -> after), summed
Decision index = menu-open anchor of the segment the ROM frame falls in (resolution k = [commit_k, menuOpen_k+1)); the tail after the last anchor is decision N-1."""
import json, sys
from collections import defaultdict
from pathlib import Path

attr, drivedir, scene = json.load(open(sys.argv[1])), Path(sys.argv[2]), (sys.argv[3] if len(sys.argv) > 3 else "on")
b, f = attr["base"]["rows"], attr["after"]["rows"]
anchors = {}
def dec(seed, frame):
    if seed not in anchors:
        anchors[seed] = json.load(open(drivedir / f"{seed}-{scene}.drive.json"))["drive"]["anchors"]
    a = anchors[seed]
    d = 0
    for x in a:
        if frame >= x["commitFrame"]:
            d = x["index"]
    return d
win = defaultdict(lambda: {"worse": [], "better": []})
for k in b:
    seed, frame = k.split("|")[:2]
    ob, of = b[k][0], f[k][0]
    if ob == of: continue
    w = win[(int(seed), dec(seed, int(frame)))]
    w["worse" if abs(of) > abs(ob) else "better"].append((int(frame), k.split("|")[2:5], ob, of, b[k][2]))
tw = tb = 0
for (s, d), w in sorted(win.items()):
    gw = sum(abs(o) - abs(p) for _, _, p, o, _ in w["worse"]); gb = sum(abs(p) - abs(o) for _, _, p, o, _ in w["better"])
    tw += gw; tb += gb
    print(f"s{s} d{d}: worse {len(w['worse'])} rows +{gw}, better {len(w['better'])} rows -{gb}")
    for kind in ("worse", "better"):
        for fr, kk, p, o, c in w[kind][:6]:
            print(f"   {kind[0].upper()} rf {fr} {'|'.join(kk)} {c}: {p:+d} -> {o:+d}")
print(f"TOTAL worse +{tw} better -{tb} net {tw - tb:+d}")
