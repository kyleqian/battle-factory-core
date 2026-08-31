#!/usr/bin/env python3
"""Read-only Battle Scene OFF receipt probe for ISSUES #138 (Encore vs
`AreAllMovesUnusable` ordering in action selection).

Run only through tools/run-mgba-probe.py.

Source under test: `battle_main.c:4183-4197` `HandleTurnActionSelectionState`
case `B_ACTION_USE_MOVE` runs `AreAllMovesUnusable()` (`battle_util.c:1125-1140`
-> `CheckMoveLimitations(b, 0, MOVE_LIMITATIONS_ALL)`, whose Encore bit at
`:1116-1117` masks every slot that is not the encored move) FIRST, and only
then `else if (gDisableStructs[battler].encoredMove != 0)` auto-confirms the
encored move.  An Encored battler whose encored move is itself unusable
(Disabled here) therefore masks all four slots -> `noValidMoves` ->
`BattleScript_NoMovesLeft` ("<mon> has no moves left!",
STRINGID_PKMNHASNOMOVESLEFT = 168) at selection, and `HandleAction_UseMove`
(`battle_util.c:100-106`) turns the action into MOVE_STRUGGLE with
`HITMARKER_NO_PPDEDUCT` (bit 11).

Fixture (`tools/battle-lab/issue138-encore-disable-{struggle,control}-off.json`):
player slot 0 DEWGONG (rental set BLIZZARD/DOUBLE_EDGE/ENCORE/DISABLE, Speed
IV/EV 0 so it moves second), opponent slot 0 JOLTEON (single ability, base
Speed 130) with TACKLE in all four slots so the Factory AI has exactly one
legal move.  Struggle arm: turn 1 ENCORE (-> encoredMove = TACKLE), turn 2
DISABLE (-> disabledMove = TACKLE), turn 3 the opponent's mask is 0x0f.
Control arm: turn 2 re-uses ENCORE (fails, leaves disabledMove clear) so the
opponent uses TACKLE normally on turn 3.

The probe samples every controller trace frame and records disable-struct,
`gProtectStructs[].noValidMoves`, `gChosenMoveByBattler`, `gCurrentMove`,
`gHitMarker & HITMARKER_NO_PPDEDUCT`, HP, PP and message transitions, each
attributed to a turn index derived from `gBattleMainFunc == BattleTurnPassed`
rising edges, plus `sRandCount` deltas per turn.

It never stages transient battle state: parties are complete legal records and
every effect is produced by real moves.
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
BATTLE_MON_SIZE = 0x58
DISABLE_STRUCT_SIZE = 0x1C
PROTECT_STRUCT_SIZE = 0x10
HITMARKER_NO_PPDEDUCT = 1 << 11
STRINGID_PKMNHASNOMOVESLEFT = 168
MOVE_STRUGGLE = 165
WATCHED_SCRIPTS = (
    "BattleScript_NoMovesLeft",
    "BattleScript_SelectingDisabledMove",
    "BattleScript_SelectingDisabledMoveInPalace",
    "BattleScript_MoveUsedIsDisabled",
    "BattleScript_DoRecoil",
    "BattleScript_SelectingMoveWithNoPP",
)


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

    disable_addr = symbols["gDisableStructs"]
    protect_addr = symbols["gProtectStructs"]
    battle_mons_addr = symbols["gBattleMons"]
    chosen_move_addr = symbols["gChosenMoveByBattler"]
    current_move_addr = symbols["gCurrentMove"]
    hitmarker_addr = symbols["gHitMarker"]
    main_func_addr = symbols["gBattleMainFunc"]
    script_instr_addr = symbols["gBattlescriptCurrInstr"]
    battle_turn_passed = symbols["BattleTurnPassed"] | 1  # Thumb pointer

    watched = {symbols[name]: name for name in WATCHED_SCRIPTS if name in symbols}
    script_bases = sorted(
        (address, name)
        for name, address in symbols.items()
        if name.startswith("BattleScript_")
    )

    def resolve_script(address: int) -> str | None:
        if address == 0:
            return None
        low, high = 0, len(script_bases)
        while low < high:
            mid = (low + high) // 2
            if script_bases[mid][0] <= address:
                low = mid + 1
            else:
                high = mid
        if low == 0:
            return None
        base, name = script_bases[low - 1]
        delta = address - base
        if delta > 0x400:
            return None
        return name if delta == 0 else f"{name}+{delta}"

    def disable_struct(battler: int) -> dict:
        base = disable_addr + battler * DISABLE_STRUCT_SIZE
        return {
            "disabledMove": oracle.read_u16(base + 0x04),
            "encoredMove": oracle.read_u16(base + 0x06),
            "disableTimer": oracle.read_u8(base + 0x0B) & 0xF,
            "encoredMovePos": oracle.read_u8(base + 0x0C),
            "encoreTimer": oracle.read_u8(base + 0x0E) & 0xF,
            "tauntTimer": oracle.read_u8(base + 0x13) & 0xF,
        }

    def no_valid_moves(battler: int) -> int:
        flags = oracle.read_u32(protect_addr + battler * PROTECT_STRUCT_SIZE)
        return (flags >> 2) & 1

    def mon_hp(battler: int) -> int:
        return oracle.read_u16(battle_mons_addr + battler * BATTLE_MON_SIZE + 0x28)

    def mon_pp(battler: int) -> list[int]:
        base = battle_mons_addr + battler * BATTLE_MON_SIZE + 0x24
        return [oracle.read_u8(base + i) for i in range(4)]

    def chosen_moves() -> list[int]:
        return [oracle.read_u16(chosen_move_addr + i * 2) for i in range(2)]

    def read_message() -> str:
        return decode_displayed([
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ])

    def actives() -> dict:
        state = lab.snapshot()["battlers"]
        return {
            side: {
                "partyIndex": state[side]["partyIndex"],
                "species": state[side]["species"],
                "speed": state[side]["stats"]["speed"],
                "hp": state[side]["hp"],
                "maxHp": state[side]["maxHp"],
                "pp": state[side]["pp"],
                "moves": state[side]["moves"],
                "status1": state[side]["status1"],
                "status2": state[side]["status2"],
            }
            for side in ("player", "opponent")
        }

    initial = {
        "actives": actives(),
        "disableStructs": [disable_struct(0), disable_struct(1)],
        "noValidMoves": [no_valid_moves(0), no_valid_moves(1)],
    }

    previous = {
        "disable": [disable_struct(0), disable_struct(1)],
        "noValidMoves": [no_valid_moves(0), no_valid_moves(1)],
        "chosenMoves": chosen_moves(),
        "currentMove": oracle.read_u16(current_move_addr),
        "hp": [mon_hp(0), mon_hp(1)],
        "pp": [mon_pp(0), mon_pp(1)],
        "ppDeductSuppressed": (oracle.read_u32(hitmarker_addr) & HITMARKER_NO_PPDEDUCT) != 0,
        "message": read_message(),
        "inTurnPassed": oracle.read_u32(main_func_addr) == battle_turn_passed,
    }

    disable_events: list[dict] = []
    no_valid_moves_events: list[dict] = []
    chosen_move_events: list[dict] = []
    current_move_events: list[dict] = []
    ppdeduct_events: list[dict] = []
    hp_events: list[dict] = []
    pp_events: list[dict] = []
    message_events: list[dict] = []
    script_events: list[dict] = []
    seen_scripts: set[str] = set()
    random_per_turn: dict[int, int] = {}
    total_random_calls = 0
    random_before = oracle.read_u32(SRANDCOUNT_ADDR)
    turn = 1

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)

        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        random_calls = (random_after - random_before) & 0xFFFFFFFF
        random_before = random_after
        total_random_calls += random_calls
        random_per_turn[turn] = random_per_turn.get(turn, 0) + random_calls

        script_address = oracle.read_u32(script_instr_addr)
        if script_address in watched:
            name = watched[script_address]
            if name not in seen_scripts:
                seen_scripts.add(name)
                script_events.append({"frame": frame, "turn": turn, "symbol": name})

        for battler in (0, 1):
            now = disable_struct(battler)
            if now != previous["disable"][battler]:
                disable_events.append({
                    "frame": frame, "turn": turn, "battler": battler,
                    "from": previous["disable"][battler], "to": now,
                })
                previous["disable"][battler] = now

            flag = no_valid_moves(battler)
            if flag != previous["noValidMoves"][battler]:
                no_valid_moves_events.append({
                    "frame": frame, "turn": turn, "battler": battler,
                    "from": previous["noValidMoves"][battler], "to": flag,
                    "script": resolve_script(script_address),
                })
                previous["noValidMoves"][battler] = flag

            hp = mon_hp(battler)
            if hp != previous["hp"][battler]:
                hp_events.append({
                    "frame": frame, "turn": turn, "battler": battler,
                    "from": previous["hp"][battler], "to": hp,
                })
                previous["hp"][battler] = hp

            pp = mon_pp(battler)
            if pp != previous["pp"][battler]:
                pp_events.append({
                    "frame": frame, "turn": turn, "battler": battler,
                    "from": previous["pp"][battler], "to": pp,
                })
                previous["pp"][battler] = pp

        now_chosen = chosen_moves()
        if now_chosen != previous["chosenMoves"]:
            chosen_move_events.append({
                "frame": frame, "turn": turn,
                "from": previous["chosenMoves"], "to": now_chosen,
            })
            previous["chosenMoves"] = now_chosen

        now_current = oracle.read_u16(current_move_addr)
        if now_current != previous["currentMove"]:
            current_move_events.append({
                "frame": frame, "turn": turn,
                "from": previous["currentMove"], "to": now_current,
                "script": resolve_script(script_address),
            })
            previous["currentMove"] = now_current

        suppressed = (oracle.read_u32(hitmarker_addr) & HITMARKER_NO_PPDEDUCT) != 0
        if suppressed != previous["ppDeductSuppressed"]:
            ppdeduct_events.append({
                "frame": frame, "turn": turn, "noPpDeduct": suppressed,
                "currentMove": now_current,
            })
            previous["ppDeductSuppressed"] = suppressed

        message = read_message()
        if message and message != previous["message"]:
            message_events.append({
                "frame": frame, "turn": turn, "text": message,
                "script": resolve_script(script_address),
            })
        previous["message"] = message

        in_turn_passed = oracle.read_u32(main_func_addr) == battle_turn_passed
        if in_turn_passed and not previous["inTurnPassed"]:
            turn += 1
        previous["inTurnPassed"] = in_turn_passed

    final = {
        "actives": actives(),
        "disableStructs": [disable_struct(0), disable_struct(1)],
        "noValidMoves": [no_valid_moves(0), no_valid_moves(1)],
        "turnsObserved": turn,
    }

    result = {
        "schema": "issue138-encore-disable-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "constants": {
            "MOVE_STRUGGLE": MOVE_STRUGGLE,
            "STRINGID_PKMNHASNOMOVESLEFT": STRINGID_PKMNHASNOMOVESLEFT,
            "HITMARKER_NO_PPDEDUCT": HITMARKER_NO_PPDEDUCT,
        },
        "symbols": {
            "gDisableStructs": disable_addr,
            "gProtectStructs": protect_addr,
            "gChosenMoveByBattler": chosen_move_addr,
            "gCurrentMove": current_move_addr,
            "gHitMarker": hitmarker_addr,
            "BattleTurnPassed": symbols["BattleTurnPassed"],
            "BattleScript_NoMovesLeft": symbols.get("BattleScript_NoMovesLeft"),
            "BattleScript_MoveUsedIsDisabled": symbols.get("BattleScript_MoveUsedIsDisabled"),
        },
        "parties": {
            side: [party_identity(mon) for mon in parties[side]]
            for side in ("player", "opponent")
        },
        "initial": initial,
        "disableStructEvents": disable_events,
        "noValidMovesEvents": no_valid_moves_events,
        "chosenMoveEvents": chosen_move_events,
        "currentMoveEvents": current_move_events,
        "ppDeductEvents": ppdeduct_events,
        "hpEvents": hp_events,
        "ppEvents": pp_events,
        "messageEvents": message_events,
        "scriptEvents": script_events,
        "randomCallsPerTurn": {str(k): v for k, v in sorted(random_per_turn.items())},
        "totalRandomCalls": total_random_calls,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: turns={turn} noValidMovesEvents={len(no_valid_moves_events)} "
        f"messages={len(message_events)} scripts={sorted(seen_scripts)} "
        f"totalRandom={total_random_calls}",
        flush=True,
    )


if __name__ == "__main__":
    main()
