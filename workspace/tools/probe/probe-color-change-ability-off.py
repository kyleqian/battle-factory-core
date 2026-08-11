#!/usr/bin/env python3
"""Process-isolated Battle Scene OFF semantic receipt for Color Change.

The mechanicLab fixture creates two complete legal parties before battle init.
Player Jolteon is faster than the target Kecleon, and all four opponent slots
are Splash, so the normal controller and Factory AI execute one deterministic
Thunderbolt hit without injecting HP, type, or transient battle state.
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
PROFILE = "battle-scene-off"
SRANDCOUNT_ADDR = 0x020249C0
DISPLAYED_STRING_BYTES = 96


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit("could not find harness root above worktree")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


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


def compact(lab: BattleLab, oracle: EmeraldOracle) -> dict:
    state = lab.snapshot()
    player = state["battlers"]["player"]
    opponent = state["battlers"]["opponent"]
    symbols = oracle.symbols
    raw = [
        oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
        for offset in range(DISPLAYED_STRING_BYTES)
    ]
    return {
        "rngValue": state["rngValue"],
        "player": {
            "species": player["species"],
            "ability": player["ability"],
            "types": player["types"],
            "hp": player["hp"],
            "pp": player["pp"],
        },
        "opponent": {
            "species": opponent["species"],
            "ability": opponent["ability"],
            "types": opponent["types"],
            "hp": opponent["hp"],
            "maxHp": opponent["maxHp"],
            "pp": opponent["pp"],
        },
        "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
        "chosenMoveByBattler": [
            oracle.read_u16(symbols["gChosenMoveByBattler"] + 2 * battler)
            for battler in range(2)
        ],
        "moveResultFlags": oracle.read_u8(symbols["gMoveResultFlags"]),
        "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
        "displayedString": decode_displayed(raw),
    }


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    fixture["seed"] = SEED
    request = validate_request(fixture, PROFILE)
    parties = request["overrides"]["parties"]
    require(request["mode"] == "mechanicLab", "fixture must remain a mechanicLab request")
    require(request["profile"] == PROFILE, "fixture must remain Battle Scene OFF")
    require(parties["player"][0]["species"] == 135, "active player must remain Jolteon")
    require(parties["player"][0]["moves"] == [85, 85, 85, 85], "Jolteon must have four Thunderbolts")
    require(parties["opponent"][0]["species"] == 317, "active target must remain Kecleon")
    require(parties["opponent"][0]["abilitySlot"] == 0, "Kecleon must select Color Change")
    require(parties["opponent"][0]["moves"] == [150, 150, 150, 150], "Kecleon must have four Splash slots")

    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    bootstrap = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", bootstrap)
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)

    initial = compact(lab, oracle)
    require(initial["player"] == {
        "species": 135, "ability": 10, "types": [13, 13], "hp": 140, "pp": [15, 15, 15, 15],
    }, f"unexpected Jolteon staging: {initial['player']}")
    require(initial["opponent"] == {
        "species": 317, "ability": 16, "types": [0, 0], "hp": 167, "maxHp": 167, "pp": [40, 40, 40, 40],
    }, f"unexpected Kecleon staging: {initial['opponent']}")

    transitions: list[dict] = []
    type_changes: list[dict] = []
    messages: list[dict] = []
    random_frames: list[dict] = []
    before = initial
    prior = initial
    rand_before = oracle.read_u32(SRANDCOUNT_ADDR)
    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact(lab, oracle)
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        random_calls = (rand_after - rand_before) & 0xFFFFFFFF
        if random_calls:
            random_frames.append({
                "frame": frame,
                "randomCalls": random_calls,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
                "currentMove": after["currentMove"],
            })
        if after["opponent"]["types"] != prior["opponent"]["types"]:
            type_changes.append({
                "frame": frame,
                "from": prior["opponent"]["types"],
                "to": after["opponent"]["types"],
                "currentMove": after["currentMove"],
                "lastUsedAbility": after["lastUsedAbility"],
                "randomCallsThisFrame": random_calls,
                "targetHp": after["opponent"]["hp"],
            })
        if (
            after["displayedString"] != prior["displayedString"]
            and "KECLEON" in after["displayedString"]
            and "COLOR CHANGE" in after["displayedString"]
            and "ELECTR" in after["displayedString"]
        ):
            messages.append({
                "frame": frame,
                "displayedString": after["displayedString"],
                "currentMove": after["currentMove"],
                "lastUsedAbility": after["lastUsedAbility"],
            })
        if after != prior:
            transitions.append({"frame": frame, **after})
            prior = after
        before = after
        rand_before = rand_after

    require(len(type_changes) == 1, f"expected exactly one target type change, got {type_changes}")
    change = type_changes[0]
    require(change == {
        "frame": change["frame"],
        "from": [0, 0],
        "to": [13, 13],
        "currentMove": 85,
        "lastUsedAbility": 16,
        "randomCallsThisFrame": 0,
        "targetHp": change["targetHp"],
    }, f"unexpected Color Change mutation: {change}")
    require(0 < change["targetHp"] < initial["opponent"]["hp"], "Color Change must follow surviving real damage")
    require(len(messages) == 1, f"expected one Color Change message, got {messages}")

    result = {
        "fixture": str(FIXTURE_PATH),
        "profile": PROFILE,
        "seed": SEED,
        "initial": initial,
        "typeChanges": type_changes,
        "colorChangeMessages": messages,
        "randomFrames": random_frames,
        "transitions": transitions,
        "final": compact(lab, oracle),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: Color Change at frame {change['frame']} "
        f"({change['from']} -> {change['to']})",
        flush=True,
    )


main()
