#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt probe for Gate-6 WATER VEIL.

Run only through tools/run-mgba-probe.py.  The fixture stages complete legal
three-mon parties: Ninetales (single-ability Flash Fire, set 430) commits
WILL-O-WISP into a Wailord (set 429) whose abilitySlot selects Water Veil
(slot 0, prevention arm) or Oblivious (slot 1, control arm).  The probe
samples every controller frame and retains the status, message, script and
Random() boundaries.  It never stages transient state.

Source: data/battle_scripts_1.s BattleScript_EffectWillOWisp jumps to
BattleScript_WaterVeilPrevents *before* accuracycheck, so the prevention arm
must draw zero Random() calls for the move.
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
DISPLAYED_STRING_BYTES = 128


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
    water_veil_script = symbols["BattleScript_WaterVeilPrevents"]
    brn_prevention_script = symbols["BattleScript_BRNPrevention"]

    def compact() -> dict:
        state = lab.snapshot()
        player = state["battlers"]["player"]
        opponent = state["battlers"]["opponent"]
        battle_resources = oracle.read_u32(symbols["gBattleResources"])
        battle_history = oracle.read_u32(battle_resources + 24)
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
                "hp": player["hp"],
                "maxHp": player["maxHp"],
                "status1": player["status1"],
                "pp": player["pp"],
            },
            "opponent": {
                "partyIndex": opponent["partyIndex"],
                "species": opponent["species"],
                "ability": opponent["ability"],
                "hp": opponent["hp"],
                "maxHp": opponent["maxHp"],
                "status1": opponent["status1"],
                "pp": opponent["pp"],
            },
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
            "abilityHistory": [oracle.read_u8(battle_history + 64 + i) for i in range(4)],
            "displayedString": decode_displayed(raw),
        }

    def script_symbol() -> str | None:
        address = oracle.read_u32(symbols["gBattlescriptCurrInstr"])
        if address == water_veil_script:
            return "BattleScript_WaterVeilPrevents"
        if address == brn_prevention_script:
            return "BattleScript_BRNPrevention"
        return None

    initial = compact()
    before = initial
    previous_message = initial["displayedString"]
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)
    total_random_calls = 0
    message_events: list[dict] = []
    rng_ledger: list[dict] = []
    scripts_visited: list[dict] = []
    checkpoints: dict[str, dict] = {}
    seen_scripts: set[str] = set()

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        random_calls = (random_after - random_before) & 0xFFFFFFFF
        total_random_calls += random_calls
        if random_calls:
            rng_ledger.append({
                "frame": frame,
                "randomCalls": random_calls,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
                "currentMove": after["currentMove"],
            })

        symbol = script_symbol()
        if symbol is not None and symbol not in seen_scripts:
            seen_scripts.add(symbol)
            scripts_visited.append({"frame": frame, "symbol": symbol})

        message = after["displayedString"]
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message})
        previous_message = message

        if (
            "willOWispSpent" not in checkpoints
            and before["player"]["pp"][0] == 15
            and after["player"]["pp"][0] == 14
        ):
            checkpoints["willOWispSpent"] = {"frame": frame, **after}
        if (
            "burnApplied" not in checkpoints
            and before["opponent"]["status1"] == 0
            and after["opponent"]["status1"] != 0
        ):
            checkpoints["burnApplied"] = {"frame": frame, **after}

        before = after
        random_before = random_after

    final = compact()
    if final["player"]["pp"][0] != 14:
        raise RuntimeError(f"WILL-O-WISP did not resolve exactly once: pp={final['player']['pp']}")

    result = {
        "schema": "gate6-water-veil-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "parties": {
            "willOWispNinetales": party_identity(parties["player"][0]),
            "targetWailord": party_identity(parties["opponent"][0]),
        },
        "scriptAddresses": {
            "BattleScript_WaterVeilPrevents": water_veil_script,
            "BattleScript_BRNPrevention": brn_prevention_script,
        },
        "initial": initial,
        "messageEvents": message_events,
        "scriptsVisited": scripts_visited,
        "rngLedger": rng_ledger,
        "totalRandomCalls": total_random_calls,
        "checkpoints": checkpoints,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: status1={final['opponent']['status1']} "
        f"randomCalls={total_random_calls} scripts={[s['symbol'] for s in scripts_visited]}",
        flush=True,
    )


if __name__ == "__main__":
    main()
