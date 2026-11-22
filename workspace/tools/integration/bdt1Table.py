#!/usr/bin/env python3
# NOTE: superseded for new work by tools/integration/labCompare.sh (one ROM probe + engine + aligned SE table tool); kept because receipts reference it.
"""bdt1: one battle lab's ROM SEs / script edges next to the engine's SEs / commands (frames = the lab's clock).
usage: bdt1Table.py DIR NAME [--span A:B]   DIR holds NAME.rom.json (hcr3mProbe), NAME.se.json (soundEventProbe lab) and NAME.eng.json (b4mEngine.ts)."""
import json
import sys
from pathlib import Path

d, name = Path(sys.argv[1]), sys.argv[2]
lo, hi = (int(x) for x in sys.argv[sys.argv.index("--span") + 1].split(":")) if "--span" in sys.argv else (0, 10**9)
rom = json.load(open(d / f"{name}.rom.json"))
se = json.load(open(d / f"{name}.se.json"))
eng = json.load(open(d / f"{name}.eng.json"))
names = rom["names"]
lab = lambda p: names.get(hex(p), hex(p))
rows = []
last = None
prev_anim = 0
for f, ptr, ex, anim, *_ in rom["rows"]:
    if ptr >= 0x08000000:
        key = (lab(ptr).split("+")[0], ex > 0)
        if key != last:
            rows.append((f, 0, f"ROM  {lab(ptr)} ex{ex}"))
            last = key
    if anim != prev_anim:
        rows.append((f, 0, f"ROM  anim {'start (A0)' if anim else 'end (A1)'}"))
        prev_anim = anim
romse = [(e["frame"], e["id"]) for e in se["events"] if e["kind"] == "se" and not e.get("noop")]
for f, i in romse:
    rows.append((f, 1, f"ROM  SE {i}"))
for f, i, pan in eng["se"]:
    rows.append((f, 2, f"ENG  SE {i}"))
for f, s, c, t, b, a, tm, age0 in eng["cmds"]:
    rows.append((f, 3, f"ENG  cmd {s}.{c} {t} b{b} anim={a} timing={json.dumps(tm)}" + (f" age0={age0}" if age0 else "")))
print(f"== {name}")
for f, _, t in sorted(rows):
    if lo <= f <= hi:
        print(f"{f:6d} {t}")
ids = {}
for tag, seq in (("ROM", romse), ("ENG", [(f, i) for f, i, _ in eng["se"]])):
    ids[tag] = seq
r, e = ids["ROM"], ids["ENG"]
print("SE compare (ROM frame / ENG frame / diff):", " ".join(f"{i}:{a}/{b}({b - a:+d})" for (a, i), (b, j) in zip(r, e) if i == j) + ("" if len(r) == len(e) else f"  LEN ROM {len(r)} ENG {len(e)}"))
