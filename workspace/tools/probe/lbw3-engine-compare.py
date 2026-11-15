#!/usr/bin/env python3
"""lbw3: engine cursor / NPC state vs the ROM dump, per frame.
usage: python3 tools/probe/lbw3-engine-compare.py ROM.json APP.json [FIRST]   (FIRST defaults to the trace's appRngRebase frame)
Prints max |offset| of the 32-bit cursor over FIRST..last ROM Lobby frame, the first frame the cursor differs, and the first NPC-state mismatch."""
import json, sys
from pathlib import Path
M = 0xFFFFFFFF
def step(v): return (1103515245 * v + 24691) & M
def offset(rom, app, lim=3000):
    v = rom
    for k in range(lim):
        if v == app: return k
        v = step(v)
    v = app
    for k in range(1, lim):
        v = step(v)
        if v == rom: return -k
    return None
rom = {r["f"]: r for r in json.loads(Path(sys.argv[1]).read_text())["rows"]}
appj = json.loads(Path(sys.argv[2]).read_text()); app = {r["f"]: r for r in appj["rows"]}
trace = json.loads(Path(appj["trace"]).read_text())
first = int(sys.argv[3]) if len(sys.argv) > 3 else trace["appRngRebase"]["frame"]
lobby = [f for f in sorted(rom) if "ev" in rom[f]]
last = max(lobby); entry_map = lobby[0]
fs = [f for f in sorted(set(rom) & set(app)) if first <= f <= last]
mx = 0; firstdiff = None; offs = {}
for f in fs:
    o = offset(rom[f]["rng"], app[f]["rng"]) if rom[f]["rng"] != app[f]["rng"] else 0
    offs[f] = o
    if o != 0 and firstdiff is None: firstdiff = f
    mx = max(mx, abs(o) if o is not None else 10**9)
print(f"{Path(sys.argv[1]).name}: frames {fs[0]}..{fs[-1]} ({len(fs)}), ROM Lobby map first frame {entry_map}, max |offset| = {mx}")
if firstdiff is not None:
    print(f"  first cursor mismatch f={firstdiff} (entry{firstdiff-entry_map:+d}) offset {offs[firstdiff]}; app free={app[firstdiff]['free']} att={app[firstdiff]['att']}")
bad = None
for f in fs:
    r = rom[f]
    if "ev" not in r: continue
    a = app[f]
    for key, gfx in (("w", 16), ("m", 17)):
        e = next((e for e in r["ev"] if e["gfx"] == gfx and not e["player"]), None)
        if e is None or a[key] is None: continue
        want = [*e["cur"], *e["prv"], e["face"], e["data"][1], e["data"][3] if e["data"][1] == 3 else 0]
        got = a[key][:]; got[6] = got[6] if got[5] == 3 else 0
        if got != want and bad is None: bad = (f, key, got, want)
print("  NPC state: " + ("all frames match" if bad is None else f"first mismatch f={bad[0]} {bad[1]} app {bad[2]} rom {bad[3]}"))
