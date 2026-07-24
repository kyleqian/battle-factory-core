#!/usr/bin/env python3
"""Probe Factory terminal field-UI boundaries after legitimate OFF handoffs.

This is evidence tooling only.  It uses the already-established late Battle-1
prefix and stages the small loss/seventh-win map-loader seams; all subsequent
message, menu, save, and field rendering state belongs to the retail game.
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
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
PREFIX_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth" / "battle1-postwin-dense.json"

PREFIX_TICK = 29601
CHALLENGE_STATUS_WON = 3
CHALLENGE_STATUS_LOST = 4
FACTORY_SINGLES_50_ACTIVE = 1 << 8
FACTORY_LOBBY_GROUP = 26
FACTORY_LOBBY_NUM = 31
FACTORY_BATTLE_ROOM_GROUP = 26
FACTORY_BATTLE_ROOM_NUM = 33
WARP_ID_NONE = 0xFF
LOBBY_X = 4
LOBBY_Y = 8
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

# Public linker symbols are read from EmeraldOracle.symbols.  The four
# source-static addresses below are intentionally kept as probe-only ABI
# evidence; `bin/oracle symbols` cannot expose them.  They come from the
# pinned ELF's local symbol table (`arm-none-eabi-nm -an pokeemerald.elf`).
STEXT_PRINTERS = 0x020201B0
TEXT_PRINTER_SIZE = 0x24
SFIELD_MESSAGE_BOX_MODE = 0x020375BC
SPROCESS_INPUT_DELAY = 0x02039F90
SGLOBAL_SCRIPT_CONTEXT_STATUS = 0x03000E38
SGLOBAL_SCRIPT_CONTEXT = 0x03000E40
# TaskFunc pointers in live RAM retain the Thumb bit (the ELF's local-symbol
# values above do not), so compare against the callable pointer form.
TASK_DRAW_FIELD_MESSAGE = 0x08098155
TASK_HANDLE_MULTICHOICE_INPUT = 0x080E2059
TASK_SIZE = 0x28
NUM_TASKS = 16
WINDOW_SIZE = 12
NUM_WINDOWS = 32

WIN_CONGRATS_A = 300
WIN_AWARD_PRINTER_A = 1100
WIN_AWARD_GATE_A = 2200
WIN_EXCHANGE_PAGE_A = 3500
WIN_RECORD_MESSAGE_A = 4400
WIN_PROMPT_SCAN_FRAMES = 4500
LOSS_PAGE_A = 80
LOSS_FINAL_PAGE_A = 160
LOSS_RECORD_MESSAGE_A = 600
LOSS_PROMPT_SCAN_FRAMES = 800


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def s16(oracle: EmeraldOracle, addr: int) -> int:
    value = u16(oracle, addr)
    return value - 0x10000 if value & 0x8000 else value


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


def task_snapshot(oracle: EmeraldOracle) -> list[dict[str, object]]:
    base = oracle.symbols["gTasks"]
    tasks = []
    for task_id in range(NUM_TASKS):
        addr = base + task_id * TASK_SIZE
        if oracle.read_u8(addr + 4):
            tasks.append({
                "id": task_id,
                "func": u32(oracle, addr),
                "data": [s16(oracle, addr + 8 + index * 2) for index in range(16)],
            })
    return tasks


def task_by_func(tasks: list[dict[str, object]], func: int) -> dict[str, object] | None:
    return next((task for task in tasks if task["func"] == func), None)


def windows_snapshot(oracle: EmeraldOracle) -> list[dict[str, int]]:
    base = oracle.symbols["gWindows"]
    windows = []
    for window_id in range(NUM_WINDOWS):
        addr = base + window_id * WINDOW_SIZE
        if oracle.read_u8(addr) != 0xFF:
            windows.append({
                "id": window_id,
                "bg": oracle.read_u8(addr),
                "left": oracle.read_u8(addr + 1),
                "top": oracle.read_u8(addr + 2),
                "width": oracle.read_u8(addr + 3),
                "height": oracle.read_u8(addr + 4),
                "palette": oracle.read_u8(addr + 5),
                "baseBlock": u16(oracle, addr + 6),
            })
    return windows


def printer_snapshot(oracle: EmeraldOracle) -> dict[str, int]:
    # Field dialogue uses window 0.  See struct TextPrinter in include/text.h.
    addr = STEXT_PRINTERS
    return {
        "currentChar": u32(oracle, addr),
        "windowId": oracle.read_u8(addr + 4),
        "currentX": oracle.read_u8(addr + 8),
        "currentY": oracle.read_u8(addr + 9),
        "active": oracle.read_u8(addr + 0x1B),
        "state": oracle.read_u8(addr + 0x1C),
        "textSpeed": oracle.read_u8(addr + 0x1D),
        "delayCounter": oracle.read_u8(addr + 0x1E),
    }


def frame(oracle: EmeraldOracle, relative: int) -> dict[str, object]:
    save1 = save1_base(oracle)
    frontier = frontier_base(oracle)
    tasks = task_snapshot(oracle)
    rgb = oracle.screen_rgb()
    saved_party_hash = party_hash(oracle, save1 + SAVE_BLOCK1_PLAYER_PARTY)
    player_party_hash = party_hash(oracle, oracle.symbols["gPlayerParty"])
    return {
        "tick": relative,
        "sha256": hashlib.sha256(rgb).hexdigest(),
        "main": {
            "callback2": u32(oracle, oracle.symbols["gMain"] + GMAIN_CALLBACK2),
            "state": oracle.read_u8(oracle.symbols["gMain"] + GMAIN_STATE),
        },
        "script": {
            "status": oracle.read_u8(SGLOBAL_SCRIPT_CONTEXT_STATUS),
            "stackDepth": oracle.read_u8(SGLOBAL_SCRIPT_CONTEXT),
            "mode": oracle.read_u8(SGLOBAL_SCRIPT_CONTEXT + 1),
            "nativePtr": u32(oracle, SGLOBAL_SCRIPT_CONTEXT + 4),
            "scriptPtr": u32(oracle, SGLOBAL_SCRIPT_CONTEXT + 8),
        },
        "fieldMessageBoxMode": oracle.read_u8(SFIELD_MESSAGE_BOX_MODE),
        "textPrinter0": printer_snapshot(oracle),
        "fieldMessageTask": task_by_func(tasks, TASK_DRAW_FIELD_MESSAGE),
        "multichoiceTask": task_by_func(tasks, TASK_HANDLE_MULTICHOICE_INPUT),
        "multichoiceInputDelay": oracle.read_u8(SPROCESS_INPUT_DELAY),
        "specialVarResult": u16(oracle, oracle.symbols["gSpecialVar_Result"]),
        "windows": windows_snapshot(oracle),
        "location": read_warp(oracle, save1 + SAVE_BLOCK1_LOCATION),
        "challengeStatus": oracle.read_u8(frontier + FRONTIER_CHALLENGE_STATUS),
        "battleNum": u16(oracle, frontier + FRONTIER_BATTLE_NUM),
        "activeFlags": u32(oracle, frontier + FRONTIER_ACTIVE_FLAGS),
        "factorySingles50Streak": u16(oracle, frontier + FRONTIER_FACTORY_SINGLES_50_STREAK),
        "factorySingles50Rents": u16(oracle, frontier + FRONTIER_FACTORY_SINGLES_50_RENTS),
        "battlePoints": u16(oracle, frontier + FRONTIER_BATTLE_POINTS),
        "partyRestored": player_party_hash == saved_party_hash,
    }


def replay_prefix(oracle: EmeraldOracle, trace: dict) -> None:
    oracle.new_session()
    tick = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
    if tick != PREFIX_TICK:
        raise AssertionError(f"expected canonical prefix tick {PREFIX_TICK}, got {tick}")


def stage(oracle: EmeraldOracle, outcome: str) -> dict[str, object]:
    save1 = save1_base(oracle)
    frontier = frontier_base(oracle)
    if outcome == "seventhWin":
        if u32(oracle, frontier + FRONTIER_ACTIVE_FLAGS) & FACTORY_SINGLES_50_ACTIVE == 0:
            raise AssertionError("canonical prefix lacks Factory singles-50 active state")
        oracle.write_u8(frontier + FRONTIER_CHALLENGE_STATUS, CHALLENGE_STATUS_WON)
        write_u16(oracle, frontier + FRONTIER_BATTLE_NUM, 7)
        write_u16(oracle, frontier + FRONTIER_FACTORY_SINGLES_50_STREAK, 7)
        write_u16(oracle, frontier + FRONTIER_BATTLE_POINTS, 0)
    elif outcome == "loss":
        oracle.write_u8(frontier + FRONTIER_CHALLENGE_STATUS, CHALLENGE_STATUS_LOST)
    else:
        raise AssertionError(f"unknown outcome: {outcome}")
    write_warp(oracle, save1 + SAVE_BLOCK1_LOCATION, FACTORY_LOBBY_GROUP, FACTORY_LOBBY_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    write_warp(oracle, oracle.symbols["gLastUsedWarp"], FACTORY_BATTLE_ROOM_GROUP, FACTORY_BATTLE_ROOM_NUM, WARP_ID_NONE, LOBBY_X, LOBBY_Y)
    oracle.write_u8(oracle.symbols["gMain"] + GMAIN_STATE, 0)
    write_u32(oracle, oracle.symbols["gMain"] + GMAIN_CALLBACK2, oracle.symbols["CB2_LoadMap"] | 1)
    return frame(oracle, 0)


def run_case(oracle: EmeraldOracle, trace: dict, outcome: str, inputs: dict[int, list[str]], frames: int) -> dict[str, object]:
    replay_prefix(oracle, trace)
    staged = stage(oracle, outcome)
    captures = []
    for relative in range(1, frames + 1):
        buttons = inputs.get(relative, [])
        oracle.advance(buttons)
        capture = frame(oracle, relative)
        if buttons:
            capture["buttons"] = buttons
        captures.append(capture)
    return {"staged": staged, "inputSchedule": [{"relativeTick": tick, "buttons": buttons} for tick, buttons in inputs.items()], "captures": captures}


def first(captures: list[dict[str, object]], predicate) -> int | None:
    for capture in captures:
        if predicate(capture):
            return int(capture["tick"])
    return None


def spans(captures: list[dict[str, object]], predicate) -> list[dict[str, int]]:
    answer = []
    start = None
    previous = None
    for capture in captures:
        tick = int(capture["tick"])
        if predicate(capture):
            if start is None:
                start = tick
            previous = tick
        elif start is not None:
            answer.append({"start": start, "end": previous})
            start = None
    if start is not None:
        answer.append({"start": start, "end": previous})
    return answer


def value_spans(captures: list[dict[str, object]], value_at) -> list[dict[str, int]]:
    answer = []
    previous_value = None
    start = None
    previous_tick = None
    for capture in captures:
        value = value_at(capture)
        tick = int(capture["tick"])
        if value != previous_value:
            if previous_value is not None:
                answer.append({"value": previous_value, "start": start, "end": previous_tick})
            previous_value = value
            start = tick
        previous_tick = tick
    if previous_value is not None:
        answer.append({"value": previous_value, "start": start, "end": previous_tick})
    return answer


def window_matches(capture: dict[str, object], left: int, top: int, width: int, height: int) -> bool:
    return any(window == {"id": window["id"], "bg": 0, "left": left, "top": top, "width": width, "height": height, "palette": window["palette"], "baseBlock": window["baseBlock"]} for window in capture["windows"])


def snapshot_at(captures: list[dict[str, object]], tick: int | None) -> dict[str, object] | None:
    if tick is None:
        return None
    return next(capture for capture in captures if capture["tick"] == tick)


def summarize_case(case: dict[str, object]) -> dict[str, object]:
    captures: list[dict[str, object]] = case["captures"]
    dialogue_frame = first(captures, lambda row: row["fieldMessageTask"] is not None and row["fieldMessageTask"]["data"][0] >= 2)
    printer_active = first(captures, lambda row: row["textPrinter0"]["active"] != 0)
    # Factory field text uses the clear/scroll controls (`\p`/`\l`), whose
    # source states wait with the down-arrow at RENDER_STATE_CLEAR (2) or
    # RENDER_STATE_SCROLL_START (3), not PAUSE_UNTIL_PRESS (1).
    page_waits = spans(captures, lambda row: row["textPrinter0"]["active"] != 0 and row["textPrinter0"]["state"] in (2, 3))
    # The task is created immediately after DrawMultichoiceMenu's window copy.
    # Keep its live tWindowId below instead of assuming window-slot allocation.
    prompt_draw = first(captures, lambda row: row["multichoiceTask"] is not None)
    prompt_ready = first(captures, lambda row: row["multichoiceTask"] is not None and row["multichoiceInputDelay"] == 0)
    status_clear = first(captures, lambda row: row["challengeStatus"] == 0)
    bp_change = first(captures, lambda row: row["battlePoints"] != case["staged"]["battlePoints"])
    prompt_capture = snapshot_at(captures, prompt_draw)
    prompt_window_id = None if prompt_capture is None else prompt_capture["multichoiceTask"]["data"][6]
    prompt_window = None if prompt_capture is None else next((window for window in prompt_capture["windows"] if window["id"] == prompt_window_id), None)
    return {
        "mapLoadFirstFrame": 1,
        "firstNonStagedCallback": first(captures, lambda row: row["main"] != case["staged"]["main"]),
        "dialogueFrameFirstDraw": dialogue_frame,
        "textPrinterFirstObserved": printer_active,
        "textPrinterStateSpans": value_spans(captures, lambda row: row["textPrinter0"]["state"] if row["textPrinter0"]["active"] else -1),
        "textPageWaitSpans": page_waits,
        "recordPromptWindowDraw": prompt_draw,
        "recordPromptContentWindow": prompt_window,
        "recordPromptFirstReady": prompt_ready,
        "firstBattlePointChange": bp_change,
        "firstChallengeStatusClear": status_clear,
        "dialogueFrameHash": (snapshot_at(captures, dialogue_frame) or {}).get("sha256"),
        "promptDrawHash": (snapshot_at(captures, prompt_draw) or {}).get("sha256"),
        "promptReadyHash": (snapshot_at(captures, prompt_ready) or {}).get("sha256"),
    }


def input_result(case: dict[str, object], input_tick: int) -> dict[str, object]:
    captures: list[dict[str, object]] = case["captures"]
    sent = snapshot_at(captures, input_tick)
    after = snapshot_at(captures, input_tick + 1)
    return {
        "inputTick": input_tick,
        "taskAliveOnInputFrame": sent["multichoiceTask"] is not None,
        "delayOnInputFrame": sent["multichoiceInputDelay"],
        "specialVarResultOnInputFrame": sent["specialVarResult"],
        "taskAliveNextFrame": after is not None and after["multichoiceTask"] is not None,
        "specialVarResultNextFrame": None if after is None else after["specialVarResult"],
        "inputFrameHash": sent["sha256"],
        "nextFrameHash": None if after is None else after["sha256"],
    }


def prompt_controls(oracle: EmeraldOracle, trace: dict, outcome: str, base_inputs: dict[int, list[str]], scan_frames: int) -> dict[str, object]:
    idle = run_case(oracle, trace, outcome, base_inputs, scan_frames)
    summary = summarize_case(idle)
    draw = summary["recordPromptWindowDraw"]
    ready = summary["recordPromptFirstReady"]
    if draw is None or ready is None:
        raise AssertionError(f"{outcome} never reached the record prompt: {summary}")
    idle_compact = compact_case(idle)
    # Each run samples dense hashes/RAM.  Retain only the source-relative
    # boundary summary before replaying the two input controls.
    del idle
    control_mode = os.environ.get("FACTORY_TERMINAL_PROBE_CONTROL", "all")
    if control_mode not in ("all", "idle", "rejected", "accepted"):
        raise SystemExit("FACTORY_TERMINAL_PROBE_CONTROL must be all, idle, rejected, or accepted")
    if control_mode == "idle":
        return {"idle": idle_compact, "firstRejectedA": None, "firstAcceptedA": None}
    # A capture with delay==0 is the post-task boundary.  The first new-button
    # sample that Task_HandleMultichoiceInput can consume is the next frame.
    accepted_tick = ready + 1
    rejected_result = None
    if control_mode in ("all", "rejected"):
        rejected = run_case(oracle, trace, outcome, {**base_inputs, draw: ["A"]}, draw + 8)
        rejected_result = input_result(rejected, draw)
        del rejected
        if not rejected_result["taskAliveNextFrame"]:
            raise AssertionError(f"{outcome} prompt accepted its two-frame-delay input: {rejected_result}")
    if control_mode == "rejected":
        return {"idle": idle_compact, "firstRejectedA": rejected_result, "firstAcceptedA": None}
    accepted = run_case(oracle, trace, outcome, {**base_inputs, accepted_tick: ["A"]}, accepted_tick + 8)
    accepted_result = input_result(accepted, accepted_tick)
    del accepted
    # MULTI_YESNO is opened with defaultChoice 1 (NO), so the first accepted
    # A dispatches result 1 rather than moving the cursor to YES.
    if accepted_result["taskAliveNextFrame"] or accepted_result["specialVarResultNextFrame"] != 1:
        raise AssertionError(f"{outcome} prompt did not accept first ready A as default NO: {accepted_result}")
    return {
        "idle": idle_compact,
        "firstRejectedA": rejected_result,
        "firstAcceptedA": accepted_result,
    }


def compact_case(case: dict[str, object]) -> dict[str, object]:
    summary = summarize_case(case)
    return {"inputSchedule": case["inputSchedule"], "boundaries": summary}


def main() -> None:
    trace = json.loads(PREFIX_PATH.read_text())
    scope = os.environ.get("FACTORY_TERMINAL_PROBE_SCOPE", "all")
    if scope not in ("all", "seventhWin", "loss"):
        raise SystemExit("FACTORY_TERMINAL_PROBE_SCOPE must be all, seventhWin, or loss")
    win_inputs = {WIN_CONGRATS_A: ["A"], WIN_AWARD_PRINTER_A: ["A"], WIN_AWARD_GATE_A: ["A"], WIN_EXCHANGE_PAGE_A: ["A"], WIN_RECORD_MESSAGE_A: ["A"]}
    loss_inputs = {LOSS_PAGE_A: ["A"], LOSS_FINAL_PAGE_A: ["A"], LOSS_RECORD_MESSAGE_A: ["A"]}
    win = None
    if scope in ("all", "seventhWin"):
        win_oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
        win = prompt_controls(win_oracle, trace, "seventhWin", win_inputs, WIN_PROMPT_SCAN_FRAMES)
    # The bindings are stable for the three same-scenario replays above, but
    # use a fresh core for the independent loss handoff rather than retaining
    # a long-lived mGBA session across six map loads.
    loss = None
    if scope in ("all", "loss"):
        loss_oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
        loss = prompt_controls(loss_oracle, trace, "loss", loss_inputs, LOSS_PROMPT_SCAN_FRAMES)
    if win is not None and win["idle"]["boundaries"]["firstBattlePointChange"] != WIN_AWARD_GATE_A + 1:
        raise AssertionError(f"GETPOINTS/BP boundary drifted: {win['idle']['boundaries']}")
    if loss is not None and loss["idle"]["boundaries"]["firstBattlePointChange"] is not None:
        raise AssertionError(f"loss awarded Battle Points: {loss['idle']['boundaries']}")
    output = {
        "schema": "factory-terminal-boundaries-off/v1",
        "oracleProfile": "battle-scene-off",
        "sourceTrace": str(PREFIX_PATH.relative_to(WORKTREE_ROOT)),
        "construction": {
            "canonicalPrefixTick": PREFIX_TICK,
            "handoffs": {
                "seventhWin": "existing legitimate success seam: status WON, battle 7/streak 7/BP 0, lobby map, CB2_LoadMap",
                "loss": "existing legitimate loss seam: status LOST, lobby map, CB2_LoadMap",
            },
            "notWritten": ["message/script contexts", "tasks", "windows", "text printers", "party", "record flags", "renderer/framebuffer"],
        },
        "watch": {
            "perFrame": ["RGB888 SHA-256", "gMain callback/state", "global script context", "field message task", "window list", "window-0 text printer", "field message mode", "multichoice task/delay/result", "challenge/BP/party fields"],
            "staticRamSymbolsNotExportedByOracle": ["sTextPrinters", "sFieldMessageBoxMode", "sProcessInputDelay", "sGlobalScriptContext", "Task_DrawFieldMessage", "Task_HandleMultichoiceInput"],
            "staticRamSource": "pinned pokeemerald.elf local symbol table; addresses are evidence-only, not production data",
        },
        "seventhWin": None if win is None else {
            "idle": win["idle"],
            "firstRejectedA": win["firstRejectedA"],
            "firstAcceptedA": win["firstAcceptedA"],
        },
        "loss": None if loss is None else {
            "idle": loss["idle"],
            "firstRejectedA": loss["firstRejectedA"],
            "firstAcceptedA": loss["firstAcceptedA"],
        },
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n")


main()
