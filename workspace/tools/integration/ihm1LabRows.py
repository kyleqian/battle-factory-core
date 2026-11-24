#!/usr/bin/env python3
"""ihm1: merged ROM script rows / engine commands of a labCompare run (frames from the lab's frame 0).

usage: ihm1LabRows.py RUNDIR LAB.SCENE [LO:HI]    (RUNDIR/LAB.SCENE.{rom,eng}.json from labCompare.sh; prints ROM label changes with exec flag and hp, ENG cmds with min frames)"""
import json
import sys
from pathlib import Path

d, name = Path(sys.argv[1]), sys.argv[2]
lo, hi = (int(x) for x in sys.argv[3].split(":")) if len(sys.argv) > 3 else (0, 10**9)
rom = json.load(open(d / f"{name}.rom.json"))
eng = json.load(open(d / f"{name}.eng.json"))
lines = []
last = None
for f, ptr, ex, anim, main, c0, h0, h1, mv, tp in rom["rows"]:
    label = rom["names"].get(hex(ptr), hex(ptr))
    key = (label.split("+")[0], ex > 0, h0, h1)
    if key == last:
        continue
    last = key
    lines.append((f, 0, f"ROM  {label} ex{ex} hp{h0}/{h1} mv{mv} tp{tp}"))
for r in eng["se"] if "se" in eng else []:
    lines.append((r[0], 1, f"ENG  SE {r[1:]}"))
for r in eng["cmds"]:
    lines.append((r[0], 2, f"ENG  cmd {r[1]}.{r[2]} {r[3]} b{r[4]} min={r[6]}"))
for f, _, t in sorted(lines):
    if lo <= f <= hi:
        print(f"{f:6d} {t}")
