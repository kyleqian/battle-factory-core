#!/usr/bin/env python3
"""hcr3m: a sound-fixture lab turn table, ROM script rows / ROM SEs (tools/audio/fixtures/NAME.json events) next to the engine's commands / SEs.
usage: hcr3mLab.py DIR NAME [A:B]   (DIR holds NAME.rom.json from hcr3mProbe.py on tools/battle-lab/NAME-on.json and NAME.eng.json from hcr3mLabEngine.ts)
Frames are the lab's own clock (ROM probe frame k = fixture event frame k = engine state.frame k)."""
import json
import sys
from pathlib import Path

d, name = Path(sys.argv[1]), sys.argv[2]
lo, hi = (int(x) for x in sys.argv[3].split(":")) if len(sys.argv) > 3 else (0, 10**9)
rom = json.load(open(d / f"{name}.rom.json"))
eng = json.load(open(d / f"{name}.eng.json"))
fix = json.load(open(Path(__file__).resolve().parents[1] / "audio/fixtures" / f"{name}.json"))
rows, last = [], None
for f, ptr, ex, anim, main, c0, h0, h1, mv, tp in rom["rows"]:
    label = rom["names"].get(hex(ptr), hex(ptr)).split("+")[0]
    if (label, ex > 0, h0, h1) == last:
        continue
    last = (label, ex > 0, h0, h1)
    rows.append((f, 0, f"ROM  {rom['names'].get(hex(ptr), hex(ptr))} ex{ex} hp{h0}/{h1} mv{mv}"))
for e in fix["events"]:
    if e["kind"] == "se" and not e.get("noop"):
        rows.append((e["frame"], 1, f"ROM  SE {e['id']} pan{e['pan']}"))
for f, i, pan in eng["se"]:
    rows.append((f, 2, f"ENG  SE {i} pan{pan}"))
for f, s, c, t, b, a, lead, bl, mn in eng["cmds"]:
    rows.append((f, 3, f"ENG  cmd {s}.{c} {t} b{b} anim={a} bodyLead={bl} min={mn}"))
for f, _, t in sorted(rows):
    if lo <= f <= hi:
        print(f"{f:6d} {t}")
