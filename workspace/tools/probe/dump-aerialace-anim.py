#!/usr/bin/env python3
"""S7 slice R rung (b) groundwork (mechanisms 1-3 fresh re-derivation +
mechanism 4's per-tick coefficient, docs/aerial-ace-notes.md): per-tick RAM
dump for turn 10's AERIAL_ACE animation window. Extends dump-quickattack-
anim.py's own convention (sprite slots 0-9, x/y/x2/y2/inUse/invisible/oam)
with the `data[]` general-purpose fields (struct Sprite, include/sprite.h
offset 0x2E, 8 x s16) needed to read the complex-palette-blend sprite's own
sTimer/sDelay/sNumBlends/sBlendY1/sBlendY2 state directly (battle_anim_
normal.c AnimComplexPaletteBlend/_Step1/_Step2), plus a a few representative
BG/OBJ palette colors to empirically confirm the blend is a 2-step palette
RAM write, not a smooth per-tick ramp.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-aerialace-anim.py <trace.json> <output.json> <startTick> <endTick>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> <endTick>")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
SLOTS = list(range(10))

BLDCNT = 0x04000050
BLDALPHA = 0x04000052

GBATTLERSPRITEIDS = 0x020241E4

BG_PLTT = 0x05000000
OBJ_PLTT = 0x05000200


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def read_s16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return s16(lo | (hi << 8))

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def record(tick: int) -> dict:
        row = {
            "tick": tick,
            "battler0slot": oracle.read_u8(GBATTLERSPRITEIDS + 0),
            "battler1slot": oracle.read_u8(GBATTLERSPRITEIDS + 1),
        }
        for slot in SLOTS:
            base = GSPRITES + slot * SPRITE_SIZE
            attr0 = read_u16(base + 0x00)
            attr1 = read_u16(base + 0x02)
            attr2 = read_u16(base + 0x04)
            flags = read_u16(base + 0x3E)
            data = [read_s16(base + 0x2E + 2 * i) for i in range(8)]
            row[f"s{slot}"] = {
                "x": read_s16(base + 0x20),
                "y": read_s16(base + 0x22),
                "x2": read_s16(base + 0x24),
                "y2": read_s16(base + 0x26),
                "inUse": bool(flags & 0x1),
                "invisible": bool(flags & 0x4),
                "objMode": (attr0 >> 10) & 0x3,
                "shape": (attr0 >> 14) & 0x3,
                "size": (attr1 >> 14) & 0x3,
                "tileNum": attr2 & 0x3FF,
                "matrixNum": (attr1 >> 9) & 0x1F,
                "paletteNum": (attr2 >> 12) & 0xF,
                "priority": (attr2 >> 10) & 0x3,
                "data": data,
            }
        row["bldcnt"] = read_u16(BLDCNT)
        row["bldalpha"] = read_u16(BLDALPHA)
        # Representative palette colors: BG palette 1 color 1 (F_PAL_BG's
        # own darken target per Move_AERIAL_ACE's selector), and battler0/1's
        # own OBJ palette color 1 (F_PAL_BATTLERS) - enough to see the
        # complex-palette-blend sprite's writes land, without dumping all 16
        # colors x 4+ palettes every tick.
        row["bgPal1Color1"] = read_u16(BG_PLTT + 1 * 32 + 2 * 1)
        b0 = row["battler0slot"]
        b1 = row["battler1slot"]
        row["objPalB0Color1"] = read_u16(OBJ_PLTT + row[f"s{b0}"]["paletteNum"] * 32 + 2 * 1) if b0 < 10 else None
        row["objPalB1Color1"] = read_u16(OBJ_PLTT + row[f"s{b1}"]["paletteNum"] * 32 + 2 * 1) if b1 < 10 else None
        return row

    rows = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        rows.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick < START_TICK:
                continue
            if tick > END_TICK:
                continue
            rows.append(record(tick))
            if tick >= END_TICK:
                break
        else:
            continue
        break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
