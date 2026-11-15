#!/usr/bin/env python3
"""lbw2: ROM gRngValue vs engine rngValue as a DRAW-COUNT offset along a compare trace, grouped into runs of constant per-frame delta.
usage: python3 tools/probe/lbw2-classify.py NAME [FIRST [LAST]]   reads .integration/evidence/lbw2/rom-NAME.json (lbw1-lobby-wander-rom.py rows) and
app-NAME.json (lbw2-app-rng.ts, stage rng replaced by the ROM cursor at the stage frame). offset k: app == lcg^k(rom) (app k draws ahead of the ROM).
Per-frame deltas use the ROM's own sRandCount and the app's LCG step count between consecutive frames; only the first jump needs a big search."""
import json, sys
from pathlib import Path
D = Path(".integration/evidence/lbw2")
M = 0xFFFFFFFF
A, C = 1103515245, 24691
def step(v): return (A * v + C) & M
def steps_between(a, b, lim=400):
    v = a
    for k in range(lim):
        if v == b: return k
        v = step(v)
    return None
def offset(rom, app, lim=400000):
    v = rom
    for k in range(lim):
        if v == app: return k
        v = step(v)
    v = app
    for k in range(1, lim):
        v = step(v)
        if v == rom: return -k
    return None
name = sys.argv[1]
rom = {r["f"]: r for r in json.loads((D / f"rom-{name}.json").read_text())["rows"]}
appj = json.loads((D / f"app-{name}.json").read_text()); app = {r["f"]: r for r in appj["rows"]}
stage = appj["stage"]["frame"]
entry = next(f for f in sorted(rom) if "ev" in rom[f])
first = int(sys.argv[2]) if len(sys.argv) > 2 else stage
last = int(sys.argv[3]) if len(sys.argv) > 3 else entry + 40
fs = [f for f in sorted(set(rom) & set(app)) if first <= f <= last]
print(f"{name}: stage frame {stage}, ROM Lobby-map first frame {entry}; offset k = app is k draws ahead of ROM")
off = {fs[0]: offset(rom[fs[0]]["rng"], app[fs[0]]["rng"])}
delta = {}
for a, b in zip(fs, fs[1:]):
    ra = steps_between(rom[a]["rng"], rom[b]["rng"]); aa = steps_between(app[a]["rng"], app[b]["rng"])
    if ra is None or aa is None: ra = rom[b]["cnt"] - rom[a]["cnt"]  # fall back to the ROM draw counter
    if aa is None: delta[b] = None; off[b] = None; continue
    delta[b] = aa - ra
    off[b] = None if off[a] is None else off[a] + delta[b]
runs = []; pd = "x"; start = fs[0]
for a, b in zip(fs, fs[1:]):
    d = delta[b]
    if d != pd:
        if pd != "x": runs.append((start, a, pd))
        start = a; pd = d
runs.append((start, fs[-1], pd))
print(f"  offset at f={fs[0]}: {off[fs[0]]}")
for a, b, d in runs:
    print(f"  f {a}..{b} (entry{a-entry:+d}..{b-entry:+d}) delta/frame {d}  offset {off[a]} -> {off[b]}  romcb2@{a}={rom[a]['cb2']:#x} appmode={app[a]['mode']} romcnt {rom[a]['cnt']}..{rom[b]['cnt']} appfree={app[b]['free']}")
