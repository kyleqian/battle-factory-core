#!/usr/bin/env python3
"""b4m: one battle lab's ROM script events next to the engine's presentation commands (frames = the lab's own clock, ROM probe frame k = engine state.frame k).

usage: b4mTable.py DIR NAME [--span A:B] [--rows]
DIR holds NAME.rom.json (tools/run-mgba-probe.py ... hcr3mProbe.py DIR/NAME.rom.json tools/battle-lab/NAME.json) and NAME.eng.json (b4mEngine.ts NAME).
Prints the summary line (P print start, R print release, E attackanimation exec, A0 / A1 gAnimScriptActive edges, N the next controller commands) and the engine
commands with their timing and the frame the body's source clock reaches age 0 (engine R = the move-animation command's start, engine A0 = age 0).
The ROM body lead is R -> A0 - 3 (docs/lead1m-rule-lead-design.md: R -> A = L + 3); the engine's presented lead is bodyLeadFrames."""
import json
import sys
from pathlib import Path

d, name = Path(sys.argv[1]), sys.argv[2]
rest = sys.argv[3:]
lo, hi = (int(x) for x in rest[rest.index("--span") + 1].split(":")) if "--span" in rest else (0, 10**9)
rom = json.load(open(d / f"{name}.rom.json"))
eng = json.load(open(d / f"{name}.eng.json"))
names = rom["names"]
rows = [(f, ptr, ex, anim) for f, ptr, ex, anim, *_ in rom["rows"]]
lab = lambda p: names.get(hex(p), hex(p))
script = [r for r in rows if r[1] >= 0x08000000]
commit = 22
# print: first ex>0 row after the commit
pi = next(i for i, r in enumerate(script) if r[0] >= commit and r[2] > 0)
P = script[pi][0]
ri = next(i for i in range(pi, len(script)) if script[i][2] == 0)
R = script[ri][0]
ei = next((i for i in range(ri, len(script)) if script[i][2] > 0), None)
E = script[ei][0] if ei is not None else None
a0 = next((r[0] for r in rows if r[0] >= R and r[3] == 1), None)
a1 = next((r[0] for r in rows if a0 is not None and r[0] > a0 and r[3] == 0), None)
nxt = []
last_ex = 0
for f, ptr, ex, anim in rows:
    if a1 is not None and f >= a1 and ex > 0 and last_ex == 0 and f > a1:
        nxt.append((f, lab(ptr)))
    last_ex = ex
n_instr = sum(1 for r in script if R < r[0] < (E or R))
print(f"{name}: ROM P {P} R {R} E {E} A0 {a0} A1 {a1}  R->A0 {None if a0 is None else a0 - R} (L {None if a0 is None else a0 - R - 3}, {n_instr} instruction rows R..E)  A0->A1 {None if a1 is None else a1 - a0}")
print("  ROM next commands after A1: " + ", ".join(f"{f}({f - (a1 or 0):+d}) {l}" for f, l in nxt[:6]))
cmds = eng["cmds"]
mv = next((c for c in cmds if c[3] == "move-animation"), None)
if mv is not None:
    i = cmds.index(mv)
    after = cmds[i + 1:i + 5]
    t = mv[6] or {}
    print(f"  ENG move-animation start {mv[0]} (R eq {mv[0] - R:+d}) age0 {mv[7]} -> R->A0 {None if mv[7] is None else mv[7] - mv[0]} (ROM {None if a0 is None else a0 - R})  timing {json.dumps(t)}")
    print("  ENG next commands: " + ", ".join(f"{c[0]}({c[0] - (mv[7] or 0):+d} from age0) {c[3]}" for c in after))
if "--rows" in rest or True:
    out = []
    last = None
    for f, ptr, ex, anim in rows:
        key = (lab(ptr).split("+")[0], ex > 0, anim)
        if key == last:
            continue
        last = key
        out.append((f, 0, f"ROM  {lab(ptr)} ex{ex} anim{anim}"))
    for f, i, pan in eng["se"]:
        out.append((f, 1, f"ENG  SE {i}"))
    for c in cmds:
        out.append((c[0], 2, f"ENG  cmd {c[1]}.{c[2]} {c[3]} b{c[4]} mv{c[5]} {json.dumps(c[6])}" + (f" age0@{c[7]}" if c[7] is not None else "")))
    for f, _, t in sorted(out):
        if lo <= f <= hi:
            print(f"{f:6d} {t}")
