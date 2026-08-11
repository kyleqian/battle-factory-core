#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt for Gate-6 R2.

Run only through tools/run-mgba-probe.py. The two complete legal party cards
use the ordinary controller route: faster Dugtrio either begins Dig or uses
Growl, and four identical Articuno Hail slots constrain the opposing Factory
AI. No transient battle state is injected. The receipt samples every trace
frame but retains only weather/volatile/HP boundaries, displayed messages,
controller-idle transitions, and Random()-active frames.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(
        f"usage: {sys.argv[0]} <dig-fixture.json> <grounded-control-fixture.json> <output.json>"
    )

DIG_FIXTURE_PATH = Path(sys.argv[1])
CONTROL_FIXTURE_PATH = Path(sys.argv[2])
OUTPUT_PATH = Path(sys.argv[3])
WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PROFILE = "battle-scene-off"
SRANDCOUNT_ADDR = 0x020249C0
DISPLAYED_STRING_BYTES = 96
STATUS3_UNDERGROUND = 1 << 7
B_WEATHER_HAIL_TEMPORARY = 1 << 7


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


def fixture_label(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(WORKTREE_ROOT))
    except ValueError:
        return str(path)


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


def semantic_message(kind: str, message: str) -> bool:
    common = {
        "Foe ARTICUNO used\nHAIL!",
        "It started to hail!",
        "Hail continues to fall.",
        "DUGTRIO is pelted\nby HAIL!",
        "But it failed!",
    }
    if message in common:
        return True
    if kind == "dig":
        return message in {"DUGTRIO dug a hole!", "DUGTRIO used\nDIG!"}
    return message in {"DUGTRIO used\nGROWL!", "Foe ARTICUNO’s ATTACK\nfell!"}


def checkpoint_snapshot(frame: int, snapshot: dict) -> dict:
    return {
        "frame": frame,
        "rngValue": snapshot["rngValue"],
        "weather": snapshot["weather"],
        "weatherTurns": snapshot["weatherTurns"],
        "player": snapshot["player"],
        "currentMove": snapshot["currentMove"],
        "battleMoveDamage": snapshot["battleMoveDamage"],
        "framebufferSha256": snapshot["framebufferSha256"],
    }


