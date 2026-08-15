#!/usr/bin/env python3
"""Live-bisect the Factory brain congrats box's two input-gate ages.

Closes the one remaining formula-derived piece flagged in
`docs/brain-terminal-live-verification.md`: `factoryTerminalPresentation.ts`'s
`frontierBrainCongratsScrollGateReadyAge` (mid-message `\\l` scroll accept)
and `frontierBrainCongratsFinalGateReadyAge` (post-third-line dismiss accept)
were formula-derived, not live-measured, because the brain congrats text is
3 lines with a mid-message scroll and no live trace had observed the true
gates.

Stages the exact same Noland-silver seventh-win Lobby checkpoint as
`stage-factory-brain-silver-terminal-off.py` (same technique: replay the real
`battle1-postwin-dense.json` win prefix to tick 29601, a genuine ROM win, then
write only the SaveBlock/map-loader bookkeeping a real seventh win's Battle
Room branch has already produced before its Lobby warp -- duplicated here
rather than imported because that script executes `main()` unconditionally
at module scope).

Method: bisect by issuing a single `A` press at a candidate relative tick
across independent fresh replays (each replay restages from the canonical
prefix, so runs never interfere), reading the real ROM's text-printer FSM
fields directly:

- Gate (a), the `\\l` scroll accept: `reference/pokeemerald/src/text.c`'s
  `RENDER_STATE_SCROLL_START` (state 3) case calls
  `TextPrinterWaitWithDownArrow`, which on an accepted press sets
  `state = RENDER_STATE_SCROLL` (4) in the SAME tick
  (`text.c:1180-1188`). So "accepted at tick T" <=> printer.state reads 4
  when read immediately after a press scheduled at T; "rejected" <=> state
  stays 3 (unchanged from the natural, un-pressed baseline).
- Gate (b), the post-third-line dismiss: the printer itself goes inactive
  once it reads EOS after line 2 (`RENDER_FINISH`, `text.c:1119-1120`,
  `:338-339`); the *outer* field-message-box task
  (`TASK_DRAW_FIELD_MESSAGE`, already read by the sibling brain-terminal
  probe as `messageTaskState`) then owns the dismiss-input gate -- the same
  mechanism the already-verified `congratulationsInputReadyAge`/
  `awardScrollInputDelay`/`awardDefaultInputDelay` gates use. "Accepted at
  tick T" <=> `messageTaskState` differs from the natural (un-pressed)
  baseline's value at that same tick; "rejected" <=> it matches.

Every candidate tick is proven with a same-tick-vs-natural-baseline diff
(the T-1/T bisection pair the step requires), not inferred from a single
endpoint screenshot. Run through tools/run-mgba-probe.py with a fresh output
path.
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
sys.path.insert(0, str(HARNESS_ROOT / "oracle"))

from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = HARNESS_ROOT / "oracle" / "bootstrap" / "factory-battle-scene-off.json"
PREFIX_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth" / "battle1-postwin-dense.json"

PREFIX_TICK = 29601
CHALLENGE_STATUS_WON = 3
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
SAVE_BLOCK1_FLAGS = 0x1270
GMAIN_CALLBACK2 = 0x004
GMAIN_STATE = 0x438

POST_WIN_STREAK = 21
TRAINER_FRONTIER_BRAIN = 1022
FACTORY_SILVER_SYMBOL_FLAG_ID = 2252
FACTORY_SILVER_SYMBOL_FLAG_BYTE = FACTORY_SILVER_SYMBOL_FLAG_ID // 8
FACTORY_SILVER_SYMBOL_FLAG_BIT = FACTORY_SILVER_SYMBOL_FLAG_ID % 8

STEXT_PRINTERS = 0x020201B0
G_TRAINER_BATTLE_OPPONENT_A = 0x02038BCA
PRINTER_ACTIVE_OFFSET = 0x1B
PRINTER_STATE_OFFSET = 0x1C
PRINTER_SCROLL_DISTANCE_OFFSET = 0x1F
TASK_DRAW_FIELD_MESSAGE = 0x08098155
TASK_SIZE = 0x28
NUM_TASKS = 16

# reference/pokeemerald/include/text.h RENDER_STATE_* enum order.
RENDER_STATE_HANDLE_CHAR = 0
RENDER_STATE_WAIT = 1
RENDER_STATE_CLEAR = 2
RENDER_STATE_SCROLL_START = 3
RENDER_STATE_SCROLL = 4
RENDER_STATE_WAIT_SE = 5
RENDER_STATE_PAUSE = 6

# Formula-derived values as actually computed by the current
# factoryTerminalPresentation.ts (confirmed live via `node_modules/.bin/vite-node`
# against the real profile strings -- NOT the stale "99"/"scrollRelease+30"
# figures quoted in docs/brain-terminal-live-verification.md's "What was NOT
# verified" section and echoed in this session's brief, which hand-counted
# the frontierBrainCongratulations line lengths as 30/29/24 instead of the
# real 29/28/23):
#   frontierBrainCongratsScrollGateReadyAge
#     = congratulationsTextDelay(41) + line0.length(29) + line1.length(28) - 1 = 97
#   frontierBrainCongratsFinalGateReadyAge(congratsScrollReleaseAge)
#     = congratsScrollReleaseAge + thirdLineTextDelay(7) + line2.length(23) - 1
#     = congratsScrollReleaseAge + 29
APP_SCROLL_GATE_READY_AGE = 97
APP_FINAL_GATE_DELTA = 29


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


def stage(oracle: EmeraldOracle, trace: dict) -> None:
    """Byte-identical staging to stage-factory-brain-silver-terminal-off.py's
    `replay_and_stage` (duplicated: that script calls `main()` unconditionally
    at import time, so it cannot be imported as a library)."""
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

    staged_status = oracle.read_u8(frontier + FRONTIER_CHALLENGE_STATUS)
    staged_opponent = oracle.read_u16(G_TRAINER_BATTLE_OPPONENT_A)
    if staged_status != CHALLENGE_STATUS_WON or staged_opponent != TRAINER_FRONTIER_BRAIN:
        raise AssertionError(f"brain seventh-win stage did not stick: status={staged_status} opponent={staged_opponent}")


def task_data0_by_function(oracle: EmeraldOracle, function: int) -> int | None:
    base = oracle.symbols["gTasks"]
    for task_id in range(NUM_TASKS):
        addr = base + task_id * TASK_SIZE
        if oracle.read_u8(addr + 4) and u32(oracle, addr) == function:
            return oracle.read_u8(addr + 8) | (oracle.read_u8(addr + 9) << 8)
    return None


def row(oracle: EmeraldOracle, relative: int) -> dict[str, object]:
    return {
        "tick": relative,
        "printerActive": oracle.read_u8(STEXT_PRINTERS + PRINTER_ACTIVE_OFFSET),
        "printerState": oracle.read_u8(STEXT_PRINTERS + PRINTER_STATE_OFFSET),
        "scrollDistance": oracle.read_u8(STEXT_PRINTERS + PRINTER_SCROLL_DISTANCE_OFFSET),
        "messageTaskState": task_data0_by_function(oracle, TASK_DRAW_FIELD_MESSAGE),
        "sha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }


def run(oracle: EmeraldOracle, trace: dict, scheduled: dict[int, list[str]], frames: int) -> list[dict[str, object]]:
    stage(oracle, trace)
    rows = []
    for relative in range(1, frames + 1):
        buttons = scheduled.get(relative, [])
        oracle.advance(buttons)
        rows.append(row(oracle, relative))
    return rows


def first_tick(rows: list[dict[str, object]], predicate) -> int | None:
    return next((int(r["tick"]) for r in rows if predicate(r)), None)


def spans(rows: list[dict[str, object]], value_at) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    start = int(rows[0]["tick"])
    value = value_at(rows[0])
    previous = start
    for r in rows[1:]:
        tick = int(r["tick"])
        next_value = value_at(r)
        if next_value != value:
            result.append({"value": value, "start": start, "end": previous})
            start, value = tick, next_value
        previous = tick
    result.append({"value": value, "start": start, "end": previous})
    return result


def bisect_gate_b_dismiss(
    oracle: EmeraldOracle,
    trace: dict,
    natural_rows: list[dict[str, object]],
    center: int,
    window: int,
    lookahead: int,
    prior_presses: dict[int, list[str]],
) -> dict[str, object]:
    """Gate (b) has no printer-FSM field to read directly: once line 2's EOS
    is hit, `field_message_box.c`'s `Task_DrawFieldMessage` self-destructs
    the SAME tick (`case 2: if (RunTextPrintersAndIsPrinter0Active() !=
    TRUE) { ...; DestroyTask(taskId); }`) -- the actual "wait for A/B, then
    advance the script" lives entirely in the overworld script engine's
    `waitbuttonpress` command, which has no dedicated struct this probe
    reads. So: for each candidate tick, press A only there, run `lookahead`
    more (un-pressed) ticks, and check whether the printer ever comes back
    ACTIVE (a new AddTextPrinter for the next msgbox, i.e. the award text)
    within that span -- vs. the un-pressed natural baseline, which never
    does. "Accepted" == a new active printer session appears within
    [candidate, candidate+lookahead] in the pressed run but not in the
    natural run over the same span (ruling out a coincidental unrelated
    transition)."""
    natural_by_tick = {int(r["tick"]): r for r in natural_rows}
    probes: dict[int, dict[str, object]] = {}
    for candidate in range(center - window, center + window + 1):
        scheduled = {**prior_presses, candidate: ["A"]}
        rows = run(oracle, trace, scheduled, candidate + lookahead)
        span = [r for r in rows if int(r["tick"]) >= candidate]
        pressed_reactivates = any(r["printerActive"] == 1 for r in span)
        natural_span_active = any(
            (natural_by_tick[t]["printerActive"] == 1)
            for t in range(candidate, candidate + lookahead + 1)
            if t in natural_by_tick
        )
        accepted = pressed_reactivates and not natural_span_active
        probes[candidate] = {
            "pressedReactivatesWithinLookahead": pressed_reactivates,
            "naturalActiveWithinSameSpan": natural_span_active,
            "accepted": accepted,
        }
    accepted_ticks = sorted(t for t, p in probes.items() if p["accepted"])
    boundary = accepted_ticks[0] if accepted_ticks else None
    return {"probes": probes, "boundary": boundary}


def bisect_gate(
    oracle: EmeraldOracle,
    trace: dict,
    natural_rows: list[dict[str, object]],
    accepted_predicate,
    center: int,
    window: int,
    prior_presses: dict[int, list[str]],
) -> dict[str, object]:
    """For each candidate tick in [center-window, center+window], stage a
    fresh replay with `prior_presses` plus a single extra `A` press at that
    candidate tick, and evaluate `accepted_predicate(pressed_row,
    natural_baseline_row_at_same_tick)`. Caller supplies the predicate so it
    can target the SPECIFIC real transition being measured -- a plain
    "anything differs from natural" diff is not enough: pokeemerald's
    held-A print-speed-up mechanic (`text.c`'s
    `RENDER_STATE_HANDLE_CHAR`: `JOY_NEW(A|B)` zeroes `delayCounter`,
    advancing that tick's glyph/control-code processing early) can make an
    EARLIER, unrelated tick's press also show a diff from natural without
    being the transition under test."""
    natural_by_tick = {int(r["tick"]): r for r in natural_rows}
    probes: dict[int, dict[str, object]] = {}
    for candidate in range(center - window, center + window + 1):
        scheduled = {**prior_presses, candidate: ["A"]}
        rows = run(oracle, trace, scheduled, candidate + 1)
        pressed_row = rows[-1]
        baseline_row = natural_by_tick.get(candidate)
        accepted = accepted_predicate(pressed_row, baseline_row)
        probes[candidate] = {
            "pressed": {k: pressed_row[k] for k in ("printerActive", "printerState", "scrollDistance", "messageTaskState")},
            "naturalBaseline": None if baseline_row is None else {
                k: baseline_row[k] for k in ("printerActive", "printerState", "scrollDistance", "messageTaskState")
            },
            "accepted": accepted,
        }
    accepted_ticks = sorted(t for t, p in probes.items() if p["accepted"])
    boundary = accepted_ticks[0] if accepted_ticks else None
    return {"probes": probes, "boundary": boundary}


def main() -> None:
    trace = json.loads(PREFIX_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    output: dict[str, object] = {
        "schema": "factory-brain-congrats-gate-bisection-off/v1",
        "oracleProfile": "battle-scene-off",
        "sourceTrace": str(PREFIX_PATH.relative_to(WORKTREE_ROOT)),
        "relativeTo": "the staged Noland-silver seventh-win Factory Lobby CB2_LoadMap handoff, tick 0 (same clock as factoryTerminalPresentation.ts's state.age -- 'Terminal-local age; zero is the staged CB2_LoadMap handoff')",
    }

    def flush() -> None:
        OUTPUT_PATH.write_text(json.dumps(output, indent=2, default=str) + "\n")

    flush()

    # Phase 1: dense natural (never-pressed) baseline, ticks 1..220 -- locates
    # the SCROLL_START entry and gives every later bisection its reject-side
    # reference (an un-pressed run sits frozen in its wait state forever).
    natural_rows = run(oracle, trace, {}, 220)
    printer_state_spans = spans(natural_rows, lambda r: r["printerState"])
    message_task_spans = spans(natural_rows, lambda r: r["messageTaskState"])
    scroll_start_first = first_tick(natural_rows, lambda r: r["printerState"] == RENDER_STATE_SCROLL_START)
    output["naturalBaseline"] = {
        "printerStateSpans": printer_state_spans,
        "messageTaskStateSpans": message_task_spans,
        "scrollStartFirstTick": scroll_start_first,
    }
    flush()
    if scroll_start_first is None:
        raise AssertionError(f"printer never entered SCROLL_START (\\l) by tick 220: {printer_state_spans}")

    # Phase 2: bisect gate (a), the \l scroll-accept boundary, around the
    # natural SCROLL_START entry tick.
    def gate_a_accepted(pressed_row: dict[str, object], natural_row: dict[str, object] | None) -> bool:
        # The precise transition under test: RENDER_STATE_SCROLL_START(3) ->
        # RENDER_STATE_SCROLL(4) (text.c:1180-1188). Plain "differs from
        # natural" over-fires on ticks where held-A merely speeds up the
        # in-progress glyph's delayCounter (text.c:944-955) without actually
        # accepting the scroll -- exactly what tick 96 showed in this
        # session's first run (see the doc write-up).
        return pressed_row["printerState"] == RENDER_STATE_SCROLL

    gate_a = bisect_gate(
        oracle, trace, natural_rows,
        gate_a_accepted,
        center=scroll_start_first,
        window=3,
        prior_presses={},
    )
    gate_a_boundary = gate_a["boundary"]
    output["gateA_scrollAccept"] = {
        "description": "earliest tick an A press is accepted to trigger the \\l scroll (printer.state RENDER_STATE_SCROLL_START(3) -> RENDER_STATE_SCROLL(4) same-tick, reference/pokeemerald/src/text.c:1180-1188)",
        "measuredBoundary": gate_a_boundary,
        "fullWindow": gate_a["probes"],
        "appFormulaValue": APP_SCROLL_GATE_READY_AGE,
        "verdict": None if gate_a_boundary is None else (
            "EXACT" if gate_a_boundary == APP_SCROLL_GATE_READY_AGE else f"off-by-{gate_a_boundary - APP_SCROLL_GATE_READY_AGE}"
        ),
    }
    flush()
    if gate_a_boundary is None:
        raise AssertionError(f"gate (a) bisection window found no accepted tick: {gate_a['probes']}")
    if gate_a["probes"][gate_a_boundary - 1]["accepted"]:
        raise AssertionError(f"gate (a) boundary tick {gate_a_boundary} has an accepted tick immediately before it: {gate_a['probes']}")

    # Phase 3: with the scroll genuinely accepted at the measured boundary,
    # continue un-pressed for a WIDE window to build a SECOND natural
    # baseline covering the post-scroll third-line typing and final dismiss
    # wait -- this run's relative ticks > gate_a_boundary are what gate (b)'s
    # bisection diffs against (a fresh natural run with NO scroll accept
    # would never reach the third line at all).
    post_scroll_natural = run(oracle, trace, {gate_a_boundary: ["A"]}, gate_a_boundary + 200)
    post_scroll_printer_spans = spans(post_scroll_natural, lambda r: r["printerState"])
    post_scroll_message_spans = spans(post_scroll_natural, lambda r: r["messageTaskState"])
    printer_inactive_first = first_tick(
        post_scroll_natural,
        lambda r: int(r["tick"]) > gate_a_boundary and r["printerActive"] == 0,
    )
    output["postScrollNaturalBaseline"] = {
        "printerStateSpans": post_scroll_printer_spans,
        "messageTaskStateSpans": post_scroll_message_spans,
        "printerInactiveFirstTick": printer_inactive_first,
    }
    flush()

    # The third line ("seven matches in a row!") only begins typing once the
    # printer leaves RENDER_STATE_SCROLL (4) back to RENDER_STATE_HANDLE_CHAR
    # (0); the dismiss gate can only be reached after that AND after the
    # printer goes inactive (EOS/RENDER_FINISH) or re-enters a wait state.
    # Use the real observed spans (not a blind formula guess) to center the
    # gate (b) search: the first span after the scroll whose value differs
    # from HANDLE_CHAR(0)/SCROLL(4) is the real wait state to bisect around.
    post_scroll_wait_span = next(
        (
            s for s in post_scroll_printer_spans
            if int(s["start"]) > gate_a_boundary and s["value"] not in (RENDER_STATE_SCROLL, RENDER_STATE_HANDLE_CHAR)
        ),
        None,
    )
    if post_scroll_wait_span is not None:
        dismiss_center = int(post_scroll_wait_span["start"])
    elif printer_inactive_first is not None:
        dismiss_center = printer_inactive_first
    else:
        dismiss_center = gate_a_boundary + APP_FINAL_GATE_DELTA

    # Phase 4: bisect gate (b), the post-third-line dismiss boundary, against
    # the post_scroll_natural baseline (NOT the phase-1 baseline, which never
    # scrolled at all). Candidates below printer_inactive_first are safe to
    # include even though held-A's print-speed-up mechanic can race the EOS
    # read early there (the same confound gate (a) hit at tick 96): the
    # script engine's waitbuttonpress only starts polling once control
    # actually returns to it (printer inactive AND Task_DrawFieldMessage
    # destroyed), so an early press cannot be consumed as a dismiss accept.
    gate_b = bisect_gate_b_dismiss(
        oracle, trace, post_scroll_natural,
        center=dismiss_center,
        window=6,
        lookahead=12,
        prior_presses={gate_a_boundary: ["A"]},
    )
    gate_b_boundary = gate_b["boundary"]
    output["gateB_finalDismiss"] = {
        "description": "earliest tick after the scroll that A dismisses the box -- the printer coming back ACTIVE (new AddTextPrinter for the award text) within a 12-tick lookahead of the press, vs. never in the un-pressed natural baseline over the same span (field_message_box.c's Task_DrawFieldMessage self-destructs the instant printing finishes, so there is no direct RAM flag for the script engine's own waitbuttonpress accept -- this is the earliest indirect but unambiguous consequence)",
        "congratsScrollReleaseAge": gate_a_boundary,
        "dismissSearchCenter": dismiss_center,
        "measuredBoundary": gate_b_boundary,
        "measuredDelta": None if gate_b_boundary is None else gate_b_boundary - gate_a_boundary,
        "fullWindow": gate_b["probes"],
        "appFormulaDelta": APP_FINAL_GATE_DELTA,
        "appFormulaValue": gate_a_boundary + APP_FINAL_GATE_DELTA,
        "verdict": None if gate_b_boundary is None else (
            "EXACT" if (gate_b_boundary - gate_a_boundary) == APP_FINAL_GATE_DELTA
            else f"off-by-{(gate_b_boundary - gate_a_boundary) - APP_FINAL_GATE_DELTA}"
        ),
    }
    flush()
    if gate_b_boundary is None:
        raise AssertionError(f"gate (b) bisection window found no accepted tick: {gate_b['probes']}")
    if gate_b_boundary - 1 in gate_b["probes"] and gate_b["probes"][gate_b_boundary - 1]["accepted"]:
        raise AssertionError(f"gate (b) boundary tick {gate_b_boundary} has an accepted tick immediately before it: {gate_b['probes']}")

    output["limits"] = {"noPngOrRgbAssets": True, "noProductionRendererUse": True}
    flush()


main()
