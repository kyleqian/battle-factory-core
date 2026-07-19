#!/usr/bin/env python3
"""Dev-time RAM/VRAM/OAM probe for ISSUES.md #16 (opponent healthbox
INTERNAL tile assembly): dumps the three sprites that make up a healthbox
(healthboxLeft/Right + the healthbar) - their `struct Sprite` fields
(include/sprite.h) - plus the raw OBJ 4bpp tile VRAM bytes covering their
allocated tile ranges and the OBJ palette RAM, at a given trace tick.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-healthbox-vram.py <trace.json> <tick> <battler> <output.json>

<trace.json> uses its top-level "segments" array only (captureFrames ignored).
<battler> selects gHealthboxSpriteIds[battler] (0=player, 1=opponent in a
singles battle).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <tick> <battler> <output.json>")
TRACE_PATH = Path(sys.argv[1])
TICK = int(sys.argv[2])
BATTLER = int(sys.argv[3])
OUTPUT_PATH = Path(sys.argv[4])

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
G_HEALTHBOX_SPRITE_IDS = 0x03005d70
SPRITE_SIZE = 0x44
OBJ_VRAM0 = 0x06010000
OBJ_PLTT = 0x05000200
TILE_BYTES = 32


def read_sprite(oracle: EmeraldOracle, sprite_id: int) -> dict:
    base = G_SPRITES + sprite_id * SPRITE_SIZE

    def u16(off):
        lo = oracle.read_u8(base + off)
        hi = oracle.read_u8(base + off + 1)
        return lo | (hi << 8)

    def s16(off):
        v = u16(off)
        return v - 0x10000 if v >= 0x8000 else v

    oam0, oam1, oam2, oam3 = u16(0), u16(2), u16(4), u16(6)
    oam = {
        "y": oam0 & 0xFF,
        "affineMode": (oam0 >> 8) & 0x3,
        "objMode": (oam0 >> 10) & 0x3,
        "mosaic": (oam0 >> 12) & 0x1,
        "bpp": (oam0 >> 13) & 0x1,
        "shape": (oam0 >> 14) & 0x3,
        "x": oam1 & 0x1FF,
        "matrixNum": (oam1 >> 9) & 0x1F,
        "size": (oam1 >> 14) & 0x3,
        "tileNum": oam2 & 0x3FF,
        "priority": (oam2 >> 10) & 0x3,
        "paletteNum": (oam2 >> 12) & 0xF,
        "affineParam": oam3,
    }
    data = [s16(0x2E + 2 * i) for i in range(8)]
    flags = u16(0x3E)
    return {
        "spriteId": sprite_id,
        "oam": oam,
        "x": s16(0x20),
        "y": s16(0x22),
        "x2": s16(0x24),
        "y2": s16(0x26),
        "centerToCornerVecX": oracle.read_u8(base + 0x28) - (256 if oracle.read_u8(base + 0x28) >= 128 else 0),
        "centerToCornerVecY": oracle.read_u8(base + 0x29) - (256 if oracle.read_u8(base + 0x29) >= 128 else 0),
        "data": data,
        "invisible": bool(flags & 0x4),
        "subspriteTables": oracle.read_u32(base + 0x18),
        "subspriteTableNum": oracle.read_u8(base + 0x42) & 0x3F,
        "subspriteMode": (oracle.read_u8(base + 0x42) >> 6) & 0x3,
    }


def read_vram_tiles(oracle: EmeraldOracle, tile_start: int, tile_count: int) -> list[int]:
    out = []
    for t in range(tile_count):
        for b in range(TILE_BYTES):
            out.append(oracle.read_u8(OBJ_VRAM0 + (tile_start + t) * TILE_BYTES + b))
    return out


def read_palette(oracle: EmeraldOracle, pal_num: int) -> list[int]:
    base = OBJ_PLTT + pal_num * 32
    out = []
    for i in range(16):
        lo = oracle.read_u8(base + 2 * i)
        hi = oracle.read_u8(base + 2 * i + 1)
        out.append(lo | (hi << 8))
    return out


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    tick = 0
    for segment in segments:
        if tick >= TICK:
            break
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            if tick >= TICK:
                break
            oracle.advance(buttons)
            tick += 1

    left_id = oracle.read_u8(G_HEALTHBOX_SPRITE_IDS + BATTLER)
    left = read_sprite(oracle, left_id)
    right_id = left["oam"]["affineParam"]
    right = read_sprite(oracle, right_id)
    bar_id = left["data"][5]
    bar = read_sprite(oracle, bar_id)

    result = {
        "tick": tick,
        "battler": BATTLER,
        "leftId": left_id,
        "rightId": right_id,
        "barId": bar_id,
        "left": left,
        "right": right,
        "bar": bar,
        "leftVram": read_vram_tiles(oracle, left["oam"]["tileNum"], 64),
        "rightVram": read_vram_tiles(oracle, right["oam"]["tileNum"], 32),
        "barVram": read_vram_tiles(oracle, bar["oam"]["tileNum"], 16),
        "leftPalette": read_palette(oracle, left["oam"]["paletteNum"]),
        "barPalette": read_palette(oracle, bar["oam"]["paletteNum"]),
    }
    OUTPUT_PATH.write_text(json.dumps(result))


main()