def run_fixture(fixture_path: Path, expected_kind: str) -> dict:
    fixture = json.loads(fixture_path.read_text())
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
    parties = {
        "playerLead": party_identity(lab.snapshot()["parties"]["player"][0]),
        "opponentLead": party_identity(lab.snapshot()["parties"]["opponent"][0]),
    }

    def compact() -> dict:
        state = lab.snapshot()
        player = state["battlers"]["player"]
        engine = state["engine"]
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "rngValue": state["rngValue"],
            "weather": state["weather"],
            "weatherTurns": state["weatherTurns"],
            "player": {
                "hp": player["hp"],
                "maxHp": player["maxHp"],
                "pp": player["pp"],
                "status3": player["status3"],
                "underground": bool(player["status3"] & STATUS3_UNDERGROUND),
            },
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "chosenMoveByBattler": [
                oracle.read_u16(symbols["gChosenMoveByBattler"] + 2 * battler)
                for battler in range(2)
            ],
            "battleMoveDamage": oracle.read_u32(symbols["gBattleMoveDamage"]),
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
    message_events: list[dict] = []
    controller_events: list[dict] = []
    rng_ledger: list[dict] = []
    checkpoints: dict[str, dict] = {}

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
        if message and message != previous_message and semantic_message(expected_kind, message):
            message_events.append({"frame": frame, "text": message})
            controller_events.append({"frame": frame, "kind": "message-print", **after["controller"]})
        previous_message = message

        if expected_kind == "dig":
            if "undergroundEntry" not in checkpoints and after["player"]["underground"] and not before["player"]["underground"]:
                checkpoints["undergroundEntry"] = checkpoint_snapshot(frame, after)
            if "hailActivated" not in checkpoints and (after["weather"] & B_WEATHER_HAIL_TEMPORARY) and not (before["weather"] & B_WEATHER_HAIL_TEMPORARY):
                checkpoints["hailActivated"] = checkpoint_snapshot(frame, after)
            if (
                "undergroundWeatherPass" not in checkpoints
                and after["player"]["underground"]
                and before["weatherTurns"] == 5
                and after["weatherTurns"] == 4
            ):
                checkpoints["undergroundWeatherPass"] = checkpoint_snapshot(frame, after)
            if "surfaceExit" not in checkpoints and not after["player"]["underground"] and before["player"]["underground"]:
                checkpoints["surfaceExit"] = checkpoint_snapshot(frame, after)
            if (
                "surfaceWeatherPass" not in checkpoints
                and not after["player"]["underground"]
                and before["weatherTurns"] == 4
                and after["weatherTurns"] == 3
            ):
                checkpoints["surfaceWeatherPass"] = checkpoint_snapshot(frame, after)
            if (
                "surfaceChip" not in checkpoints
                and not after["player"]["underground"]
                and after["player"]["hp"] < before["player"]["hp"]
            ):
                checkpoints["surfaceChip"] = checkpoint_snapshot(frame, after)
        else:
            if "hailActivated" not in checkpoints and (after["weather"] & B_WEATHER_HAIL_TEMPORARY) and not (before["weather"] & B_WEATHER_HAIL_TEMPORARY):
                checkpoints["hailActivated"] = checkpoint_snapshot(frame, after)
            if (
                "firstWeatherPass" not in checkpoints
                and before["weatherTurns"] == 5
                and after["weatherTurns"] == 4
            ):
                checkpoints["firstWeatherPass"] = checkpoint_snapshot(frame, after)
            if "firstChip" not in checkpoints and after["player"]["hp"] < before["player"]["hp"]:
                checkpoints["firstChip"] = checkpoint_snapshot(frame, after)
            if (
                "secondWeatherPass" not in checkpoints
                and before["weatherTurns"] == 4
                and after["weatherTurns"] == 3
            ):
                checkpoints["secondWeatherPass"] = checkpoint_snapshot(frame, after)
            if (
                "secondChip" not in checkpoints
                and "firstChip" in checkpoints
                and frame > checkpoints["firstChip"]["frame"]
                and after["player"]["hp"] < before["player"]["hp"]
            ):
                checkpoints["secondChip"] = checkpoint_snapshot(frame, after)

        before = after
        random_before = random_after

    required = {
        "dig": {
            "undergroundEntry", "hailActivated", "undergroundWeatherPass", "surfaceExit",
            "surfaceWeatherPass", "surfaceChip",
        },
        "groundedControl": {
            "hailActivated", "firstWeatherPass", "firstChip", "secondWeatherPass", "secondChip",
        },
    }["dig" if expected_kind == "dig" else "groundedControl"]
    if set(checkpoints) != required:
        raise RuntimeError(
            f"{expected_kind} trace missed receipt checkpoints: {sorted(required - set(checkpoints))}"
        )

    return {
        "fixture": fixture_label(fixture_path),
        "seed": request["seed"],
        "parties": parties,
        "initial": initial,
        "messageEvents": message_events,
        "controllerEvents": controller_events,
        "rngLedger": rng_ledger,
        "checkpoints": checkpoints,
        "final": compact(),
    }


def main() -> None:
    dig = run_fixture(DIG_FIXTURE_PATH, "dig")
    grounded_control = run_fixture(CONTROL_FIXTURE_PATH, "groundedControl")
    result = {
        "schema": "gate6-r2-off-semantic-receipt/v1",
        "cardId": "R2",
        "oracleProfile": PROFILE,
        "sampledEveryTraceFrame": True,
        "scenarios": {
            "dig": dig,
            "groundedControl": grounded_control,
        },
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: "
        f"{len(dig['checkpoints']) + len(grounded_control['checkpoints'])} checkpoints, "
        f"{sum(row['randomCalls'] for row in dig['rngLedger']) + sum(row['randomCalls'] for row in grounded_control['rngLedger'])} Random() calls",
        flush=True,
    )


main()
