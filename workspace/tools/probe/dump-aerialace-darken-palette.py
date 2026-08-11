#!/usr/bin/env python3
"""Mission A (worktree PROBE, docs/aerial-ace-notes.md's own "darken-plateau
residual, NOT closed" section): RAM-read the ACTUAL post-darken palette bytes
(`gPlttBufferFaded`) for BOTH the affected OBJ bank (Pidgeotto's own palette,
shared by the real sprite slot 5 and the TraceMonBlended clone slot 7 -
confirmed dynamically below, not assumed) AND the affected BG bank (hardware
bank 2 - `tools/extract/extract-battle-bg.ts:86`'s own `normalizePaletteOffset
(..., 2)`, i.e. asset-local palette index 0 = hardware BG_PLTT bank 2) at RAM
ticks 12367-12371 (one tick either side of the already-pinned 12368-12370
darken-RAM-active plateau, `docs/aerial-ace-notes.md`'s own mechanism-4 table).

Rationale: the prior session's `BlendPalette(plain, BLACK, 10)` re-derivation
of the darkened OBJ+BG colors did NOT close the plateau (off by a few units/
channel at every sampled pixel) - this reads the REAL bytes the hardware
actually blended with instead of recomputing them, per the brief's own named
instrument.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-aerialace-darken-palette.py <trace.json> \
        <output.json> <startTick> <endTick>

PAPERCUT (per docs/turn9-shake-notes.md's own methodology note, same family):
this probe may exit 139 (segfault on interpreter teardown) AFTER writing
valid, complete JSON - validate `len(ticks)` before assuming the run failed.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> <endTick>")
TRACE_PATH = Path(sys.argv[1])
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

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
SPRITE_OAM_ATTR2_OFF = 0x04
SPRITE_FLAGS_OFF = 0x3E

GPLTTBUFFERFADED = 0x02037B14
GPLTTBUFFERUNFADED = 0x02037714

BG_HW_BANK = 2  # extract-battle-bg.ts's own normalizePaletteOffset(..., 2)
SLOTS_OF_INTEREST = [5, 7]  # real Pidgeotto (5), TraceMonBlended clone (7)


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def bgr555_to_rgb8(v: int) -> list:
        r5 = v & 0x1F
        g5 = (v >> 5) & 0x1F
        b5 = (v >> 10) & 0x1F
        return [(r5 << 3) | (r5 >> 2), (g5 << 3) | (g5 >> 2), (b5 << 3) | (b5 >> 2)]

    def read_bank(base_addr: int, bank: int) -> list:
        base = base_addr + bank * 16 * 2
        raw = [read_u16(base + 2 * i) for i in range(16)]
        return raw

    def record(tick: int) -> dict:
        sprite_pal_nums = {}
        for slot in SLOTS_OF_INTEREST:
            base = GSPRITES + slot * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            in_use = bool(flags & 1)
            attr2 = read_u16(base + SPRITE_OAM_ATTR2_OFF)
            pal_num = (attr2 >> 12) & 0xF
            sprite_pal_nums[str(slot)] = {"inUse": in_use, "paletteNum": pal_num}

        # Use whichever sprite is in-use this tick to resolve the OBJ bank;
        # fall back to slot 5's own reading if neither reports in-use.
        obj_bank = None
        for slot in SLOTS_OF_INTEREST:
            info = sprite_pal_nums[str(slot)]
            if info["inUse"]:
                obj_bank = info["paletteNum"]
                break
        if obj_bank is None:
            obj_bank = sprite_pal_nums["5"]["paletteNum"]

        obj_faded_raw = read_bank(GPLTTBUFFERFADED + 0x100 * 2, obj_bank)
        obj_unfaded_raw = read_bank(GPLTTBUFFERUNFADED + 0x100 * 2, obj_bank)
        bg_faded_raw = read_bank(GPLTTBUFFERFADED, BG_HW_BANK)
        bg_unfaded_raw = read_bank(GPLTTBUFFERUNFADED, BG_HW_BANK)

        return {
            "tick": tick,
            "spritePaletteNums": sprite_pal_nums,
            "objBank": obj_bank,
            "objFadedRaw": obj_faded_raw,
            "objUnfadedRaw": obj_unfaded_raw,
            "objFadedRgb": [bgr555_to_rgb8(v) for v in obj_faded_raw],
            "objUnfadedRgb": [bgr555_to_rgb8(v) for v in obj_unfaded_raw],
            "bgBank": BG_HW_BANK,
            "bgFadedRaw": bg_faded_raw,
            "bgUnfadedRaw": bg_unfaded_raw,
            "bgFadedRgb": [bgr555_to_rgb8(v) for v in bg_faded_raw],
            "bgUnfadedRgb": [bgr555_to_rgb8(v) for v in bg_unfaded_raw],
        }

    rows = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        rows.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick < START_TICK:
                continue
            if tick > END_TICK:
                continue
            rows.append(record(tick))
            if tick >= END_TICK:
                break
        else:
            continue
        break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
