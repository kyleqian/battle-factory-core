#!/usr/bin/env python3
"""Process-isolated Battle Scene OFF receipt for one Roar fixture/seed.

Run only through tools/run-mgba-probe.py. The probe stages the committed
mechanicLab fixture from a fresh emulator, records every frame with Random()
calls using source's sRandCount, and banks the chosen-move/party/PP endpoints
needed to identify the usable-bench and zero-bench decisions directly.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <seed> <output.json>")

FIXTURE_PATH = Path(sys.argv[1])
SEED = int(sys.argv[2])
OUTPUT_PATH = Path(sys.argv[3])
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

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-off"
SRANDCOUNT_ADDR = 0x020249C0


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
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", bootstrap)
    lab = BattleLab(oracle, PROFILE)
    setup = lab.prepare(request)

    chosen_moves = oracle.symbols["gChosenMoveByBattler"]

    def chosen() -> list[int]:
        return [oracle.read_u16(chosen_moves + battler * 2) for battler in range(4)]

    def compact() -> dict:
        state = lab.snapshot()
        player_party = state["parties"]["player"]
        active_index = state["battlers"]["player"]["partyIndex"]
        usable = sum(
            1 for index, mon in enumerate(player_party)
            if index != active_index and mon["hp"] != 0 and mon["species"] not in (0, 412)
        )
        return {
            "rngValue": state["rngValue"],
            "chosenMoveByBattler": chosen(),
            "playerPartyIndex": active_index,
            "playerPartyHp": [mon["hp"] for mon in player_party[:3]],
            "playerUsableBench": usable,
            "opponentPartyIndex": state["battlers"]["opponent"]["partyIndex"],
            "opponentSpecies": state["battlers"]["opponent"]["species"],
            "opponentHp": state["battlers"]["opponent"]["hp"],
            "opponentPp": state["battlers"]["opponent"]["pp"],
            "opponentLightScreenTurns": state["sideConditions"]["opponent"]["lightScreenTurns"],
        }

    random_frames = []
    before = compact()
    rand_before = oracle.read_u32(SRANDCOUNT_ADDR)
    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        after = compact()
        delta = (rand_after - rand_before) & 0xFFFFFFFF
        if delta:
            random_frames.append({
                "frame": frame,
                "randomCalls": delta,
                "before": before,
                "after": after,
            })
        before = after
        rand_before = rand_after

    result = {
        "fixture": str(FIXTURE_PATH),
        "profile": PROFILE,
        "seed": SEED,
        "setupSpecies": {
            "player": [mon["species"] for mon in setup["player"]],
            "opponent": [mon["species"] for mon in setup["opponent"]],
        },
        "randomFrames": random_frames,
        "final": compact(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH}: {len(random_frames)} Random()-active frames", flush=True)


main()
