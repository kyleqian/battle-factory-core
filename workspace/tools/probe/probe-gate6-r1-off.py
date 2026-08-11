#!/usr/bin/env python3
"""Record Gate-6 R1 sun/freeze state and every stock-ROM Random() draw."""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <seed> <output.json>")

FIXTURE_PATH = Path(sys.argv[1])
SEED = int(sys.argv[2])
OUTPUT_PATH = Path(sys.argv[3])
WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PROFILE = "battle-scene-off"
SRANDCOUNT_ADDR = 0x020249C0


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    fixture["seed"] = SEED
    request = validate_request(fixture, PROFILE)
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    bootstrap = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        bootstrap,
    )
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    symbols = oracle.symbols

    def compact() -> dict:
        state = lab.snapshot()
        return {
            "rngValue": state["rngValue"],
            "weather": state["weather"],
            "weatherTurns": state["weatherTurns"],
            "playerHp": state["battlers"]["player"]["hp"],
            "playerStatus1": state["battlers"]["player"]["status1"],
            "playerStatStages": state["battlers"]["player"]["statStages"],
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "chosenMoveByBattler": [
                oracle.read_u16(symbols["gChosenMoveByBattler"] + 2 * battler)
                for battler in range(2)
            ],
        }

    initial = compact()
    prior_key = {
        key: initial[key]
        for key in (
            "weather",
            "weatherTurns",
            "playerHp",
            "playerStatus1",
            "playerStatStages",
        )
    }
    transitions = []
    random_frames = []
    before = initial
    rand_before = oracle.read_u32(SRANDCOUNT_ADDR)
    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        delta = (rand_after - rand_before) & 0xFFFFFFFF
        if delta:
            random_frames.append({
                "frame": frame,
                "randomCalls": delta,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
                "currentMove": after["currentMove"],
                "chosenMoveByBattler": after["chosenMoveByBattler"],
                "playerStatus1": after["playerStatus1"],
                "weather": after["weather"],
            })
        after_key = {
            key: after[key]
            for key in (
                "weather",
                "weatherTurns",
                "playerHp",
                "playerStatus1",
                "playerStatStages",
            )
        }
        if after_key != prior_key:
            transitions.append({"frame": frame, **after_key})
            prior_key = after_key
        before = after
        rand_before = rand_after

    result = {
        "fixture": str(FIXTURE_PATH),
        "profile": PROFILE,
        "seed": SEED,
        "initial": initial,
        "randomFrames": random_frames,
        "transitions": transitions,
        "final": compact(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: {len(transitions)} state transitions, "
        f"{sum(row['randomCalls'] for row in random_frames)} Random() calls",
        flush=True,
    )


main()
