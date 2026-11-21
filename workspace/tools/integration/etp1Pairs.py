#!/usr/bin/env python3
"""etp1: pair the ROM's print rows (the exec flag rises on a waitmessage / ppreduce pointer: a print's controller command; opcode read from the ROM) with the engine's message commands, in order,
and print ENG - ROM first glyph (ROM first glyph = the exec row + 1) per pair, for every lab table in DIR (DIR/<lab>-<scene>.{rom,eng}.json).
usage: etp1Pairs.py DIR [lab-prefix] [--from-label SUBSTR]"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GBA = (ROOT / "reference/pokeemerald/pokeemerald.gba").read_bytes()
# the exec flag is set by the print and the script pointer has already advanced: the next instruction is the print's waitmessage (0x12) or, after attackstring, ppreduce (0x03)
PRINT_OPS = {0x12: "waitmessage", 0x03: "ppreduce"}


def rom_prints(path):
    d = json.load(open(path))
    names = d["names"]
    out, prev_exec, prev_ptr = [], 0, None
    for f, ptr, ex, anim, *_ in d["rows"]:
        if ex != 0 and (prev_exec == 0 or ptr != prev_ptr) and 0x08000000 <= ptr < 0x0A000000:
            op = GBA[ptr - 0x08000000]
            if op in PRINT_OPS:
                out.append((f + 1, names.get(hex(ptr), hex(ptr)), PRINT_OPS[op]))
        prev_exec, prev_ptr = ex, ptr
    return out


def eng_prints(path):
    return [(c[0], c[2], c[3], c[4]) for c in json.load(open(path))["cmds"] if c[1] == "message"]


def align(roms, engs):
    """Pair each engine message with the next ROM print of the same script label (an unmatched one on either side is skipped)."""
    pairs, j = [], 0
    for e in engs:
        k = next((k for k in range(j, len(roms)) if roms[k][1].split("+")[0] == e[2]), None)
        if k is not None:
            pairs.append((roms[k], e))
            j = k + 1
    return pairs


def main():
    d = Path(sys.argv[1])
    prefix = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else ""
    for rom in sorted(d.glob(f"{prefix}*.rom.json")):
        base = rom.name[: -len(".rom.json")]
        eng = d / f"{base}.eng.json"
        if not eng.exists():
            continue
        r, e = rom_prints(rom), eng_prints(eng)
        if "--compact" in sys.argv:
            pairs = align(r, e)
            parts = [f"{ee[1].replace('STRINGID_', '')}{ee[0] - rr[0]:+d}" for rr, ee in pairs]
            print(f"{base} [{len(pairs)}/{len(r)}/{len(e)}] " + " ".join(parts))
            continue
        print(f"== {base}: ROM prints {len(r)}, engine messages {len(e)}")
        for i in range(max(len(r), len(e))):
            rr = r[i] if i < len(r) else None
            ee = e[i] if i < len(e) else None
            delta = f"{ee[0] - rr[0]:+d}" if rr and ee else "  ?"
            print(f"  {i:2d} ROM {rr[0] if rr else '-':>5} {rr[1] if rr else '':<48} | ENG {ee[0] if ee else '-':>5} {ee[1] if ee else '':<34} {ee[2] if ee else ''}  => {delta}")


main()
