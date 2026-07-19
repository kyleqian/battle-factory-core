#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for S7 slice-B convergence (docs/battle-menu-
notes.md §10 gap 1, docs/battle-move-anim-notes.md §3's `AnimDoubleTeam`):
dumps `AnimDoubleTeam`'s own two clone sprites' `data[]`/x2 every tick (the
task's own internal call-count/phase counters, not a pixel-bbox inference),
plus Grovyle's own front sprite (`gBattlerSpriteIds[1]`) anim/x2/y2 fields for
the same window - covers gap 2 (banner-hold color cycling) with the same run,
since both gaps live in the same 1964-2193 span.

Clone sprites are identified by `callback == AnimDoubleTeam` (a full 64-slot
scan every tick, not a fixed slot guess - `AnimTask_DoubleTeam` allocates
whichever free OAM slots `CloneBattlerSpriteWithBlend` finds, same
"identify by pointer, not slot number" precedent as
`dump-rockslide-sprites.py`'s own template-pointer scan). `AnimDoubleTeam`
is `static`, so its address needs `nm`, not `bin/oracle symbols`:

    arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf \
        | grep AnimDoubleTeam
    # 08102b3c t AnimDoubleTeam  (thumb bit +1 added below)

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-doubleteam-sprites.py <trace.json> <output.json> \
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

SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_ANIMNUM_OFF = 0x2A
SPRITE_ANIMCMDINDEX_OFF = 0x2B
SPRITE_ANIMDELAYCOUNTER_OFF = 0x2C  # low 6 bits
SPRITE_DATA_OFF = 0x2E  # s16 data[8]
SPRITE_FLAGS_OFF = 0x3E  # inUse bit0, invisible bit2

# `arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf`,
# thumb bit (+1) added - the one and only AnimDoubleTeam (static, not in the
# linker map, so `bin/oracle symbols` can't resolve it).
ANIM_DOUBLE_TEAM_CB = 0x08102B3C + 1

# `bin/oracle symbols gBattlerSpriteIds` - u8[MAX_BATTLERS_COUNT], battler 1 =
# Grovyle (the opponent's active battler in battle1-turn1.json), same
# convention as dump-rockslide-sprites.py.
GBATTLERSPRITEIDS = 0x020241E4
TARGET_BATTLER = 1


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

    def sprite_entry(i: int) -> dict:
        base = GSPRITES + i * SPRITE_SIZE
        flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
        return {
            "slot": i,
            "inUse": flags & 1,
            "invisible": (flags >> 2) & 1,
            "callback": oracle.read_u32(base + SPRITE_CALLBACK_OFF),
            "x": read_s16(base + SPRITE_X_OFF),
            "y": read_s16(base + SPRITE_Y_OFF),
            "x2": read_s16(base + SPRITE_X2_OFF),
            "y2": read_s16(base + SPRITE_Y2_OFF),
            "animNum": oracle.read_u8(base + SPRITE_ANIMNUM_OFF),
            "animCmdIndex": oracle.read_u8(base + SPRITE_ANIMCMDINDEX_OFF),
            "animDelayCounter": oracle.read_u8(base + SPRITE_ANIMDELAYCOUNTER_OFF) & 0x3F,
            "data": [read_s16(base + SPRITE_DATA_OFF + 2 * j) for j in range(8)],
        }

    def record(tick: int) -> dict:
        clones = [
            sprite_entry(i)
            for i in range(MAX_SPRITES)
            if (oracle.read_u8(GSPRITES + i * SPRITE_SIZE + SPRITE_FLAGS_OFF) & 1)
            and oracle.read_u32(GSPRITES + i * SPRITE_SIZE + SPRITE_CALLBACK_OFF) == ANIM_DOUBLE_TEAM_CB
        ]
        grovyle_slot = oracle.read_u8(GBATTLERSPRITEIDS + TARGET_BATTLER)
        grovyle = sprite_entry(grovyle_slot)
        return {"tick": tick, "clones": clones, "grovyle": grovyle}

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
