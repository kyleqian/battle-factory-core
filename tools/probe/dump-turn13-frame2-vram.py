#!/usr/bin/env python3
"""ISSUES #33(a) probe (docs/turn13-notes.md, this session's dated append):
direct VRAM evidence for the wrong-asset theory on MURKROW's wobble-phase
shape residual (renders 17019-17069). `dump-turn13-murkrow-materialize.py`
already confirmed the wobble table/anchor/frame-flip are RAM-exact and
colors are correct; the only remaining suspect is the reused `frame2`
sprite asset (`battle-opponent-front-sprites.json["MURKROW"].frame2`),
which is never exercised by MURKROW's own settled draw path so has never
been pixel-validated against the oracle.

Dumps battler 1's (`gBattlerSpriteIds+1`, same slot the materialize probe
used) live OBJ VRAM tile bytes at a materialize-window tick with
animCmdIndex=1 (RAM 17040, plus RAM 17050 for redundancy), using the same
1D-obj-mapping/4bpp/32-bytes-per-tile addressing established by
`tools/compare/scratch/probe_grovyle_vram.py` (OBJ_VRAM0=0x06010000) and
the same `gSprites`/OAM struct offsets as `dump-turn13-murkrow-
materialize.py` (SPRITE_SIZE=68, tileNum = OAM word2 & 0x3FF). Decodes the
4bpp-packed bytes into the same row-major 0-15 pixel-index-per-tile shape
`tools/extract/tiles.ts`'s `sliceTiles` produces, so the output is
directly diffable against `battle-opponent-front-sprites.json`'s
`frame2.tiles` byte-for-byte (see `verify-turn13-frame2.ts`).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-turn13-frame2-vram.py \
        tools/probe/specs/turn13-b1-sprite.json <output.json> 17040 17050

Quirks (see ROADMAP.md Domain notes): mGBA spews log lines to stdout
(never parsed here - all results go to the output file); the interpreter
segfaults at teardown *after* results are written (exit 139 is benign -
check the output file, not the exit code).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) < 4:
    raise SystemExit(f"usage: {sys.argv[0]} <spec.json> <output.json> <tick> [<tick> ...]")
SPEC_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TARGET_TICKS = {int(t) for t in sys.argv[3:]}

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

SPRITE_SIZE = 68
MATRIX_SIZE = 8
OBJ_VRAM0 = 0x06010000
TILE_BYTES_4BPP = 32
TILES_WIDE = 8
TILES_TALL = 8  # matches battle-opponent-front-sprites.json MURKROW frame2 columns/rows


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_sprites = oracle.symbols["gSprites"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def decode_4bpp_tile(tile_index: int) -> list[int]:
        base = OBJ_VRAM0 + tile_index * TILE_BYTES_4BPP
        pixels = [0] * 64
        for row in range(8):
            for col_pair in range(4):
                byte = oracle.read_u8(base + row * 4 + col_pair)
                pixels[row * 8 + col_pair * 2] = byte & 0xF
                pixels[row * 8 + col_pair * 2 + 1] = (byte >> 4) & 0xF
        return pixels

    def record(tick: int) -> dict:
        sprite_id = oracle.read_u8(g_battler_sprite_ids + 1)
        sprite_base = g_sprites + sprite_id * SPRITE_SIZE
        oam_byte1 = oracle.read_u8(sprite_base + 1)
        oam_word2 = u16(sprite_base + 4)
        affine_mode = oam_byte1 & 0x3
        obj_mode = (oam_byte1 >> 2) & 0x3
        bpp = (oam_byte1 >> 5) & 0x1  # OAM attr0 bit13 = byte1 bit5 (attr0 is bytes 0-1)
        tile_num = oam_word2 & 0x3FF
        anim_num = oracle.read_u8(sprite_base + 42)
        anim_cmd_index = oracle.read_u8(sprite_base + 43)
        tiles = [decode_4bpp_tile(tile_num + i) for i in range(TILES_WIDE * TILES_TALL)]
        return {
            "tick": tick,
            "spriteId": sprite_id,
            "affineMode": affine_mode,
            "objMode": obj_mode,
            "bpp": bpp,
            "tileNum": tile_num,
            "animNum": anim_num,
            "animCmdIndex": anim_cmd_index,
            "tiles": tiles,
        }

    ticks_out = []
    tick = 0
    max_tick = max(TARGET_TICKS)
    if tick in TARGET_TICKS:
        ticks_out.append(record(tick))

    for segment in spec["segments"]:
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
