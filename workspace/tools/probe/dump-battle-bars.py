#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for the battle HP-bar's double-indirection
internals: gBattleSpritesDataPtr (a pointer variable) -> deref -> struct's
+0xC field (itself a pointer) -> deref -> struct BattleBarInfo battleBars[];
each entry is 20 bytes {u8 healthboxSpriteId; u8 pad[3]; s32 maxValue,
oldValue, receivedValue, currValue;} (include/battle.h, BattleBarInfo).
tools/probe/ram-probe.py's "watch" spec only supports one level of
pointer-deref, so this needs its own script - see docs/battle-turn-notes.md
section 4 for what the currValue column means (a flat 1-HP-unit-per-tick
drain counter, sentinel -32768 on the first tick of a drain, 0 when done;
the authoritative gBattleMons[].hp stat itself updates 1 tick after the
"done" sentinel, not synchronously with the bar).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-battle-bars.py <trace.json> <output.json> [startTick]

<trace.json> is any oracle trace file with a top-level "segments" array
(e.g. tools/compare/traces-groundtruth/battle1-turn1.json - captureFrames
is ignored, only segments/buttons/frames are replayed).
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

GBATTLESPRITESDATAPTR = 0x20244D0
BATTLE_BAR_INFO_SIZE = 20
CURR_VALUE_OFFSET = 0x10
MAX_BATTLERS = 4


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def s32(addr: int) -> int:
        v = oracle.read_u32(addr)
        return v - (1 << 32) if v >= (1 << 31) else v

    def record(tick: int) -> dict:
        row: dict = {"tick": tick}
        sprites_ptr = oracle.read_u32(GBATTLESPRITESDATAPTR)
        battle_bars_ptr = oracle.read_u32(sprites_ptr + 0xC) if sprites_ptr else 0
        for i in range(MAX_BATTLERS):
            row[f"bar{i}Curr"] = s32(battle_bars_ptr + i * BATTLE_BAR_INFO_SIZE + CURR_VALUE_OFFSET) if battle_bars_ptr else None
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
