#!/usr/bin/env python3
"""Derive the full source-owned Factory seventh-win terminal timeline (OFF).

This is dev-only evidence tooling.  It replays the established late Battle-1
prefix, writes exactly the SaveBlock/map-loader state which the retail seventh
win branch has already produced, then observes the ordinary lobby scripts.
It never writes a field script, text printer, task, party, menu, sound, or
renderer state.  The compact JSON records RAM and framebuffer hashes only;
it does not produce image assets.

Run through tools/run-mgba-probe.py with a fresh output path.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <fresh-output.json>")

OUTPUT_PATH = Path(sys.argv[1])
RGB_DIR = Path(os.environ["FACTORY_SEVENTH_WIN_RGB_DIR"]) if os.environ.get("FACTORY_SEVENTH_WIN_RGB_DIR") else None
RGB_START = int(os.environ.get("FACTORY_SEVENTH_WIN_RGB_START", "1"))
RGB_END = int(os.environ.get("FACTORY_SEVENTH_WIN_RGB_END", "2513"))
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / "oracle"))

from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = HARNESS_ROOT / "oracle" / "bootstrap" / "factory-battle-scene-off.json"
PREFIX_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth" / "battle1-postwin-dense.json"

# The source success branch (`BattleFactoryBattleRoom/scripts.inc:98-105`) has
# established these values before warping into the lobby's WonChallenge script.
PREFIX_TICK = 29601
CHALLENGE_STATUS_WON = 3
CHALLENGE_STATUS_NONE = 0
FACTORY_SINGLES_50_ACTIVE = 1 << 8
FACTORY_LOBBY_GROUP = 26
FACTORY_LOBBY_NUM = 31
FACTORY_BATTLE_ROOM_GROUP = 26
FACTORY_BATTLE_ROOM_NUM = 33
WARP_ID_NONE = 0xFF
LOBBY_X = 4
LOBBY_Y = 8
FRONTIER_CHALLENGE_STATUS = 0xCA8
FRONTIER_BATTLE_NUM = 0xCB2
FRONTIER_ACTIVE_FLAGS = 0xCDC
FRONTIER_FACTORY_SINGLES_50_STREAK = 0xDE2
FRONTIER_BATTLE_POINTS = 0xEB8
SAVE_BLOCK1_LOCATION = 0x04
SAVE_BLOCK1_PLAYER_PARTY = 0x238
PARTY_SIZE = 6
POKEMON_SIZE = 100
GMAIN_CALLBACK2 = 0x004
GMAIN_STATE = 0x438

# These source-static RAM locations are intentionally probe-only.  They are
# pinned by the local-symbol table of the checked-in ELF, not an app ABI.
STEXT_PRINTERS = 0x020201B0
SFANFARE_COUNTER = 0x03000F4E
SPROCESS_INPUT_DELAY = 0x02039F90
TASK_DRAW_FIELD_MESSAGE = 0x08098155
TASK_HANDLE_MULTICHOICE_INPUT = 0x080E2059
TASK_SIZE = 0x28
NUM_TASKS = 16

# Deliberately roomy, source-relative releases.  They demonstrate gates rather
# than encode timing into production code.  GETPOINTS has no user release:
# MSGBOX_GETPOINTS waits for its fanfare itself.
INPUTS_TO_READY_MENU = {
    300: ["A"],       # congratulations DEFAULT wait
    1100: ["A"],      # award \l page-scroll wait
    2200: ["A"],      # award DEFAULT wait -> frontier_givepoints
    3500: ["A"],      # exchange \p page-clear wait
    4400: ["A"],      # record-question \l page-scroll wait
}
MENU_DRAW = 4422
MENU_ACCEPT = 4424
FINAL_FRAME = MENU_ACCEPT + 1


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def u32(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u32(addr)


def write_u16(oracle: EmeraldOracle, addr: int, value: int) -> None:
    oracle.write_u8(addr, value & 0xFF)
    oracle.write_u8(addr + 1, value >> 8)


def write_u32(oracle: EmeraldOracle, addr: int, value: int) -> None:
    for offset in range(4):
        oracle.write_u8(addr + offset, value >> (offset * 8))


def write_warp(oracle: EmeraldOracle, addr: int, group: int, num: int, warp_id: int, x: int, y: int) -> None:
    for offset, value in enumerate((group, num, warp_id, x, y)):
        oracle.write_u8(addr + offset, value & 0xFF)


def save1_base(oracle: EmeraldOracle) -> int:
    return u32(oracle, oracle.symbols["gSaveBlock1Ptr"])


def frontier_base(oracle: EmeraldOracle) -> int:
    return u32(oracle, oracle.symbols["gSaveBlock2Ptr"])


def party_hash(oracle: EmeraldOracle, addr: int) -> str:
    return hashlib.sha256(bytes(oracle.read_u8(addr + i) for i in range(PARTY_SIZE * POKEMON_SIZE))).hexdigest()


def task_by_function(oracle: EmeraldOracle, function: int) -> dict[str, int] | None:
    base = oracle.symbols["gTasks"]
    for task_id in range(NUM_TASKS):
        addr = base + task_id * TASK_SIZE
        if oracle.read_u8(addr + 4) and u32(oracle, addr) == function:
            return {"id": task_id, "data0": u16(oracle, addr + 8), "windowId": oracle.read_u8(addr + 20)}
    return None


def frame(oracle: EmeraldOracle, relative: int) -> dict[str, object]:
    save1 = save1_base(oracle)
    frontier = frontier_base(oracle)
    saved_hash = party_hash(oracle, save1 + SAVE_BLOCK1_PLAYER_PARTY)
    player_hash = party_hash(oracle, oracle.symbols["gPlayerParty"])
    printer = STEXT_PRINTERS
    rgb = oracle.screen_rgb()
    message_task = task_by_function(oracle, TASK_DRAW_FIELD_MESSAGE)
    menu_task = task_by_function(oracle, TASK_HANDLE_MULTICHOICE_INPUT)
    return {
        "tick": relative,
        "sha256": hashlib.sha256(rgb).hexdigest(),
        "rng": u32(oracle, oracle.symbols["gRngValue"]),
        "challengeStatus": oracle.read_u8(frontier + FRONTIER_CHALLENGE_STATUS),
        "battlePoints": u16(oracle, frontier + FRONTIER_BATTLE_POINTS),
        "partyRestored": player_hash == saved_hash,
        "printer": {"active": oracle.read_u8(printer + 0x1B), "state": oracle.read_u8(printer + 0x1C)},
        "messageTaskState": None if message_task is None else message_task["data0"],
        "fanfareCounter": u16(oracle, SFANFARE_COUNTER),
        "recordMenu": None if menu_task is None else {"windowId": menu_task["windowId"], "inputDelay": oracle.read_u8(SPROCESS_INPUT_DELAY)},
        "recordResult": u16(oracle, oracle.symbols["gSpecialVar_Result"]),
    }


def replay_and_stage(oracle: EmeraldOracle, trace: dict) -> dict[str, object]:
    oracle.new_session()
    tick = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
    if tick != PREFIX_TICK:
        raise AssertionError(f"expected prefix tick {PREFIX_TICK}, got {tick}")

    save1 = save1_base(oracle)
    frontier = frontier_base(oracle)
    if not u32(oracle, frontier + FRONTIER_ACTIVE_FLAGS) & FACTORY_SINGLES_50_ACTIVE:
        raise AssertionError("canonical prefix did not retain Factory singles-50 active state")
    oracle.write_u8(frontier + FRONTIER_CHALLENGE_STATUS, CHALLENGE_STATUS_WON)
    write_u16(oracle, frontier + FRONTIER_BATTLE_NUM, 7)
    write_u16(oracle, frontier + FRONTIER_FACTORY_SINGLES_50_STREAK, 7)
    write_u16(oracle, frontier + FRONTIER_BATTLE_POINTS, 0)
    write_warp(oracle, save1 + SAVE_BLOCK1_LOCATION, FACTORY_LOBBY_GROUP, FACTORY_LOBBY_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    write_warp(oracle, oracle.symbols["gLastUsedWarp"], FACTORY_BATTLE_ROOM_GROUP, FACTORY_BATTLE_ROOM_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    oracle.write_u8(oracle.symbols["gMain"] + GMAIN_STATE, 0)
    write_u32(oracle, oracle.symbols["gMain"] + GMAIN_CALLBACK2, oracle.symbols["CB2_LoadMap"] | 1)
    staged = frame(oracle, 0)
    if staged["challengeStatus"] != CHALLENGE_STATUS_WON or staged["battlePoints"] != 0:
        raise AssertionError(f"seventh-win stage did not stick: {staged}")
    return staged


def lcg_steps(before: int, after: int, maximum: int = 16) -> int | None:
    value = before
    for calls in range(1, maximum + 1):
        value = (value * 0x41C64E6D + 0x6073) & 0xFFFFFFFF
        if value == after:
            return calls
    return None


def spans(rows: list[dict[str, object]], value_at) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    start = int(rows[0]["tick"])
    value = value_at(rows[0])
    previous = start
    for row in rows[1:]:
        tick = int(row["tick"])
        next_value = value_at(row)
        if next_value != value:
            result.append({"value": value, "start": start, "end": previous})
            start, value = tick, next_value
        previous = tick
    result.append({"value": value, "start": start, "end": previous})
    return result


def first(rows: list[dict[str, object]], predicate) -> int | None:
    return next((int(row["tick"]) for row in rows if predicate(row)), None)


def static_framebuffer_holds(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    # A visual hold is only reported when RGB888 hash is unchanged for >=8
    # consecutive frames. RNG intentionally remains outside this predicate:
    # the field VBlank RNG advances while a visible message waits.
    result = []
    start = int(rows[0]["tick"])
    value = rows[0]["sha256"]
    previous = start
    for row in rows[1:]:
        tick = int(row["tick"])
        if row["sha256"] != value:
            if previous - start + 1 >= 8:
                result.append({"start": start, "end": previous, "sha256": value})
            start, value = tick, row["sha256"]
        previous = tick
    if previous - start + 1 >= 8:
        result.append({"start": start, "end": previous, "sha256": value})
    return result


def run_case(
    oracle: EmeraldOracle,
    trace: dict,
    scheduled_inputs: dict[int, list[str]],
    frames: int,
    capture_rgb: bool = False,
) -> tuple[dict[str, object], list[dict[str, object]]]:
    staged = replay_and_stage(oracle, trace)
    rows = []
    for relative in range(1, frames + 1):
        buttons = scheduled_inputs.get(relative, [])
        oracle.advance(buttons)
        if capture_rgb and RGB_DIR is not None and RGB_START <= relative <= RGB_END:
            (RGB_DIR / f"{relative:03d}.rgb").write_bytes(oracle.screen_rgb())
        row = frame(oracle, relative)
        if buttons:
            row["buttons"] = buttons
        rows.append(row)
    return staged, rows


def compact_timeline(staged: dict[str, object], rows: list[dict[str, object]]) -> dict[str, object]:
    rng_calls = [lcg_steps(int(before["rng"]), int(after["rng"])) for before, after in zip([staged, *rows[:-1]], rows)]
    if any(calls is None for calls in rng_calls):
        raise AssertionError(f"could not express terminal RNG delta as <=16 Gen-3 LCG calls: {spans(rows, lambda row: rng_calls[int(row['tick']) - 1])}")
    fanfare_active = [row for row in rows if row["fanfareCounter"] != 0]
    return {
        "printer": spans(rows, lambda row: (row["printer"]["active"], row["printer"]["state"])),
        "fanfare": {
            "start": None if not fanfare_active else fanfare_active[0]["tick"],
            "initialCounter": None if not fanfare_active else fanfare_active[0]["fanfareCounter"],
            "lastNonzero": None if not fanfare_active else fanfare_active[-1]["tick"],
            "firstZero": first(rows, lambda row: row["tick"] > fanfare_active[0]["tick"] and row["fanfareCounter"] == 0) if fanfare_active else None,
        },
        "recordMenu": spans(rows, lambda row: None if row["recordMenu"] is None else row["recordMenu"]["inputDelay"]),
        "rngLcgCallsPerFrame": spans(rows, lambda row: rng_calls[int(row["tick"]) - 1]),
        "staticFramebufferHolds": [hold for hold in static_framebuffer_holds(rows) if hold["end"] - hold["start"] + 1 >= 50],
        "firstBattlePointMutation": first(rows, lambda row: row["battlePoints"] == 3),
        "firstPartyRestore": first(rows, lambda row: row["partyRestored"]),
        "firstChallengeStatusClear": first(rows, lambda row: row["challengeStatus"] == CHALLENGE_STATUS_NONE),
        "recordMenuDraw": first(rows, lambda row: row["recordMenu"] is not None),
        "recordMenuDelayZero": first(rows, lambda row: row["recordMenu"] is not None and row["recordMenu"]["inputDelay"] == 0),
    }


def main() -> None:
    trace = json.loads(PREFIX_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    ready_stage, ready_rows = run_case(
        oracle,
        trace,
        INPUTS_TO_READY_MENU,
        MENU_ACCEPT,
        capture_rgb=True,
    )
    rejected_stage, rejected_rows = run_case(oracle, trace, {**INPUTS_TO_READY_MENU, MENU_DRAW: ["A"]}, MENU_DRAW + 1)
    accepted_stage, accepted_rows = run_case(oracle, trace, {**INPUTS_TO_READY_MENU, MENU_ACCEPT: ["A"]}, FINAL_FRAME)
    if ready_stage != rejected_stage or ready_stage != accepted_stage:
        raise AssertionError("identical terminal staging did not remain deterministic")
    timeline = compact_timeline(ready_stage, ready_rows)
    if timeline["firstBattlePointMutation"] != 2201 or timeline["firstPartyRestore"] != 3549 or timeline["firstChallengeStatusClear"] != 3549:
        raise AssertionError(f"seventh-win source milestones drifted: {timeline}")
    if timeline["recordMenuDraw"] != MENU_DRAW or timeline["recordMenuDelayZero"] != MENU_DRAW + 1:
        raise AssertionError(f"record menu boundaries drifted: {timeline}")
    rejected_next = rejected_rows[-1]
    if rejected_next["recordMenu"] is None or rejected_next["recordResult"] != 0xFF:
        raise AssertionError(f"A at draw frame was not rejected: {rejected_next}")
    accepted_next = accepted_rows[-1]
    if accepted_next["recordMenu"] is not None or accepted_next["recordResult"] != 1:
        raise AssertionError(f"A at first accepted frame was not default-NO: {accepted_next}")
    output = {
        "schema": "factory-seventh-win-timeline-off/v1",
        "oracleProfile": "battle-scene-off",
        "sourceTrace": str(PREFIX_PATH.relative_to(WORKTREE_ROOT)),
        "relativeTo": "the staged source-owned seventh-win Factory Lobby CB2_LoadMap handoff after canonical prefix tick 29601",
        "construction": {
            "writes": [
                {"target": "frontier.challengeStatus", "offset": "0xCA8", "value": 3, "source": "BattleFactoryBattleRoom/scripts.inc:98-105"},
                {"target": "frontier.curChallengeBattleNum", "offset": "0xCB2", "value": 7, "source": "BattleFactoryBattleRoom/scripts.inc:98-103"},
                {"target": "frontier.factoryWinStreaks[SINGLES][LEVEL_50]", "offset": "0xDE2", "value": 7, "source": "BattleFactoryBattleRoom/scripts.inc:98-100"},
                {"target": "frontier.battlePoints", "offset": "0xEB8", "value": 0, "source": "first completed-challenge precondition"},
                {"target": "SaveBlock1.location/gLastUsedWarp/gMain.callback2", "value": "Factory Lobby 4,8 / Factory Battle Room provenance / CB2_LoadMap", "source": "BattleFactoryBattleRoom/scripts.inc:222-227; overworld.c:540-546,1572-1587"},
            ],
            "notWritten": ["field script", "message/text printer", "tasks/windows", "party", "sound/fanfare", "record result", "renderer/framebuffer"],
            "sourceContinuation": "BattleFactoryBattleRoom -> CB2_LoadMap -> BattleFactoryLobby WonChallenge -> GiveBattlePoints -> AskRecordBattle",
        },
        "controls": [{"relativeTick": tick, "buttons": buttons} for tick, buttons in INPUTS_TO_READY_MENU.items()],
        "timeline": timeline,
        "recordMenuControls": {
            "drawFrameRejectedA": {"tick": MENU_DRAW, "nextFrame": {"menuAlive": rejected_next["recordMenu"] is not None, "result": rejected_next["recordResult"]}},
            "firstAcceptedDefaultNoA": {"tick": MENU_ACCEPT, "nextFrame": {"menuAlive": accepted_next["recordMenu"] is not None, "result": accepted_next["recordResult"]}},
        },
        "limits": {"noPngOrRgbAssets": True, "noProductionRendererUse": True, "framebufferEvidence": "raw RGB888 SHA-256 only"},
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n")


main()
