#!/usr/bin/env python3
"""Throwaway: scan every gSprites[] slot at RAM ticks 1492-1496 for the
opponent ball-open particle burst (subpriority=28, matching
PARTICLE_OAM_SUBPRIORITY), reporting each live particle's own array index
(the tie-break order SortSprites actually falls back to) + x2/y2, to check
whether sprite-slot REUSE scrambles the simple "ascending spawn index =
ascending array index" assumption right at the PARTICLE_LATE_SPAWN_START_INDEX
(14) boundary - ISSUES #18's 1496 residual (age0/age1 particles, exact Y tie).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

G_SPRITES = 0x02020630
SPRITE_SIZE = 0x44
MAX_SPRITES = 64
PARTICLE_SUBPRIORITY = 28

TARGET_TICKS = set(range(1492, 1497))


def s16(v):
    return v - 0x10000 if v >= 0x8000 else v


def read_sprite(oracle: EmeraldOracle, idx: int) -> dict | None:
    base = G_SPRITES + idx * SPRITE_SIZE

    def u16(off):
        lo = oracle.read_u8(base + off)
        hi = oracle.read_u8(base + off + 1)
        return lo | (hi << 8)

    subpriority = oracle.read_u8(base + 0x43)
    if subpriority != PARTICLE_SUBPRIORITY:
        return None
    flags = u16(0x3E)
    invisible = bool(flags & 0x4)
    oam2 = u16(4)
    priority = (oam2 >> 10) & 0x3
    if priority != 1:
        return None
    return {
        "idx": idx,
        "invisible": invisible,
        "x2": s16(u16(0x24)),
        "y2": s16(u16(0x26)),
        "animCmdIndex": oracle.read_u8(base + 0x2A),
        "callback": oracle.read_u32(base + 0x1C),
    }


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    tick = 0
    rows = []
    max_tick = max(TARGET_TICKS)
    for segment in segments:
        if tick > max_tick:
            break
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            if tick > max_tick:
                break
            oracle.advance(buttons)
            tick += 1
            if tick in TARGET_TICKS:
                sprites = []
                for idx in range(MAX_SPRITES):
                    sp = read_sprite(oracle, idx)
                    if sp is not None and not sp["invisible"]:
                        sprites.append(sp)
                rows.append({"ramTick": tick, "sprites": sprites})

    OUTPUT_PATH.write_text(json.dumps({"rows": rows}, indent=0))


main()
