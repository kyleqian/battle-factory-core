#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for ENDEAVOR's 16 sweat-droplet particle
sprites (`docs/battle-menu-notes.md` §15's own banked `CreateSweatDroplets`/
`AnimFacadeSweatDrop` derivation, `src/battle_anim_effects_3.c:3804-3856`) -
the S7 slice E1d droplets increment (§15b landed the concurrent squish+blend
for renders 3000-3005, found droplets start contaminating pixels at 3006).

Identifies droplet sprites by their `callback` field (`struct Sprite` +0x1C)
against `AnimFacadeSweatDrop`'s own real address - both `AnimFacadeSweatDrop`
and `CreateSweatDroplets` are `static` (no `bin/oracle symbols` entry), so
the address below is a one-time `nm -n --defined-only
reference/pokeemerald/pokeemerald.elf` dump (thumb bit +1 added, same
convention `dump-rockslide-sprites.py`'s own `HEALTHBOX_WOBBLE_CB` already
established) rather than resolved dynamically. This is a stronger, less
ambiguous filter than shape/size (`gOamData_AffineOff_ObjNormal_8x8` isn't
necessarily unique to droplets) - no other sprite in this scene can share
this exact static callback.

`sTimer`/`sVelocX`/`sVelocY`/`sTaskId`/`sActiveSpritesIdx` are `data[0..4]`
(`battle_anim_effects_3.c:3733-3737`).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-endeavor-droplets.py <trace.json> <output.json> \
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
SPRITE_SUBPRIORITY_OFF = 0x43
SPRITE_DATA_OFF = 0x2E  # s16 data[8]
SPRITE_FLAGS_OFF = 0x3E  # inUse bit0

# `arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf`,
# thumb bit (+1) added - the one and only AnimFacadeSweatDrop.
ANIM_FACADE_SWEAT_DROP_CB = 0x0815DEBC + 1


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

    def record(tick: int) -> dict:
        droplets = []
        for i in range(MAX_SPRITES):
            base = GSPRITES + i * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            if not (flags & 1):
                continue
            callback = oracle.read_u32(base + SPRITE_CALLBACK_OFF)
            if callback != ANIM_FACADE_SWEAT_DROP_CB:
                continue
            droplets.append(
                {
                    "slot": i,
                    "x": read_s16(base + SPRITE_X_OFF),
                    "y": read_s16(base + SPRITE_Y_OFF),
                    "x2": read_s16(base + SPRITE_X2_OFF),
                    "y2": read_s16(base + SPRITE_Y2_OFF),
                    "subpriority": oracle.read_u8(base + SPRITE_SUBPRIORITY_OFF),
                    "data": [read_s16(base + SPRITE_DATA_OFF + 2 * j) for j in range(5)],
                }
            )
        return {"tick": tick, "droplets": droplets}

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
