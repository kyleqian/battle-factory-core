#!/usr/bin/env python3
"""S7 slice R rung (c) (docs/turn9-notes.md, docs/battle-turn-notes.md §35):
per-tick sprite-slot RAM dump for QUICK_ATTACK's own animation window
(10925-10949 task activity per §35's probe) - dumps x/y/x2/y2/invisible/oam
attrs for sprite slots 2/3/4/7 (the four slots §35 already identified via
`dump-task-and-sprite-callbacks.py`: 2=Pidgeotto's real sprite, 3/4=the
`AnimMonTrace` blended afterimage sprites, 7=the hitsplat helper), plus
BLDCNT/BLDALPHA (the alpha-blend registers - not linked symbols, GBA IO
addresses 0x04000050/0x04000052) to solve the afterimage's own blend coeffs
directly from RAM rather than pixel-guessing.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-quickattack-anim.py <trace.json> <output.json> <startTick> <endTick>
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
SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

BLDCNT = 0x04000050
BLDALPHA = 0x04000052

GBATTLERSPRITEIDS = 0x020241E4


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def read_s16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return s16(lo | (hi << 8))

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def record(tick: int) -> dict:
        row = {
            "tick": tick,
            "battler0slot": oracle.read_u8(GBATTLERSPRITEIDS + 0),
            "battler1slot": oracle.read_u8(GBATTLERSPRITEIDS + 1),
        }
        for slot in SLOTS:
            base = GSPRITES + slot * SPRITE_SIZE
            attr0 = read_u16(base + 0x00)
            attr1 = read_u16(base + 0x02)
            attr2 = read_u16(base + 0x04)
            flags = read_u16(base + 0x3E)
            row[f"s{slot}"] = {
                "x": read_s16(base + 0x20),
                "y": read_s16(base + 0x22),
                "x2": read_s16(base + 0x24),
                "y2": read_s16(base + 0x26),
                "inUse": bool(flags & 0x1),
                "invisible": bool(flags & 0x4),
                "objMode": (attr0 >> 10) & 0x3,
                "matrixNum": (attr1 >> 9) & 0x1F,
                "paletteNum": (attr2 >> 12) & 0xF,
                "priority": (attr2 >> 10) & 0x3,
            }
        row["bldcnt"] = read_u16(BLDCNT)
        row["bldalpha"] = read_u16(BLDALPHA)
        return row

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


main()
