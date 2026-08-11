#!/usr/bin/env python3
"""Throwaway: dump gSprites[8] (Grovyle materialize) OAM + its OBJ VRAM tile
bytes at RAM ticks 1489-1496, following the same struct offsets/addressing
as tools/probe/dump-healthbox-vram.py (G_SPRITES, OBJ_VRAM0, 4bpp/32B tile,
1D obj-mapping sequential tile numbering). ISSUES #18 / §7.29's own
explicitly-named-but-untested lead: does the real VRAM tile content for the
tile covering screen (164-167,42-43) match the statically-extracted
battle-opponent-front-sprites.json["GROVYLE"].tileset.tiles[26]?

Run with the harness's mGBA-enabled interpreter:
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/compare/scratch/probe_grovyle_vram.py tools/compare/traces/sendout.json out.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

G_SPRITES = 0x02020630
SPRITE_SIZE = 0x44
OBJ_VRAM0 = 0x06010000
OBJ_PLTT = 0x05000200
TILE_BYTES = 32
GROVYLE_SPRITE_ID = 8

TARGET_TICKS = set(range(1486, 1497))  # RAM ticks; render N = RAM N-1


def read_sprite(oracle: EmeraldOracle, sprite_id: int) -> dict:
    base = G_SPRITES + sprite_id * SPRITE_SIZE

    def u16(off):
        lo = oracle.read_u8(base + off)
        hi = oracle.read_u8(base + off + 1)
        return lo | (hi << 8)

    oam0, oam1, oam2 = u16(0), u16(2), u16(4)
    return {
        "tileNum": oam2 & 0x3FF,
        "priority": (oam2 >> 10) & 0x3,
        "paletteNum": (oam2 >> 12) & 0xF,
        "bpp": (oam0 >> 13) & 0x1,
        "shape": (oam0 >> 14) & 0x3,
        "size": (oam1 >> 14) & 0x3,
        "matrixNum": (oam1 >> 9) & 0x1F,
        "affineMode": (oam0 >> 8) & 0x3,
        "invisible": bool(u16(0x3E) & 0x4) if False else None,
    }


def read_vram_tiles(oracle: EmeraldOracle, tile_start: int, tile_count: int) -> list[int]:
    out = []
    for t in range(tile_count):
        for b in range(TILE_BYTES):
            out.append(oracle.read_u8(OBJ_VRAM0 + (tile_start + t) * TILE_BYTES + b))
    return out


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    tick = 0
    rows = []
    max_tick = max(TARGET_TICKS)
    for segment in segments:
        if tick > max_tick:
            break
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            if tick > max_tick:
                break
            oracle.advance(buttons)
            tick += 1
            if tick in TARGET_TICKS:
                sp = read_sprite(oracle, GROVYLE_SPRITE_ID)
                # tile 26 = row3,col2 of an 8x8-tile (64x64) sheet in 1D obj mapping
                vram = read_vram_tiles(oracle, sp["tileNum"] + 26, 1)
                rows.append({"ramTick": tick, "sprite": sp, "tile26Vram": vram})

    OUTPUT_PATH.write_text(json.dumps({"rows": rows}, indent=0))


main()
