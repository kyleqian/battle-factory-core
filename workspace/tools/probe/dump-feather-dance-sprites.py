#!/usr/bin/env python3
"""S7 slice N-3 (bounded worker, this session): RAM-probe the FULL
FEATHER_DANCE feather-sprite window (docs/turn6-notes.md §6, battle-turn-
notes.md §28 "Feather sprite ground truth banked for the next session") -
per-tick `gOamMatrices[matrixNum]` {a,b,c,d}, sprite x/y/x2/y2, hFlip,
animNum, OAM priority, and alive/invisible status for all 8
`gFallingFeatherSpriteTemplate` sprites (RAM-confirmed slots 3/4/7/8/9/10/
11/12 per §28's spawn timeline probe), across ticks 7405-7658.

Same `struct Sprite`/`struct OamData`/`struct OamMatrix` layout every prior
probe in this directory uses (`include/sprite.h`, `include/gba/types.h`):
  sprite base + 0x00: OamData (byte1 affineMode, byte3 matrixNum bits1-5,
    byte4/5 tileNum/priority/paletteNum - priority = (byte5>>2)&0x3)
  + 0x14: template pointer (4 bytes) - sanity-check against
    gFallingFeatherSpriteTemplate's own address (0x08596388, §28)
  + 0x20/0x22/0x24/0x26: x/y/x2/y2 (s16)
  + 0x2A: animNum
  + 0x3E: flags byte (bit2 = invisible)
  + 0x3F: flags byte (bit0 = hFlip)

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-feather-dance-sprites.py \
        tools/probe/specs/turn6-feathers.json <output.json> \
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

FEATHER_SLOTS = [3, 4, 7, 8, 9, 10, 11, 12]
FEATHER_TEMPLATE_PTR = 0x08596388


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    g_sprites = oracle.symbols["gSprites"]
    g_oam_matrices = oracle.symbols["gOamMatrices"]
    SPRITE_SIZE = 68
    MATRIX_SIZE = 8

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def u32(addr: int) -> int:
        return u16(addr) | (u16(addr + 2) << 16)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def record_sprite(slot: int) -> dict:
        base = g_sprites + slot * SPRITE_SIZE
        oam_byte1 = u8(base + 1)
        oam_byte3 = u8(base + 3)
        oam_byte5 = u8(base + 5)
        affine_mode = oam_byte1 & 0x3
        matrix_num = (oam_byte3 >> 1) & 0x1F
        priority = (oam_byte5 >> 2) & 0x3
        flags_e = u8(base + 0x3E)
        flags_f = u8(base + 0x3F)
        matrix_base = g_oam_matrices + matrix_num * MATRIX_SIZE
        return {
            "slot": slot,
            "template": u32(base + 0x14),
            "inUse": flags_e & 0x1,
            "invisible": (flags_e >> 2) & 0x1,
            "affineMode": affine_mode,
            "matrixNum": matrix_num,
            "priority": priority,
            "hFlip": flags_f & 0x1,
            "animNum": u8(base + 0x2A),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "a": s16(matrix_base + 0),
            "b": s16(matrix_base + 2),
            "c": s16(matrix_base + 4),
            "d": s16(matrix_base + 6),
        }

    def record(tick: int) -> dict:
        return {"tick": tick, "sprites": [record_sprite(slot) for slot in FEATHER_SLOTS]}

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

    OUTPUT_PATH.write_text(json.dumps({"templatePtrExpected": FEATHER_TEMPLATE_PTR, "slots": FEATHER_SLOTS, "ticks": ticks_out}, indent=0))


main()
