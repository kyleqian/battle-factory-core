#!/usr/bin/env python3
"""ISSUES #56 item 2 probe: RAM-read the real `gSprites[*].y2` bounce driver
values during a `factoryLegal` arbitrary-trainer intro's settled command-menu
window, for direct comparison against the app's own closed-form
`menuIdleBounce` (`src/engine/battleMenu.ts:820`).

Unlike `dump-party-icon-bounce.py` (which replays a plain button-segments
groundtruth trace), the arbitrary-trainer intro fixtures
(`tools/battle-lab/factory-arbitrary-intro-{yoshi,magneton}-off.json`) are
`factoryLegal`-mode battle-lab requests whose pre-battle route (rental
selection, intro cutscene) is built internally by `oracle/battle_lab.py`'s
`BattleLab.prepare()` — there is no flat button-segments file to replay
directly. This script drives `BattleLab.prepare()` in-process (same class the
HTTP oracle service itself uses) and monkey-patches `oracle.advance` to record
a 64-slot sprite scan on every frame inside the requested absolute-frame
window, without editing `battle_lab.py` itself. Same struct-offset convention
as `dump-party-icon-bounce.py` (x@0x20/y@0x22/x2@0x24/y2@0x26/flags@0x3E,
SPRITE_SIZE=0x44, `gSprites=0x02020630` confirmed via `bin/oracle symbols
gSprites`).

Frame numbers here are ABSOLUTE `BattleLab.prepare()` pre-checkpoint frame
numbers (0 == immediately after `new_session()`) — the same coordinate space
`preCheckpointCaptureAllFrames` uses and the same one the comparison trace's
own `oracleBattleLab.preCheckpointFrameOffset` maps to app-relative frames
(`absolute = appRelative + preCheckpointFrameOffset`).

Run with the harness's mGBA-enabled interpreter, through the standard SIGSEGV-
tolerant wrapper:
    python3 tools/run-mgba-probe.py <output.json> -- \\
        /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \\
        tools/probe/dump-arbitrary-intro-bounce-driver.py <output.json> \\
        <fixture.json> <startAbsFrame> <endAbsFrame>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(
        f"usage: {sys.argv[0]} <output.json> <fixture.json> <startAbsFrame> <endAbsFrame>"
    )
OUTPUT_PATH = Path(sys.argv[1])
FIXTURE_PATH = Path(sys.argv[2])
START_ABS = int(sys.argv[3])
END_ABS = int(sys.argv[4])

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
from battle_lab import BattleLab, validate_request  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
SLOTS = list(range(64))


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)

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

    rows: list[dict] = []

    def record() -> None:
        row = {"frame": oracle.frame, "sprites": {}}
        for slot in SLOTS:
            base = GSPRITES + slot * SPRITE_SIZE
            flags3e = read_u16(base + 0x3E)
            in_use = bool(flags3e & 0x1)
            invisible = bool(flags3e & 0x4)
            if not in_use or invisible:
                continue
            row["sprites"][str(slot)] = {
                "x": read_s16(base + 0x20),
                "y": read_s16(base + 0x22),
                "x2": read_s16(base + 0x24),
                "y2": read_s16(base + 0x26),
            }
        rows.append(row)

    orig_advance = oracle.advance

    def patched_advance(buttons):
        orig_advance(buttons)
        if START_ABS <= oracle.frame <= END_ABS:
            record()

    oracle.advance = patched_advance  # type: ignore[method-assign]

    oracle.new_session()
    lab = BattleLab(oracle, "battle-scene-off")
    request = validate_request(fixture, "battle-scene-off")
    lab.prepare(request)

    OUTPUT_PATH.write_text(json.dumps({"rows": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} frames, slots scanned={len(SLOTS)})")


main()
