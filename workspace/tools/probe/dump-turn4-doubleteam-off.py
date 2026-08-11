#!/usr/bin/env python3
"""ISSUES #39 rank-6 slice 4: combined Scene-OFF RAM probe for turn 4's
DOUBLE_TEAM/ROCK_SLIDE window - union of `dump-turn1-rockslide-off.py`'s own
fields (BLDALPHA, for the stat-rise banner's own on/off window - turn 4's
DOUBLE_TEAM, same move as turn 1's own) and `dump-turn2-dragonbreath-off.py`'s
own fields (message-box hard-cut signals, hit-flash/HP-drain/text-clear/
menu-redraw anchors), so this one pass can pin every turn-4-only OFF
constant without pixel-crop bisection.

Battler 0 is ONIX (the player's own, DOUBLE_TEAM's target/ROCK_SLIDE
attacker); battler 1 is Foe GROVYLE (DOUBLE_TEAM's user, ROCK_SLIDE's
target) - same slot assignment turn 1's own probe used.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-turn4-doubleteam-off.py <trace.json> <output.json> <startTick> <endTick>
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
GBATTLE_BG0_Y = 0x2022E16
GBATTLE_BG1_Y = 0x2022E1A
GBATTLE_BG3_Y = 0x2022E22
GBATTLECONTROLLEREXECFLAGS = 0x2024068
GBATTLEMOVEDAMAGE = 0x20241F0
GPLTTBUFFERFADED = 0x02037B14
REG_BLDALPHA = 0x04000052

SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_FLAGS_OFF = 0x3E  # inUse:1, coordOffsetEnabled:1, invisible:1, ...
SPRITE_OAM_ATTR2_OFF = 0x04


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

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def record(tick: int) -> dict:
        healthbox0_slot = oracle.read_u8(GHEALTHBOXSPRITEIDS + 0)
        hbase0 = GSPRITES + healthbox0_slot * SPRITE_SIZE
        healthbox1_slot = oracle.read_u8(GHEALTHBOXSPRITEIDS + 1)
        hbase1 = GSPRITES + healthbox1_slot * SPRITE_SIZE

        onix_slot = oracle.read_u8(GBATTLERSPRITEIDS + 0)
        obase = GSPRITES + onix_slot * SPRITE_SIZE
        oflags = oracle.read_u8(obase + SPRITE_FLAGS_OFF)

        grovyle_slot = oracle.read_u8(GBATTLERSPRITEIDS + 1)
        gbase = GSPRITES + grovyle_slot * SPRITE_SIZE
        gflags = oracle.read_u8(gbase + SPRITE_FLAGS_OFF)
        g_attr2 = read_u16(gbase + SPRITE_OAM_ATTR2_OFF)
        g_palette_num = (g_attr2 >> 12) & 0xF
        g_pal_faded = GPLTTBUFFERFADED + (0x100 + g_palette_num * 16) * 2
        g_pal_faded_1 = read_u16(g_pal_faded + 2)

        sprites_ptr = oracle.read_u32(GBATTLESPRITESDATAPTR)
        battle_bars_ptr = oracle.read_u32(sprites_ptr + 0xC) if sprites_ptr else 0
        bar0 = s32(oracle.read_u32(battle_bars_ptr + 0 * BATTLE_BAR_INFO_SIZE + CURR_VALUE_OFFSET)) if battle_bars_ptr else None
        bar1 = s32(oracle.read_u32(battle_bars_ptr + 1 * BATTLE_BAR_INFO_SIZE + CURR_VALUE_OFFSET)) if battle_bars_ptr else None

        return {
            "tick": tick,
            "healthbox0Y2": read_s16(hbase0 + SPRITE_Y2_OFF),
            "healthbox1Y2": read_s16(hbase1 + SPRITE_Y2_OFF),
            "onixX2": read_s16(obase + SPRITE_X2_OFF),
            "onixY2": read_s16(obase + SPRITE_Y2_OFF),
            "onixInvisible": bool(oflags & 4),
            "grovyleInvisible": bool(gflags & 4),
            "grovyleX2": read_s16(gbase + SPRITE_X2_OFF),
            "grovyleY2": read_s16(gbase + SPRITE_Y2_OFF),
            "grovylePalFaded1": g_pal_faded_1,
            "bar0Curr": bar0,
            "bar1Curr": bar1,
            "bg0Y": read_s16(GBATTLE_BG0_Y),
            "bg1Y": read_s16(GBATTLE_BG1_Y),
            "bg3Y": read_s16(GBATTLE_BG3_Y),
            "execFlags": oracle.read_u32(GBATTLECONTROLLEREXECFLAGS),
            "moveDamage": s32(oracle.read_u32(GBATTLEMOVEDAMAGE)),
            "bldalpha": oracle.read_u8(REG_BLDALPHA) | (oracle.read_u8(REG_BLDALPHA + 1) << 8),
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
