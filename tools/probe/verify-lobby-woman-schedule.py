#!/usr/bin/env python3
"""PASS/FAIL verification of the Lobby wandering-woman NPC schedule
(MOVEMENT_TYPE_WANDER_AROUND, OBJ_EVENT_GFX_WOMAN_1, map spawn (3,11)).

Replays the committed loss-beyond-boundary scratch fixture through the residual
window (5170-5254) and checks the woman's per-tick schedule against the
ground-truth table measured on 2026-08-07
(docs/factory-lobby-freeroam-ground-truth.md §6, PROGRESS 981 residual):

  - map tile (grid coords -7, MAP_OFFSET per include/fieldmap.h:18),
  - facing (real enum SOUTH=1/NORTH=2/WEST=3/EAST=4, constants/global.h:138-141),
  - movementActionId (0x09 = MOVEMENT_ACTION_WALK_NORMAL_UP, 0xff = none),
  - world box-top px (sprite logical x/y, the follow-cam render anchor).

The woman leaves spawn at 5185 and settles at (3,10) / world (104,144) at 5200,
which drives the 12 red frames (5186-5254) of the loss-beyond-boundary-off
compare. Run only through tools/run-mgba-probe.py:

    python3 tools/run-mgba-probe.py /tmp/wander-verify.json -- \
        python3 tools/probe/verify-lobby-woman-schedule.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent

FIXTURE = WORKTREE_ROOT / "tools" / "battle-lab" / "scratch-loss-beyond-boundary-probe.json"

WOMAN_GFX_ID = 16  # OBJ_EVENT_GFX_WOMAN_1, constants/event_objects.h:23

# (tick, mapX, mapY, facing, movementActionId, worldBoxTopX, worldBoxTopY)
# Dense from the residual-window RAM probe (run 2026-08-07, twice byte-identical).
# Facing: S=SOUTH, N=NORTH (raw nibble 1/2).
EXPECTED = [
    (5170, 3, 11, "S", 0xFF, 104, 160),
    (5184, 3, 11, "S", 0xFF, 104, 160),
    (5185, 3, 10, "N", 0x09, 104, 159),
    (5186, 3, 10, "N", 0x09, 104, 158),
    (5188, 3, 10, "N", 0x09, 104, 156),
    (5190, 3, 10, "N", 0x09, 104, 154),
    (5192, 3, 10, "N", 0x09, 104, 152),
    (5195, 3, 10, "N", 0x09, 104, 149),
    (5199, 3, 10, "N", 0x09, 104, 145),
    (5200, 3, 10, "N", 0xFF, 104, 144),
    (5205, 3, 10, "N", 0xFF, 104, 144),
    (5210, 3, 10, "N", 0xFF, 104, 144),
    (5215, 3, 10, "N", 0xFF, 104, 144),
    (5220, 3, 10, "N", 0xFF, 104, 144),
    (5224, 3, 10, "N", 0xFF, 104, 144),
    (5240, 3, 10, "N", 0xFF, 104, 144),
    (5254, 3, 10, "N", 0xFF, 104, 144),
]

FULL = {1: "SOUTH", 2: "NORTH", 3: "WEST", 4: "EAST"}

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json>")


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

OBJECT_EVENTS = 0x2037350
OBJ_STRIDE = 0x24
OBJ_EVENTS_COUNT = 16
G_SPRITES = 0x2020630
G_SPRITE_STRIDE = 0x44

OUT = Path(sys.argv[1])


def main() -> int:
    scenario = json.loads(FIXTURE.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    request = validate_request(scenario, "battle-scene-off")
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(request)

    def read_u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def read_u16(addr: int) -> int:
        return oracle.read_u16(addr)

    def read_s16(addr: int) -> int:
        v = oracle.read_u16(addr)
        return v - 0x10000 if v & 0x8000 else v

    def woman_state() -> dict:
        for i in range(OBJ_EVENTS_COUNT):
            base = OBJECT_EVENTS + i * OBJ_STRIDE
            graphics_id = read_u8(base + 0x05)
            if graphics_id != WOMAN_GFX_ID:
                continue
            face_move = read_u16(base + 0x18)
            sprite_base = G_SPRITES + read_u8(base + 0x04) * G_SPRITE_STRIDE
            return {
                "mapX": read_s16(base + 0x10) - 7,
                "mapY": read_s16(base + 0x12) - 7,
                "facing": FULL.get(face_move & 0xF, "?")[0],
                "actionId": read_u8(base + 0x1C),
                "worldX": read_s16(sprite_base + 0x20),
                "worldY": read_s16(sprite_base + 0x22),
            }
        return None

    segments = request["trace"]["segments"]
    failures = []
    expected_by_tick = {t[0]: t for t in EXPECTED}
    tick = 0

    def maybe_check():
        if tick in expected_by_tick:
            st = woman_state()
            want = expected_by_tick[tick]
            want_map = (want[1], want[2])
            if st is None:
                failures.append(f"tick {tick}: no woman object event")
            else:
                got = ((st["mapX"], st["mapY"]), st["facing"], st["actionId"], st["worldX"], st["worldY"])
                want_all = (want_map, want[3], want[4], want[5], want[6])
                if got != want_all:
                    failures.append(f"tick {tick}: got {got} want {want_all}")

    maybe_check()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            maybe_check()
        if tick > 5254:
            break

    OUT.write_text(json.dumps({"tick": tick, "failures": failures}, indent=0))
    if failures:
        print("FAIL: " + " | ".join(failures))
        return 1
    print(f"PASS: woman schedule matches at all {len(EXPECTED)} pinned ticks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
