#!/usr/bin/env python3
"""ISSUES #97 side-lane instrument (B), the next instrument §13.4 of
docs/turn5-resolve-ab-pools-diagnosis.md names but did not run: direct VRAM
tile/tilemap content for BG0 (screenBase 24, charBase 0) and BG2 (screenBase
30, charBase 0) - the two background layers whose priority (0 and, for turn
5 only, ALSO 0 - see below) beats BG3's priority 3, so either one could be
the opaque occluder that hides turn 5's real, RAM-confirmed BG3VOFS=-7 shift
(§13.2/§13.3 of the same doc: hardware registers are otherwise identical
between turn 5 and turn 6 except BG2CNT's priority field, 0 for turn 5 vs 2
for turn 6; turn 5's real screen is provably byte-static at rows 0 and 10 for
the ENTIRE shake window despite the register genuinely cycling, while turn
6's analogous rows visibly change).

Also dumps BG1 (screenBase 28, priority 2 in both turns per §13.2 - untested
content until this probe) once BG0/BG2 turn out, per this probe's own first
run, to be fully transparent single-tile fills in the sampled region in both
turns - ruling both out as the occluder and leaving BG1 and OAM sprites as
the only remaining candidates.

Dumps, per requested tick, for BG0, BG1, and BG2:
  - BGnCNT decoded (priority/charBase/screenBase/screenSize/colorMode256)
  - BGnHOFS/VOFS hardware registers (confirms 0/0 at capture time - §13.2
    already established this via a separate probe; re-reading here keeps
    this probe self-contained)
  - the visible screen-entry tilemap (tile index / hflip / vflip / palette
    bank) for tile rows 0-7, cols 0-29 - display rows 0-63px, cols 0-239px,
    which covers both the exactly-static rows 0/10 (§13.3) AND the
    unresolved row-15-44 residual band (§13.4) with margin
  - the actual 4bpp pixel content (palette-index 0-15 per pixel) of every
    UNIQUE tile index referenced by that entry grid (deduped - the same
    fill/border tile is reused dozens of times, so this stays small)
Plus the full 512-byte BG palette (256 x 15-bit BGR words) per tick, so a
turn5-vs-turn6 comparison can rule out (or confirm) a palette-bank content
difference independent of §13.2's own already-ruled-out BLDCNT/tick-to-tick
palette-fade checks (that session never compared turn 5's palette bytes
against turn 6's own - only turn 5 against itself across time).

Run twice, once per trace, with each turn's own analogous ticks (baseline
shiftY=0 tick immediately followed by a flagged shiftY=-7 tick - see
docs/turn5-resolve-ab-pools-diagnosis.md §13.1/§13.2 for how these ticks were
derived) - the two runs are NOT diffable frame-number-to-frame-number since
the traces start at different pressTicks; diff by d-offset / role instead
(see the dated section this probe's evidence feeds).

Run with the harness's mGBA-enabled interpreter (NOT system python3), or via
the tools/run-mgba-probe.py wrapper (segfaults at teardown after writing
valid JSON are expected and benign - see that wrapper's own docstring):
    ../../vendor/mgba-venv/bin/python \
        tools/probe/dump-turn5-resolve-offa-bg02-vram-census.py \
        tools/compare/traces/turn5-resolve-off-a.json <output.json> 6258 6259
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) < 4:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <tick> [<tick> ...]")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TARGET_TICKS = sorted({int(t) for t in sys.argv[3:]})

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

BG_VRAM_BASE = 0x06000000
BG_PALETTE_BASE = 0x05000000
TILE_BYTES_4BPP = 32
SCREENBLOCK_BYTES = 0x800
VISIBLE_COLS = 30  # 240px / 8px per tile
VISIBLE_ROWS = 8  # 64px - covers rows 0/10 (proven-static) and the 15-44 residual band with margin

LAYERS = {
    "bg0": {"cnt": 0x04000008, "hofs": 0x04000010, "vofs": 0x04000012},
    "bg1": {"cnt": 0x0400000A, "hofs": 0x04000014, "vofs": 0x04000016},
    "bg2": {"cnt": 0x0400000C, "hofs": 0x04000018, "vofs": 0x0400001A},
}


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def decode_bgcnt(v: int) -> dict:
        return {
            "priority": v & 0x3,
            "charBase": (v >> 2) & 0x3,
            "colorMode256": bool(v & 0x80),
            "screenBase": (v >> 8) & 0x1F,
            "screenSize": (v >> 14) & 0x3,
        }

    def decode_tile_4bpp(char_base_addr: int, tile_index: int) -> list[int]:
        base = char_base_addr + tile_index * TILE_BYTES_4BPP
        pixels = [0] * 64
        for row in range(8):
            for col_pair in range(4):
                byte = oracle.read_u8(base + row * 4 + col_pair)
                pixels[row * 8 + col_pair * 2] = byte & 0xF
                pixels[row * 8 + col_pair * 2 + 1] = (byte >> 4) & 0xF
        return pixels

    def screenblock_index(cnt: dict, tile_col: int, tile_row: int) -> tuple[int, int, int]:
        # Text-mode screenblock layout: size 0=32x32 (1 block), 1=64x32 (2 side
        # by side), 2=32x64 (2 stacked), 3=64x64 (4, row-major). Returns
        # (blockIndex, localCol, localRow) - localCol/localRow always 0-31.
        size = cnt["screenSize"]
        block_col = tile_col // 32
        block_row = tile_row // 32
        local_col = tile_col % 32
        local_row = tile_row % 32
        if size == 0:
            block = 0
        elif size == 1:
            block = block_col
        elif size == 2:
            block = block_row
        else:
            block = block_row * 2 + block_col
        return block, local_col, local_row

    def record_layer(regs: dict) -> dict:
        cnt = decode_bgcnt(u16(regs["cnt"]))
        hofs = u16(regs["hofs"]) & 0x1FF
        vofs = u16(regs["vofs"]) & 0x1FF
        char_base_addr = BG_VRAM_BASE + cnt["charBase"] * 0x4000
        map_width_tiles = 64 if cnt["screenSize"] in (1, 3) else 32
        map_height_tiles = 64 if cnt["screenSize"] in (2, 3) else 32
        map_width_px = map_width_tiles * 8
        map_height_px = map_height_tiles * 8

        # ACTUAL on-screen content accounting for HOFS/VOFS wraparound across
        # screenblocks - a naive read of the base screenblock at cols 0-29/
        # rows 0-7 is only correct when hofs=vofs=0 (true for BG0/BG2 in this
        # window, false for BG1 - see the dated section this probe feeds).
        entries = []
        tile_cache: dict[int, list[int]] = {}
        for screen_y in range(VISIBLE_ROWS * 8):
            bg_y = (screen_y + vofs) % map_height_px
            tile_row = bg_y // 8
            within_y = bg_y % 8
            entry_row = []
            for screen_x_tile in range(VISIBLE_COLS):
                bg_x = (screen_x_tile * 8 + hofs) % map_width_px
                tile_col = bg_x // 8
                block, local_col, local_row = screenblock_index(cnt, tile_col, tile_row)
                screen_base_addr = BG_VRAM_BASE + (cnt["screenBase"] + block) * SCREENBLOCK_BYTES
                addr = screen_base_addr + (local_row * 32 + local_col) * 2
                raw = u16(addr)
                tile_index = raw & 0x3FF
                hflip = bool(raw & 0x400)
                vflip = bool(raw & 0x800)
                pal = (raw >> 12) & 0xF
                if tile_index not in tile_cache:
                    tile_cache[tile_index] = decode_tile_4bpp(char_base_addr, tile_index)
                src_y = 7 - within_y if vflip else within_y
                pixel_row_start = src_y * 8
                row_pixels = tile_cache[tile_index][pixel_row_start : pixel_row_start + 8]
                if hflip:
                    row_pixels = list(reversed(row_pixels))
                entry_row.append(
                    {
                        "tile": tile_index,
                        "hflip": hflip,
                        "vflip": vflip,
                        "pal": pal,
                        "pixelRow": row_pixels,
                    }
                )
            entries.append(entry_row)
        return {
            "cnt": cnt,
            "hofs": hofs,
            "vofs": vofs,
            "mapWidthPx": map_width_px,
            "mapHeightPx": map_height_px,
            "screenPixelRows": entries,
        }

    def record(tick: int) -> dict:
        row = {"tick": tick}
        for name, regs in LAYERS.items():
            row[name] = record_layer(regs)
        row["bgPalette"] = [u16(BG_PALETTE_BASE + i * 2) for i in range(256)]
        # A once-per-tick RAM snapshot cannot see a mid-frame (HBlank IRQ)
        # scroll-register rewrite - a common GBA technique for shaking only
        # part of the screen. If HBlank IRQ is enabled here, a uniform
        # end-of-frame BG3VOFS=-7 read is consistent with only SOME scanlines
        # actually showing the shift, which single-snapshot register probes
        # (this one and the prior session's) cannot distinguish from a true
        # whole-frame shift.
        dispstat = u16(0x04000004)
        ie = u16(0x04000200)
        row["hblankIrqEnabled"] = bool(ie & 0x2)
        row["dispstatHblankIrqEnable"] = bool(dispstat & 0x10)
        return row

    ticks_out = []
    tick = 0
    max_tick = max(TARGET_TICKS)
    if tick in TARGET_TICKS:
        ticks_out.append(record(tick))

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
                ticks_out.append(record(tick))

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out}))


main()
