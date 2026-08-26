#!/usr/bin/env python3
"""Read-only Battle Scene OFF receipt probe for ISSUES #140 (GetMoveTarget draw loop).

Run only through tools/run-mgba-probe.py.

    python3 tools/run-mgba-probe.py <out.json> -- \
        python3 tools/probe/probe-issue140-getmovetarget-off.py <card.json> <out.json> [seed]

Source under test: `src/battle_util.c:98-146` `GetMoveTarget`'s
`MOVE_TARGET_SELECTED` arm (`:112-141`) --

    side = BATTLE_OPPOSITE(GetBattlerSide(gBattlerAttacker));
    if (gSideTimers[side].followmeTimer && gBattleMons[...followmeTarget].hp)
        targetBattler = gSideTimers[side].followmeTarget;      // :113-116, no draw
    else
        do { targetBattler = Random() % gBattlersCount; }      // :119-122
        while (targetBattler == gBattlerAttacker
               || side == GetBattlerSide(targetBattler)
               || gAbsentBattlerFlags & gBitTable[targetBattler]);

-- and its four `HandleAction_UseMove` callers: forced Struggle (`:105`), the
Encore match (`:117`), an Encore whose slot was overwritten (`:128`) and a
chosen slot overwritten between selection and execution (`:133`).  The ordinary
chosen-move path (`:135-138`) does NOT call it.  With two active battlers the
loop is `Random() % 2` and exactly one of the two outcomes exits, so it draws a
geometric(1/2) number of `Random()`s: >= 1 always, 2+ on half the entries.

ATTRIBUTION IS FRAME-EXACT, no single-stepping needed.  `BattleMainCB2` calls
`gBattleMainFunc()` exactly once per frame, so `HandleAction_UseMove` runs alone
in its frame: it ends by setting `gBattlescriptCurrInstr` and
`gCurrentActionFuncId = B_ACTION_EXEC_SCRIPT` (10) (`:291`), and the move
script's first opcode only runs on the NEXT frame via `HandleAction_RunBattleScript`
(`:92-96`, one opcode per frame).  `HandleAction_UseMove` contains no other
`Random()` reachable in singles (the two `Random() & 1` re-target arms at
`:161`/`:220` are both `BATTLE_TYPE_DOUBLE`-gated).  Therefore **every draw
observed on the frame where `gCurrentActionFuncId` goes 0 -> 10 is a
`GetMoveTarget` draw**, and this probe reports it as `prologueFrames[].calls`.

Draw counts are measured TWICE and cross-checked:
  * `sRandCount` (0x020249C0) frame delta -- the ROM's own call counter, the
    same address ISSUES #135's probe used; and
  * an independent replay of `gRngValue`'s LCG (`value = value * 0x41C64E6D +
    0x6073`, `src/random.c`) from the previous frame's value, solving for the
    smallest k that reproduces the new value.
The receipt refuses to be written if the two ever disagree.

`gBattlerTarget` stands in for `gBattleStruct->moveTarget[gBattlerAttacker]`:
`HandleAction_UseMove`'s singles "choose target" tail assigns
`gBattlerTarget = *(gBattleStruct->moveTarget + gBattlerAttacker)` verbatim
(`:245`) on the only branch two active battlers can reach, and `gBattleStruct`
is a runtime pointer with no linker symbol for the field.

gDisableStruct byte offsets, derived from `include/battle.h:70-101`:
    u32 transformedMonPersonality @ 0
    u16 disabledMove @ 4, u16 encoredMove @ 6
    u8 protectUses @ 8, stockpileCounter @ 9, substituteHP @ 10
    u8 disableTimer:4|disableTimerStartValue:4 @ 11
    u8 encoredMovePos @ 12, filler_D @ 13
    u8 encoreTimer:4|encoreTimerStartValue:4 @ 14   <-- low nibble watched
    ... struct size 28 (0x1C, u32-aligned)

It never stages transient battle state: parties are complete legal records and
every effect (Encore, Disable, Struggle) is produced by real controller input.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <output.json> [seed]")

FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
SEED_OVERRIDE = int(sys.argv[3]) if len(sys.argv) == 4 else None
WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PROFILE = "battle-scene-off"
SRANDCOUNT_ADDR = 0x020249C0
DISABLE_STRUCT_SIZE = 28
DISABLE_ENCORED_MOVE = 6
DISABLE_ENCORED_MOVE_POS = 12
DISABLE_ENCORE_TIMER = 14
DISABLE_DISABLED_MOVE = 4
DISABLE_DISABLE_TIMER = 11
BATTLE_MON_SIZE = 0x58
BATTLE_MON_HP = 0x28
POKEMON_SIZE = 100
PARTY_HP_OFFSET = 86
DISPLAYED_STRING_BYTES = 128
B_ACTION_USE_MOVE = 0
B_ACTION_EXEC_SCRIPT = 10
LCG_MULT = 0x41C64E6D
LCG_ADD = 0x6073
MAX_DRAWS_PER_FRAME = 512


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


def lcg_distance(before: int, after: int) -> int:
    """Smallest k <= MAX_DRAWS_PER_FRAME with LCG^k(before) == after, else -1."""
    value = before & 0xFFFFFFFF
    for k in range(MAX_DRAWS_PER_FRAME + 1):
        if value == (after & 0xFFFFFFFF):
            return k
        value = (value * LCG_MULT + LCG_ADD) & 0xFFFFFFFF
    return -1


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
    if SEED_OVERRIDE is not None:
        fixture["seed"] = SEED_OVERRIDE
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

    script_labels = sorted(
        (address, name)
        for name, address in symbols.items()
        if name.startswith("BattleScript") or name.startswith("gBattleScriptsForMoveEffects")
    )
    code_labels = sorted((address & ~1, name) for name, address in symbols.items())

    def resolve_from(table: list, address: int, span: int) -> str:
        low, high = 0, len(table)
        while low < high:
            mid = (low + high) // 2
            if table[mid][0] <= address:
                low = mid + 1
            else:
                high = mid
        if low == 0:
            return f"0x{address:08X}"
        base, name = table[low - 1]
        delta = address - base
        if delta > span:
            return f"0x{address:08X}"
        return name if delta == 0 else f"{name}+{delta}"

    battle_mons = symbols["gBattleMons"]
    disable_structs = symbols["gDisableStructs"]
    player_party = symbols["gPlayerParty"]

    def disable_struct(battler: int) -> dict:
        base = disable_structs + battler * DISABLE_STRUCT_SIZE
        return {
            "encoredMove": oracle.read_u16(base + DISABLE_ENCORED_MOVE),
            "encoredMovePos": oracle.read_u8(base + DISABLE_ENCORED_MOVE_POS),
            "encoreTimer": oracle.read_u8(base + DISABLE_ENCORE_TIMER) & 0x0F,
            "disabledMove": oracle.read_u16(base + DISABLE_DISABLED_MOVE),
            "disableTimer": oracle.read_u8(base + DISABLE_DISABLE_TIMER) & 0x0F,
        }

    def watch() -> dict:
        return {
            "actionFuncId": oracle.read_u8(symbols["gCurrentActionFuncId"]),
            "turnActionNumber": oracle.read_u8(symbols["gCurrentTurnActionNumber"]),
            "battleMainFunc": resolve_from(
                code_labels, oracle.read_u32(symbols["gBattleMainFunc"]) & ~1, 0x800
            ),
            "script": resolve_from(
                script_labels, oracle.read_u32(symbols["gBattlescriptCurrInstr"]), 0x400
            ),
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "chosenMove": oracle.read_u16(symbols["gChosenMove"]),
            "attacker": oracle.read_u8(symbols["gBattlerAttacker"]),
            "target": oracle.read_u8(symbols["gBattlerTarget"]),
            "battleMoveDamage": to_s32(oracle.read_u32(symbols["gBattleMoveDamage"])),
            "moveResultFlags": oracle.read_u8(symbols["gMoveResultFlags"]),
            "activeHp": [
                oracle.read_u16(battle_mons + battler * BATTLE_MON_SIZE + BATTLE_MON_HP)
                for battler in range(2)
            ],
            "disableStructs": [disable_struct(battler) for battler in range(2)],
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
    rng_before = oracle.read_u32(symbols["gRngValue"])

    transitions: list[dict] = []
    message_events: list[dict] = []
    random_events: list[dict] = []
    prologue_frames: list[dict] = []
    mismatches: list[dict] = []
    total_random_calls = 0

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        random_after = oracle.read_u32(SRANDCOUNT_ADDR)
        rng_after = oracle.read_u32(symbols["gRngValue"])
        random_calls = (random_after - random_before) & 0xFFFFFFFF
        lcg_calls = lcg_distance(rng_before, rng_after)
        if lcg_calls != random_calls:
            mismatches.append({
                "frame": frame,
                "sRandCount": random_calls,
                "lcgDistance": lcg_calls,
                "rngBefore": rng_before,
                "rngAfter": rng_after,
            })
        random_before = random_after
        total_random_calls += random_calls

        now = watch()
        # HandleAction_UseMove's own frame: gCurrentActionFuncId 0 -> 10 with
        # gBattleMainFunc still RunTurnActionsFunctions.  Every Random() drawn
        # on this frame is GetMoveTarget's (see the module docstring).
        if (
            previous["actionFuncId"] == B_ACTION_USE_MOVE
            and now["actionFuncId"] == B_ACTION_EXEC_SCRIPT
        ):
            prologue_frames.append({
                "frame": frame,
                "attacker": now["attacker"],
                "target": now["target"],
                "currentMove": now["currentMove"],
                "chosenMove": now["chosenMove"],
                "script": now["script"],
                "turnActionNumber": now["turnActionNumber"],
                "calls": random_calls,
                "lcgCalls": lcg_calls,
                "rngBefore": rng_before,
                "rngAfter": rng_after,
                "attackerDisableStruct": now["disableStructs"][now["attacker"]],
            })
        rng_before = rng_after

        if random_calls:
            random_events.append({
                "frame": frame,
                "calls": random_calls,
                "script": now["script"],
                "actionFuncId": now["actionFuncId"],
                "currentMove": now["currentMove"],
                "attacker": now["attacker"],
            })
        changed = {key: [previous[key], now[key]] for key in now if now[key] != previous[key]}
        if changed:
            transitions.append({"frame": frame, "changed": changed, "state": now})
            previous = now

        message = read_message()
        if message and message != previous_message:
            message_events.append({"frame": frame, "text": message})
        previous_message = message

    if mismatches:
        raise SystemExit(
            "sRandCount and gRngValue LCG replay disagree on "
            f"{len(mismatches)} frame(s); first: {mismatches[0]}"
        )

    final_snapshot = lab.snapshot()
    result = {
        "schema": "issue140-getmovetarget-off-semantic-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "sampledEveryTraceFrame": True,
        "drawCountCrossChecked": True,
        "symbols": {
            "gCurrentActionFuncId": symbols["gCurrentActionFuncId"],
            "gBattleMainFunc": symbols["gBattleMainFunc"],
            "gBattlescriptCurrInstr": symbols["gBattlescriptCurrInstr"],
            "gDisableStructs": disable_structs,
            "gRngValue": symbols["gRngValue"],
            "sRandCount": SRANDCOUNT_ADDR,
        },
        "parties": {
            side: [party_identity(mon) for mon in parties_before[side]]
            for side in ("player", "opponent")
        },
        "initial": initial,
        "prologueFrames": prologue_frames,
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
        f"wrote {OUTPUT_PATH}: prologues={len(prologue_frames)} "
        f"randomEvents={len(random_events)} totalRandom={total_random_calls}",
        flush=True,
    )


if __name__ == "__main__":
    main()
