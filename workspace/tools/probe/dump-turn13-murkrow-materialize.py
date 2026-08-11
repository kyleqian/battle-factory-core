#!/usr/bin/env python3
"""S7/S8 turn13 rung 4 residual 1 probe (docs/turn13-notes.md, this
session's dated append): RAM-probe MURKROW's own front sprite (battler 1,
same `gBattlerSpriteIds+1` slot Pidgeotto's own switch-in used) across the
materialize/wobble window - `oam.affineMode`/`objMode`/`matrixNum`/
`tileNum`/`paletteNum`, the live `gOamMatrices[matrixNum]` registers
(pa/pb/pc/pd), `x2`/`y2`, `animNum`/`animCmdIndex`, and the stretch-driver's
own `data4`/`data5` fields - one row per tick, RAM ground truth, not
inferred.

Mirrors `dump-switchin-materialize-affine.py`'s own OamData field-packing
citation (`struct OamData`, include/gba/types.h) plus `turn13-b1-sprite.json`'s
own `data4`/`data5`/`animNum`/`animCmdIndex` watch fields - this script
just combines both probes into one pass instead of two, since this
session's mission needs both the affine-identity check AND the wobble
table in the same tick range.

Takes any spec with the same `"segments"` shape as `tools/probe/specs/
turn13-b1-sprite.json` (that file's own 108 segments replay verbatim from
the canonical anchor and reach past render 17722, comfortably covering
this window).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-turn13-murkrow-materialize.py \
        tools/probe/specs/turn13-b1-sprite.json <output.json> \
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
        oam_byte0 = oracle.read_u8(sprite_base + 0)
        oam_byte1 = oracle.read_u8(sprite_base + 1)
        oam_byte3 = oracle.read_u8(sprite_base + 3)
        oam_word2 = u16(sprite_base + 4)
        affine_mode = oam_byte1 & 0x3
        obj_mode = (oam_byte1 >> 2) & 0x3
        matrix_num = (oam_byte3 >> 1) & 0x1F
        matrix_base = g_oam_matrices + matrix_num * MATRIX_SIZE
        flags_byte = oracle.read_u8(sprite_base + 0x3E)
        return {
            "tick": tick,
            "spriteId": sprite_id,
            "oamY": oam_byte0,
            "affineMode": affine_mode,
            "objMode": obj_mode,
            "matrixNum": matrix_num,
            "tileNum": oam_word2 & 0x3FF,
            "paletteNum": (oam_word2 >> 12) & 0xF,
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
            "invisible": (flags_byte >> 2) & 1,
            "inUse": flags_byte & 1,
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
