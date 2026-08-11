#!/usr/bin/env python3
"""Stage the real Factory seventh-win lobby path with Battle Scene OFF.

This oracle-only probe replays the canonical Battle-1 post-win prefix and
stages only the values the successful seventh battle has already written when
it enters `BattleFactoryBattleRoom_EventScript_WarpToLobbyWon`.  From that
field handoff onwards, the ordinary map loader and Factory lobby scripts own
the map, messages, fanfare, BP award, restore/save, and record prompt.

Run through tools/run-mgba-probe.py with a fresh output path.
"""

from __future__ import annotations

import hashlib
import json
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
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
PREFIX_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth" / "battle1-postwin-dense.json"

# Constants and offsets are source-owned state established by the win branch.
# struct BattleFrontier comments in include/global.h give the absolute offsets
# below (relative to SaveBlock2), while frontier_util.h names the active bit.
CHALLENGE_STATUS_WON = 3
FIRST_COMPLETED_CHALLENGE_BATTLE_NUM = 7
FIRST_COMPLETED_CHALLENGE_STREAK = 7
FIRST_COMPLETED_CHALLENGE_BATTLE_POINTS_BEFORE = 0
FIRST_COMPLETED_CHALLENGE_AWARD = 3
FACTORY_SINGLES_50_ACTIVE = 1 << 8
FACTORY_LOBBY_GROUP = 26
FACTORY_LOBBY_NUM = 31
FACTORY_BATTLE_ROOM_GROUP = 26
FACTORY_BATTLE_ROOM_NUM = 33
WARP_ID_NONE = 0xFF
LOBBY_X = 4
LOBBY_Y = 8
PREFIX_TICK = 29601
GATE_DENSE_FRAMES = 1200
FULL_DENSE_FRAMES = 4700
SAVE_BLOCK1_LOCATION = 0x04
SAVE_BLOCK1_PLAYER_PARTY = 0x238
PARTY_SIZE = 6
POKEMON_SIZE = 100
FRONTIER_CHALLENGE_STATUS = 0xCA8
FRONTIER_BATTLE_NUM = 0xCB2
FRONTIER_ACTIVE_FLAGS = 0xCDC
FRONTIER_FACTORY_SINGLES_50_STREAK = 0xDE2
FRONTIER_FACTORY_SINGLES_50_RENTS = 0xDF6
FRONTIER_BATTLE_POINTS = 0xEB8
GMAIN_CALLBACK2 = 0x004
GMAIN_STATE = 0x438

# These controls are relative to the lobby handoff. GETPOINTS is deliberately
# left without input: its source macro waits on fanfare/text, not a button.
# The final B is scheduled only after the restore/save milestone.
REGULAR_CONGRATS_A = 300
AWARD_PRINTER_A = 1100
AWARD_GATE_A = 2200
EXCHANGE_SECOND_PAGE_A = 3500
RECORD_PROMPT_B = 4400
NO_INPUTS: dict[int, list[str]] = {}
AWARD_GATE = {REGULAR_CONGRATS_A: ["A"]}
FULL_TO_RECORD_PROMPT = {
    REGULAR_CONGRATS_A: ["A"],
    AWARD_PRINTER_A: ["A"],
    AWARD_GATE_A: ["A"],
    EXCHANGE_SECOND_PAGE_A: ["A"],
}
RECORD_PROMPT_B_CONTROL = {**FULL_TO_RECORD_PROMPT, RECORD_PROMPT_B: ["B"]}


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


def read_warp(oracle: EmeraldOracle, addr: int) -> dict[str, int]:
    names = ("group", "map", "warpId", "x", "y")
    return {name: oracle.read_u8(addr + index) for index, name in enumerate(names)}


def frontier_base(oracle: EmeraldOracle) -> int:
    return u32(oracle, oracle.symbols["gSaveBlock2Ptr"])


def save1_base(oracle: EmeraldOracle) -> int:
    return u32(oracle, oracle.symbols["gSaveBlock1Ptr"])


