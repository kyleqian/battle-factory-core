#!/usr/bin/env python3
"""ISSUES #97 side-lane instrument, the exact next probe §8.7/§8's own
closing text named for `turn5-resolve-off-c` tick 6763: a raw **hardware**
OAM census (0x07000000, all 128 slots - not the software `gSprites[]`
bookkeeping table every prior probe in this family read) at a SPAN of
consecutive ticks straddling the healthbox slide-in onset (6760-6765),
paired with the same-tick software `gSprites[]` read for PIDGEOTTO's own
three healthbox sprites (left/right/bar), all in ONE probe run so the two
views can be compared tick-for-tick without any cross-run bootstrap drift.

Why this probe, precisely: `dump-turn5-resolve-offc-healthbox-halfsprite-
vram.py` (prior session) found the software struct fully correct at tick
6762 (invisible=False, position/content byte-exact against the oracle's
own eventual PNG(6763) content) YET the three healthbox sprites' own tile
numbers (156/188/292) were entirely ABSENT from the hardware OAM buffer
read at that same tick - not merely mispositioned, genuinely missing. That
prior probe only sampled hardware OAM at a single tick (6762). This probe
sweeps a tick window and asks: at which advance-tick does each sprite's
own tile number FIRST appear in hardware OAM, and does that onset tick
differ from when the software struct itself goes non-invisible (6762,
`dump-turn5-resolve-offc-tail-probe.py`, already established) by exactly
one extra tick (a hardware-OAM-copy lag layered on top of the family's
already-known "PNG(T) shows RAM(T-1)" display-basis convention) - or does
it never appear in this window at all (a different mechanism, e.g. an
OAM-slot budget/sort-order truncation specific to this crowded frame).

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-resolve-offc-hwoam-schedule-probe.py \\
      tools/compare/traces/turn5-resolve-off-c.json <fresh-output.json> \\
      6760 6761 6762 6763 6764 6765

(mGBA teardown SIGSEGV after valid JSON is written is expected and benign
per tools/run-mgba-probe.py's own docstring.)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) < 3:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> [tick ...]")

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TARGET_TICKS = [int(t) for t in sys.argv[3:]] or [6760, 6761, 6762, 6763, 6764, 6765]

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
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

SPRITE_SIZE = 0x44
DISPCNT = 0x04000000

# The three PIDGEOTTO healthbox sprites' own known tile numbers, per
# `dump-turn5-resolve-offc-healthbox-halfsprite-vram.py` (prior session):
# left=156, right=188 (=156+32, opponent-side CreateBattlerHealthboxSprites
# offset), bar=292.
KNOWN_TILE_NUMS = {"left": 156, "right": 188, "bar": 292}


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    g_sprites = oracle.symbols["gSprites"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return u8(addr) | (u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def s8(addr: int) -> int:
        v = u8(addr)
        return v - 0x100 if v >= 0x80 else v

    def read_sprite(sprite_id: int) -> dict:
        base = g_sprites + sprite_id * SPRITE_SIZE
        a0 = u16(base)
        a1 = u16(base + 2)
        shape = (a0 >> 14) & 0x3
        size = (a1 >> 14) & 0x3
        tile_num = u16(base + 4) & 0x3FF
        pal_num = (u16(base + 4) >> 12) & 0xF
        affine_param = u16(base + 6)
        data5 = s16(base + 0x2E + 5 * 2)
        flags = u16(base + 0x3E)
        return {
            "spriteId": sprite_id,
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "centerToCornerVecX": s8(base + 0x28),
            "invisible": bool(flags & 0x4),  # SPRITE_FLAGS: bit0 inUse, bit2 invisible
            "shape": shape,
            "size": size,
            "tileNum": tile_num,
            "paletteNum": pal_num,
            "affineParam": affine_param,
            "data5": data5,
        }

    def hw_oam_scan() -> list:
        entries = []
        for slot in range(128):
            base = 0x07000000 + slot * 8
            a0 = u16(base)
            a1 = u16(base + 2)
            a2 = u16(base + 4)
            obj_mode = (a0 >> 10) & 0x3
            if obj_mode == 2:  # OBJ disabled
                continue
            entries.append({
                "oamSlot": slot,
                "y": a0 & 0xFF,
                "shape": (a0 >> 14) & 0x3,
                "x": a1 & 0x1FF,
                "size": (a1 >> 14) & 0x3,
                "tileNum": a2 & 0x3FF,
                "priority": (a2 >> 10) & 0x3,
                "paletteNum": (a2 >> 12) & 0xF,
            })
        return entries

    target_set = sorted(set(TARGET_TICKS))
    max_tick = target_set[-1]
    records = {}

    tick = 0
    segment_iter = iter(segments)
    remaining_targets = list(target_set)

    for segment in segments:
        if tick > max_tick:
            break
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            if tick > max_tick:
                break
            oracle.advance(buttons)
            tick += 1
            if remaining_targets and tick == remaining_targets[0]:
                remaining_targets.pop(0)
                left_id = u8(g_healthbox_sprite_ids + 1)
                left = read_sprite(left_id)
                right_id = left["affineParam"] & 0xFF
                right = read_sprite(right_id)
                bar_id = left["data5"] & 0xFF
                bar = read_sprite(bar_id)
                hw_oam = hw_oam_scan()
                hw_by_tile = {e["tileNum"]: e for e in hw_oam}
                records[tick] = {
                    "tick": tick,
                    "software": {"left": left, "right": right, "bar": bar},
                    "hwOamEntryCount": len(hw_oam),
                    "hwOamTileNumsSorted": sorted(e["tileNum"] for e in hw_oam),
                    "hwMatch": {
                        name: hw_by_tile.get(tnum)
                        for name, tnum in KNOWN_TILE_NUMS.items()
                    },
                }

    # Summarize: first tick (if any) each sprite's tile number appears in
    # hardware OAM, vs. the tick its software struct first shows
    # invisible=False.
    first_hw_appearance = {}
    first_software_visible = {}
    for t in target_set:
        rec = records.get(t)
        if rec is None:
            continue
        for name in KNOWN_TILE_NUMS:
            if name not in first_software_visible and not rec["software"][name]["invisible"]:
                first_software_visible[name] = t
            if name not in first_hw_appearance and rec["hwMatch"][name] is not None:
                first_hw_appearance[name] = t

    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH),
        "targetTicks": target_set,
        "records": records,
        "firstSoftwareVisibleTick": first_software_visible,
        "firstHwOamAppearanceTick": first_hw_appearance,
    }, indent=1))
    print(f"wrote {OUTPUT_PATH} (ticks={target_set})")


main()
