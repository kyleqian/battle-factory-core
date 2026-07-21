#!/usr/bin/env python3
"""ISSUES #26 dedicated probe (S7 worktree, oracle/RAM only - no engine
code): RAM-probe the Sitrus proc's expanding THIN_RING sprite
(`ANIM_TAG_THIN_RING`, `gThinRingExpandingSpriteTemplate`,
docs/faint-switch-notes.md §8a/§11/§15) across its full lifetime, to bank a
per-tick affine-state table for analytic placement (no fitting).

Same `struct Sprite`/`struct OamData`/`struct OamMatrix` layout every prior
probe in this directory uses (`include/sprite.h`, `include/gba/types.h`).
Unlike the feather probe (`dump-feather-dance-sprites.py`), the ring's own
slot is NOT known ahead of time (only one instance is ever alive, but which
of the ~64 sprite slots the allocator picks isn't pinned in any prior
session's notes) - this scans ALL slots 0-63 every tick and records full
detail only for whichever slot(s) have a template pointer matching
`gThinRingExpandingSpriteTemplate` (0x0859381c, oracle-resolved this
session), so the slot is discovered empirically rather than assumed.

  sprite base + 0x00: OamData (byte1 affineMode bits0-1, objMode bits2-3,
    shape bits6-7; byte3 matrixNum bits1-5, size bits6-7; byte5 priority
    bits2-3, paletteNum bits4-7)
  + 0x14: template pointer (4 bytes)
  + 0x20/0x22/0x24/0x26: x/y/x2/y2 (s16)
  + 0x2A: animNum, + 0x2B: animCmdIndex
  + 0x3E: flags byte (bit0 inUse, bit2 invisible)
  + 0x3F: flags byte (bit3 affineAnimBeginning, bit5 affineAnimEnded)

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-sitrus-ring-sprite.py \
        tools/probe/specs/turn5-sitrus-ring.json <output.json> \
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

RING_TEMPLATE_PTR = 0x0859381C
NUM_SLOTS = 64


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
        obj_mode = (oam_byte1 >> 2) & 0x3
        shape = (oam_byte1 >> 6) & 0x3
        matrix_num = (oam_byte3 >> 1) & 0x1F
        size = (oam_byte3 >> 6) & 0x3
        priority = (oam_byte5 >> 2) & 0x3
        palette_num = (oam_byte5 >> 4) & 0xF
        flags_e = u8(base + 0x3E)
        flags_f = u8(base + 0x3F)
        matrix_base = g_oam_matrices + matrix_num * MATRIX_SIZE
        return {
            "slot": slot,
            "template": u32(base + 0x14),
            "inUse": flags_e & 0x1,
            "invisible": (flags_e >> 2) & 0x1,
            "affineMode": affine_mode,
            "objMode": obj_mode,
            "shape": shape,
            "size": size,
            "matrixNum": matrix_num,
            "priority": priority,
            "paletteNum": palette_num,
            "hFlip": flags_f & 0x1,
            "affineAnimBeginning": (flags_f >> 3) & 0x1,
            "affineAnimEnded": (flags_f >> 5) & 0x1,
            "animNum": u8(base + 0x2A),
            "animCmdIndex": u8(base + 0x2B),
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
        matches = []
        for slot in range(NUM_SLOTS):
            rec = record_sprite(slot)
            if rec["template"] == RING_TEMPLATE_PTR and rec["inUse"]:
                matches.append(rec)
        return {"tick": tick, "ringSprites": matches}

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

    OUTPUT_PATH.write_text(json.dumps({"templatePtrExpected": RING_TEMPLATE_PTR, "ticks": ticks_out}, indent=0))


main()
