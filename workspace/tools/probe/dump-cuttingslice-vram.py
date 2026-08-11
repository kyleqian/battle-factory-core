#!/usr/bin/env python3
"""Dev-time RAM/VRAM probe for turn 10's AERIAL_ACE cutting-slice sprite
(docs/battle-turn-notes.md §40 mechanism 5, gCuttingSliceSpriteTemplate).

Re-derives (fresh-oracle-constants rule, not trusted from §40's prose) which
gSprites[] slot is the cutting-slice sprite at a given tick by scanning ALL
64 slots for the OAM signature ONLY this template has active in this window
(affineMode=OFF, objMode=BLEND, shape=SQUARE, size=32x32) with a nonzero
tileNum, then dumps that slot's OAM/position fields plus the raw 4bpp OBJ
VRAM bytes for its current 16-tile (32x32) frame and its OBJ palette - ground
truth for tools/extract/extract-cutting-slice.ts's own asset (papercut: the
bulk extractor `extract-battle-anim-assets.ts` is known to silently drop
fields on re-run, so this asset has its own standalone extractor + this own
standalone VRAM verification, not folded into that file).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-cuttingslice-vram.py <trace.json> <output.json> <tick1> [tick2 ...]

<trace.json> uses its top-level "segments" array only (captureFrames ignored).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) < 4:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <tick1> [tick2 ...]")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TICKS = sorted(int(t) for t in sys.argv[3:])

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
SPRITE_SIZE = 0x44
MAX_SPRITES = 64
OBJ_VRAM0 = 0x06010000
OBJ_PLTT = 0x05000200
TILE_BYTES = 32


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def s16(oracle: EmeraldOracle, addr: int) -> int:
    v = u16(oracle, addr)
    return v - 0x10000 if v >= 0x8000 else v


def read_oam(oracle: EmeraldOracle, base: int) -> dict:
    oam0, oam1, oam2 = u16(oracle, base), u16(oracle, base + 2), u16(oracle, base + 4)
    return {
        "affineMode": (oam0 >> 8) & 0x3,
        "objMode": (oam0 >> 10) & 0x3,
        "shape": (oam0 >> 14) & 0x3,
        "size": (oam1 >> 14) & 0x3,
        "tileNum": oam2 & 0x3FF,
        "priority": (oam2 >> 10) & 0x3,
        "paletteNum": (oam2 >> 12) & 0xF,
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
        out.append(u16(oracle, base + 2 * i))
    return out


def find_slice_sprite(oracle: EmeraldOracle) -> int | None:
    for i in range(MAX_SPRITES):
        base = G_SPRITES + i * SPRITE_SIZE
        oam = read_oam(oracle, base)
        # gOamData_AffineOff_ObjBlend_32x32: affineMode=0 (OFF), objMode=1
        # (BLEND), shape=0 (SQUARE), size=2 (32x32) - see reference/
        # pokeemerald/src/data/battle_anim.h:534-546. This exact combination
        # is unique to the cutting-slice/air-cutter templates in this window
        # (mechanisms 1-4 are affine-off-normal or affine sprites, not blend).
        if oam["affineMode"] == 0 and oam["objMode"] == 1 and oam["shape"] == 0 and oam["size"] == 2 and oam["tileNum"] != 0:
            return i
    return None


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    results = []
    remaining = list(TICKS)
    tick = 0
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if remaining and tick == remaining[0]:
                remaining.pop(0)
                slot = find_slice_sprite(oracle)
                entry: dict = {"tick": tick, "slot": slot}
                if slot is not None:
                    base = G_SPRITES + slot * SPRITE_SIZE
                    oam = read_oam(oracle, base)
                    entry["oam"] = oam
                    entry["x"] = s16(oracle, base + 0x20)
                    entry["y"] = s16(oracle, base + 0x22)
                    entry["x2"] = s16(oracle, base + 0x24)
                    entry["y2"] = s16(oracle, base + 0x26)
                    entry["vramTiles"] = read_vram_tiles(oracle, oam["tileNum"], 16)
                    entry["palette"] = read_palette(oracle, oam["paletteNum"])
                results.append(entry)
        if not remaining:
            break

    OUTPUT_PATH.write_text(json.dumps(results, indent=2))
    print(f"wrote {OUTPUT_PATH} ({len(results)} ticks)")


if __name__ == "__main__":
    main()
