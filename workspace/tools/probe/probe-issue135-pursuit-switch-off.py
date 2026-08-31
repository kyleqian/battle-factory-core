#!/usr/bin/env python3
"""Read-only Battle Scene OFF receipt probe for ISSUES #135 (Pursuit x2).

Run only through tools/run-mgba-probe.py.

Source under test: `data/battle_scripts_1.s:3088-3094` `BattleScript_ActionSwitch`
executes `setbyte sDMG_MULTIPLIER, 2` BEFORE falling into
`BattleScript_PursuitSwitchDmgLoop`; `jumpifnopursuitswitchdmg` then calls
`BattleScript_PursuitDmgOnSwitchOut` (`:3123-3148`), whose `damagecalc`
multiplies by it (`src/battle_script_commands.c:1296`
`gBattleMoveDamage = gBattleMoveDamage * gCritMultiplier * gBattleScripting.dmgMultiplier`)
and whose `adjustnormaldamage` then applies the 85-100% roll
(`ApplyRandomDmgMultiplier`, `:1638-1650`, one `Random()`).

`gBattleScripting.dmgMultiplier` byte offset, derived from
`include/battle.h:489-518` `struct BattleScripting`:
    s32 painSplitHp        @ 0
    s32 bideDmg            @ 4
    u8  multihitString[6]  @ 8..13
    u8  dmgMultiplier      @ 14   <-- watched
    u8  twoTurnsMoveStringId @ 15
    u8  animArg1 @ 16, animArg2 @ 17
    u16 tripleKickPower    @ 18
    u8  moveendState       @ 20   (cross-check: ISSUES #129's probe used +20)

The probe samples every controller trace frame and records transitions of
gBattleScripting.dmgMultiplier, gCritMultiplier, gBattleMoveDamage,
gMoveResultFlags, gMultiHitCounter, both gBattleMons hp values, all three
gPlayerParty hp values, the resolved gBattlescriptCurrInstr label, and the
per-frame sRandCount delta.

It never stages transient battle state: parties are complete legal records
and every effect is produced by real controller input.
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
DMG_MULTIPLIER_OFFSET = 14  # struct BattleScripting, derived above
BATTLE_MON_SIZE = 0x58
POKEMON_SIZE = 100
PARTY_HP_OFFSET = 86
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
        "hp": mon["hp"],
        "maxHp": mon["maxHp"],
        "stats": mon["stats"],
    }


def to_s32(value: int) -> int:
    return value - 0x100000000 if value >= 0x80000000 else value


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
    parties_before = lab.snapshot()["parties"]

    # Sorted BattleScript_* label table so gBattlescriptCurrInstr resolves to
    # "<label>+<offset>" instead of a bare ROM address.
    script_labels = sorted(
        (address, name)
        for name, address in symbols.items()
        if name.startswith("BattleScript") or name.startswith("gBattleScriptsForMoveEffects")
    )

    def resolve_script(address: int) -> str:
        low, high = 0, len(script_labels)
        while low < high:
            mid = (low + high) // 2
            if script_labels[mid][0] <= address:
                low = mid + 1
            else:
                high = mid
        if low == 0:
            return f"0x{address:08X}"
        base, name = script_labels[low - 1]
        delta = address - base
        if delta > 0x400:
            return f"0x{address:08X}"
        return name if delta == 0 else f"{name}+{delta}"

    scripting = symbols["gBattleScripting"]
    battle_mons = symbols["gBattleMons"]
    player_party = symbols["gPlayerParty"]

    def watch() -> dict:
        return {
            "dmgMultiplier": oracle.read_u8(scripting + DMG_MULTIPLIER_OFFSET),
            "critMultiplier": oracle.read_u8(symbols["gCritMultiplier"]),
            "battleMoveDamage": to_s32(oracle.read_u32(symbols["gBattleMoveDamage"])),
            "moveResultFlags": oracle.read_u8(symbols["gMoveResultFlags"]),
            "multiHitCounter": oracle.read_u8(symbols["gMultiHitCounter"]),
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "attacker": oracle.read_u8(symbols["gBattlerAttacker"]),
            "target": oracle.read_u8(symbols["gBattlerTarget"]),
            "activeHp": [
                oracle.read_u16(battle_mons + battler * BATTLE_MON_SIZE + 0x28)
                for battler in range(2)
            ],
            "activePartyIndexes": [
                oracle.read_u8(symbols["gBattlerPartyIndexes"] + battler * 2)
                for battler in range(2)
            ],
            "playerPartyHp": [
                oracle.read_u16(player_party + index * POKEMON_SIZE + PARTY_HP_OFFSET)
                for index in range(3)
            ],
            "script": resolve_script(oracle.read_u32(symbols["gBattlescriptCurrInstr"])),
        }

    def read_message() -> str:
        return decode_displayed([
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ])

    initial = watch()
    previous = initial
    previous_message = read_message()
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)

    transitions: list[dict] = []
    message_events: list[dict] = []
    random_events: list[dict] = []
    total_random_calls = 0

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        random_calls = (random_after - random_before) & 0xFFFFFFFF
        random_before = random_after
        total_random_calls += random_calls

        now = watch()
        if random_calls:
            random_events.append({
                "frame": frame,
                "calls": random_calls,
                "script": now["script"],
                "dmgMultiplier": now["dmgMultiplier"],
                "battleMoveDamage": now["battleMoveDamage"],
            })
        changed = {key: [previous[key], now[key]] for key in now if now[key] != previous[key]}
        if changed:
            transitions.append({"frame": frame, "changed": changed, "state": now})
            previous = now

        message = read_message()
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message})
        previous_message = message

    final_snapshot = lab.snapshot()
    result = {
        "schema": "issue135-pursuit-switch-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "dmgMultiplierOffset": DMG_MULTIPLIER_OFFSET,
        "symbols": {
            "gBattleScripting": scripting,
            "gCritMultiplier": symbols["gCritMultiplier"],
            "gBattleMoveDamage": symbols["gBattleMoveDamage"],
            "gBattlescriptCurrInstr": symbols["gBattlescriptCurrInstr"],
            "gPlayerParty": player_party,
        },
        "parties": {
            side: [party_identity(mon) for mon in parties_before[side]]
            for side in ("player", "opponent")
        },
        "initial": initial,
        "transitions": transitions,
        "randomEvents": random_events,
        "messageEvents": message_events,
        "totalRandomCalls": total_random_calls,
        "final": {
            "watch": watch(),
            "playerParty": [
                {"species": mon["species"], "hp": mon["hp"], "maxHp": mon["maxHp"]}
                for mon in final_snapshot["parties"]["player"]
            ],
            "opponentParty": [
                {"species": mon["species"], "hp": mon["hp"], "maxHp": mon["maxHp"]}
                for mon in final_snapshot["parties"]["opponent"]
            ],
            "battleOutcome": final_snapshot["battleOutcome"],
        },
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: transitions={len(transitions)} "
        f"randomEvents={len(random_events)} totalRandom={total_random_calls}",
        flush=True,
    )


if __name__ == "__main__":
    main()
