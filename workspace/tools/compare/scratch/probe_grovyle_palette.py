#!/usr/bin/env python3
"""Throwaway: dump gSprites[8] (Grovyle) OAM paletteNum + the actual OBJ
palette RAM bank at RAM ticks 1486-1497, to test whether the real
materialize "tint" is a genuinely-flat single-color palette override (this
engine's MATERIALIZE_TINT_COLOR model) or non-flat per-index at these ticks.
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
OBJ_PLTT = 0x05000200
GROVYLE_SPRITE_ID = 8

TARGET_TICKS = set(range(1486, 1498))


def read_palette_num(oracle: EmeraldOracle, sprite_id: int) -> int:
    base = G_SPRITES + sprite_id * SPRITE_SIZE
    lo = oracle.read_u8(base + 4)
    hi = oracle.read_u8(base + 5)
    oam2 = lo | (hi << 8)
    return (oam2 >> 12) & 0xF


def read_palette(oracle: EmeraldOracle, pal_num: int) -> list[int]:
    base = OBJ_PLTT + pal_num * 32
    out = []
    for i in range(16):
        lo = oracle.read_u8(base + 2 * i)
        hi = oracle.read_u8(base + 2 * i + 1)
        out.append(lo | (hi << 8))
    return out


def bgr555_to_rgb8(v: int) -> list[int]:
    r = v & 0x1F
    g = (v >> 5) & 0x1F
    b = (v >> 10) & 0x1F
    return [(r << 3) | (r >> 2), (g << 3) | (g >> 2), (b << 3) | (b >> 2)]


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
                palnum = read_palette_num(oracle, GROVYLE_SPRITE_ID)
                pal = read_palette(oracle, palnum)
                rows.append({
                    "ramTick": tick,
                    "paletteNum": palnum,
                    "paletteRaw": pal,
                    "paletteRgb8": [bgr555_to_rgb8(v) for v in pal],
                })

    OUTPUT_PATH.write_text(json.dumps({"rows": rows}, indent=0))


main()
