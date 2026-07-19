#!/usr/bin/env python3
"""Throwaway: dump gSprites[6] (opponent summary bar, Exit phase) OAM +
its OBJ VRAM tile bytes (tiles 0-15, the full ballStatusBar tileset range)
at RAM ticks 1489-1496, to check the extracted battle-healthbox.json
ballStatusBar.tileset against real runtime VRAM (ISSUES #18's 1493-95
residual, second half after the drawOpponentSummaryExit destroy-cutoff fix
surfaced a NEW bar-tile-0 shape mismatch).
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
TILE_BYTES = 32
BAR_SPRITE_ID = 6

TARGET_TICKS = set(range(1489, 1497))


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
        "bpp": (oam0 >> 13) & 0x1,
        "shape": (oam0 >> 14) & 0x3,
        "size": (oam1 >> 14) & 0x3,
    }


def read_vram_tiles(oracle: EmeraldOracle, tile_start: int, tile_count: int) -> list[list[int]]:
    tiles = []
    for t in range(tile_count):
        raw = [oracle.read_u8(OBJ_VRAM0 + (tile_start + t) * TILE_BYTES + b) for b in range(TILE_BYTES)]
        px = []
        for byte in raw:
            px.append(byte & 0xF)
            px.append((byte >> 4) & 0xF)
        tiles.append(px)
    return tiles


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
                sp = read_sprite(oracle, BAR_SPRITE_ID)
                tiles = read_vram_tiles(oracle, sp["tileNum"], 16)
                rows.append({"ramTick": tick, "sprite": sp, "tiles": tiles})

    OUTPUT_PATH.write_text(json.dumps({"rows": rows}, indent=0))


main()
