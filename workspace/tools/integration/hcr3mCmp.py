#!/usr/bin/env python3
"""hcr3m: one table of a T2 seed's turn, ROM script commands / sounds next to the engine's presentation commands / sounds (frames from each side's own commit).

usage: hcr3mCmp.py DIR SEED [--decision N] [--span A:B]
DIR holds SEED-on.{eng-cmd,rom,snd,drive}.json (eng-cmd = soundCensusRomReplay replay --cmdtrace=1; rom = hcr3mProbe.py --from <commit-30>; snd = ROM sound
pass; drive = ROM drive with the decision anchors). N = decision index (default last). Prints the ROM script rows (ptr change, deduplicated per command),
the ROM and engine SE rows and the engine cmd rows, sorted by frame from the commit."""
import json
import sys
from pathlib import Path

d, seed = Path(sys.argv[1]), sys.argv[2]
rest = sys.argv[3:]
which = int(rest[rest.index("--decision") + 1]) if "--decision" in rest else -1
lo, hi = (int(x) for x in rest[rest.index("--span") + 1].split(":")) if "--span" in rest else (-40, 1600)
eng = json.load(open(d / f"{seed}-on.eng-cmd.json"))
rom = json.load(open(d / f"{seed}-on.rom.json"))
snd = json.load(open(d / f"{seed}-on.snd.json"))
drv = json.load(open(d / f"{seed}-on.drive.json"))["drive"]
ec = [x for x in eng["decisions"] if x.get("commitFrame") is not None][which]["commitFrame"]
rc = drv["anchors"][which]["commitFrame"]
lines = []
last = None
for f, ptr, ex, anim, main, c0, h0, h1, mv, tp in rom["rows"]:
    label = rom["names"].get(hex(ptr), hex(ptr)).split("+")[0]
    if (label, ex > 0, h0, h1) == last and not (ex > 0 and "--all" in rest):
        continue
    last = (label, ex > 0, h0, h1)
    lines.append((f - rc, 0, f"ROM  {rom['names'].get(hex(ptr), hex(ptr))} ex{ex} hp{h0}/{h1} mv{mv}"))
for e in snd["events"]:
    if e["kind"] == "se":
        lines.append((e["frame"] - rc, 1, f"ROM  SE {e['id']} {e['name']}"))
for r in eng["sound"]:
    if r[1] == "se":
        lines.append((r[0] - ec, 2, f"ENG  SE {r[2]}"))
for r in eng["cmds"]:
    lines.append((r[0] - ec, 3, f"ENG  cmd {r[1]}.{r[2]} {r[3]} b{r[4]} {r[5]}>{r[6]} lead={r[7]} bodyLead={r[8] if not isinstance(r[8], dict) else 'mv' + str(r[8].get('moveId'))} anim={r[9]} min={r[10]}"))
print(f"engine commit {ec} rom commit {rc}")
for f, _, text in sorted(lines):
    if lo <= f <= hi:
        print(f"{f:6d} {text}")
