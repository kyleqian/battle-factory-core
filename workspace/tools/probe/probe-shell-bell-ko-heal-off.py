#!/usr/bin/env python3
"""LIVE stock-ROM witness for Shell Bell's HEAL on a KO (Battle Scene OFF).

Run only through tools/run-mgba-probe.py.  Read-only: replays a two-turn
battle-lab fixture frame by frame and watches exactly the cells that gate
`ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)`'s Shell Bell
branch (src/battle_util.c:3787-3806, reached from Cmd_moveend's
MOVEEND_KINGSROCK_SHELLBELL == 12, src/battle_script_commands.c:4336-4340):

    if (gBattleMoveDamage)                                        <- outer guard
      case HOLD_EFFECT_SHELL_BELL:                                    (:3787)
        !(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)                   (:3788)
        && gSpecialStatuses[gBattlerTarget].shellBellDmg != 0         (:3789)
        && gSpecialStatuses[gBattlerTarget].shellBellDmg != IGNORE_SHELL_BELL
        && gBattlerAttacker != gBattlerTarget                         (:3791)
        && gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP
        && gBattleMons[gBattlerAttacker].hp != 0                      (:3793)
      -> gBattleMoveDamage = (shellBellDmg / atkHoldEffectParam) * -1 (:3798)
         if (gBattleMoveDamage == 0) gBattleMoveDamage = -1           (:3799-3800)
         gSpecialStatuses[gBattlerTarget].shellBellDmg = 0            (:3801)
         gBattlescriptCurrInstr = BattleScript_ItemHealHP_Ret         (:3803)

PROGRESS 1402 pinned the KO arm's *record* (shellBellDmg survives the faint
into state 12) but could not stage the *heal*: the attacker was at full HP, so
:3792 was false.  This probe stages the missing arm with a two-turn fixture --
turn 1 the holder uses a non-damaging move while the AI chips it below maxHP,
turn 2 the holder KOs with EARTHQUAKE -- so every gate holds on the KO.

BattleScript_ItemHealHP_Ret (data/battle_scripts_1.s:4377-4384) prints
STRINGID_PKMNSITEMRESTOREDHPALITTLE == 301
(include/constants/battle_string_ids.h:301) and then `datahpupdate BS_ATTACKER`
applies the negative gBattleMoveDamage as a heal.  The string id reaches the
controller through BtlController_EmitPrintString
(src/battle_controllers.c:1136-1144), which packs it little-endian at
gBattleBufferA[battler][2..3] -- that is what `printStringLedger` reads.

Struct offsets used (computed from include/battle.h / include/pokemon.h):
  struct SpecialStatus (include/battle.h:132-147) is 20 bytes --
    +0  u32 bitfield  +4 s32 shellBellDmg  +8 s32 physicalDmg
    +12 s32 specialDmg  +16 u8 physicalBattlerId  +17 u8 specialBattlerId
  struct BattleScripting (include/battle.h:489-518) -- +20 moveendState
  struct BattlePokemon (include/pokemon.h:260-295) -- +0x28 hp, +0x2C maxHP,
    +0x2E item; stride 0x58.
Shell Bell costs NO Random(): the King's Rock branch above it draws only when
the attacker actually holds King's Rock, so the draw count around state 12 is
the attribution control.
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

SPECIAL_STATUS_SIZE = 20
SPECIAL_STATUS_SHELL_BELL = 4
SPECIAL_STATUS_PHYSICAL = 8
SPECIAL_STATUS_SPECIAL = 12
BATTLE_SCRIPTING_MOVEEND_STATE = 20
BATTLE_MON_SIZE = 0x58
BATTLE_MON_HP = 0x28
BATTLE_MON_MAX_HP = 0x2C
BATTLE_MON_ITEM = 0x2E
BATTLE_BUFFER_STRIDE = 0x200
BATTLE_BUFFER_COMMAND = 0
BATTLE_BUFFER_STRING_ID = 2
# enum in include/battle_controllers.h:184-217 -- CONTROLLER_GETMONDATA is 0,
# CONTROLLER_PRINTSTRING is the 17th entry (CONTROLLER_23 == 23 anchors the count).
CONTROLLER_PRINTSTRING = 16
HOLDER = 0
FOE = 1


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


def to_signed32(value: int) -> int:
    return value - 0x100000000 if value >= 0x80000000 else value


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

    script_labels = sorted(
        (address, name)
        for name, address in symbols.items()
        if name.startswith("BattleScript") or name.startswith("gBattleScriptsForMoveEffects")
    )
    all_labels = sorted((address, name) for name, address in symbols.items())

    def resolve_from(table, address: int, limit: int) -> str:
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
        if delta > limit:
            return f"0x{address:08X}"
        return name if delta == 0 else f"{name}+{delta}"

    def resolve_script(address: int) -> str:
        return resolve_from(script_labels, address, 0x400)

    def resolve_func(address: int) -> str:
        return resolve_from(all_labels, address & ~1, 0x800)

    special_statuses = symbols["gSpecialStatuses"]
    battle_mons = symbols["gBattleMons"]
    battle_buffer_a = symbols["gBattleBufferA"]

    def special(battler: int, offset: int) -> int:
        return to_signed32(
            oracle.read_u32(special_statuses + battler * SPECIAL_STATUS_SIZE + offset)
        )

    def mon(battler: int, offset: int) -> int:
        return oracle.read_u16(battle_mons + battler * BATTLE_MON_SIZE + offset)

    def watch() -> dict:
        attacker = oracle.read_u8(symbols["gBattlerAttacker"])
        target = oracle.read_u8(symbols["gBattlerTarget"])
        return {
            "battleMoveDamage": to_signed32(oracle.read_u32(symbols["gBattleMoveDamage"])),
            "moveResultFlags": oracle.read_u8(symbols["gMoveResultFlags"]),
            "attacker": attacker,
            "target": target,
            "holderItem": mon(HOLDER, BATTLE_MON_ITEM),
            "holderHp": mon(HOLDER, BATTLE_MON_HP),
            "holderMaxHp": mon(HOLDER, BATTLE_MON_MAX_HP),
            "foeHp": mon(FOE, BATTLE_MON_HP),
            "foeMaxHp": mon(FOE, BATTLE_MON_MAX_HP),
            "holderShellBellDmg": special(HOLDER, SPECIAL_STATUS_SHELL_BELL),
            "foeShellBellDmg": special(FOE, SPECIAL_STATUS_SHELL_BELL),
            "foePhysicalDmg": special(FOE, SPECIAL_STATUS_PHYSICAL),
            "foeSpecialDmg": special(FOE, SPECIAL_STATUS_SPECIAL),
            "moveendState": oracle.read_u8(
                symbols["gBattleScripting"] + BATTLE_SCRIPTING_MOVEEND_STATE
            ),
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "lastUsedItem": oracle.read_u16(symbols["gLastUsedItem"]),
            "script": resolve_script(oracle.read_u32(symbols["gBattlescriptCurrInstr"])),
            "mainFunc": resolve_func(oracle.read_u32(symbols["gBattleMainFunc"])),
        }

    def string_ids() -> tuple[int | None, int | None]:
        """stringId of a pending CONTROLLER_PRINTSTRING per battler buffer, else None."""
        out = []
        for battler in (HOLDER, FOE):
            base = battle_buffer_a + battler * BATTLE_BUFFER_STRIDE
            if oracle.read_u8(base + BATTLE_BUFFER_COMMAND) == CONTROLLER_PRINTSTRING:
                out.append(oracle.read_u16(base + BATTLE_BUFFER_STRING_ID))
            else:
                out.append(None)
        return (out[0], out[1])

    initial = watch()
    initial["frame"] = 0
    initial["randCount"] = oracle.read_u32(SRANDCOUNT_ADDR)

    timeline: list[dict] = [dict(initial)]
    rng_ledger: list[dict] = []
    moveend_ledger: list[dict] = []
    holder_hp_writes: list[dict] = []
    foe_shell_bell_writes: list[dict] = []
    print_string_ledger: list[dict] = []
    turn_boundaries: list[dict] = []

    previous = {k: v for k, v in initial.items() if k not in ("frame", "randCount")}
    rand_before = initial["randCount"]
    total_random_calls = 0
    last_holder_hp = initial["holderHp"]
    last_foe_shell_bell = initial["foeShellBellDmg"]
    last_string_ids = string_ids()
    last_moveend = initial["moveendState"]
    last_main_func = initial["mainFunc"]

    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        current = watch()
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        calls = (rand_after - rand_before) & 0xFFFFFFFF
        total_random_calls += calls
        if calls:
            rng_ledger.append({
                "frame": frame,
                "randomCalls": calls,
                "randCountAfter": rand_after,
                "script": current["script"],
                "moveendState": current["moveendState"],
                "battleMoveDamage": current["battleMoveDamage"],
                "currentMove": current["currentMove"],
                "mainFunc": current["mainFunc"],
            })
        if current["moveendState"] != last_moveend:
            moveend_ledger.append({
                "frame": frame,
                "moveendState": current["moveendState"],
                "previousState": last_moveend,
                "randCount": rand_after,
                "battleMoveDamage": current["battleMoveDamage"],
                "moveResultFlags": current["moveResultFlags"],
                "attacker": current["attacker"],
                "target": current["target"],
                "holderItem": current["holderItem"],
                "holderHp": current["holderHp"],
                "holderMaxHp": current["holderMaxHp"],
                "foeHp": current["foeHp"],
                "foeShellBellDmg": current["foeShellBellDmg"],
                "foePhysicalDmg": current["foePhysicalDmg"],
                "currentMove": current["currentMove"],
                "script": current["script"],
            })
            last_moveend = current["moveendState"]
        if current["holderHp"] != last_holder_hp:
            holder_hp_writes.append({
                "frame": frame,
                "before": last_holder_hp,
                "after": current["holderHp"],
                "delta": current["holderHp"] - last_holder_hp,
                "moveendState": current["moveendState"],
                "battleMoveDamage": current["battleMoveDamage"],
                "lastUsedItem": current["lastUsedItem"],
                "script": current["script"],
            })
            last_holder_hp = current["holderHp"]
        if current["foeShellBellDmg"] != last_foe_shell_bell:
            foe_shell_bell_writes.append({
                "frame": frame,
                "before": last_foe_shell_bell,
                "after": current["foeShellBellDmg"],
                "moveendState": current["moveendState"],
                "script": current["script"],
            })
            last_foe_shell_bell = current["foeShellBellDmg"]
        ids = string_ids()
        if ids != last_string_ids:
            print_string_ledger.append({
                "frame": frame,
                "stringIdHolderBuffer": ids[0],
                "stringIdFoeBuffer": ids[1],
                "moveendState": current["moveendState"],
                "lastUsedItem": current["lastUsedItem"],
                "script": current["script"],
            })
            last_string_ids = ids
        if current["mainFunc"] != last_main_func:
            turn_boundaries.append({
                "frame": frame,
                "mainFunc": current["mainFunc"],
                "previousMainFunc": last_main_func,
                "holderHp": current["holderHp"],
                "foeHp": current["foeHp"],
            })
            last_main_func = current["mainFunc"]
        if current != previous or calls:
            row = dict(current)
            row["frame"] = frame
            row["randCount"] = rand_after
            timeline.append(row)
        previous = current
        rand_before = rand_after

    final = watch()
    final["frame"] = "final"
    final["randCount"] = oracle.read_u32(SRANDCOUNT_ADDR)

    result = {
        "schema": "shell-bell-ko-heal-off/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "structOffsets": {
            "SpecialStatus.size": SPECIAL_STATUS_SIZE,
            "SpecialStatus.shellBellDmg": SPECIAL_STATUS_SHELL_BELL,
            "SpecialStatus.physicalDmg": SPECIAL_STATUS_PHYSICAL,
            "SpecialStatus.specialDmg": SPECIAL_STATUS_SPECIAL,
            "BattleScripting.moveendState": BATTLE_SCRIPTING_MOVEEND_STATE,
            "BattlePokemon.hp": BATTLE_MON_HP,
            "BattlePokemon.maxHP": BATTLE_MON_MAX_HP,
            "BattlePokemon.item": BATTLE_MON_ITEM,
            "gBattleBufferA.stride": BATTLE_BUFFER_STRIDE,
            "gBattleBufferA.stringId": BATTLE_BUFFER_STRING_ID,
        },
        "initial": initial,
        "mainFuncLedger": turn_boundaries,
        "moveendLedger": moveend_ledger,
        "holderHpWrites": holder_hp_writes,
        "foeShellBellDmgWrites": foe_shell_bell_writes,
        "printStringLedger": print_string_ledger,
        "rngLedger": rng_ledger,
        "totalRandomCalls": total_random_calls,
        "timeline": timeline,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: draws={total_random_calls} "
        f"holderHpWrites={[(e['frame'], e['before'], e['after']) for e in holder_hp_writes]} "
        f"shellBellWrites={[(e['frame'], e['before'], e['after']) for e in foe_shell_bell_writes]} "
        f"rows={len(timeline)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
