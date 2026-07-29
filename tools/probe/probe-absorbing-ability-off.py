#!/usr/bin/env python3
"""Process-isolated Battle Scene OFF receipt for Volt Absorb.

The mechanicLab fixture supplies three complete legal Pokémon per side.
Jolteon is faster and its four identical Take Down slots constrain the
Factory AI; recoil damages Jolteon before the player's Spark is absorbed.
This probe records the stock ROM's battle/party HP sync, move-result state,
displayed message, ability reveal, and every Random() frame.
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
WORKTREE_ROOT = Path(__file__).resolve().parents[2]


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
DISPLAYED_STRING_BYTES = 96


def decode_displayed(raw: list[int]) -> str:
    chars: list[str] = []
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-",
        0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    for value in raw:
        if value == 0xFF:
            break
        if value == 0xFE:
            chars.append("\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        elif value in (0xFA, 0xFB):
            chars.append("\n")
        else:
            chars.append(f"<{value:02X}>")
    return "".join(chars)


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
    lab.prepare(request)
    symbols = oracle.symbols

    def compact() -> dict:
        state = lab.snapshot()
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "rngValue": state["rngValue"],
            "battleHp": {
                "player": state["battlers"]["player"]["hp"],
                "opponent": state["battlers"]["opponent"]["hp"],
            },
            "battleSpecies": {
                "player": state["battlers"]["player"]["species"],
                "opponent": state["battlers"]["opponent"]["species"],
            },
            "partyHp": {
                "player": [mon["hp"] for mon in state["parties"]["player"][:3]],
                "opponent": [mon["hp"] for mon in state["parties"]["opponent"][:3]],
            },
            "opponentMaxHp": state["battlers"]["opponent"]["maxHp"],
            "opponentPp": state["battlers"]["opponent"]["pp"],
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "chosenMoveByBattler": [
                oracle.read_u16(symbols["gChosenMoveByBattler"] + 2 * battler)
                for battler in range(2)
            ],
            "moveResultFlags": oracle.read_u8(symbols["gMoveResultFlags"]),
            "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
            "displayedString": decode_displayed(raw),
        }

    changes = []
    random_frames = []
    before = compact()
    prior = before
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
            })
        if after != prior:
            changes.append({"frame": frame, **after})
            prior = after
        before = after
        rand_before = rand_after

    expected_draws = [
        (36, "Factory AI equal-slot choice (all four slots are TAKE_DOWN)"),
        (36, "Cmd_critcalc for TAKE_DOWN"),
        (36, "ApplyRandomDmgMultiplier for TAKE_DOWN"),
        (209, "Cmd_accuracycheck for SPARK; absorption exits before crit/damage draws"),
    ]
    observed_draws = [
        (row["currentMove"], row["randomCalls"]) for row in random_frames
    ]
    if observed_draws != [(move, 1) for move, _ in expected_draws]:
        raise RuntimeError(f"unexpected Random() ledger: {observed_draws}")
    attributed_random_frames = [
        {**row, "sourceAttribution": attribution}
        for row, (_, attribution) in zip(random_frames, expected_draws)
    ]

    result = {
        "fixture": str(FIXTURE_PATH),
        "profile": PROFILE,
        "seed": SEED,
        "initial": compact() if not changes else changes[0],
        "randomFrames": attributed_random_frames,
        "transitions": changes,
        "final": compact(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: {len(changes)} state transitions, "
        f"{sum(row['randomCalls'] for row in random_frames)} Random() calls",
        flush=True,
    )


main()
