#!/usr/bin/env python3
"""Follow-up to `dump-turn5-resolve-offc-healthbox-halfsprite-census.py`
(same session, same ISSUES #97 §1.3 next-probe): the census proved
PIDGEOTTO's healthbox is really THREE real sprites (left/right frame
halves + healthbar) that all share one `x2` every tick - a pure clip-
boundary fix (per-sprite span clipping) predicts NO change at tick 6763's
own residual bbox `x=0-2,y=41-43`, because that screen range is INSIDE the
real right-frame sprite's own on-screen span at that tick (base x=108,
x2=-110 => real span [-2,61], and screen 0-2 is within it). So the
residual can only be explained if the real right sprite's OWN tile bitmap
is actually blank (transparent) at the exact local column/row the
mismatch maps to - this probe decodes that tile directly from OBJ VRAM to
settle it, instead of assuming.

Local-coordinate math accounts for `UpdateOamCoords`'s real formula
(sprite.c:339-359): `oam.x = sprite.x + x2 + centerToCornerVecX` (+
`gSpriteCoordOffsetX` iff `coordOffsetEnabled`), NOT `sprite.x + x2` alone -
so `localCol = screenX - rightX - x2 - centerToCornerVecX`. At tick 6763
(`rightX=108`, `x2=-110`, `centerToCornerVecX=-32` measured below), screen
(0,41)-(2,43) maps to right-sprite local (col=34..36, row=27..29), not the
naive (col=2..4, row=11..13) an earlier draft of this probe assumed before
`centerToCornerVecX` was accounted for.

Reuses `dump-healthbox-vram.py`'s own OAM-field-read/VRAM-tile-read
pattern (ISSUES #16), corrected to this trace's own `battle-scene-off`
bootstrap (the older probe hardcoded the scene-ON `factory.json` bootstrap,
wrong save state for this trace) and to a 1D-vs-2D OBJ mapping-aware tile
walk (decoded from `DISPCNT` bit 6 at read time rather than assumed).

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-resolve-offc-healthbox-halfsprite-vram.py \\
      tools/compare/traces/turn5-resolve-off-c.json <fresh-output.json> [tick]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> [tick]")

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TARGET_TICK = int(sys.argv[3]) if len(sys.argv) == 4 else 6762

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

SPRITE_SIZE = 0x44
OBJ_VRAM0 = 0x06010000
OBJ_PLTT = 0x05000200
TILE_BYTES_4BPP = 32
TILE_BYTES_8BPP = 64
DISPCNT = 0x04000000

SHAPE_SIZE_TILES = {  # (shape,size) -> (tilesWide, tilesTall)
    (0, 0): (1, 1), (0, 1): (2, 2), (0, 2): (4, 4), (0, 3): (8, 8),
    (1, 0): (2, 1), (1, 1): (4, 1), (1, 2): (4, 2), (1, 3): (8, 4),
    (2, 0): (1, 2), (2, 1): (1, 4), (2, 2): (2, 4), (2, 3): (4, 8),
}


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    g_sprites = oracle.symbols["gSprites"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return u8(addr) | (u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    tick = 0
    for segment in segments:
        if tick >= TARGET_TICK:
            break
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            if tick >= TARGET_TICK:
                break
            oracle.advance(buttons)
            tick += 1

    dispcnt = u16(DISPCNT)
    obj_1d_mapping = bool(dispcnt & 0x40)

    def s8(addr: int) -> int:
        v = u8(addr)
        return v - 0x100 if v >= 0x80 else v

    def read_sprite(sprite_id: int) -> dict:
        base = g_sprites + sprite_id * SPRITE_SIZE
        a0 = u16(base)
        a1 = u16(base + 2)
        shape = (a0 >> 14) & 0x3
        size = (a1 >> 14) & 0x3
        bpp = (a0 >> 13) & 0x1
        tile_num = u16(base + 4) & 0x3FF
        pal_num = (u16(base + 4) >> 12) & 0xF
        affine_param = u16(base + 6)
        data5 = s16(base + 0x2E + 5 * 2)
        flags = u16(base + 0x3E)
        return {
            "spriteId": sprite_id,
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "centerToCornerVecX": s8(base + 0x28),
            "centerToCornerVecY": s8(base + 0x29),
            "coordOffsetEnabled": bool(flags & 0x2),
            "shape": shape,
            "size": size,
            "bpp8": bool(bpp),
            "tileNum": tile_num,
            "paletteNum": pal_num,
            "affineParam": affine_param,
            "data5": data5,
        }

    def decode_tile_4bpp(tile_index: int) -> list:
        base = OBJ_VRAM0 + tile_index * TILE_BYTES_4BPP
        pixels = [0] * 64
        for row in range(8):
            for col_pair in range(4):
                byte = u8(base + row * 4 + col_pair)
                pixels[row * 8 + col_pair * 2] = byte & 0xF
                pixels[row * 8 + col_pair * 2 + 1] = (byte >> 4) & 0xF
        return pixels

    def decode_sprite_grid(entry: dict) -> dict:
        tiles_wide, tiles_tall = SHAPE_SIZE_TILES[(entry["shape"], entry["size"])]
        width, height = tiles_wide * 8, tiles_tall * 8
        grid = [[None] * width for _ in range(height)]
        for ty in range(tiles_tall):
            for tx in range(tiles_wide):
                if obj_1d_mapping:
                    tile_index = entry["tileNum"] + ty * tiles_wide + tx
                else:
                    tile_index = entry["tileNum"] + ty * 32 + tx
                pix = decode_tile_4bpp(tile_index)
                for py in range(8):
                    for px in range(8):
                        grid[ty * 8 + py][tx * 8 + px] = pix[py * 8 + px]
        return {"width": width, "height": height, "grid": grid, "tilesWide": tiles_wide, "tilesTall": tiles_tall}

    def read_palette(pal_num: int) -> list:
        base = OBJ_PLTT + pal_num * 32
        return [u16(base + 2 * i) for i in range(16)]

    left_id = u8(g_healthbox_sprite_ids + 1)
    left = read_sprite(left_id)
    right_id = left["affineParam"] & 0xFF
    right = read_sprite(right_id)
    bar_id = left["data5"] & 0xFF
    bar = read_sprite(bar_id)

    # Decisive cross-check: the SOFTWARE gSprites[] struct (EWRAM,
    # 0x02020630) reflects the game LOGIC's intended position, but the
    # actually-displayed frame is built from the HARDWARE OAM buffer
    # (0x07000000, written by `BuildOamBuffer`/`AddSpriteToOamBuffer` -
    # sprite.c) - if that copy ever drops/reorders a sprite (OAM budget,
    # sort-order truncation) the two can diverge. Scan all 128 raw hardware
    # OAM entries and match by `tileNum` (unique per sprite here) to read
    # what ACTUALLY got built into OAM this frame, independent of the
    # software struct's own x/x2/centerToCornerVec bookkeeping.
    def hw_oam_scan() -> list:
        entries = []
        for slot in range(128):
            base = 0x07000000 + slot * 8
            a0 = u16(base)
            a1 = u16(base + 2)
            a2 = u16(base + 4)
            obj_mode = (a0 >> 10) & 0x3
            if obj_mode == 2:
                continue
            entries.append({
                "oamSlot": slot,
                "y": a0 & 0xFF,
                "shape": (a0 >> 14) & 0x3,
                "x": a1 & 0x1FF,
                "size": (a1 >> 14) & 0x3,
                "tileNum": a2 & 0x3FF,
                "priority": (a2 >> 10) & 0x3,
                "paletteNum": (a2 >> 12) & 0xF,
            })
        return entries

    hw_oam = hw_oam_scan()
    hw_by_tile = {e["tileNum"]: e for e in hw_oam}

    left_grid = decode_sprite_grid(left)
    right_grid = decode_sprite_grid(right)
    bar_grid = decode_sprite_grid(bar)

    # CORRECTED local-coordinate math, accounting for `UpdateOamCoords`
    # (sprite.c:339-359): real OAM corner = sprite.x + x2 + centerToCornerVecX
    # (+ gSpriteCoordOffsetX iff coordOffsetEnabled) - NOT sprite.x + x2 alone
    # (an earlier draft of this probe omitted centerToCornerVec and derived
    # the wrong local window entirely). With centerToCornerVecX=-32 (measured
    # below), left's own corner (44-32=12) exactly equals FRAME_ORIGIN.x, and
    # right's corner (108-32=76) is exactly 64px right of left's - so canvas
    # px 0-63 is left's own local col 0-63, and canvas px 64-127 is right's
    # own local col 0-63 (localCol = px-64), cleanly, at ANY shared x2/dx.
    # The residual bbox (screen 0-2,41-43 at tick 6763, dx=-110) is canvas
    # px 98-100 (screenX-12-dx), i.e. right-sprite local col 34-36 - NOT
    # col 2-4 as the earlier miscalculation assumed. Dump that window.
    def window(grid: dict, col0: int, row0: int, w: int, h: int) -> list:
        out = []
        for r in range(row0, row0 + h):
            if r < 0 or r >= grid["height"]:
                out.append(None)
                continue
            out.append(grid["grid"][r][col0 : col0 + w] if col0 >= 0 else None)
        return out

    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH),
        "tick": tick,
        "obj1dMapping": obj_1d_mapping,
        "leftId": left_id,
        "rightId": right_id,
        "barId": bar_id,
        "left": {**left, "width": left_grid["width"], "height": left_grid["height"]},
        "right": {**right, "width": right_grid["width"], "height": right_grid["height"]},
        "bar": {**bar, "width": bar_grid["width"], "height": bar_grid["height"]},
        "rightLocalWindow_col28-40_row20-32": window(right_grid, 28, 20, 12, 12),
        "rightLocalWindow_col0-8_row8-16": window(right_grid, 0, 8, 8, 8),
        "leftLocalWindow_col56-64_row8-16": window(left_grid, 56, 8, 8, 8),
        "rightPalette": read_palette(right["paletteNum"]),
        "leftPalette": read_palette(left["paletteNum"]),
        "hwOamMatchLeft": hw_by_tile.get(left["tileNum"]),
        "hwOamMatchRight": hw_by_tile.get(right["tileNum"]),
        "hwOamMatchBar": hw_by_tile.get(bar["tileNum"]),
        "hwOamEntryCount": len(hw_oam),
        "hwOamTileNumsSorted": sorted(e["tileNum"] for e in hw_oam),
        "hwOamNearTiles": [e for e in hw_oam if 140 <= e["tileNum"] <= 300],
    }))
    print(f"wrote {OUTPUT_PATH} (tick={tick}, obj1dMapping={obj_1d_mapping})")


main()
