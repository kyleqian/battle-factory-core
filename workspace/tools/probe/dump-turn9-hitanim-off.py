#!/usr/bin/env python3
"""Rank-5 slice 1 (ISSUES #39): combined Scene-OFF RAM probe for turn 9's
class-(b) generic hit choreography - Onix's own healthbox `y2` wobble +
sprite-invisible flicker (`gHealthboxSpriteIds[0]`/`gBattlerSpriteIds[0]`,
same fields `dump-endeavor-tail.py` already reads for the ON profile) plus
the HP-bar drain counter (`gBattleSpritesDataPtr->battleBars[]`, same layout
`dump-battle-bars.py` already reads). One combined probe instead of three
separate ones since all three need the SAME per-tick replay of the SAME
`turn9-rockslide-off.json` segments (the widest of the turn-9 triplet's own
button streams) under the `factory-battle-scene-off.json` bootstrap.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-turn9-hitanim-off.py <trace.json> <output.json> <startTick> <endTick>
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
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
GHEALTHBOXSPRITEIDS = 0x03005D70
GBATTLERSPRITEIDS = 0x020241E4
GBATTLESPRITESDATAPTR = 0x20244D0
BATTLE_BAR_INFO_SIZE = 20
CURR_VALUE_OFFSET = 0x10

SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_FLAGS_OFF = 0x3E  # inUse:1, coordOffsetEnabled:1, invisible:1, ...


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def s32(v: int) -> int:
        return v - (1 << 32) if v >= (1 << 31) else v

    def read_s16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return s16(lo | (hi << 8))

    def record(tick: int) -> dict:
        healthbox_slot = oracle.read_u8(GHEALTHBOXSPRITEIDS + 0)
        hbase = GSPRITES + healthbox_slot * SPRITE_SIZE
        healthbox1_slot = oracle.read_u8(GHEALTHBOXSPRITEIDS + 1)
        hbase1 = GSPRITES + healthbox1_slot * SPRITE_SIZE

        onix_slot = oracle.read_u8(GBATTLERSPRITEIDS + 0)
        obase = GSPRITES + onix_slot * SPRITE_SIZE
        flags = oracle.read_u8(obase + SPRITE_FLAGS_OFF)

        pidgeotto_slot = oracle.read_u8(GBATTLERSPRITEIDS + 1)
        pbase = GSPRITES + pidgeotto_slot * SPRITE_SIZE
        pflags = oracle.read_u8(pbase + SPRITE_FLAGS_OFF)

        sprites_ptr = oracle.read_u32(GBATTLESPRITESDATAPTR)
        battle_bars_ptr = oracle.read_u32(sprites_ptr + 0xC) if sprites_ptr else 0
        bar0 = s32(oracle.read_u32(battle_bars_ptr + 0 * BATTLE_BAR_INFO_SIZE + CURR_VALUE_OFFSET)) if battle_bars_ptr else None
        bar1 = s32(oracle.read_u32(battle_bars_ptr + 1 * BATTLE_BAR_INFO_SIZE + CURR_VALUE_OFFSET)) if battle_bars_ptr else None

        return {
            "tick": tick,
            "healthboxY2": read_s16(hbase + SPRITE_Y2_OFF),
            "onixInvisible": bool(flags & 4),
            "onixX2": read_s16(obase + SPRITE_X2_OFF),
            "onixY2": read_s16(obase + SPRITE_Y2_OFF),
            "healthbox1Y2": read_s16(hbase1 + SPRITE_Y2_OFF),
            "pidgeottoInvisible": bool(pflags & 4),
            "pidgeottoX2": read_s16(pbase + SPRITE_X2_OFF),
            "pidgeottoY2": read_s16(pbase + SPRITE_Y2_OFF),
            "bar0Curr": bar0,
            "bar1Curr": bar1,
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
