#!/usr/bin/env python3
"""etp1: ROM script rows (hcr3mProbe) next to the engine's presentation commands (etp1Engine.ts) for one lab, merged by frame.
usage: etp1Table.py ROM.json ENG.json [FROM_FRAME]
ROM lines: the rows where the controller exec flag becomes non-zero (a command was sent: printstring, healthbar, animation ...) as 'R frame label exec anim' (a printstring's first glyph = frame + 1);
engine lines: 'E frame type messageId script exec'."""
import json
import sys

rom = json.load(open(sys.argv[1]))
eng = json.load(open(sys.argv[2]))
start = int(sys.argv[3]) if len(sys.argv) > 3 else 0
names = rom["names"]
lines = []
prev_exec = 0
prev_ptr = None
for f, ptr, ex, anim, main, comm0, hp0, hp1, mv, tp in [r[:10] for r in rom["rows"]]:
    if ex != 0 and (prev_exec == 0 or ptr != prev_ptr):
        lines.append((f, 0, f"R {f:5d} {names.get(hex(ptr), hex(ptr))} exec={ex} anim={anim}"))
    prev_exec, prev_ptr = ex, ptr
for f, typ, mid, lab, ex, mn, hold, anim in eng["cmds"]:
    lines.append((f, 1, f"E {f:5d} {typ} {mid or ''} {lab or ''} x{ex} min={mn} hold={hold} {anim or ''}"))
for f, o, s in sorted(lines):
    if f >= start:
        print(s)
