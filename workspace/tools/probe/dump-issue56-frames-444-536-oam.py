#!/usr/bin/env python3
"""ISSUES #56 item 2 probe: RAM-read full OAM (`x`/`y`/`x2`/`y2`/`affineMode`/
`matrixNum` + live `gOamMatrices[matrixNum]` a/b/c/d when affine) for every
in-use, visible sprite slot across one or more absolute-frame windows, for
either fixture shape this run's arbitrary-trainer-intro family uses:
  - a `factoryLegal` request whose pre-battle route is built internally by
    `oracle/battle_lab.py`'s `BattleLab.prepare()` (no flat button-segments
    file to replay) - `tools/battle-lab/factory-arbitrary-intro-*-off.json`.
  - a flat button-segment replay, optionally composed from a
    `sourceTrace`+`sourceSegmentCount`+`appendSegments` compare-trace (the
    same composition `tools/compare/run.ts` performs) - e.g.
    `tools/compare/traces/interactive-generated-intro-off.json` ->
    `tools/compare/traces-groundtruth/battle1-intro.json`. Detected by the
    fixture JSON having a top-level `segments` key (plain groundtruth trace)
    or a `sourceTrace` key (compare-trace composition); anything else is
    treated as a `BattleLab` request.

Combines two existing idioms, neither edited:
  - `tools/probe/dump-arbitrary-intro-bounce-driver.py`'s in-process
    `BattleLab.prepare()` drive + monkey-patched `oracle.advance` scan (this
    fixture family's only way to reach these ticks at all).
  - `tools/probe/dump-switchin-materialize-affine.py`'s OAM-byte decode
    (`struct OamData`'s packed matrixNum/affineMode fields) + live
    `gOamMatrices[matrixNum]` register read (needed to distinguish a real
    sub-pixel/matrix effect from a plain x/x2 translation), and its flat
    `segments`-replay driving loop (reused verbatim for the second fixture
    shape above).

Frame numbers are ABSOLUTE ticks since `new_session()` (0 == immediately
after `new_session()`) in both fixture shapes - the same space
`factory-arbitrary-intro-*-off.json` traces' own `preCheckpointFrameOffset`
maps to app-relative frames for the `BattleLab` shape
(`absolute = appRelative + preCheckpointFrameOffset`); the flat-replay shape
needs no offset (its own `captureWindow` is already in this same absolute
tick space, e.g. `interactive-generated-intro-off.json`'s frame 1492).

Run with the harness's mGBA-enabled interpreter, through the standard SIGSEGV-
tolerant wrapper:
    python3 tools/run-mgba-probe.py <output.json> -- \\
        tools/probe/dump-issue56-frames-444-536-oam.py <output.json> \\
        <fixture.json> <ranges>
    # <ranges> is "start1:end1,start2:end2,..." (inclusive, absolute frames)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(
        f"usage: {sys.argv[0]} <output.json> <fixture.json> <start1:end1[,start2:end2,...]>"
    )
OUTPUT_PATH = Path(sys.argv[1])
FIXTURE_PATH = Path(sys.argv[2])
RANGES: list[tuple[int, int]] = []
for chunk in sys.argv[3].split(","):
    a, b = chunk.split(":")
    RANGES.append((int(a), int(b)))


def in_ranges(frame: int) -> bool:
    return any(a <= frame <= b for a, b in RANGES)


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
MATRIX_SIZE = 8
GTASKS = 0x03005E00
TASK_SIZE = 0x28
GBATTLER_STATUS_SUMMARY_TASK_ID = 0x020244B4
GBATTLE_SPRITES_DATA_PTR = 0x020244D0
GMAIN = 0x030022C0
GMAIN_OAM_BUFFER_OFFSET = 0x38


def resolve_flat_segments(fixture: dict) -> list[dict] | None:
    """Returns the flat `segments` list for either non-BattleLab fixture
    shape (plain groundtruth trace, or a sourceTrace+appendSegments compare-
    trace composed the same way `tools/compare/run.ts` does), or None if
    `fixture` is a `BattleLab` request instead."""
    if "segments" in fixture:
        return fixture["segments"]
    if "sourceTrace" in fixture:
        source_path = (FIXTURE_PATH.parent / fixture["sourceTrace"]).resolve()
        source = json.loads(source_path.read_text())
        source_segments = source["segments"]
        count = fixture.get("sourceSegmentCount")
        if count is not None:
            source_segments = source_segments[:count]
        return [*source_segments, *fixture.get("appendSegments", [])]
    return None


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)

    g_oam_matrices = oracle.symbols["gOamMatrices"]

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def read_s16(addr: int) -> int:
        return s16(read_u16(addr))

    def read_u32(addr: int) -> int:
        return (
            oracle.read_u8(addr)
            | (oracle.read_u8(addr + 1) << 8)
            | (oracle.read_u8(addr + 2) << 16)
            | (oracle.read_u8(addr + 3) << 24)
        )

    rows: list[dict] = []

    def record_summary_task() -> dict:
        task_ids = [
            oracle.read_u8(GBATTLER_STATUS_SUMMARY_TASK_ID + battler)
            for battler in range(4)
        ]
        tasks = {}
        for task_id in sorted(set(task_ids)):
            base = GTASKS + task_id * TASK_SIZE
            tasks[str(task_id)] = {
                "active": bool(oracle.read_u8(base + 4)),
                "priority": oracle.read_u8(base + 7),
                "data": [read_s16(base + 8 + i * 2) for i in range(16)],
            }
        battle_sprites_data = read_u32(GBATTLE_SPRITES_DATA_PTR)
        animation_data = read_u32(battle_sprites_data + 8)
        healthboxes_data = read_u32(battle_sprites_data + 4)
        return {
            "taskIdsByBattler": task_ids,
            "tasks": tasks,
            "summaryShownByBattler": [
                bool(oracle.read_u8(healthboxes_data + battler * 12) & 1)
                for battler in range(4)
            ],
            "activeSummaryCount": (oracle.read_u8(animation_data + 9) >> 2) & 0x7,
        }

    def record_oam() -> list[dict]:
        entries = []
        for index in range(128):
            base = GMAIN + GMAIN_OAM_BUFFER_OFFSET + index * 8
            attr0 = read_u16(base)
            attr1 = read_u16(base + 2)
            attr2 = read_u16(base + 4)
            # ST_OAM_AFFINE_ERASE is the buffer's empty entry. Matrix rows
            # live at the same offsets, but cannot be ordinary drawable OAM.
            if (attr0 & 0x3) == 2:
                continue
            entries.append({
                "index": index,
                "x": attr1 & 0x1FF,
                "y": attr0 & 0xFF,
                "tile": attr2 & 0x3FF,
                "palette": (attr2 >> 12) & 0xF,
                "priority": (attr2 >> 10) & 0x3,
            })
        return entries

    def record() -> None:
        row = {
            "frame": oracle.frame,
            "sprites": {},
            "summaryTask": record_summary_task(),
            "oam": record_oam(),
        }
        for slot in SLOTS:
            base = GSPRITES + slot * SPRITE_SIZE
            flags3e = read_u16(base + 0x3E)
            in_use = bool(flags3e & 0x1)
            invisible = bool(flags3e & 0x4)
            if not in_use or invisible:
                continue
            oam_byte1 = oracle.read_u8(base + 1)
            oam_byte3 = oracle.read_u8(base + 3)
            affine_mode = oam_byte1 & 0x3
            matrix_num = (oam_byte3 >> 1) & 0x1F
            entry = {
                "x": read_s16(base + 0x20),
                "y": read_s16(base + 0x22),
                "x2": read_s16(base + 0x24),
                "y2": read_s16(base + 0x26),
                "affineMode": affine_mode,
                "matrixNum": matrix_num,
                "animNum": oracle.read_u8(base + 42),
                "animCmdIndex": oracle.read_u8(base + 43),
            }
            if affine_mode != 0:
                matrix_base = g_oam_matrices + matrix_num * MATRIX_SIZE
                entry["pa"] = read_s16(matrix_base + 0)
                entry["pb"] = read_s16(matrix_base + 2)
                entry["pc"] = read_s16(matrix_base + 4)
                entry["pd"] = read_s16(matrix_base + 6)
            row["sprites"][str(slot)] = entry
        rows.append(row)

    flat_segments = resolve_flat_segments(fixture)

    if flat_segments is None:
        orig_advance = oracle.advance

        def patched_advance(buttons):
            orig_advance(buttons)
            if in_ranges(oracle.frame):
                record()

        oracle.advance = patched_advance  # type: ignore[method-assign]

        oracle.new_session()
        lab = BattleLab(oracle, "battle-scene-off")
        request = validate_request(fixture, "battle-scene-off")
        lab.prepare(request)
    else:
        oracle.new_session()
        if in_ranges(oracle.frame):
            record()
        last_end = max((b for _, b in RANGES), default=0)
        for segment in flat_segments:
            buttons = segment.get("buttons", [])
            for _ in range(int(segment["frames"])):
                oracle.advance(buttons)
                if in_ranges(oracle.frame):
                    record()
                if oracle.frame > last_end:
                    break
            if oracle.frame > last_end:
                break

    OUTPUT_PATH.write_text(json.dumps({"rows": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} frames, slots scanned={len(SLOTS)})")


main()
