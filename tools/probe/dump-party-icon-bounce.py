#!/usr/bin/env python3
"""Turn-15 party-menu worktree probe (docs/party-menu-notes.md open item 1):
RAM-probes ALL 64 sprite slots' `struct Sprite` (include/sprite.h) fields
relevant to `SpriteCB_BouncePartyMonIcon`/`UpdateMonIconFrame`
(reference/pokeemerald/src/party_menu.c:4003-4014,
src/pokemon_icon.c:1230-1264) over the "Choose a POKeMON." party-select
screen's own window (cursor-on-ONIX idle, the DOWN-press move to MAGBY, and
cursor-on-MAGBY idle) - same struct-offset convention as
`dump-fly-anim.py` (x@0x20/y@0x22/x2@0x24/y2@0x26, SPRITE_SIZE=0x44), plus
`animNum@0x2A/animCmdIndex@0x2B/animDelayCounter@0x2C(low 6 bits)` newly
added here to correlate the y2 hop against `UpdateMonIconFrame`'s own frame-
advance bookkeeping. `sPartyMenuBoxes` is `static` (not in the linker map,
confirmed via `bin/oracle symbols`) so icon sprite slots are NOT looked up
by struct pointer - instead every in-use, non-invisible sprite slot is
dumped every tick and the icons are identified afterward purely by their
(x+x2, y+y2) screen position falling in the known per-species anchor boxes.

Reuses `tools/compare/traces-groundtruth/battle1-turn15-dense.json`'s own
segments verbatim (per docs/party-menu-notes.md convention: rerun via fresh
oracle round trips with overridden captureFrames only, never edited) -
only its "segments" array is consumed here, same precedent as
`dump-turn14-bounce-driver.py`.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-party-icon-bounce.py <output.json> <startTick> <endTick>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> <startTick> <endTick>")
OUTPUT_PATH = Path(sys.argv[1])
START_TICK = int(sys.argv[2])
END_TICK = int(sys.argv[3])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth" / "battle1-turn15-dense.json"


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
SLOTS = list(range(64))


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
        row = {"tick": tick, "sprites": {}}
        for slot in SLOTS:
            base = GSPRITES + slot * SPRITE_SIZE
            attr1 = read_u16(base + 0x02)
            attr2 = read_u16(base + 0x04)
            flags3e = read_u16(base + 0x3E)
            in_use = bool(flags3e & 0x1)
            invisible = bool(flags3e & 0x4)
            if not in_use or invisible:
                continue
            animdelay_byte = oracle.read_u8(base + 0x2C)
            entry = {
                "x": read_s16(base + 0x20),
                "y": read_s16(base + 0x22),
                "x2": read_s16(base + 0x24),
                "y2": read_s16(base + 0x26),
                "animNum": oracle.read_u8(base + 0x2A),
                "animCmdIndex": oracle.read_u8(base + 0x2B),
                "animDelayCounter": animdelay_byte & 0x3F,
                "tileNum": attr2 & 0x3FF,
                "paletteNum": (attr2 >> 12) & 0xF,
                "priority": (attr2 >> 10) & 0x3,
                "size": (attr1 >> 14) & 0x3,
            }
            row["sprites"][str(slot)] = entry
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
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
