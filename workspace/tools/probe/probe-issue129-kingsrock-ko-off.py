#!/usr/bin/env python3
"""ISSUES #129 -- why the stock ROM spends NO King's Rock Random() on a KO.

Run only through tools/run-mgba-probe.py.  Read-only: replays a battle-lab
fixture frame by frame and watches, per frame, exactly the cells that gate
`ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)`
(src/battle_util.c:3768-3806, reached from Cmd_moveend's
MOVEEND_KINGSROCK_SHELLBELL == 12, src/battle_script_commands.c:4336-4340):

    if (gBattleMoveDamage)                                  <- outer guard
      case HOLD_EFFECT_FLINCH:
        !(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)
        && TARGET_TURN_DAMAGED                              <- include/battle.h:469
        && (Random() % 100) < atkHoldEffectParam            <- THE DRAW
        && FLAG_KINGS_ROCK_AFFECTED && gBattleMons[target].hp
      case HOLD_EFFECT_SHELL_BELL:
        !(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)
        && shellBellDmg != 0 && != IGNORE_SHELL_BELL
        && attacker != target && attacker hp != maxHP && attacker hp != 0

Struct offsets used (computed from include/battle.h, cited in the receipt):
  struct SpecialStatus (include/battle.h:132-147) is 20 bytes --
    +0  u32 bitfield (statLowered..focusBanded)
    +4  s32 shellBellDmg
    +8  s32 physicalDmg
    +12 s32 specialDmg
    +16 u8  physicalBattlerId
    +17 u8  specialBattlerId
  struct BattleScripting (include/battle.h:489-518) --
    +0 painSplitHp(s32) +4 bideDmg(s32) +8 multihitString[6]
    +14 dmgMultiplier +15 twoTurnsMoveStringId +16 animArg1 +17 animArg2
    +18 tripleKickPower(u16) => +20 moveendState  <- the one we read
  struct BattlePokemon (include/pokemon.h:260-295) -- +0x28 hp, +0x2C maxHP,
    +0x2E item; stride 0x58.

FINDING: see the `finding` block of tools/probe/receipts/issue129-kingsrock-ko-off.json.
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

    special_statuses = symbols["gSpecialStatuses"]
    battle_mons = symbols["gBattleMons"]

    def watch() -> dict:
        attacker = oracle.read_u8(symbols["gBattlerAttacker"])
        target = oracle.read_u8(symbols["gBattlerTarget"])

        def special(battler: int, offset: int) -> int:
            return to_signed32(
                oracle.read_u32(special_statuses + battler * SPECIAL_STATUS_SIZE + offset)
            )

        def mon(battler: int, offset: int) -> int:
            return oracle.read_u16(battle_mons + battler * BATTLE_MON_SIZE + offset)

        return {
            "battleMoveDamage": to_signed32(oracle.read_u32(symbols["gBattleMoveDamage"])),
            "moveResultFlags": oracle.read_u8(symbols["gMoveResultFlags"]),
            "attacker": attacker,
            "target": target,
            "attackerItem": mon(attacker, BATTLE_MON_ITEM),
            "attackerHp": mon(attacker, BATTLE_MON_HP),
            "attackerMaxHp": mon(attacker, BATTLE_MON_MAX_HP),
            "targetHp": mon(target, BATTLE_MON_HP),
            "targetPhysicalDmg": special(target, SPECIAL_STATUS_PHYSICAL),
            "targetSpecialDmg": special(target, SPECIAL_STATUS_SPECIAL),
            "targetShellBellDmg": special(target, SPECIAL_STATUS_SHELL_BELL),
            "moveendState": oracle.read_u8(
                symbols["gBattleScripting"] + BATTLE_SCRIPTING_MOVEEND_STATE
            ),
            "script": resolve_script(oracle.read_u32(symbols["gBattlescriptCurrInstr"])),
        }

    initial = watch()
    initial["frame"] = 0
    initial["randCount"] = oracle.read_u32(SRANDCOUNT_ADDR)
    initial["currentMove"] = oracle.read_u16(symbols["gCurrentMove"])

    timeline: list[dict] = [dict(initial)]
    rng_ledger: list[dict] = []
    moveend_states: list[dict] = []
    seen_moveend: set[int] = set()
    previous = {k: v for k, v in initial.items() if k not in ("frame", "randCount", "currentMove")}
    rand_before = initial["randCount"]
    total_random_calls = 0

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
                "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            })
        state = current["moveendState"]
        if state not in seen_moveend:
            seen_moveend.add(state)
            moveend_states.append({
                "frame": frame,
                "moveendState": state,
                "randCount": rand_after,
                "battleMoveDamage": current["battleMoveDamage"],
                "moveResultFlags": current["moveResultFlags"],
                "attacker": current["attacker"],
                "target": current["target"],
                "attackerItem": current["attackerItem"],
                "targetPhysicalDmg": current["targetPhysicalDmg"],
                "targetSpecialDmg": current["targetSpecialDmg"],
                "targetShellBellDmg": current["targetShellBellDmg"],
                "targetHp": current["targetHp"],
                "attackerHp": current["attackerHp"],
                "script": current["script"],
            })
        if current != previous or calls:
            row = dict(current)
            row["frame"] = frame
            row["randCount"] = rand_after
            row["currentMove"] = oracle.read_u16(symbols["gCurrentMove"])
            timeline.append(row)
        previous = current
        rand_before = rand_after

    final = watch()
    final["frame"] = "final"
    final["randCount"] = oracle.read_u32(SRANDCOUNT_ADDR)

    result = {
        "schema": "issue129-kingsrock-ko-off/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "structOffsets": {
            "SpecialStatus.size": SPECIAL_STATUS_SIZE,
            "SpecialStatus.shellBellDmg": SPECIAL_STATUS_SHELL_BELL,
            "SpecialStatus.physicalDmg": SPECIAL_STATUS_PHYSICAL,
            "SpecialStatus.specialDmg": SPECIAL_STATUS_SPECIAL,
            "BattleScripting.moveendState": BATTLE_SCRIPTING_MOVEEND_STATE,
            "BattlePokemon.item": BATTLE_MON_ITEM,
        },
        "initial": initial,
        "moveendStatesFirstSeen": moveend_states,
        "rngLedger": rng_ledger,
        "totalRandomCalls": total_random_calls,
        "timeline": timeline,
        "final": final,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: draws={total_random_calls} "
        f"drawFrames={[e['frame'] for e in rng_ledger]} "
        f"moveendStates={[e['moveendState'] for e in moveend_states]} "
        f"rows={len(timeline)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
