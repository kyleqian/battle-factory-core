#!/usr/bin/env python3
"""Verify the first Battle Scene OFF action-input edges after turns 7 and 8.

The canonical watch in ``specs/turn7-8-off-boundary-watch.json`` preserves
all fixed inputs.  This companion probe preserves each replay prefix through
move confirmation, then places one isolated A pulse on either side of the
candidate post-resolution edge.  That distinguishes an installed controller
from an input that ``HandleInputChooseAction`` actually consumes.

Run through the teardown-safe wrapper:

    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
      tools/probe/verify-turn7-8-off-input-boundaries.py <fresh-output.json>
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
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn9-menu.json"

PLAYER_BUFFER_RUN_COMMAND = 0x08057505
HANDLE_INPUT_CHOOSE_ACTION = 0x08057589


def read_u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


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
        raise ValueError(f"pulse tick {pulse_tick} precedes prefix end {prefix_frames}")
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
            "bg0Y": read_u16(oracle, symbols["gBattle_BG0_Y"]),
            "battleMainFunc": oracle.read_u32(symbols["gBattleMainFunc"]),
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
    return {
        "pulseTick": pulse_tick,
        "prefixFrames": prefix_frames,
        "acceptedActionOnPulse": (
            press_row["playerControllerFunc"] == PLAYER_BUFFER_RUN_COMMAND
            and press_row["playerReturnAction"] == 0
        ),
        "rows": rows,
    }


def main() -> None:
    # Source-audited against turn9-menu.json:
    # 75 segments end after turn-7 move-confirm at tick 8380.
    # 81 segments end after turn-8 move-confirm at tick 9426.
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    output = {
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "functionPointers": {
            "PlayerBufferRunCommand": PLAYER_BUFFER_RUN_COMMAND,
            "HandleInputChooseAction": HANDLE_INPUT_CHOOSE_ACTION,
        },
        "turn7NextActionCandidates": [
            run_pulse(oracle, 75, tick) for tick in (8897, 8898, 8899)
        ],
        "turn8NextActionCandidates": [
            run_pulse(oracle, 81, tick) for tick in (9858, 9859, 9860)
        ],
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2))
    print(f"wrote {OUTPUT_PATH}")


main()
