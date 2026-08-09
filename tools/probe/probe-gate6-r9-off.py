#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt for Gate-6 R9.

Run only through tools/run-mgba-probe.py.  The fixture's complete legal
parties let Gengar use Swagger against Lum Berry Machamp, then perform a real
party-menu switch to White Herb Machamp for a second Swagger.  This probe
records just the item/volatile/stat-stage boundaries, complete battle strings,
and Random()-active frames; it never stages transient battle state.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <output.json>")

FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PROFILE = "battle-scene-off"
SRANDCOUNT_ADDR = 0x020249C0
DISPLAYED_STRING_BYTES = 96


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


def decode_displayed(raw: list[int]) -> str:
    chars: list[str] = []
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-",
        0xB4: "’", 0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    for value in raw:
        if value == 0xFF:
            break
        if value == 0xFE:
            chars.append("\\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        elif value in (0xFA, 0xFB):
            chars.append("\\n")
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
    request = validate_request(fixture, PROFILE)
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
    )
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    symbols = oracle.symbols

    def compact() -> dict:
        state = lab.snapshot()
        player = state["battlers"]["player"]
        opponent = state["battlers"]["opponent"]
        party = state["parties"]["player"][:3]
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "rngValue": state["rngValue"],
            "player": {
                "partyIndex": player["partyIndex"],
                "species": player["species"],
                "item": player["item"],
                "partyItems": [mon["item"] for mon in party],
                "attackStage": player["statStages"][1],
                "status2": player["status2"],
                "confusionTurns": player["volatile"]["confusionTurns"],
                "pp": player["pp"],
            },
            "opponent": {
                "species": opponent["species"],
                "item": opponent["item"],
                "pp": opponent["pp"],
            },
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "chosenMoveByBattler": [
                oracle.read_u16(symbols["gChosenMoveByBattler"] + 2 * battler)
                for battler in range(2)
            ],
            "displayedString": decode_displayed(raw),
            "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
        }

    initial = compact()
    random_frames = []
    message_events = []
    checkpoints: dict[str, dict] = {}
    before = initial
    previous_message = initial["displayedString"]
    rand_before = oracle.read_u32(SRANDCOUNT_ADDR)

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        random_calls = (rand_after - rand_before) & 0xFFFFFFFF
        if random_calls:
            random_frames.append({
                "frame": frame,
                "randomCalls": random_calls,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
                "currentMove": after["currentMove"],
                "chosenMoveByBattler": after["chosenMoveByBattler"],
            })
        message = after["displayedString"]
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message, "snapshot": after})
        previous_message = message

        player = after["player"]
        if (
            "lumBoostAndCure" not in checkpoints
            and player["partyIndex"] == 0
            and player["item"] == 141
            and player["partyItems"][:2] == [141, 180]
            and player["attackStage"] == 8
            and player["status2"] == 0
            and player["confusionTurns"] == 0
        ):
            checkpoints["lumBoostAndCure"] = {"frame": frame, **after}
        if (
            "lumConsumed" not in checkpoints
            and player["partyIndex"] == 0
            and player["item"] == 0
            and player["partyItems"][:2] == [0, 180]
            and player["attackStage"] == 8
            and player["status2"] == 0
            and player["confusionTurns"] == 0
        ):
            checkpoints["lumConsumed"] = {"frame": frame, **after}
        if (
            "whiteHerbSwitchIn" not in checkpoints
            and player["partyIndex"] == 1
            and player["item"] == 180
            and player["partyItems"][:2] == [0, 180]
            and player["attackStage"] == 6
            and player["status2"] == 0
            and player["confusionTurns"] == 0
        ):
            checkpoints["whiteHerbSwitchIn"] = {"frame": frame, **after}
        if (
            "whiteHerbBoost" not in checkpoints
            and player["partyIndex"] == 1
            and player["item"] == 180
            and player["partyItems"][:2] == [0, 180]
            and player["attackStage"] == 8
            and player["status2"] == 0
            and player["confusionTurns"] == 0
        ):
            checkpoints["whiteHerbBoost"] = {"frame": frame, **after}
        if (
            "whiteHerbConfusedAndHeld" not in checkpoints
            and player["partyIndex"] == 1
            and player["item"] == 180
            and player["partyItems"][:2] == [0, 180]
            and player["attackStage"] == 8
            and (player["status2"] & 2) != 0
            and player["confusionTurns"] > 0
        ):
            checkpoints["whiteHerbConfusedAndHeld"] = {"frame": frame, **after}
        before = after
        rand_before = rand_after

    relevant_message_texts = [
        "Foe GENGAR used\\nSWAGGER!",
        "MACHAMP’s ATTACK\\nsharply rose!",
        "MACHAMP became\\nconfused!",
        "MACHAMP’s LUM BERRY\\ncured its confusion problem!",
    ]
    relevant_messages = [
        {"frame": event["frame"], "text": event["text"]}
        for event in message_events
        if event["text"] in relevant_message_texts
    ]
    expected_message_texts = [
        relevant_message_texts[0],
        relevant_message_texts[1],
        relevant_message_texts[2],
        relevant_message_texts[3],
        relevant_message_texts[0],
        relevant_message_texts[1],
        relevant_message_texts[2],
    ]
    if [event["text"] for event in relevant_messages] != expected_message_texts:
        raise RuntimeError("R9 did not retain the expected Swagger/Lum/White-Herb message order")

    lum_message = next(event for event in message_events if event["text"] == relevant_message_texts[3])
    lum_snapshot = lum_message["snapshot"]
    if lum_snapshot["player"]["item"] != 141 or lum_snapshot["player"]["partyItems"][:2] != [141, 180]:
        raise RuntimeError("Lum cure message did not precede the shared item removal")
    checkpoints["lumCureMessageBeforeConsumption"] = {"frame": lum_message["frame"], **lum_snapshot}

    white_confusion_message = [
        event for event in message_events if event["text"] == relevant_message_texts[2]
    ][-1]
    white_snapshot = white_confusion_message["snapshot"]
    if (
        white_snapshot["player"]["item"] != 180
        or white_snapshot["player"]["partyItems"][:2] != [0, 180]
        or white_snapshot["player"]["attackStage"] != 8
        or (white_snapshot["player"]["status2"] & 2) == 0
    ):
        raise RuntimeError("White Herb did not remain held through Swagger confusion")
    checkpoints["whiteHerbConfusionMessageAndHeld"] = {"frame": white_confusion_message["frame"], **white_snapshot}

    required = {
        "lumBoostAndCure",
        "lumConsumed",
        "whiteHerbSwitchIn",
        "whiteHerbBoost",
        "whiteHerbConfusedAndHeld",
        "lumCureMessageBeforeConsumption",
        "whiteHerbConfusionMessageAndHeld",
    }
    if set(checkpoints) != required:
        raise RuntimeError(f"R9 trace missed required checkpoints: {sorted(required - set(checkpoints))}")

    result = {
        "schema": "gate6-r9-off-semantic-receipt/v1",
        "cardId": "R9",
        "fixture": "tools/battle-lab/gate6-r9-off.json",
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "initial": initial,
        "randomFrames": random_frames,
        "messageEvents": relevant_messages,
        "checkpoints": checkpoints,
        "final": compact(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: {len(checkpoints)} checkpoints, "
        f"{len(message_events)} message events, "
        f"{sum(row['randomCalls'] for row in random_frames)} Random() calls",
        flush=True,
    )


main()
