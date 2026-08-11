#!/usr/bin/env python3
"""S7 slice M-3 (bounded worker, this session): RAM-probe the real
`gOamMatrices[matrixNum]` (pa/pb/pc/pd, 8.8 fixed point) for Onix's OWN
sprite (battler 0) across the Sitrus proc's rotation window
(docs/faint-switch-notes.md §12), to bisect `drawSpriteSheetAffineRotate`'s
small-angle rounding gap against the real oracle pixels at fixed ticks
(6873 tiny-angle, 6887 peak) rather than trusting §12's own prose-quoted
values.

Same `struct OamData`/`struct OamMatrix` layout §12's own
`dump-switchin-materialize-affine.py` already used, just battler 0 instead
of battler 1 (`gBattlerSpriteIds + 0`, not `+ 1`).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-onix-sitrus-rotate-matrix.py \
        tools/probe/specs/switchin-b0-sprite.json <output.json> \
        <startTick> <endTick>

Quirks (see ROADMAP.md Domain notes): mGBA spews log lines to stdout
(never parsed here - all results go to the output file); the interpreter
segfaults at teardown *after* results are written (exit 139 is benign -
check the output file, not the exit code).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <spec.json> <output.json> <startTick> <endTick>")
SPEC_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])

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


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_sprites = oracle.symbols["gSprites"]
    g_oam_matrices = oracle.symbols["gOamMatrices"]
    SPRITE_SIZE = 68
    MATRIX_SIZE = 8

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def record(tick: int) -> dict:
        sprite_id = oracle.read_u8(g_battler_sprite_ids + 0)
        sprite_base = g_sprites + sprite_id * SPRITE_SIZE
        oam_byte1 = oracle.read_u8(sprite_base + 1)
        oam_byte3 = oracle.read_u8(sprite_base + 3)
        affine_mode = oam_byte1 & 0x3
        matrix_num = (oam_byte3 >> 1) & 0x1F
        matrix_base = g_oam_matrices + matrix_num * MATRIX_SIZE
        return {
            "tick": tick,
            "spriteId": sprite_id,
            "affineMode": affine_mode,
            "matrixNum": matrix_num,
            "pa": s16(matrix_base + 0),
            "pb": s16(matrix_base + 2),
            "pc": s16(matrix_base + 4),
            "pd": s16(matrix_base + 6),
            "x": u16(sprite_base + 32),
            "y": u16(sprite_base + 34),
            "x2": s16(sprite_base + 36),
            "y2": s16(sprite_base + 38),
        }

    ticks_out = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        ticks_out.append(record(tick))

    for segment in spec["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if START_TICK <= tick <= END_TICK:
                ticks_out.append(record(tick))
            if tick > END_TICK:
                break
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out}, indent=0))


main()
