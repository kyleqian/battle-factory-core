#!/usr/bin/env python3
"""Dev-time RAM/OAM/register probe for ISSUES.md #19: the single-tick 99px
row-111 residual at the FIGHT-submenu resumed-idle window (fight-submenu.json
tick 2073). Dumps, per tick over a bounded range:
  - the ONIX battler sprite (gBattlerSpriteIds[0]) and the player healthbox's
    3 sprites (left/right/bar, gHealthboxSpriteIds[0]) - y/y2/x2 fields
  - WIN0H/WIN0V/WIN1H/WIN1V/WININ/WINOUT/BLDCNT/BLDALPHA/DISPCNT registers

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-fight-submenu-row111.py <trace.json> <output.json> <startTick> <endTick>
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

G_SPRITES = 0x02020630
G_BATTLER_SPRITE_IDS = 0x020241e4
G_HEALTHBOX_SPRITE_IDS = 0x03005d70
SPRITE_SIZE = 0x44

DISPCNT = 0x04000000
BLDCNT = 0x04000050
BLDALPHA = 0x04000052
BLDY = 0x04000054
WIN0H = 0x04000040
WIN1H = 0x04000042
WIN0V = 0x04000044
WIN1V = 0x04000046
WININ = 0x04000048
WINOUT = 0x0400004A


def read_sprite_min(oracle: EmeraldOracle, sprite_id: int) -> dict:
    base = G_SPRITES + sprite_id * SPRITE_SIZE

    def u16(off):
        lo = oracle.read_u8(base + off)
        hi = oracle.read_u8(base + off + 1)
        return lo | (hi << 8)

    def s16(off):
        v = u16(off)
        return v - 0x10000 if v >= 0x8000 else v

    oam0 = u16(0)
    return {
        "spriteId": sprite_id,
        "oamY": oam0 & 0xFF,
        "y": s16(0x22),
        "x2": s16(0x24),
        "y2": s16(0x26),
        "invisible": bool(u16(0x3E) & 0x4),
    }


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def record(tick: int) -> dict:
        onix_id = oracle.read_u8(G_BATTLER_SPRITE_IDS + 0)
        hb_left_id = oracle.read_u8(G_HEALTHBOX_SPRITE_IDS + 0)
        hb_left = read_sprite_min(oracle, hb_left_id)
        hb_right_id = None
        hb_bar_id = None
        # right/bar ids come from the left sprite's own oam affineParam / data[5]
        base = G_SPRITES + hb_left_id * SPRITE_SIZE

        def u16b(off):
            lo = oracle.read_u8(base + off)
            hi = oracle.read_u8(base + off + 1)
            return lo | (hi << 8)

        oam1 = u16b(4)  # oam2 word has tileNum etc; affineParam is oam3 at offset 6
        oam3 = u16b(6)
        hb_right_id = oam3
        data5 = u16b(0x2E + 2 * 5)
        if data5 >= 0x8000:
            data5 -= 0x10000
        hb_bar_id = data5

        return {
            "tick": tick,
            "onix": read_sprite_min(oracle, onix_id),
            "hbLeft": hb_left,
            "hbRight": read_sprite_min(oracle, hb_right_id) if 0 <= hb_right_id < 64 else None,
            "hbBar": read_sprite_min(oracle, hb_bar_id) if hb_bar_id is not None and 0 <= hb_bar_id < 64 else None,
            "dispcnt": u16(DISPCNT),
            "bldcnt": u16(BLDCNT),
            "bldalpha": u16(BLDALPHA),
            "bldy": u16(BLDY),
            "win0h": u16(WIN0H),
            "win1h": u16(WIN1H),
            "win0v": u16(WIN0V),
            "win1v": u16(WIN1V),
            "winin": u16(WININ),
            "winout": u16(WINOUT),
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
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))


main()
