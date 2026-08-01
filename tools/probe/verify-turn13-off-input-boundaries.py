#!/usr/bin/env python3
"""Verify Battle Scene OFF turn-13 input edges and delayed KO dismissal.

The fixed-prefix candidates distinguish an installed input handler from the
first frame on which it consumes A.  The two continuation variants preserve
the canonical prefix through the long KO hold and move only its two-frame A
segment: the second variant inserts exactly 30 idle frames.

Run through the teardown-safe wrapper:

    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
      tools/probe/verify-turn13-off-input-boundaries.py <fresh-output.json>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json>")

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
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn13-menu.json"

PLAYER_BUFFER_RUN_COMMAND = 0x08057505
HANDLE_INPUT_CHOOSE_ACTION = 0x08057589
HANDLE_INPUT_CHOOSE_MOVE = 0x08057BFD
COMPLETE_ON_INACTIVE_TEXT_PRINTER2 = 0x080597B5


def read_row(oracle: EmeraldOracle, tick: int) -> dict:
    symbols = oracle.symbols
    return {
        "tick": tick,
        "execFlags": oracle.read_u32(symbols["gBattleControllerExecFlags"]),
        "battleMainFunc": oracle.read_u32(symbols["gBattleMainFunc"]),
        "playerControllerFunc": oracle.read_u32(symbols["gBattlerControllerFuncs"]),
        "opponentControllerFunc": oracle.read_u32(symbols["gBattlerControllerFuncs"] + 4),
        "playerCommand": oracle.read_u8(symbols["gBattleBufferA"]),
        "opponentCommand": oracle.read_u8(symbols["gBattleBufferA"] + 0x200),
        "playerReturnAction": oracle.read_u8(symbols["gBattleBufferB"] + 1),
        "playerReturnMoveSlot": oracle.read_u8(symbols["gBattleBufferB"] + 2),
        "bg0Y": (
            oracle.read_u8(symbols["gBattle_BG0_Y"])
            | (oracle.read_u8(symbols["gBattle_BG0_Y"] + 1) << 8)
        ),
        "moveCursor": oracle.read_u8(symbols["gMoveSelectionCursor"]),
        "battleScript": oracle.read_u32(symbols["gBattlescriptCurrInstr"]),
        "opponentSpecies": (
            oracle.read_u8(symbols["gBattleMons"] + 0x58)
            | (oracle.read_u8(symbols["gBattleMons"] + 0x59) << 8)
        ),
        "opponentHp": (
            oracle.read_u8(symbols["gBattleMons"] + 0x80)
            | (oracle.read_u8(symbols["gBattleMons"] + 0x81) << 8)
        ),
        "submenuPp0": oracle.read_u8(symbols["gBattleBufferA"] + 12),
        "submenuPp1": oracle.read_u8(symbols["gBattleBufferA"] + 13),
        "submenuPp2": oracle.read_u8(symbols["gBattleBufferA"] + 14),
        "submenuPp3": oracle.read_u8(symbols["gBattleBufferA"] + 15),
    }


def replay(oracle: EmeraldOracle, segments: list[dict], record_start: int) -> list[dict]:
    oracle.new_session()
    rows = []
    tick = 0
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick >= record_start:
                rows.append(read_row(oracle, tick))
    return rows


def run_pulse(
    oracle: EmeraldOracle,
    source_segments: list[dict],
    prefix_count: int,
    pulse_tick: int,
    tail_frames: int = 12,
) -> dict:
    prefix = source_segments[:prefix_count]
    prefix_frames = sum(int(segment["frames"]) for segment in prefix)
    idle_frames = pulse_tick - prefix_frames - 1
    if idle_frames < 0:
        raise ValueError(f"pulse tick {pulse_tick} precedes prefix end {prefix_frames}")
    segments = [
        *prefix,
        {"frames": idle_frames, "buttons": []},
        {"frames": 1, "buttons": ["A"]},
        {"frames": tail_frames, "buttons": []},
    ]
    rows = replay(oracle, segments, pulse_tick - 2)
    press_row = next(row for row in rows if row["tick"] == pulse_tick)
    accepted_action = (
        press_row["playerControllerFunc"] == PLAYER_BUFFER_RUN_COMMAND
        and press_row["playerReturnAction"] == 0
    )
    dismissed_text = any(
        row["tick"] >= pulse_tick
        and row["execFlags"] == 0
        and row["playerControllerFunc"] == PLAYER_BUFFER_RUN_COMMAND
        for row in rows
    )
    return {
        "pulseTick": pulse_tick,
        "prefixFrames": prefix_frames,
        "acceptedActionOnPulse": accepted_action,
        "dismissedTextByTail": dismissed_text,
        "rows": rows,
    }


def run_dismiss_variant(
    oracle: EmeraldOracle,
    source_segments: list[dict],
    delay_frames: int,
) -> dict:
    prefix = source_segments[:106]
    prefix_frames = sum(int(segment["frames"]) for segment in prefix)
    dismiss = source_segments[106]
    if dismiss.get("buttons") != ["A"] or int(dismiss["frames"]) != 2:
        raise ValueError("source segment 106 is no longer the two-frame KO-dismiss A")
    segments = [
        *prefix,
        {"frames": delay_frames, "buttons": []},
        dismiss,
        {"frames": 430, "buttons": []},
    ]
    first_press_tick = prefix_frames + delay_frames + 1
    rows = replay(oracle, segments, first_press_tick - 2)
    return {
        "delayFrames": delay_frames,
        "firstPressTick": first_press_tick,
        "rows": rows,
    }


def main() -> None:
    source_segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    output = {
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "functionPointers": {
            "PlayerBufferRunCommand": PLAYER_BUFFER_RUN_COMMAND,
            "HandleInputChooseAction": HANDLE_INPUT_CHOOSE_ACTION,
            "HandleInputChooseMove": HANDLE_INPUT_CHOOSE_MOVE,
            "CompleteOnInactiveTextPrinter2": COMPLETE_ON_INACTIVE_TEXT_PRINTER2,
        },
        "turn12NextActionCandidates": [
            run_pulse(oracle, source_segments, 99, tick)
            for tick in (14768, 14769)
        ],
        "turn13FaintDismissCandidates": [
            run_pulse(oracle, source_segments, 105, tick, 16)
            for tick in (15909, 15910)
        ],
        "turn13NextActionCandidates": [
            run_pulse(oracle, source_segments, 107, tick)
            for tick in (17084, 17085)
        ],
        "dismissContinuations": [
            run_dismiss_variant(oracle, source_segments, delay)
            for delay in (0, 30)
        ],
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2))
    print(f"wrote {OUTPUT_PATH}")


main()
