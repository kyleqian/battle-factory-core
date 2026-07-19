#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for ROCK_SLIDE's rock-vs-rock OAM stacking
order (docs/battle-menu-notes.md §11's own named residual - the fixed
table-index draw order this run's engine used gets only ~71% of frames
right). Extends `dump-rockslide-sprites.py`'s rock-identification method
(scan all 64 `gSprites[]` slots for the `gFallingRockSpriteTemplate`
pointer) with the REAL ground truth for both open questions the residual
needs: (1) `CreateSprite`'s slot-allocation outcome, by reading `inUse`
for every slot each tick (not just rocks) so the persistent/non-rock
occupancy baseline is known, not guessed; (2) the REAL draw order itself,
by reading `sSpriteOrder`/`sSpritePriorities` DIRECTLY from RAM rather
than re-deriving `SortSprites`'s insertion-sort tie-break from source -
both are `EWRAM_DATA static` arrays in `src/sprite.c` with stable
addresses resolved once via
`arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf`
(they have no exported symbol, `bin/oracle symbols` can't find them):
    020217f4 b sSpriteOrder        (u8[64])
    02021774 b sSpritePriorities   (u16[64])
Reading `sSpriteOrder` directly sidesteps needing to simulate
`SortSprites`'s full persistent-history tie-break (§7.32's own "whole-scene
state" concern) - the real array's current permutation already encodes
that history exactly, whatever it is.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-rockslide-slot-order.py <trace.json> <output.json> \
        <startTick> <endTick>

<trace.json> is any oracle trace file with a top-level "segments" array
(captureFrames is ignored).
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
MAX_SPRITES = 64

SPRITE_Y_OFF = 0x22
SPRITE_Y2_OFF = 0x26
SPRITE_TEMPLATE_OFF = 0x14
SPRITE_ANIMNUM_OFF = 0x2A
SPRITE_OAM_Y_OFF = 0x00  # OamData.y:8 is the low byte of the first u16
SPRITE_OAM_PRIORITY_OFF = 0x04  # OamData tileNum:10/priority:2/paletteNum:4, u16
SPRITE_SUBPRIORITY_OFF = 0x43
SPRITE_FLAGS_OFF = 0x3E  # inUse bit0, invisible bit2

# From `bin/oracle symbols gFallingRockSpriteTemplate`.
ROCK_TEMPLATE = 0x08596B04

# nm -n --defined-only pokeemerald.elf (static EWRAM_DATA, src/sprite.c).
S_SPRITE_ORDER = 0x020217F4
S_SPRITE_PRIORITIES = 0x02021774


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
        rocks = []
        in_use = []
        all_slots = []
        for i in range(MAX_SPRITES):
            base = GSPRITES + i * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            slot_in_use = flags & 1
            in_use.append(slot_in_use)
            oam_priority = (read_u16(base + SPRITE_OAM_PRIORITY_OFF) >> 10) & 0x3
            subpriority = oracle.read_u8(base + SPRITE_SUBPRIORITY_OFF)
            oam_y = oracle.read_u8(base + SPRITE_OAM_Y_OFF)
            all_slots.append({"oamY": oam_y, "oamPriority": oam_priority, "subpriority": subpriority})
            if not slot_in_use:
                continue
            template = oracle.read_u32(base + SPRITE_TEMPLATE_OFF)
            if template != ROCK_TEMPLATE:
                continue
            rocks.append({
                "slot": i,
                "y": read_s16(base + SPRITE_Y_OFF),
                "y2": read_s16(base + SPRITE_Y2_OFF),
                "oamY": oam_y,
                "oamPriority": oam_priority,
                "subpriority": subpriority,
                "animNum": oracle.read_u8(base + SPRITE_ANIMNUM_OFF),
                "invisible": (flags >> 2) & 1,
            })

        sprite_order = [oracle.read_u8(S_SPRITE_ORDER + i) for i in range(MAX_SPRITES)]
        sprite_priorities = [read_u16(S_SPRITE_PRIORITIES + 2 * i) for i in range(MAX_SPRITES)]

        return {
            "tick": tick,
            "rocks": rocks,
            "inUse": in_use,
            "allSlots": all_slots,
            "spriteOrder": sprite_order,
            "spritePriorities": sprite_priorities,
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

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))


main()
