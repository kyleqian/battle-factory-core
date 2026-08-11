#!/usr/bin/env python3
"""Verify the first Battle Scene OFF input-accept edges around turns 5 and 6.

This complements ``specs/turn5-6-off-boundary-watch.json``.  The watch keeps
the canonical fixed-button replay intact; this probe replays the same prefix
but moves one isolated A pulse across each candidate readiness boundary.  It
therefore distinguishes "the menu is visible" from "HandleInputChooseAction
actually consumed A" without inferring either fact from pixels.

Run through the teardown-safe wrapper:

    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
      tools/probe/verify-turn5-6-off-input-boundaries.py <fresh-output.json>
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
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn7-menu.json"

PLAYER_BUFFER_RUN_COMMAND = 0x08057505
HANDLE_INPUT_CHOOSE_ACTION = 0x08057589
HANDLE_INPUT_CHOOSE_MOVE = 0x08057BFD


def run_pulse(
    oracle: EmeraldOracle,
    prefix_count: int,
    pulse_tick: int,
    tail_frames: int = 12,
) -> dict:
    source_segments = json.loads(TRACE_PATH.read_text())["segments"]
    prefix = source_segments[:prefix_count]
    prefix_frames = sum(int(segment["frames"]) for segment in prefix)
    idle_frames = pulse_tick - prefix_frames - 1
    if idle_frames < 0:
        raise ValueError(
            f"pulse tick {pulse_tick} precedes prefix end {prefix_frames}"
        )
    segments = [
        *prefix,
        {"frames": idle_frames, "buttons": []},
        {"frames": 1, "buttons": ["A"]},
        {"frames": tail_frames, "buttons": []},
    ]

    oracle.new_session()
    symbols = oracle.symbols

    def row(tick: int) -> dict:
        return {
            "tick": tick,
            "execFlags": oracle.read_u32(symbols["gBattleControllerExecFlags"]),
            "playerControllerFunc": oracle.read_u32(symbols["gBattlerControllerFuncs"]),
            "playerReturnAction": oracle.read_u8(symbols["gBattleBufferB"] + 1),
            "playerCommand": oracle.read_u8(symbols["gBattleBufferA"]),
            "bg0Y": (
                oracle.read_u8(symbols["gBattle_BG0_Y"])
                | (oracle.read_u8(symbols["gBattle_BG0_Y"] + 1) << 8)
            ),
            "battleScript": oracle.read_u32(symbols["gBattlescriptCurrInstr"]),
        }

    rows = []
    tick = 0
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if pulse_tick - 2 <= tick <= pulse_tick + tail_frames:
                rows.append(row(tick))

    press_row = next(item for item in rows if item["tick"] == pulse_tick)
    accepted_action = (
        press_row["playerControllerFunc"] == PLAYER_BUFFER_RUN_COMMAND
        and press_row["playerReturnAction"] == 0
    )
    dismissed_text = any(
        item["tick"] >= pulse_tick
        and item["execFlags"] == 0
        and item["playerControllerFunc"] == PLAYER_BUFFER_RUN_COMMAND
        for item in rows
    )
    return {
        "pulseTick": pulse_tick,
        "prefixFrames": prefix_frames,
        "acceptedActionOnPulse": accepted_action,
        "dismissedTextByTail": dismissed_text,
        "rows": rows,
    }


def main() -> None:
    # Prefix counts are source-audited against turn7-menu.json:
    # 63 -> turn-5 move confirm ends at 5960;
    # 65 -> canonical faint-dismiss A ends at 6562;
    # 71 -> turn-6 move confirm ends at 7346.
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    output = {
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "functionPointers": {
            "PlayerBufferRunCommand": PLAYER_BUFFER_RUN_COMMAND,
            "HandleInputChooseAction": HANDLE_INPUT_CHOOSE_ACTION,
            "HandleInputChooseMove": HANDLE_INPUT_CHOOSE_MOVE,
        },
        "turn5FaintDismissCandidates": [
            run_pulse(oracle, 63, tick, 16) for tick in (6397, 6398, 6399, 6400)
        ],
        "turn5NextActionCandidates": [
            run_pulse(oracle, 65, tick) for tick in (6993, 6994, 6995)
        ],
        "turn6NextActionCandidates": [
            run_pulse(oracle, 71, tick) for tick in (7875, 7876, 7877)
        ],
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2))
    print(f"wrote {OUTPUT_PATH}")


main()
