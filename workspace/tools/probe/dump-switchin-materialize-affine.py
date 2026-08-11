#!/usr/bin/env python3
"""S7 slice L-4: RAM-probe `oam.affineMode`/`oam.matrixNum` and the live
`gOamMatrices[matrixNum]` registers (pa/pb/pc/pd) for Pidgeotto's own
sprite (battler 1) across the materialize coefficient ramp-down window
(docs/faint-switch-notes.md §10 item 1's named next instrument) - directly,
not inferred from `affineEmergeAccumulator`'s own extrapolated saturation.

Reuses the exact button-segment sequence `tools/probe/specs/switchin-
pidgeotto-tint.json` already RAM-verified to land Pidgeotto's switch-in
(same canonical anchor replay), so this script takes that spec (or any
spec with the same `"segments"` shape) as its trace source.

`struct OamData` (include/gba/types.h): the second u16 group (offset
+2/+3 of the 8-byte oam field) packs `x:9, matrixNum:5, size:2` LSB-first;
the high byte (+3) is therefore `bit8(x) | matrixNum<<1 | size<<6`, so
`matrixNum = (byte3 >> 1) & 0x1F`. `affineMode` is bits 0-1 of the first
group's high byte (+1). `struct OamMatrix` (a,b,c,d, each s16) is 8 bytes;
`gOamMatrices[n]` at `gOamMatrices + 8*n`.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-switchin-materialize-affine.py \
        tools/probe/specs/switchin-pidgeotto-tint.json <output.json> \
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
        sprite_id = oracle.read_u8(g_battler_sprite_ids + 1)
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
            "x2": s16(sprite_base + 36),
            "y2": s16(sprite_base + 38),
            "animNum": oracle.read_u8(sprite_base + 42),
            "animCmdIndex": oracle.read_u8(sprite_base + 43),
            "data3": s16(sprite_base + 0x2E + 2 * 3),
            "data4": s16(sprite_base + 0x2E + 2 * 4),
            "data5": s16(sprite_base + 0x2E + 2 * 5),
            "data6": s16(sprite_base + 0x2E + 2 * 6),
            "data7": s16(sprite_base + 0x2E + 2 * 7),
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
