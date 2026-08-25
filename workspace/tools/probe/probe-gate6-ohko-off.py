#!/usr/bin/env python3
"""Compact, read-only Battle Scene OFF receipt probe for Gate-6 OHKO (FISSURE).

Run only through tools/run-mgba-probe.py.  The fixture stages complete legal
three-mon parties: a player DUGTRIO (set 564, all four slots FISSURE, keeping
its KING'S ROCK) commits FISSURE into a grounded, slower opponent -- METAPOD
(set 8, HARDEN, Shed Skin) for the hit/miss arms, FORRETRESS (set 575, ZAP
CANNON, STURDY) for the refusal arm.

Source: data/battle_scripts_1.s:762-776 BattleScript_EffectOHKO --
accuracycheck runs with NO_ACC_CALC_CHECK_LOCK_ON (so it draws nothing), and
the real accuracy lives in `tryKO BattleScript_KOFail`.
src/battle_script_commands.c:7490-7573 Cmd_tryKO: the target's Focus Band
`(Random() % 100) < param` is short-circuited behind holdEffect, then
ABILITY_STURDY jumps to BattleScript_SturdyPreventsOHKO *before* any accuracy
draw, and only the non-Sturdy branch draws `Random() % 100 + 1 < accuracy +
attackerLevel - targetLevel`.  King's Rock's own `Random() % 100` in
src/battle_util.c:3769-3779 sits behind `if (gBattleMoveDamage)` and
TARGET_TURN_DAMAGED, so it costs a draw on a hit and nothing on a miss or a
Sturdy refusal (FISSURE is not FLAG_KINGS_ROCK_AFFECTED, so it never flinches).
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
FISSURE = 90


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
    script_addresses = {
        name: symbols[name]
        for name in ("BattleScript_SturdyPreventsOHKO", "BattleScript_KOFail")
        if name in symbols
    }
    script_by_address = {address: name for name, address in script_addresses.items()}

    def compact() -> dict:
        state = lab.snapshot()
        player = state["battlers"]["player"]
        opponent = state["battlers"]["opponent"]
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "rngValue": state["rngValue"],
            "playerHp": player["hp"],
            "playerMaxHp": player["maxHp"],
            "playerPartyIndex": player["partyIndex"],
            "playerPp": player["pp"],
            "opponentHp": opponent["hp"],
            "opponentMaxHp": opponent["maxHp"],
            "opponentPartyIndex": opponent["partyIndex"],
            "opponentAbility": opponent["ability"],
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "moveResultFlags": oracle.read_u8(symbols["gMoveResultFlags"]),
            "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
            "displayedString": decode_displayed(raw),
        }

    initial = compact()
    before = initial
    previous_message = initial["displayedString"]
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)
    total_random_calls = 0
    fissure_random_calls = 0
    message_events: list[dict] = []
    rng_ledger: list[dict] = []
    scripts_visited: list[dict] = []
    seen_scripts: set[str] = set()
    hp_events: list[dict] = []

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        random_calls = (random_after - random_before) & 0xFFFFFFFF
        total_random_calls += random_calls
        if random_calls:
            if after["currentMove"] == FISSURE:
                fissure_random_calls += random_calls
            rng_ledger.append({
                "frame": frame,
                "randomCalls": random_calls,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
                "currentMove": after["currentMove"],
                "opponentHp": after["opponentHp"],
            })

        address = oracle.read_u32(symbols["gBattlescriptCurrInstr"])
        symbol = script_by_address.get(address)
        if symbol is not None and symbol not in seen_scripts:
            seen_scripts.add(symbol)
            scripts_visited.append({
                "frame": frame,
                "symbol": symbol,
                "lastUsedAbility": after["lastUsedAbility"],
                "moveResultFlags": after["moveResultFlags"],
                "opponentHp": after["opponentHp"],
                "fissureRandomCallsSoFar": fissure_random_calls,
            })

        message = after["displayedString"]
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message})
        previous_message = message

        if after["opponentHp"] != before["opponentHp"]:
            hp_events.append({
                "frame": frame,
                "from": before["opponentHp"],
                "to": after["opponentHp"],
                "fissureRandomCallsSoFar": fissure_random_calls,
                "moveResultFlags": after["moveResultFlags"],
            })

        before = after
        random_before = random_after

    final = compact()
    if final["playerPp"][0] == initial["playerPp"][0]:
        raise RuntimeError(f"FISSURE never resolved: pp={final['playerPp']}")

    result = {
        "schema": "gate6-ohko-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "parties": {
            "fissureDugtrio": party_identity(parties["player"][0]),
            "target": party_identity(parties["opponent"][0]),
        },
        "scriptAddresses": script_addresses,
        "initial": initial,
        "messageEvents": message_events,
        "scriptsVisited": scripts_visited,
        "opponentHpEvents": hp_events,
        "rngLedger": rng_ledger,
        "totalRandomCalls": total_random_calls,
        "fissureRandomCalls": fissure_random_calls,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: opponentHp={initial['opponentHp']}->{final['opponentHp']} "
        f"fissureDraws={fissure_random_calls} total={total_random_calls} "
        f"scripts={[s['symbol'] for s in scripts_visited]}",
        flush=True,
    )


if __name__ == "__main__":
    main()
