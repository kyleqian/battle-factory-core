#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for ENDEAVOR's tail window (`docs/battle-menu-
notes.md` §15f, renders 3061-3094): the two mechanisms past the settled
squish/blend/droplet/shake/hitsplat window (`docs/battle-menu-notes.md`
§15e), neither of which showed up in `dump-endeavor-hitsplat-shake.py`'s own
own shake/hitsplat fields (both RAM-confirmed zero/absent throughout this
window) or `dump-endeavor-squish-blend-ext.py`'s own matrix/blend fields
(RAM-confirmed neutral throughout) - S7 slice E1 tail increment.

Two DISTINCT mechanisms found, neither assumed going in:

1. The player healthbox's own brief post-hit "wobble" - `y2` on
   `gHealthboxSpriteIds[0]`'s own sprite (and two neighbor slots that move in
   perfect lockstep - almost certainly other pieces of the same compound
   healthbox assembly), alternating `+1`/`-1` every tick for a fixed span
   then a hard stop. A DIFFERENT mechanism from `menuIdleBounce`'s own slow,
   continuous, never-negative sine bounce (battleMenu.ts) - this one can go
   negative and doesn't damp, it just stops.

2. Onix's own brief post-hit "flicker" - `gBattlerSpriteIds[0]`'s own sprite
   toggling `struct Sprite.invisible` (the `flags` byte at +0x3E, bit 2) on
   and off, NOT a palette blend or a position change - both were checked and
   ruled out first (this probe's own `paletteDiffersFromBaseline`/`x2`/`y2`
   fields stay `False`/`0`/`0` throughout the window; the first hypothesis,
   reusing the attacker's own `BlendPalette`-style yellow blend, was wrong).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-endeavor-tail.py <trace.json> \
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
GHEALTHBOXSPRITEIDS = 0x03005D70
GBATTLERSPRITEIDS = 0x020241E4
GPLTTBUFFERFADED = 0x02037B14

SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_OAM_ATTR2_OFF = 0x04
SPRITE_FLAGS_OFF = 0x3E  # inUse:1, coordOffsetEnabled:1, invisible:1, ...


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

    baseline_palette: list[int] | None = None

    def onix_palette(onix_base: int) -> list[int]:
        attr2 = read_u16(onix_base + SPRITE_OAM_ATTR2_OFF)
        palette_num = (attr2 >> 12) & 0xF
        pal_base = GPLTTBUFFERFADED + (0x100 + palette_num * 16) * 2
        return [read_u16(pal_base + 2 * i) for i in range(16)]

    def record(tick: int) -> dict:
        nonlocal baseline_palette
        healthbox_slot = oracle.read_u8(GHEALTHBOXSPRITEIDS + 0)
        hbase = GSPRITES + healthbox_slot * SPRITE_SIZE

        onix_slot = oracle.read_u8(GBATTLERSPRITEIDS + 0)
        obase = GSPRITES + onix_slot * SPRITE_SIZE
        flags = oracle.read_u8(obase + SPRITE_FLAGS_OFF)
        palette = onix_palette(obase)
        if baseline_palette is None:
            baseline_palette = palette

        return {
            "tick": tick,
            "healthboxSlot": healthbox_slot,
            "healthboxY2": read_s16(hbase + SPRITE_Y2_OFF),
            "onixSlot": onix_slot,
            "onixInvisible": bool(flags & 4),
            "onixX2": read_s16(obase + SPRITE_X2_OFF),
            "onixY2": read_s16(obase + SPRITE_Y2_OFF),
            "paletteDiffersFromBaseline": palette != baseline_palette,
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
