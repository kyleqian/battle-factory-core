#!/usr/bin/env python3
"""RAM probe for free-roam Lobby movement (rung C of the SIDE-lane ground-truth
scout, docs/factory-lobby-freeroam-ground-truth.md): replays the scratch walk
fixture's own trace.segments and records the player object event's exact
currentCoords, facing direction, running state, and tile-transition state every
tick in the requested window, so the free-roam boundary tick, per-tile walk
cadence, and collision blocks can be pinned exactly.

Run only through tools/run-mgba-probe.py, e.g.:
    python3 tools/run-mgba-probe.py /tmp/lobby-walk-out.json -- \
        python3 tools/probe/dump-lobby-walk-player-coords.py \
        /tmp/lobby-walk-out.json 5160 5472
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
SCENARIO_PATH = WORKTREE_ROOT / "tools" / "battle-lab" / "scratch-loss-lobby-walk-probe.json"

OBJECT_EVENTS = 0x2037350
OBJ_STRIDE = 0x24
OBJ_IS_PLAYER_BIT = 2  # bits: active[0]... isPlayer at bit position 2 of the u32 at 0x00
PLAYER_AVATAR = 0x2037590
PA_OFF_OBJECT_EVENT_ID = 0x05
PA_OFF_RUNNING_STATE = 0x02
PA_OFF_TILE_TRANSITION_STATE = 0x03
CAMERA = 0x2037334

DIR_NAMES = {0: "DOWN", 1: "UP", 2: "LEFT", 3: "RIGHT"}


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
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

    def read_u32(addr: int) -> int:
        return oracle.read_u32(addr)

    player_id = read_u8(PLAYER_AVATAR + PA_OFF_OBJECT_EVENT_ID)
    obj_base = OBJECT_EVENTS + player_id * OBJ_STRIDE

    def state() -> dict:
        flags = read_u32(obj_base + 0x00)
        is_player = (flags >> OBJ_IS_PLAYER_BIT) & 1
        return {
            "objectEventId": player_id,
            "isPlayer": is_player,
            "x": read_s16(obj_base + 0x10),
            "y": read_s16(obj_base + 0x12),
            "prevX": read_s16(obj_base + 0x14),
            "prevY": read_s16(obj_base + 0x16),
            "facing": DIR_NAMES.get(read_u16(obj_base + 0x18) & 0xF, "?"),
            "movementType": read_u8(obj_base + 0x06),
            "runningState": read_u8(PLAYER_AVATAR + PA_OFF_RUNNING_STATE),
            "tileTransition": read_u8(PLAYER_AVATAR + PA_OFF_TILE_TRANSITION_STATE),
            "camX": read_u32(CAMERA + 0x04),
            "camY": read_u32(CAMERA + 0x08),
        }

    segments = request["trace"]["segments"]
    ticks_out = []
    tick = 0

    def maybe_record():
        if START_TICK <= tick <= END_TICK:
            ticks_out.append({"tick": tick, **state()})

    maybe_record()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            maybe_record()
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out, "finalTick": tick}, indent=0))


main()
