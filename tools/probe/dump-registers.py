#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for the ROCK_SLIDE hardware-register window
(docs/battle-move-anim-notes.md §9): dumps BLDCNT (0x04000050), BLDALPHA
(0x04000052), DISPCNT (0x04000000), and the two BG3 scroll mirrors
gBattle_BG3_X/gBattle_BG3_Y (bin/oracle symbols gBattle_BG3_X gBattle_BG3_Y)
every tick over a bounded range - narrower than dump-ai-and-hitmarker.py's
whole-trace scope because this is meant to be run at stride 1 across a short
window (e.g. 2340-2370) rather than the full trace.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-registers.py <trace.json> <output.json> <startTick> [endTick]

<trace.json> is any oracle trace file with a top-level "segments" array
(captureFrames is ignored). If endTick is omitted, records through the end
of the trace.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (4, 5):
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> [endTick]")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4]) if len(sys.argv) == 5 else None

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

DISPCNT = 0x04000000
BLDCNT = 0x04000050
BLDALPHA = 0x04000052

# From `bin/oracle symbols gBattle_BG3_Y gBattle_BG3_X`.
GBATTLE_BG3_X = 0x02022E20
GBATTLE_BG3_Y = 0x02022E22


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v & 0x8000 else v

    def record(tick: int) -> dict:
        return {
            "tick": tick,
            "dispcnt": u16(DISPCNT),
            "bldcnt": u16(BLDCNT),
            "bldalpha": u16(BLDALPHA),
            "bg3x": s16(GBATTLE_BG3_X),
            "bg3y": s16(GBATTLE_BG3_Y),
        }

    rows = []
    tick = 0
    if START_TICK <= tick <= (END_TICK if END_TICK is not None else tick):
        rows.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick < START_TICK:
                continue
            if END_TICK is not None and tick > END_TICK:
                continue
            rows.append(record(tick))

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))


main()