def party_hash(oracle: EmeraldOracle, addr: int) -> str:
    data = bytes(oracle.read_u8(addr + offset) for offset in range(PARTY_SIZE * POKEMON_SIZE))
    return hashlib.sha256(data).hexdigest()


def frame(oracle: EmeraldOracle, tick: int) -> dict[str, object]:
    save1 = save1_base(oracle)
    frontier = frontier_base(oracle)
    rgb = oracle.screen_rgb()
    saved_party_hash = party_hash(oracle, save1 + SAVE_BLOCK1_PLAYER_PARTY)
    player_party_hash = party_hash(oracle, oracle.symbols["gPlayerParty"])
    return {
        "tick": tick,
        "sha256": hashlib.sha256(rgb).hexdigest(),
        "location": read_warp(oracle, save1 + SAVE_BLOCK1_LOCATION),
        "challengeStatus": oracle.read_u8(frontier + FRONTIER_CHALLENGE_STATUS),
        "battleNum": u16(oracle, frontier + FRONTIER_BATTLE_NUM),
        "activeFlags": u32(oracle, frontier + FRONTIER_ACTIVE_FLAGS),
        "factorySingles50Streak": u16(oracle, frontier + FRONTIER_FACTORY_SINGLES_50_STREAK),
        "factorySingles50Rents": u16(oracle, frontier + FRONTIER_FACTORY_SINGLES_50_RENTS),
        "battlePoints": u16(oracle, frontier + FRONTIER_BATTLE_POINTS),
        "playerPartyHash": player_party_hash,
        "savedPlayerPartyHash": saved_party_hash,
        "partyRestored": player_party_hash == saved_party_hash,
        "callback2": u32(oracle, oracle.symbols["gMain"] + GMAIN_CALLBACK2),
        "mainState": oracle.read_u8(oracle.symbols["gMain"] + GMAIN_STATE),
    }


def first_relative(captures: list[dict[str, object]], predicate) -> int | None:
    for capture in captures:
        if predicate(capture):
            return int(capture["tick"])
    return None


