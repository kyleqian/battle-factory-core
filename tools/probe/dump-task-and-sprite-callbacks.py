#!/usr/bin/env python3
"""Dev-time per-tick RAM probe that dumps every gTasks[] slot's function
pointer and every gSprites[] slot's callback pointer, tick by tick.

Built for the S7 move-animation research step (docs/battle-move-anim-notes.md
S5 questions 1 and 3): when a register (e.g. BLDALPHA, gBattle_BG3_Y) changes
in a way a move's own battle-anim script doesn't explain, or conversely stays
flat despite an "unconditional" script step, the fastest way to find the
*actual* driver (or confirm nothing ever ran) is to watch which C functions
are occupying gTasks[]/gSprites[] slots over time and resolve those addresses
against the ELF's full (including static) symbol table - `nm`'d ahead of time
since `pokeemerald.map` only carries global symbols and most battle-anim task/
sprite callbacks are `static`:

    arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf \
        > /tmp/full-syms.txt

then bisect each dumped pointer (masking the Thumb bit) against that table.
This script only dumps the raw pointers (portable, tiny output); do the
symbol-name resolution as a separate offline step against your own `nm` dump,
since the exact addresses are toolchain/build-specific enough not to bake
into a committed script.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-task-and-sprite-callbacks.py <trace.json> <output.json> [startTick]

<trace.json> is any oracle trace file with a top-level "segments" array
(e.g. tools/compare/traces-groundtruth/battle1-turn1.json - captureFrames
is ignored, only segments/buttons/frames are replayed).

Addresses (from `bin/oracle symbols gTasks gSprites`, this run's pinned
reference build): gTasks = 0x03005e00 (NUM_TASKS=16, sizeof(struct Task)=
0x28, func at +0x0 - include/task.h), gSprites = 0x02020630 (MAX_SPRITES=64,
sizeof(struct Sprite)=0x44, callback at +0x1C - include/sprite.h).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> [startTick]")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3]) if len(sys.argv) == 4 else 0

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

GTASKS = 0x03005E00
TASK_SIZE = 0x28
NUM_TASKS = 16

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
SPRITE_CALLBACK_OFFSET = 0x1C
MAX_SPRITES = 64


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def record(tick: int) -> dict:
        row: dict = {"tick": tick}
        for i in range(NUM_TASKS):
            row[f"t{i}func"] = oracle.read_u32(GTASKS + i * TASK_SIZE)
        for i in range(MAX_SPRITES):
            row[f"s{i}cb"] = oracle.read_u32(GSPRITES + i * SPRITE_SIZE + SPRITE_CALLBACK_OFFSET)
        return row

    rows = []
    tick = 0
    if tick >= START_TICK:
        rows.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick >= START_TICK:
                rows.append(record(tick))

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))


main()
