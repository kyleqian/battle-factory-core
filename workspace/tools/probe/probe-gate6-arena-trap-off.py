#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt probe for Gate-6 ARENA TRAP.

Run only through tools/run-mgba-probe.py.  The fixture stages complete legal
three-mon parties: an opponent DUGTRIO (set 372) whose abilitySlot 1 selects
ARENA TRAP faces a player lead that is either grounded (MARILL, set 28 --
trapped arm) or a LEVITATE carrier (WEEZING, set 597 -- control arm).  Both
arms replay the identical button script: POKeMON -> bench slot 1 -> SWITCH.

Source: src/battle_main.c HandleTurnActionSelectionState case B_ACTION_SWITCH
(4239-4256) tests ABILITY_ON_OPPOSING_FIELD(ARENA_TRAP) with the Flying-type /
ABILITY_LEVITATE exemption and, on a trap, emits ChoosePokemon with
PARTY_ACTION_ABILITY_PREVENTS instead of PARTY_ACTION_CHOOSE_MON.  The refusal
is therefore a *party-menu* refusal (src/party_menu.c:5839-5843 ->
SetMonPreventsSwitchingString, src/pokemon.c:6650-6666) written into
gStringVar4, not a battle script and not gNoEscapeStringIds /
STRINGID_PREVENTSESCAPE (that path is B_ACTION_RUN only, battle_main.c:4338-4346).
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
STRINGVAR_BYTES = 96


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
    party_menu = symbols["gPartyMenu"]
    party_indexes = symbols["gBattlerPartyIndexes"]

    def compact() -> dict:
        battle_string = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        menu_string = [
            oracle.read_u8(symbols["gStringVar4"] + offset)
            for offset in range(STRINGVAR_BYTES)
        ]
        return {
            "rngValue": oracle.read_u32(symbols["gRngValue"]),
            "playerPartyIndex": oracle.read_u8(party_indexes),
            "opponentPartyIndex": oracle.read_u8(party_indexes + 2),
            "playerHp": oracle.read_u16(symbols["gBattleMons"] + 0x28),
            "opponentHp": oracle.read_u16(symbols["gBattleMons"] + 0x58 + 0x28),
            "partyMenuAction": oracle.read_u8(party_menu + 11),
            "partyMenuSlotId": oracle.read_u8(party_menu + 9),
            "actionSelectionCursor": oracle.read_u8(symbols["gActionSelectionCursor"]),
            "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
            "battleMessage": decode_displayed(battle_string),
            "menuMessage": decode_displayed(menu_string),
        }

    initial = compact()
    before = initial
    previous_battle_message = initial["battleMessage"]
    previous_menu_message = initial["menuMessage"]
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)
    total_random_calls = 0
    battle_message_events: list[dict] = []
    menu_message_events: list[dict] = []
    rng_ledger: list[dict] = []
    party_menu_events: list[dict] = []
    party_index_events: list[dict] = []

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
                "playerPartyIndex": after["playerPartyIndex"],
            })

        if after["battleMessage"] and after["battleMessage"] != previous_battle_message:
            battle_message_events.append({"frame": frame, "text": after["battleMessage"]})
        previous_battle_message = after["battleMessage"]

        if after["menuMessage"] and after["menuMessage"] != previous_menu_message:
            menu_message_events.append({
                "frame": frame,
                "text": after["menuMessage"],
                "lastUsedAbility": after["lastUsedAbility"],
            })
        previous_menu_message = after["menuMessage"]

        if (after["partyMenuAction"], after["partyMenuSlotId"]) != (
            before["partyMenuAction"], before["partyMenuSlotId"]
        ):
            party_menu_events.append({
                "frame": frame,
                "action": after["partyMenuAction"],
                "slotId": after["partyMenuSlotId"],
            })

        if after["playerPartyIndex"] != before["playerPartyIndex"]:
            party_index_events.append({
                "frame": frame,
                "from": before["playerPartyIndex"],
                "to": after["playerPartyIndex"],
                "randomCallsSoFar": total_random_calls,
            })

        before = after
        random_before = random_after

    final = compact()

    result = {
        "schema": "gate6-arena-trap-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "parties": {
            "playerLead": party_identity(parties["player"][0]),
            "playerBench1": party_identity(parties["player"][1]),
            "trapperDugtrio": party_identity(parties["opponent"][0]),
        },
        "initial": initial,
        "battleMessageEvents": battle_message_events,
        "menuMessageEvents": menu_message_events,
        "partyMenuEvents": party_menu_events,
        "partyIndexEvents": party_index_events,
        "rngLedger": rng_ledger,
        "totalRandomCalls": total_random_calls,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: playerPartyIndex={final['playerPartyIndex']} "
        f"switches={party_index_events} randomCalls={total_random_calls}",
        flush=True,
    )


if __name__ == "__main__":
    main()
