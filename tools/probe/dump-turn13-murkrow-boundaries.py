#!/usr/bin/env python3
"""Dump the two unresolved render-lag boundaries from ISSUES #33.

This is deliberately narrower than the earlier materialize and VRAM probes:
it records the *pre-DMA Sprite struct*, the final `gMain.oamBuffer` entry
which reaches hardware, OBJ palette RAM, and the live OBJ tiles in one pass.
That lets a later renderer distinguish a genuine sprite-state transition from
a framebuffer/OAM/VRAM timing artifact without fitting pixels.

Usage (use the mGBA virtualenv, not system Python):
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
    tools/probe/dump-turn13-murkrow-boundaries.py \
    tools/probe/specs/turn13-b1-sprite.json /tmp/murkrow-boundaries.json \
    17017 17018 17019 17020 17032 17033 17034 17035
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) < 4:
    raise SystemExit(f"usage: {sys.argv[0]} <spec.json> <output.json> <ramTick> [<ramTick> ...]")

SPEC_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TARGET_TICKS = {int(t) for t in sys.argv[3:]}
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit("could not find harness root containing oracle/emerald_core.py")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

ROM_PATH = (WORKTREE_ROOT / "reference" / "pokeemerald" / "pokeemerald.gba").resolve()
MAP_PATH = (WORKTREE_ROOT / "reference" / "pokeemerald" / "pokeemerald.map").resolve()
BOOTSTRAP_PATH = HARNESS_ROOT / "oracle" / "bootstrap" / "factory.json"

SPRITE_SIZE = 0x44
OAM_ENTRY_SIZE = 8
OAM_ENTRIES = 128
GMAIN_OAM_OFFSET = 0x38  # struct Main.oamBuffer, include/main.h
OBJ_VRAM0 = 0x06010000
TILE_BYTES = 32
MURKROW_TILE_COUNT = 64


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    g_sprites = oracle.symbols["gSprites"]
    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_oam_matrices = oracle.symbols["gOamMatrices"]
    g_main = oracle.symbols["gMain"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        value = u16(addr)
        return value - 0x10000 if value >= 0x8000 else value

    def decode_oam(base: int) -> dict:
        attr0, attr1, attr2 = u16(base), u16(base + 2), u16(base + 4)
        return {
            "attr0": attr0, "attr1": attr1, "attr2": attr2,
            "x": attr1 & 0x1FF, "y": attr0 & 0xFF,
            "affineMode": (attr0 >> 8) & 3,
            "objMode": (attr0 >> 10) & 3,
            "matrixNum": (attr1 >> 9) & 0x1F,
            "tileNum": attr2 & 0x3FF,
            "priority": (attr2 >> 10) & 3,
            "paletteNum": (attr2 >> 12) & 0xF,
        }

    def palette(base: int, bank: int) -> list[int]:
        # OBJ palettes follow the 0x100-byte BG palette range.
        start = base + 0x200 + bank * 0x20
        return [u16(start + i * 2) for i in range(16)]

    def record(tick: int) -> dict:
        sprite_id = oracle.read_u8(g_battler_sprite_ids + 1)
        sprite_base = g_sprites + sprite_id * SPRITE_SIZE
        sprite_oam = decode_oam(sprite_base)
        matrix_base = g_oam_matrices + sprite_oam["matrixNum"] * 8
        sprite_oam.update({
            "spriteId": sprite_id,
            "pa": s16(matrix_base), "pb": s16(matrix_base + 2),
            "pc": s16(matrix_base + 4), "pd": s16(matrix_base + 6),
            "x2": s16(sprite_base + 0x24), "y2": s16(sprite_base + 0x26),
            "animNum": oracle.read_u8(sprite_base + 0x2A),
            "animCmdIndex": oracle.read_u8(sprite_base + 0x2B),
            "inUse": bool(oracle.read_u8(sprite_base + 0x3E) & 1),
            "invisible": bool(oracle.read_u8(sprite_base + 0x3E) & 4),
        })
        hw_matches = []
        for index in range(OAM_ENTRIES):
            oam = decode_oam(g_main + GMAIN_OAM_OFFSET + index * OAM_ENTRY_SIZE)
            if (oam["tileNum"], oam["paletteNum"], oam["x"], oam["y"]) == (
                sprite_oam["tileNum"], sprite_oam["paletteNum"], sprite_oam["x"], sprite_oam["y"],
            ):
                oam["index"] = index
                hw_matches.append(oam)
        raw_tiles = bytes(
            oracle.read_u8(OBJ_VRAM0 + (sprite_oam["tileNum"] + i) * TILE_BYTES + j)
            for i in range(MURKROW_TILE_COUNT) for j in range(TILE_BYTES)
        )
        bank = sprite_oam["paletteNum"]
        return {
            "tick": tick,
            "sprite": sprite_oam,
            "hardwareOamMatches": hw_matches,
            "objFaded": palette(faded, bank),
            "objUnfaded": palette(unfaded, bank),
            "objVramSha256": hashlib.sha256(raw_tiles).hexdigest(),
        }

    rows = []
    tick = 0
    if tick in TARGET_TICKS:
        rows.append(record(tick))
    for segment in spec["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
            if tick in TARGET_TICKS:
                rows.append(record(tick))
            if tick >= max(TARGET_TICKS):
                break
        if tick >= max(TARGET_TICKS):
            break
    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=2))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
