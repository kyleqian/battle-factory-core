#!/usr/bin/env python3
"""Record Gate-6 R10 Attract/Oblivious transitions from the stock ROM."""

from __future__ import annotations

import hashlib
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
BATTLE_MON_SIZE = 0x58


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
        player = state["battlers"]["player"]
        opponent = state["battlers"]["opponent"]
        player_personality = oracle.read_u32(symbols["gBattleMons"] + 0x48)
        opponent_personality = oracle.read_u32(
            symbols["gBattleMons"] + BATTLE_MON_SIZE + 0x48
        )
        return {
            "rngValue": state["rngValue"],
            "currentMove": state["engine"]["currentMove"],
            "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
            "moveResultFlags": oracle.read_u8(symbols["gMoveResultFlags"]),
            "player": {
                "ability": player["ability"],
                "status2": player["status2"],
                "status3": player["status3"],
                "perishSongTurns": player["volatile"]["perishSongTurns"],
                "personality": player_personality,
                "gender": "female" if (player_personality & 0xFF) < 127 else "male",
                "pp": player["pp"],
            },
            "opponent": {
                "ability": opponent["ability"],
                "status2": opponent["status2"],
                "status3": opponent["status3"],
                "perishSongTurns": opponent["volatile"]["perishSongTurns"],
                "personality": opponent_personality,
                "gender": "female" if (opponent_personality & 0xFF) < 127 else "male",
                "pp": opponent["pp"],
            },
        }

    initial = compact()
    transitions = []
    prior = initial
    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        if after != prior:
            transitions.append({
                "frame": frame,
                "sha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
                **after,
            })
            prior = after

    result = {
        "fixture": str(FIXTURE_PATH),
        "profile": PROFILE,
        "seed": SEED,
        "initial": initial,
        "transitions": transitions,
        "final": compact(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH}: {len(transitions)} state transitions", flush=True)


main()
