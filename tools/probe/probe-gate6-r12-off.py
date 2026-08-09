#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt probe for Gate-6 R12.

Run only through tools/run-mgba-probe.py.  The fixture uses complete legal
three-mon parties: White Herb Pinsir (its only ability is Hyper Cutter) takes
an ordinary opponent replacement to Granbull/Intimidate after its first move.
The probe samples every controller frame and retains the entry, prevention,
item, message, and Random() boundaries.  It never stages transient state.
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


def party_identity(mon: dict) -> dict:
    return {
        "species": mon["species"],
        "item": mon["item"],
        "abilitySlot": mon["abilitySlot"],
        "ability": mon["ability"],
        "moves": mon["moves"],
    }


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
    parties = lab.snapshot()["parties"]

    def compact() -> dict:
        state = lab.snapshot()
        player = state["battlers"]["player"]
        opponent = state["battlers"]["opponent"]
        engine = state["engine"]
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "rngValue": state["rngValue"],
            "player": {
                "partyIndex": player["partyIndex"],
                "species": player["species"],
                "ability": player["ability"],
                "item": player["item"],
                "partyItems": [mon["item"] for mon in state["parties"]["player"][:3]],
                "attackStage": player["statStages"][1],
                "hp": player["hp"],
                "maxHp": player["maxHp"],
                "status1": player["status1"],
                "status2": player["status2"],
                "status3": player["status3"],
                "pp": player["pp"],
            },
            "opponent": {
                "partyIndex": opponent["partyIndex"],
                "species": opponent["species"],
                "ability": opponent["ability"],
                "item": opponent["item"],
                "hp": opponent["hp"],
                "maxHp": opponent["maxHp"],
                "status1": opponent["status1"],
                "status2": opponent["status2"],
                "status3": opponent["status3"],
                "pp": opponent["pp"],
            },
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "chosenMoveByBattler": [
                oracle.read_u16(symbols["gChosenMoveByBattler"] + 2 * battler)
                for battler in range(2)
            ],
            "displayedString": decode_displayed(raw),
            "controller": {
                "activeBattler": engine["activeBattler"],
                "execFlags": engine["controllerExecFlags"],
                "playerCommand": engine["playerControllerCommand"],
                "opponentCommand": engine["opponentControllerCommand"],
            },
            "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
        }

    initial = compact()
    before = initial
    previous_message = initial["displayedString"]
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)
    all_message_events: list[dict] = []
    rng_ledger: list[dict] = []
    checkpoints: dict[str, dict] = {}
    attack_stages: set[int] = {initial["player"]["attackStage"]}
    item_pairs: set[tuple[int, tuple[int, ...]]] = {
        (initial["player"]["item"], tuple(initial["player"]["partyItems"]))
    }

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        random_calls = (random_after - random_before) & 0xFFFFFFFF
        if random_calls:
            rng_ledger.append({
                "frame": frame,
                "randomCalls": random_calls,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
                "currentMove": after["currentMove"],
                "chosenMoveByBattler": after["chosenMoveByBattler"],
            })

        message = after["displayedString"]
        if message and message != previous_message:
            event = {"frame": frame, "text": message, "snapshot": after}
            all_message_events.append(event)
        previous_message = message

        attack_stages.add(after["player"]["attackStage"])
        item_pairs.add((after["player"]["item"], tuple(after["player"]["partyItems"])))

        if (
            "leadFainted" not in checkpoints
            and before["opponent"]["partyIndex"] == 0
            and before["opponent"]["hp"] > 0
            and after["opponent"]["partyIndex"] == 0
            and after["opponent"]["hp"] == 0
        ):
            checkpoints["leadFainted"] = {"frame": frame, **after}
        if (
            "granbullPartyIndexSelected" not in checkpoints
            and before["opponent"]["partyIndex"] != 1
            and after["opponent"]["partyIndex"] == 1
        ):
            checkpoints["granbullPartyIndexSelected"] = {"frame": frame, **after}
        if (
            "granbullEntryDataLoaded" not in checkpoints
            and after["opponent"]["partyIndex"] == 1
            and after["opponent"]["species"] == 210
            and after["opponent"]["ability"] == 22
            and (before["opponent"]["species"], before["opponent"]["ability"]) != (210, 22)
        ):
            checkpoints["granbullEntryDataLoaded"] = {"frame": frame, **after}

        if "granbullEntryDataLoaded" in checkpoints and "granbullIntimidatePrevention" not in checkpoints:
            switch_frame = checkpoints["granbullEntryDataLoaded"]["frame"]
            if frame >= switch_frame and "HYPER CUTTER" in message:
                checkpoints["granbullIntimidatePrevention"] = {"frame": frame, **after}

        if (
            "postEntrySettled" not in checkpoints
            and "granbullIntimidatePrevention" in checkpoints
            and after["opponent"]["partyIndex"] == 1
            and after["player"]["item"] == 180
            and after["player"]["partyItems"] == [180, 0, 0]
            and after["player"]["attackStage"] == 6
            and after["controller"]["execFlags"] == 0
            and frame > checkpoints["granbullIntimidatePrevention"]["frame"]
        ):
            checkpoints["postEntrySettled"] = {"frame": frame, **after}

        before = after
        random_before = random_after

    if attack_stages != {6}:
        raise RuntimeError(f"Hyper Cutter control changed Pinsir Attack stage: {sorted(attack_stages)}")
    if item_pairs != {(180, (180, 0, 0))}:
        raise RuntimeError(f"White Herb control changed held item ownership: {sorted(item_pairs)}")
    required = {
        "leadFainted",
        "granbullPartyIndexSelected",
        "granbullEntryDataLoaded",
        "granbullIntimidatePrevention",
        "postEntrySettled",
    }
    if set(checkpoints) != required:
        raise RuntimeError(f"R12 trace missed required checkpoints: {sorted(required - set(checkpoints))}")

    prevention_messages = [
        {"frame": event["frame"], "text": event["text"]}
        for event in all_message_events
        if "HYPER CUTTER" in event["text"] or "WHITE HERB" in event["text"]
    ]
    expected_prevention = "PINSIR’s HYPER CUTTER\nprevented Foe GRANBULL’s\nINTIMIDATE from working!"
    if len(prevention_messages) != 1 or prevention_messages[0]["text"] != expected_prevention:
        raise RuntimeError("R12 did not expose the exact Granbull/Hyper Cutter prevention message")

    relevant_texts = {
        "PINSIR used\nAERIAL ACE!",
        "Foe SHEDINJA\nfainted!\n",
        "BLACK BELT SHIZUKA sent\nout GRANBULL!",
        expected_prevention,
    }
    relevant_messages = [
        {"frame": event["frame"], "text": event["text"]}
        for event in all_message_events
        if event["text"] in relevant_texts
    ]
    expected_message_texts = [
        "PINSIR used\nAERIAL ACE!",
        "Foe SHEDINJA\nfainted!\n",
        "BLACK BELT SHIZUKA sent\nout GRANBULL!",
        expected_prevention,
    ]
    if [event["text"] for event in relevant_messages] != expected_message_texts:
        raise RuntimeError("R12 did not retain the expected move/faint/send-out/prevention message order")

    controller_events = [
        {
            "frame": checkpoints["granbullPartyIndexSelected"]["frame"],
            "kind": "party-index-selected-before-battle-data-copy",
            **checkpoints["granbullPartyIndexSelected"]["controller"],
        },
        {
            "frame": checkpoints["granbullEntryDataLoaded"]["frame"],
            "kind": "incoming-granbull-battle-data-loaded",
            **checkpoints["granbullEntryDataLoaded"]["controller"],
        },
        {
            "frame": checkpoints["granbullIntimidatePrevention"]["frame"],
            "kind": "intimidate-prevention-message",
            **checkpoints["granbullIntimidatePrevention"]["controller"],
        },
        {
            "frame": checkpoints["postEntrySettled"]["frame"],
            "kind": "post-entry-controller-idle",
            **checkpoints["postEntrySettled"]["controller"],
        },
    ]

    result = {
        "schema": "gate6-r12-off-semantic-receipt/v1",
        "cardId": "R12",
        "fixture": "tools/battle-lab/gate6-r12-off.json",
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "parties": {
            "whiteHerbPinsir": party_identity(parties["player"][0]),
            "leadOpponent": party_identity(parties["opponent"][0]),
            "switchInGranbull": party_identity(parties["opponent"][1]),
        },
        "initial": initial,
        "messageEvents": relevant_messages,
        "controllerEvents": controller_events,
        "rngLedger": rng_ledger,
        "checkpoints": checkpoints,
        "final": compact(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: {len(checkpoints)} checkpoints, "
        f"{len(prevention_messages)} prevention messages, "
        f"{sum(row['randomCalls'] for row in rng_ledger)} Random() calls",
        flush=True,
    )


if __name__ == "__main__":
    main()
