#!/usr/bin/env python3
"""Dense read-only Battle Scene OFF receipts for Gate-6 R7/R8 fixtures."""

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


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text())
    fixture["seed"] = SEED
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
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "rngValue": state["rngValue"],
            "battleStatus1": {
                "player": state["battlers"]["player"]["status1"],
                "opponent": state["battlers"]["opponent"]["status1"],
            },
            "partyStatus1": {
                "player": [mon["status1"] for mon in state["parties"]["player"][:3]],
                "opponent": [mon["status1"] for mon in state["parties"]["opponent"][:3]],
            },
            "hp": {
                "player": state["battlers"]["player"]["hp"],
                "opponent": state["battlers"]["opponent"]["hp"],
            },
            "maxHp": {
                "player": state["battlers"]["player"]["maxHp"],
                "opponent": state["battlers"]["opponent"]["maxHp"],
            },
            "stats": {
                "player": state["battlers"]["player"]["stats"],
                "opponent": state["battlers"]["opponent"]["stats"],
            },
            "ability": {
                "player": state["battlers"]["player"]["ability"],
                "opponent": state["battlers"]["opponent"]["ability"],
            },
            "pp": {
                "player": state["battlers"]["player"]["pp"],
                "opponent": state["battlers"]["opponent"]["pp"],
            },
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "chosenMoveByBattler": [
                oracle.read_u16(symbols["gChosenMoveByBattler"] + 2 * battler)
                for battler in range(2)
            ],
            "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
            "displayedString": decode_displayed(raw),
            "sha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
        }

    initial = compact()
    frames = []
    random_frames = []
    before = initial
    rand_before = oracle.read_u32(SRANDCOUNT_ADDR)
    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        frames.append({"frame": frame, **after})
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        delta = (rand_after - rand_before) & 0xFFFFFFFF
        if delta:
            random_frames.append({
                "frame": frame,
                "randomCalls": delta,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
                "returnedU16": after["rngValue"] >> 16,
                "currentMove": after["currentMove"],
                "chosenMoveByBattler": after["chosenMoveByBattler"],
            })
        before = after
        rand_before = rand_after

    result = {
        "fixture": str(FIXTURE_PATH),
        "profile": PROFILE,
        "seed": SEED,
        "sampledEveryTraceFrame": True,
        "initial": initial,
        "randomFrames": random_frames,
        "frames": frames,
        "final": compact(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: {len(frames)} dense frames, "
        f"{sum(row['randomCalls'] for row in random_frames)} Random() calls",
        flush=True,
    )


main()
