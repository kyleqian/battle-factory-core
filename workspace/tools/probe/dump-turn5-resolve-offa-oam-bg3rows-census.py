#!/usr/bin/env python3
"""ISSUES #97 side-lane instrument (fourth), the precise next instrument named
in docs/turn5-resolve-ab-pools-diagnosis.md's §14.4 (the VRAM-census section
committed at 64a13b1d): a raw-hardware OAM census over ALL 128 OAM slots
(not just the app-level `gSprites[]` bookkeeping table §11.2's own prior
sprite census read) intersected against screen rows 0/10 - §13.3's own
proven-exactly-static rows - PLUS a direct BG3 tilemap/tile-pixel dump at
those same rows, reusing `dump-turn5-resolve-offa-bg02-vram-census.py`'s own
scroll-wraparound-correct `record_layer` method, to test the doc's own named
"uniform BG3 content" hypothesis (the shifted-in tile row happening to be
pixel-identical to the tile row it replaces, so a real VOFS change produces
no visible pixel change at that specific row).

Two things this probe does that neither predecessor did:
  1. Reads OAM directly from GBA hardware memory (0x07000000, all 128 x
     8-byte entries) instead of the app's `Sprite` struct - the OAM buffer
     is what the PPU actually composites, and decoding it directly (attr0
     shape/objMode/y, attr1 x/size/hflip/vflip, attr2 tileNum/priority/
     paletteNum) avoids needing to reconstruct GBA's own corner-vs-center
     sprite-positioning convention from the software struct. Screen-row
     overlap uses hardware's own mod-256 wraparound rule (a sprite at OAM
     y=248 with height 16 covers wrapped rows 248..255,0..7 - i.e. rows
     0-7 on screen), so an explicit "is Y negative" sign convention is
     unnecessary: overlap is computed as `{(y+dy) % 256 for dy in
     range(height)}`.
  2. Selects its own EmeraldOracle bootstrap PER TRACE from that trace's own
     `oracleProfile` field (default `battle-scene-on`, matching
     tools/compare/run.ts's own `trace.oracleProfile ?? "battle-scene-on"`
     convention) rather than a single hardcoded bootstrap for both turns -
     `turn5-resolve-off-a.json` declares `oracleProfile: battle-scene-off`
     (bootstrap `factory-battle-scene-off.json`, matching the sprite
     census's own already-correct choice) while `turn6-rockslide-a.json`
     carries no `oracleProfile` field at all (defaults `battle-scene-on`,
     bootstrap `factory.json`) - the prior VRAM-census probe hardcoded
     `factory.json` for BOTH runs, which is right for the turn-6 call but
     was the WRONG (scene-ON) starting save state for the turn-5 call. This
     probe's own turn5-vs-turn6 OAM/BG3 comparison is only trustworthy if
     each side replays under the save state its own trace was actually
     captured against, so this is corrected here rather than repeated.

Run once per trace, with each turn's own tick pairs (see
docs/turn5-resolve-ab-pools-diagnosis.md §14.4/§14.5 for how these were
derived - baseline shiftY=0 tick immediately followed by the flagged
shiftY=-7 tick, twice per turn for stability):
    python3 tools/run-mgba-probe.py <output.json> -- \\
      tools/probe/dump-turn5-resolve-offa-oam-bg3rows-census.py \\
      tools/compare/traces/turn5-resolve-off-a.json <output.json> \\
      6258 6259 6263 6264
    python3 tools/run-mgba-probe.py <output.json> -- \\
      tools/probe/dump-turn5-resolve-offa-oam-bg3rows-census.py \\
      tools/compare/traces/turn6-rockslide-a.json <output.json> \\
      7801 7802 7806 7807

(mGBA teardown SIGSEGV after valid JSON is written is expected and benign
per tools/run-mgba-probe.py's own docstring.)
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

PROFILE_BOOTSTRAP = {
    "battle-scene-on": "factory.json",
    "battle-scene-off": "factory-battle-scene-off.json",
}

OAM_BASE = 0x07000000
OAM_ENTRY_BYTES = 8
OAM_ENTRY_COUNT = 128

BG_VRAM_BASE = 0x06000000
BG_PALETTE_BASE = 0x05000000
TILE_BYTES_4BPP = 32
SCREENBLOCK_BYTES = 0x800
VISIBLE_COLS = 30  # 240px / 8px per tile
VISIBLE_ROWS = 8  # 64px - covers rows 0/10 (proven-static) with margin

BG3_REGS = {"cnt": 0x0400000E, "hofs": 0x0400001C, "vofs": 0x0400001E}

# GBA OAM shape(2 bits)/size(2 bits) -> (widthPx, heightPx). shape 0=square,
# 1=wide(horizontal), 2=tall(vertical), 3=prohibited.
SHAPE_SIZE_DIMS = {
    (0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64),
    (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16), (1, 3): (64, 32),
    (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64),
}

STATIC_ROWS = (0, 10)


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    segments = trace["segments"]
    oracle_profile = trace.get("oracleProfile", "battle-scene-on")
    bootstrap_name = PROFILE_BOOTSTRAP[oracle_profile]
    bootstrap_path = ORACLE_DIR / "bootstrap" / bootstrap_name

    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, bootstrap_path)
    oracle.new_session()

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return u8(addr) | (u8(addr + 1) << 8)

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
                byte = u8(base + row * 4 + col_pair)
                pixels[row * 8 + col_pair * 2] = byte & 0xF
                pixels[row * 8 + col_pair * 2 + 1] = (byte >> 4) & 0xF
        return pixels

    def screenblock_index(cnt: dict, tile_col: int, tile_row: int) -> tuple[int, int, int]:
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

    def record_bg3() -> dict:
        cnt = decode_bgcnt(u16(BG3_REGS["cnt"]))
        hofs = u16(BG3_REGS["hofs"]) & 0x1FF
        vofs = u16(BG3_REGS["vofs"]) & 0x1FF
        char_base_addr = BG_VRAM_BASE + cnt["charBase"] * 0x4000
        map_width_tiles = 64 if cnt["screenSize"] in (1, 3) else 32
        map_height_tiles = 64 if cnt["screenSize"] in (2, 3) else 32
        map_width_px = map_width_tiles * 8
        map_height_px = map_height_tiles * 8

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
                    {"tile": tile_index, "hflip": hflip, "vflip": vflip, "pal": pal, "pixelRow": row_pixels}
                )
            entries.append(entry_row)

        def flatten_row(tile_row: list[dict]) -> list[int]:
            out: list[int] = []
            for entry in tile_row:
                out.extend(entry["pixelRow"])
            return out

        return {
            "cnt": cnt,
            "hofs": hofs,
            "vofs": vofs,
            "mapWidthPx": map_width_px,
            "mapHeightPx": map_height_px,
            "screenPixelRows": entries,
            "staticRowPixels": {str(r): flatten_row(entries[r]) for r in STATIC_ROWS},
        }

    def record_oam() -> dict:
        entries = []
        static_row_hits = {str(r): [] for r in STATIC_ROWS}
        for slot in range(OAM_ENTRY_COUNT):
            base = OAM_BASE + slot * OAM_ENTRY_BYTES
            a0 = u16(base)
            a1 = u16(base + 2)
            a2 = u16(base + 4)

            obj_mode = (a0 >> 8) & 0x3
            if obj_mode == 2:
                continue  # hidden/disabled - not displayed by hardware

            y = a0 & 0xFF
            gfx_mode = (a0 >> 10) & 0x3
            mosaic = bool((a0 >> 12) & 0x1)
            is256 = bool((a0 >> 13) & 0x1)
            shape = (a0 >> 14) & 0x3

            x = a1 & 0x1FF
            affine = obj_mode in (1, 3)
            if affine:
                matrix_num = (a1 >> 9) & 0x1F
                hflip = vflip = None
            else:
                matrix_num = None
                hflip = bool((a1 >> 12) & 0x1)
                vflip = bool((a1 >> 13) & 0x1)
            size = (a1 >> 14) & 0x3

            tile_num = a2 & 0x3FF
            priority = (a2 >> 10) & 0x3
            palette_num = (a2 >> 12) & 0xF

            dims = SHAPE_SIZE_DIMS.get((shape, size))
            if dims is None:
                continue  # prohibited shape/size combo
            width, height = dims

            rows_covered = {(y + dy) % 256 for dy in range(height)}
            cols_covered = {(x + dx) % 512 for dx in range(width)}
            on_screen_cols = sorted(c for c in cols_covered if c < 240)

            entry = {
                "slot": slot,
                "y": y,
                "x": x,
                "width": width,
                "height": height,
                "shape": shape,
                "size": size,
                "objMode": obj_mode,
                "gfxMode": gfx_mode,
                "mosaic": mosaic,
                "is256Color": is256,
                "hflip": hflip,
                "vflip": vflip,
                "matrixNum": matrix_num,
                "tileNum": tile_num,
                "priority": priority,
                "paletteNum": palette_num,
                "onScreenColRange": [on_screen_cols[0], on_screen_cols[-1]] if on_screen_cols else None,
                "overlapsStaticRow0": 0 in rows_covered and bool(on_screen_cols),
                "overlapsStaticRow10": 10 in rows_covered and bool(on_screen_cols),
            }
            entries.append(entry)
            for r in STATIC_ROWS:
                if r in rows_covered and on_screen_cols:
                    static_row_hits[str(r)].append(slot)

        return {"entries": entries, "staticRowHitSlots": static_row_hits}

    def record(tick: int) -> dict:
        return {"tick": tick, "oam": record_oam(), "bg3": record_bg3()}

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

    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH),
        "oracleProfile": oracle_profile,
        "bootstrap": bootstrap_name,
        "ticks": ticks_out,
    }))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks, bootstrap={bootstrap_name})")


main()
