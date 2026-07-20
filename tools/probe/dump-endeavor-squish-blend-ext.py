#!/usr/bin/env python3
"""Extends `dump-endeavor-squish.py` (docs/battle-menu-notes.md §15b) past
its own committed 2996-3012 window: same `gOamMatrices`/sprite `y2` read,
PLUS a direct read of the attacker's own real OBJ palette in both
`gPlttBufferFaded` and `gPlttBufferUnfaded` (`bin/oracle symbols
gPlttBufferFaded gPlttBufferUnfaded`) to solve the concurrent blend's real
`coeff` (`BlendPalette`, `reference/pokeemerald/src/util.c:264-278`:
`faded = unfaded + ((target-unfaded)*coeff)>>4` per 5-bit channel) directly
from RAM instead of pixel-solving against oracle PNGs (§15b's own flagged
follow-up - "if a future session extends past tick 3007, RAM-confirming
gPlttBufferFaded's own per-tick coeff would be the more direct check").

OBJ palette slot resolved dynamically from the attacker sprite's own
`oam.paletteNum` (`struct OamData`, `include/gba/types.h:55-72` - attr2 is
the u16 at Sprite+0x04, paletteNum is bits 12-15). OBJ palettes occupy
`gPlttBufferFaded`/`Unfaded` slots 16-31 (BG palettes are 0-15), 16 u16
colors (32 bytes) each - `PLTT_ID(paletteNum)` = `0x100 + paletteNum` in
16-bit-color units, `*2` for the byte address.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-endeavor-squish-blend-ext.py <trace.json> \
        <output.json> <startTick> <endTick>
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
GOAMMATRICES = 0x02021BC0
OAMMATRIX_SIZE = 0x08
GBATTLERSPRITEIDS = 0x020241E4
GBATTLEANIMATTACKER = 0x02038436

GPLTTBUFFERFADED = 0x02037B14
GPLTTBUFFERUNFADED = 0x02037714

SPRITE_Y2_OFF = 0x26
SPRITE_OAM_ATTR1_OFF = 0x02
SPRITE_OAM_ATTR2_OFF = 0x04


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
        attacker_battler = oracle.read_u8(GBATTLEANIMATTACKER)
        attacker_slot = oracle.read_u8(GBATTLERSPRITEIDS + attacker_battler)
        base = GSPRITES + attacker_slot * SPRITE_SIZE

        attr1 = read_u16(base + SPRITE_OAM_ATTR1_OFF)
        matrix_num = (attr1 >> 9) & 0x1F
        attr2 = read_u16(base + SPRITE_OAM_ATTR2_OFF)
        palette_num = (attr2 >> 12) & 0xF

        mbase = GOAMMATRICES + matrix_num * OAMMATRIX_SIZE
        # OBJ palette N is 16-bit-color index 0x100 + N*16 (BG palettes are
        # the first 0x100 = 16 palettes x16 colors; each OBJ palette is also
        # 16 colors) - *2 for the byte address. (First attempt used
        # +palette_num instead of +palette_num*16 and read garbage/wrong-slot
        # data - a near-flat-white block, not a real sprite palette.)
        pal_base_faded = GPLTTBUFFERFADED + (0x100 + palette_num * 16) * 2
        pal_base_unfaded = GPLTTBUFFERUNFADED + (0x100 + palette_num * 16) * 2

        faded = [read_u16(pal_base_faded + 2 * i) for i in range(16)]
        unfaded = [read_u16(pal_base_unfaded + 2 * i) for i in range(16)]

        return {
            "tick": tick,
            "matrixA": read_s16(mbase + 0),
            "matrixD": read_s16(mbase + 6),
            "y2": read_s16(base + SPRITE_Y2_OFF),
            "paletteNum": palette_num,
            "faded": faded,
            "unfaded": unfaded,
        }

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


main()
