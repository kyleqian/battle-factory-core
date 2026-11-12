#!/usr/bin/env python3
"""Classify the ISSUES #96(b) frame-29838 header-edge sliver.

`battle1-swap-enemy-picker.json` (compare trace) mismatches oracle vs. app
at exactly one tick/column: frame 29838, bbox 239,62-239,66 (screen's last
column). This probe replays the SAME resolved trace (sourceTrace +
appendSegments spliced, matching `tools/compare/traceFile.ts`'s
resolution) and for each oracle tick in [START_TICK, END_TICK] dumps:

  - every active OAM entry whose committed (post-VBlank) screen position
    falls near the right edge (x in [176, 256) unsigned, or wrapped
    negative x in [400, 512) two's-complement) and near the mismatch's Y
    band, decoded to shape/size/tile/priority/palette;
  - BG scroll (HOFS/VOFS) for BG0-3;
  - WIN0H/WIN0V/WIN1H/WIN1V/WININ/WINOUT/DISPCNT.

This is read-only (RAM reads only; no writes, no fix). Feed it a trace
resolved by `tools/compare/traceFile.ts`'s loadCompareTrace so tick numbers
match `npm run compare`'s exactly -- do NOT feed it the raw compare-trace
file (it has a `sourceTrace` pointer, not a flat `segments` array).

Run through the teardown-safe wrapper, e.g.:

  node --experimental-strip-types -e "
    import { loadCompareTrace } from './tools/compare/traceFile.ts';
    import { writeFileSync } from 'node:fs';
    writeFileSync('/tmp/resolved.json',
      JSON.stringify(loadCompareTrace('tools/compare/traces/battle1-swap-enemy-picker.json')));
  "
  python3 tools/run-mgba-probe.py /tmp/edge-out.json -- \\
    ../../vendor/mgba-venv/bin/python \\
    tools/probe/dump-swap-enemy-picker-edge.py \\
    /tmp/resolved.json /tmp/edge-out.json 29835 29841
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(
        f"usage: {sys.argv[0]} <resolved-trace.json> <output.json> <startTick> <endTick>"
    )

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
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

OAM_BASE = 0x07000000
OAM_ENTRY_SIZE = 8
OAM_COUNT = 128

IO_BASE = 0x04000000
DISPCNT = IO_BASE + 0x00
BG0CNT = IO_BASE + 0x08
BG1CNT = IO_BASE + 0x0A
BG2CNT = IO_BASE + 0x0C
BG3CNT = IO_BASE + 0x0E
BG_HOFS = {0: IO_BASE + 0x10, 1: IO_BASE + 0x14, 2: IO_BASE + 0x18, 3: IO_BASE + 0x1C}
BG_VOFS = {0: IO_BASE + 0x12, 1: IO_BASE + 0x16, 2: IO_BASE + 0x1A, 3: IO_BASE + 0x1E}
WIN0H = IO_BASE + 0x40
WIN1H = IO_BASE + 0x42
WIN0V = IO_BASE + 0x44
WIN1V = IO_BASE + 0x46
WININ = IO_BASE + 0x48
WINOUT = IO_BASE + 0x4A

SHAPE_SIZE_DIMS = {
    # (shape, size) -> (width, height) in pixels
    (0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64),
    (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16), (1, 3): (64, 32),
    (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64),
}


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def signed9(value: int) -> int:
    value &= 0x1FF
    return value - 0x200 if value & 0x100 else value


def dump_oam(oracle: EmeraldOracle) -> list[dict]:
    entries = []
    for i in range(OAM_COUNT):
        base = OAM_BASE + i * OAM_ENTRY_SIZE
        attr0 = u16(oracle, base)
        attr1 = u16(oracle, base + 2)
        attr2 = u16(oracle, base + 4)
        y = attr0 & 0xFF
        shape = (attr0 >> 14) & 0x3
        rs_flag = (attr0 >> 8) & 0x1
        double_or_hidden = (attr0 >> 9) & 0x1
        hidden = (rs_flag == 0 and double_or_hidden == 1)
        x_raw = attr1 & 0x1FF
        x = signed9(x_raw)
        size = (attr1 >> 14) & 0x3
        hflip = (attr1 >> 12) & 0x1 if rs_flag == 0 else None
        vflip = (attr1 >> 13) & 0x1 if rs_flag == 0 else None
        tile = attr2 & 0x3FF
        priority = (attr2 >> 10) & 0x3
        palette = (attr2 >> 12) & 0xF
        width, height = SHAPE_SIZE_DIMS.get((shape, size), (0, 0))
        entries.append({
            "oam": i,
            "hidden": hidden,
            "y": y,
            "x": x,
            "xRaw": x_raw,
            "shape": shape,
            "size": size,
            "width": width,
            "height": height,
            "tile": tile,
            "priority": priority,
            "palette": palette,
            "hflip": hflip,
            "vflip": vflip,
        })
    return entries


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def snapshot(tick: int) -> dict:
        oam = dump_oam(oracle)
        # Right-edge band: unsigned x in [176,256) covers sprites approaching
        # or straddling the screen edge; also report anything already
        # wrapped negative (x<0, i.e. xRaw in [400,512)) near the same Y band.
        relevant = [
            e for e in oam
            if not e["hidden"]
            and (176 <= e["x"] < 256 or -80 <= e["x"] < 0)
            and 40 <= e["y"] < 100
        ]
        return {
            "tick": tick,
            "relevantOam": relevant,
            "bgHofs": {b: u16(oracle, BG_HOFS[b]) & 0x1FF for b in range(4)},
            "bgVofs": {b: u16(oracle, BG_VOFS[b]) & 0x1FF for b in range(4)},
            "bgcnt": {
                0: u16(oracle, BG0CNT),
                1: u16(oracle, BG1CNT),
                2: u16(oracle, BG2CNT),
                3: u16(oracle, BG3CNT),
            },
            "dispcnt": u16(oracle, DISPCNT),
            "win0h": u16(oracle, WIN0H),
            "win1h": u16(oracle, WIN1H),
            "win0v": u16(oracle, WIN0V),
            "win1v": u16(oracle, WIN1V),
            "winin": u16(oracle, WININ),
            "winout": u16(oracle, WINOUT),
        }

    rows: list[dict] = []
    tick = 0

    def record_if_in_range() -> None:
        if START_TICK <= tick <= END_TICK:
            rows.append(snapshot(tick))

    record_if_in_range()
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
            record_if_in_range()
            if tick > END_TICK:
                break
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "profile": "battle-scene-off",
                "trace": str(TRACE_PATH),
                "range": [START_TICK, END_TICK],
                "rows": rows,
            },
            indent=2,
        )
    )


main()