def run_case(oracle: EmeraldOracle, trace: dict, inputs: dict[int, list[str]], dense_frames: int) -> dict[str, object]:
    oracle.new_session()
    tick = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
    if tick != PREFIX_TICK:
        raise AssertionError(f"expected canonical prefix tick {PREFIX_TICK}, got {tick}")

    save1 = save1_base(oracle)
    frontier = frontier_base(oracle)
    before = frame(oracle, tick)
    if before["activeFlags"] & FACTORY_SINGLES_50_ACTIVE == 0:
        raise AssertionError(f"canonical prefix lacks Factory singles-50 active state: {before}")

    # This is the field state after the source success branch's capped streak
    # increment and battle-number increment selected its terminal case. The
    # canonical draft bootstrap starts at the BP cap, so set the ordinary
    # first-challenge balance to zero in order to observe the source award's
    # exact 0 -> 3 mutation. No message, script, task, party, record,
    # renderer, or static performed-swap state is written.
    oracle.write_u8(frontier + FRONTIER_CHALLENGE_STATUS, CHALLENGE_STATUS_WON)
    write_u16(oracle, frontier + FRONTIER_BATTLE_NUM, FIRST_COMPLETED_CHALLENGE_BATTLE_NUM)
    write_u16(oracle, frontier + FRONTIER_FACTORY_SINGLES_50_STREAK, FIRST_COMPLETED_CHALLENGE_STREAK)
    write_u16(oracle, frontier + FRONTIER_BATTLE_POINTS, FIRST_COMPLETED_CHALLENGE_BATTLE_POINTS_BEFORE)
    write_warp(oracle, save1 + SAVE_BLOCK1_LOCATION, FACTORY_LOBBY_GROUP, FACTORY_LOBBY_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    write_warp(oracle, oracle.symbols["gLastUsedWarp"], FACTORY_BATTLE_ROOM_GROUP, FACTORY_BATTLE_ROOM_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    oracle.write_u8(oracle.symbols["gMain"] + GMAIN_STATE, 0)
    write_u32(oracle, oracle.symbols["gMain"] + GMAIN_CALLBACK2, oracle.symbols["CB2_LoadMap"] | 1)

    staged = frame(oracle, tick)
    expected_location = {"group": FACTORY_LOBBY_GROUP, "map": FACTORY_LOBBY_NUM, "warpId": WARP_ID_NONE, "x": LOBBY_X, "y": LOBBY_Y}
    if (
        staged["challengeStatus"] != CHALLENGE_STATUS_WON
        or staged["battleNum"] != FIRST_COMPLETED_CHALLENGE_BATTLE_NUM
        or staged["factorySingles50Streak"] != FIRST_COMPLETED_CHALLENGE_STREAK
        or staged["battlePoints"] != FIRST_COMPLETED_CHALLENGE_BATTLE_POINTS_BEFORE
        or staged["location"] != expected_location
    ):
        raise AssertionError(f"seventh-win handoff stage did not stick: {staged}")

    captures: list[dict[str, object]] = []
    for relative in range(1, dense_frames + 1):
        buttons = inputs.get(relative, [])
        oracle.advance(buttons)
        capture = frame(oracle, relative)
        if buttons:
            capture["buttons"] = buttons
        captures.append(capture)

    return {
        "before": before,
        "staged": staged,
        "inputSchedule": [{"relativeTick": tick, "buttons": buttons} for tick, buttons in inputs.items()],
        "milestones": {
            "firstBattlePointChange": first_relative(captures, lambda item: item["battlePoints"] != staged["battlePoints"]),
            "firstChallengeStatusClear": first_relative(captures, lambda item: item["challengeStatus"] == 0),
            "firstPartyRestore": first_relative(captures, lambda item: item["partyRestored"]),
        },
        "captures": captures,
    }


def main() -> None:
    trace = json.loads(PREFIX_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    regular_gate = run_case(oracle, trace, NO_INPUTS, GATE_DENSE_FRAMES)
    award_gate = run_case(oracle, trace, AWARD_GATE, GATE_DENSE_FRAMES)
    full = run_case(oracle, trace, RECORD_PROMPT_B_CONTROL, FULL_DENSE_FRAMES)

    for name, case in (("regular congratulations", regular_gate), ("award", award_gate)):
        endpoint = case["captures"][-1]
        if endpoint["challengeStatus"] != CHALLENGE_STATUS_WON or endpoint["battlePoints"] != FIRST_COMPLETED_CHALLENGE_BATTLE_POINTS_BEFORE:
            raise AssertionError(f"{name} gate escaped before its intended input: {endpoint}")
    if award_gate["milestones"]["firstBattlePointChange"] is not None:
        raise AssertionError("one A escaped the award DEFAULT gate and granted BP")
    if full["milestones"]["firstBattlePointChange"] is None:
        raise AssertionError("second A did not pass the award DEFAULT gate into frontier_givepoints")
    full_bp_frame = full["captures"][full["milestones"]["firstBattlePointChange"] - 1]
    if full_bp_frame["battlePoints"] != FIRST_COMPLETED_CHALLENGE_AWARD:
        raise AssertionError(f"first completed Factory singles-50 award was not {FIRST_COMPLETED_CHALLENGE_AWARD}: {full_bp_frame}")
    if full["milestones"]["firstBattlePointChange"] != AWARD_GATE_A + 1:
        raise AssertionError(f"award did not mutate immediately after its release gate: {full['milestones']}")
    final_full = full["captures"][-1]
    if (
        final_full["challengeStatus"] != 0
        or final_full["battleNum"] != FIRST_COMPLETED_CHALLENGE_BATTLE_NUM
        or final_full["factorySingles50Streak"] != FIRST_COMPLETED_CHALLENGE_STREAK
        or final_full["activeFlags"] & FACTORY_SINGLES_50_ACTIVE == 0
        or final_full["battlePoints"] != FIRST_COMPLETED_CHALLENGE_AWARD
        or not final_full["partyRestored"]
    ):
        raise AssertionError(f"seventh-win restore/save endpoint is not source-consistent: {final_full}")
    if full["captures"][RECORD_PROMPT_B - 1].get("buttons") != ["B"]:
        raise AssertionError("later record-prompt B control was not retained in the dense capture")
    if full["milestones"]["firstChallengeStatusClear"] is None or full["milestones"]["firstChallengeStatusClear"] >= RECORD_PROMPT_B:
        raise AssertionError(f"record B occurred before restore/save completed: {full['milestones']}")

    output = {
        "schema": "factory-seventh-win-ending-stage/v1",
        "oracleProfile": "battle-scene-off",
        "sourceTrace": str(PREFIX_PATH.relative_to(WORKTREE_ROOT)),
        "construction": {
            "canonicalPrefixTick": PREFIX_TICK,
            "stageBoundary": "late canonical Battle-1 post-win swap screen -> successful seventh Factory singles Level-50 battle-room handoff",
            "writes": [
                {"target": "gSaveBlock2Ptr->frontier.challengeStatus", "offset": "0xCA8", "value": CHALLENGE_STATUS_WON, "source": "BattleFactoryBattleRoom/scripts.inc:103-105"},
                {"target": "gSaveBlock2Ptr->frontier.curChallengeBattleNum", "offset": "0xCB2", "value": FIRST_COMPLETED_CHALLENGE_BATTLE_NUM, "source": "BattleFactoryBattleRoom/scripts.inc:100-103"},
                {"target": "gSaveBlock2Ptr->frontier.factoryWinStreaks[SINGLES][LEVEL_50]", "offset": "0xDE2", "value": FIRST_COMPLETED_CHALLENGE_STREAK, "source": "BattleFactoryBattleRoom/scripts.inc:98-100; frontier_util.c:2111-2157"},
                {"target": "gSaveBlock2Ptr->frontier.battlePoints", "offset": "0xEB8", "value": FIRST_COMPLETED_CHALLENGE_BATTLE_POINTS_BEFORE, "source": "first-challenge precondition; frontier_util.c:1853-1910 mutates this field"},
                {"target": "gSaveBlock1Ptr->location", "value": {"map": "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY", "group": FACTORY_LOBBY_GROUP, "num": FACTORY_LOBBY_NUM, "warpId": WARP_ID_NONE, "x": LOBBY_X, "y": LOBBY_Y}, "source": "BattleFactoryBattleRoom/scripts.inc:222-227"},
                {"target": "gLastUsedWarp", "value": {"map": "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM", "group": FACTORY_BATTLE_ROOM_GROUP, "num": FACTORY_BATTLE_ROOM_NUM}, "source": "overworld.c:540-546 transition provenance"},
                {"target": "gMain.callback2/state", "value": "CB2_LoadMap/0", "source": "overworld.c:1572-1587"},
            ],
            "notWritten": ["message/script contexts", "tasks/windows/text printers", "party", "record flags", "renderer/framebuffer", "sPerformedRentalSwap"],
            "normalRenderingAfterStage": "CB2_LoadMap -> LoadMapInStepsLocal -> lobby OnWarp/OnFrame map scripts -> WonChallenge",
        },
        "controls": {
            "regularCongratsGate": "no input; regular congratulations remains at its DEFAULT A/B gate",
            "awardGate": f"A at +{REGULAR_CONGRATS_A}; opens award DEFAULT message and leaves it gated",
            "fullToRecordPromptAndB": f"A at +{REGULAR_CONGRATS_A} (congrats), A at +{AWARD_PRINTER_A} (award printer), A at +{AWARD_GATE_A} (award gate), no GETPOINTS input, A at +{EXCHANGE_SECOND_PAGE_A} (exchange second page), then B at +{RECORD_PROMPT_B} (record prompt)",
        },
        "regularCongratsGate": regular_gate,
        "awardGate": award_gate,
        "fullToRecordPromptAndB": full,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n")


main()
