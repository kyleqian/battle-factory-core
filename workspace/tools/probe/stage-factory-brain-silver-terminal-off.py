#!/usr/bin/env python3
"""Derive the Factory brain (Noland silver) seventh-win terminal timeline (OFF).

Brain analog of `stage-factory-seventh-win-timeline-off.py` -- same technique
(replay the established late Battle-1 prefix, then write exactly the
SaveBlock/map-loader state a genuine Noland-silver win's Battle Room branch
has already produced before its Lobby warp), extended with the two RAM
writes an ordinary seventh win never needs: `gTrainerBattleOpponent_A =
TRAINER_FRONTIER_BRAIN` (so `frontier_isbrain`/`GiveBattlePoints` read the
Brain identity the Lobby script consults) and the Factory silver symbol flag
(`FLAG_SYS_TOWER_SILVER + FRONTIER_FACILITY_FACTORY*2`, which the real route
sets in the Battle Room's `DefeatedNolandSilver` branch -- BEFORE the warp
this checkpoint starts from, per
`data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:128-141` --
so it is pre-existing state at this checkpoint, not a Lobby-script mutation).
It never writes a field script, text printer, task, party, menu, sound, or
renderer state beyond those two additions. The compact JSON records RAM and
framebuffer hashes only; it does not produce image assets.

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
SAVE_BLOCK1_FLAGS = 0x1270
PARTY_SIZE = 6
POKEMON_SIZE = 100
GMAIN_CALLBACK2 = 0x004
GMAIN_STATE = 0x438

# Post-win facility/challenge bookkeeping this fixture represents: battle 21
# overall = challengeNum 2 (Noland's silver encounter), battle 7 (1-indexed,
# 0-indexed battleNum 6) of that challenge. Entering streak 20, post-win 21 --
# docs/noland-brain-staging-design.md S3.2's "current_streak = challengeNum*7
# + battleNum" (=20 entering) plus this win (=21).
POST_WIN_STREAK = 21
TRAINER_FRONTIER_BRAIN = 1022
# FLAG_SYS_TOWER_SILVER (SYSTEM_FLAGS+0x64, flags.h:1348,1468) + FRONTIER_FACILITY_FACTORY(4)*2
# = 0x860 + 0x64 + 8 = 0x8CC = 2252 (frontier_util.c:1918-1925, battle_frontier.h:13).
FACTORY_SILVER_SYMBOL_FLAG_ID = 2252
FACTORY_SILVER_SYMBOL_FLAG_BYTE = FACTORY_SILVER_SYMBOL_FLAG_ID // 8
FACTORY_SILVER_SYMBOL_FLAG_BIT = FACTORY_SILVER_SYMBOL_FLAG_ID % 8

# These source-static RAM locations are intentionally probe-only.
STEXT_PRINTERS = 0x020201B0
SFANFARE_COUNTER = 0x03000F4E
SPROCESS_INPUT_DELAY = 0x02039F90
TASK_DRAW_FIELD_MESSAGE = 0x08098155
TASK_HANDLE_MULTICHOICE_INPUT = 0x080E2059
TASK_SIZE = 0x28
NUM_TASKS = 16
G_TRAINER_BATTLE_OPPONENT_A = 0x02038BCA

# Roomy, source-relative releases (demonstrate gates, not production timing).
# The frontier-brain congrats text has an extra `\l` mid-message scroll gate
# (3 lines vs the ordinary 2) ahead of its own DEFAULT wait, so this schedule
# carries one more entry than the ordinary fixture's before the award phase.
INPUTS_TO_READY_MENU = {
    300: ["A"],   # brain congrats \l scroll wait (3rd-line reveal)
    700: ["A"],   # brain congrats DEFAULT wait -> frontier_givepoints text
    1600: ["A"],  # award \l page-scroll wait
    2700: ["A"],  # award DEFAULT wait -> frontier_givepoints
    4000: ["A"],  # exchange \p page-clear wait
    4900: ["A"],  # record-question \l page-scroll wait
}
MENU_DRAW = 4922
MENU_ACCEPT = 4924
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


def silver_symbol_flag_set(oracle: EmeraldOracle) -> bool:
    save1 = save1_base(oracle)
    byte = oracle.read_u8(save1 + SAVE_BLOCK1_FLAGS + FACTORY_SILVER_SYMBOL_FLAG_BYTE)
    return bool(byte & (1 << FACTORY_SILVER_SYMBOL_FLAG_BIT))


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
        "trainerBattleOpponentA": u16(oracle, G_TRAINER_BATTLE_OPPONENT_A),
        "silverSymbolFlagSet": silver_symbol_flag_set(oracle),
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
    write_u16(oracle, frontier + FRONTIER_FACTORY_SINGLES_50_STREAK, POST_WIN_STREAK)
    write_u16(oracle, frontier + FRONTIER_BATTLE_POINTS, 0)
    write_u16(oracle, G_TRAINER_BATTLE_OPPONENT_A, TRAINER_FRONTIER_BRAIN)
    flag_addr = save1 + SAVE_BLOCK1_FLAGS + FACTORY_SILVER_SYMBOL_FLAG_BYTE
    oracle.write_u8(flag_addr, oracle.read_u8(flag_addr) | (1 << FACTORY_SILVER_SYMBOL_FLAG_BIT))
    write_warp(oracle, save1 + SAVE_BLOCK1_LOCATION, FACTORY_LOBBY_GROUP, FACTORY_LOBBY_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    write_warp(oracle, oracle.symbols["gLastUsedWarp"], FACTORY_BATTLE_ROOM_GROUP, FACTORY_BATTLE_ROOM_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    oracle.write_u8(oracle.symbols["gMain"] + GMAIN_STATE, 0)
    write_u32(oracle, oracle.symbols["gMain"] + GMAIN_CALLBACK2, oracle.symbols["CB2_LoadMap"] | 1)
    staged = frame(oracle, 0)
    if staged["challengeStatus"] != CHALLENGE_STATUS_WON or staged["battlePoints"] != 0:
        raise AssertionError(f"brain seventh-win stage did not stick: {staged}")
    if staged["trainerBattleOpponentA"] != TRAINER_FRONTIER_BRAIN:
        raise AssertionError(f"gTrainerBattleOpponent_A did not stick: {staged}")
    if not staged["silverSymbolFlagSet"]:
        raise AssertionError(f"silver symbol flag did not stick: {staged}")
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


def run_case(
    oracle: EmeraldOracle,
    trace: dict,
    scheduled_inputs: dict[int, list[str]],
    frames: int,
) -> tuple[dict[str, object], list[dict[str, object]]]:
    staged = replay_and_stage(oracle, trace)
    rows = []
    for relative in range(1, frames + 1):
        buttons = scheduled_inputs.get(relative, [])
        oracle.advance(buttons)
        row = frame(oracle, relative)
        if buttons:
            row["buttons"] = buttons
        rows.append(row)
    return staged, rows


def compact_timeline(staged: dict[str, object], rows: list[dict[str, object]]) -> dict[str, object]:
    rng_calls = [lcg_steps(int(before["rng"]), int(after["rng"])) for before, after in zip([staged, *rows[:-1]], rows)]
    if any(calls is None for calls in rng_calls):
        raise AssertionError("could not express terminal RNG delta as <=16 Gen-3 LCG calls")
    return {
        "printer": spans(rows, lambda row: (row["printer"]["active"], row["printer"]["state"])),
        "recordMenu": spans(rows, lambda row: None if row["recordMenu"] is None else row["recordMenu"]["inputDelay"]),
        "firstBattlePointMutation": first(rows, lambda row: row["battlePoints"] == 14),
        "firstPartyRestore": first(rows, lambda row: row["partyRestored"]),
        "firstChallengeStatusClear": first(rows, lambda row: row["challengeStatus"] == CHALLENGE_STATUS_NONE),
        "recordMenuDraw": first(rows, lambda row: row["recordMenu"] is not None),
        "recordMenuDelayZero": first(rows, lambda row: row["recordMenu"] is not None and row["recordMenu"]["inputDelay"] == 0),
        "silverSymbolFlagStaysSet": all(row["silverSymbolFlagSet"] for row in rows),
        "trainerBattleOpponentAStaysBrain": all(row["trainerBattleOpponentA"] == TRAINER_FRONTIER_BRAIN for row in rows),
    }


def main() -> None:
    trace = json.loads(PREFIX_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    ready_stage, ready_rows = run_case(oracle, trace, INPUTS_TO_READY_MENU, MENU_ACCEPT)
    rejected_stage, rejected_rows = run_case(oracle, trace, {**INPUTS_TO_READY_MENU, MENU_DRAW: ["A"]}, MENU_DRAW + 1)
    accepted_stage, accepted_rows = run_case(oracle, trace, {**INPUTS_TO_READY_MENU, MENU_ACCEPT: ["A"]}, FINAL_FRAME)
    if ready_stage != rejected_stage or ready_stage != accepted_stage:
        raise AssertionError("identical terminal staging did not remain deterministic")
    timeline = compact_timeline(ready_stage, ready_rows)
    if timeline["firstBattlePointMutation"] is None:
        raise AssertionError(f"brain seventh-win BP award never reached 14: {timeline}")
    if not timeline["silverSymbolFlagStaysSet"] or not timeline["trainerBattleOpponentAStaysBrain"]:
        raise AssertionError(f"brain identity/symbol did not hold through the terminal window: {timeline}")
    rejected_next = rejected_rows[-1]
    if rejected_next["recordMenu"] is None or rejected_next["recordResult"] != 0xFF:
        raise AssertionError(f"A at draw frame was not rejected: {rejected_next}")
    accepted_next = accepted_rows[-1]
    if accepted_next["recordMenu"] is not None or accepted_next["recordResult"] != 1:
        raise AssertionError(f"A at first accepted frame was not default-NO: {accepted_next}")
    output = {
        "schema": "factory-brain-silver-terminal-off/v1",
        "oracleProfile": "battle-scene-off",
        "sourceTrace": str(PREFIX_PATH.relative_to(WORKTREE_ROOT)),
        "relativeTo": "the staged source-owned Noland-silver seventh-win Factory Lobby CB2_LoadMap handoff after canonical prefix tick 29601",
        "construction": {
            "writes": [
                {"target": "frontier.challengeStatus", "offset": "0xCA8", "value": 3, "source": "BattleFrontier_BattleFactoryBattleRoom/scripts.inc:109-111 (WarpToLobbyWon)"},
                {"target": "frontier.curChallengeBattleNum", "offset": "0xCB2", "value": 7, "source": "BattleFrontier_BattleFactoryBattleRoom/scripts.inc:100-105"},
                {"target": "frontier.factoryWinStreaks[SINGLES][LEVEL_50]", "offset": "0xDE2", "value": POST_WIN_STREAK, "source": "docs/noland-brain-staging-design.md S3.2 current_streak=challengeNum*7+battleNum (=20 entering, +1 this win)"},
                {"target": "frontier.battlePoints", "offset": "0xEB8", "value": 0, "source": "pre-award baseline so the 0->14 mutation is observable"},
                {"target": "gTrainerBattleOpponent_A", "offset": "0x02038bca (bin/oracle symbols)", "value": TRAINER_FRONTIER_BRAIN, "source": "frontier_util.c:1839-1845 IsTrainerFrontierBrain / :1892,1902 GiveBattlePoints brain bonus gate"},
                {"target": "SaveBlock1.flags bit (FLAG_SYS_TOWER_SILVER + FRONTIER_FACILITY_FACTORY*2)", "offset": f"byte {FACTORY_SILVER_SYMBOL_FLAG_BYTE} bit {FACTORY_SILVER_SYMBOL_FLAG_BIT} (flag id {FACTORY_SILVER_SYMBOL_FLAG_ID})", "value": True, "source": "frontier_util.c:1918-1925 GiveFacilitySymbol; already granted by the real BattleRoom DefeatedNolandSilver branch (scripts.inc:128-141) BEFORE this checkpoint's warp, so it is pre-existing state here, not a Lobby mutation"},
                {"target": "SaveBlock1.location/gLastUsedWarp/gMain.callback2", "value": "Factory Lobby 4,8 / Factory Battle Room provenance / CB2_LoadMap", "source": "BattleFrontier_BattleFactoryBattleRoom/scripts.inc:222-227; overworld.c:540-546,1572-1587"},
            ],
            "notWritten": ["field script", "message/text printer", "tasks/windows", "party", "sound/fanfare", "record result", "renderer/framebuffer"],
            "sourceContinuation": "BattleFrontier_BattleFactoryBattleRoom -> CB2_LoadMap -> BattleFrontier_BattleFactoryLobby WonChallenge (frontier_isbrain branch) -> GiveBattlePoints (+10 brain bonus) -> AskRecordBattle",
        },
        "controls": [{"relativeTick": tick, "buttons": buttons} for tick, buttons in INPUTS_TO_READY_MENU.items()],
        "timeline": timeline,
        "recordMenuControls": {
            "drawFrameRejectedA": {"tick": MENU_DRAW, "nextFrame": {"menuAlive": rejected_next["recordMenu"] is not None, "result": rejected_next["recordResult"]}},
            "firstAcceptedDefaultNoA": {"tick": MENU_ACCEPT, "nextFrame": {"menuAlive": accepted_next["recordMenu"] is not None, "result": accepted_next["recordResult"]}},
        },
        "limits": {"noPngOrRgbAssets": True, "noProductionRendererUse": True, "framebufferEvidence": "raw RGB888 SHA-256 only", "roomyScheduledInputs": True},
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n")


main()
