#!/usr/bin/env python3
"""Verify one complete-parties Battle Scene OFF Shell Bell heal turn against a no-item control."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HEAL_FIXTURE = ROOT / "tools/battle-lab/mechanic-shell-bell-heal-off.json"
CONTROL_FIXTURE = ROOT / "tools/battle-lab/mechanic-shell-bell-control-off.json"

# struct BattlePokemon (reference/pokeemerald/include/pokemon.h:260): hp @0x28, maxHP @0x2C, item @0x2E, pp[0] @0x24.
BATTLE_MON_STRIDE = 0x58
HP_OFFSET = 0x28
MAXHP_OFFSET = 0x2C
ITEM_OFFSET = 0x2E
PP0_OFFSET = 0x24
# struct SpecialStatus (reference/pokeemerald/include/battle.h:132): shellBellDmg @ offset 4, stride 0x14 (20, confirmed by gSpecialStatuses byte size 0x50 / MAX_BATTLERS_COUNT 4).
SPECIAL_STATUS_STRIDE = 0x14
SHELL_BELL_DMG_OFFSET = 0x04
IGNORE_SHELL_BELL = 0xFFFF
HOLDER_BATTLER = 0
TARGET_BATTLER = 1


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def static_checks() -> dict:
    heal_request = json.loads(HEAL_FIXTURE.read_text())
    control_request = json.loads(CONTROL_FIXTURE.read_text())
    moves = {row["id"]: row for row in json.loads((ROOT / "src/data/gen/moves.json").read_text())["moves"]}
    items = json.loads((ROOT / "src/data/gen/item-hold-effects.json").read_text())["items"]
    util = (ROOT / "reference/pokeemerald/src/battle_util.c").read_text()
    commands = (ROOT / "reference/pokeemerald/src/battle_script_commands.c").read_text()
    require(heal_request["profile"] == "battle-scene-off", "heal fixture profile drifted")
    require(control_request["profile"] == "battle-scene-off", "control fixture profile drifted")
    require(heal_request["overrides"]["parties"]["player"][0]["item"] == 219, "holder lost Shell Bell")
    require(control_request["overrides"]["parties"]["player"][0]["item"] == 0, "control unexpectedly holds an item")
    # the two fixtures must differ only in the holder's item so the action RNG stays identical
    heal_copy = json.loads(HEAL_FIXTURE.read_text())
    heal_copy["overrides"]["parties"]["player"][0]["item"] = 0
    require(heal_copy == control_request, "heal/control fixtures diverge outside the holder's item")
    require(moves[1]["move"] == "MOVE_POUND" and moves[1]["power"] == 40 and moves[1]["accuracy"] == 100, "Pound selector drifted")
    require(any(row["itemId"] == 219 and row["holdEffect"] == "HOLD_EFFECT_SHELL_BELL" and row["holdEffectParam"] == 8 for row in items), "Shell Bell hold-effect row drifted")
    ordered = [
        "if (gBattleMoveDamage)", "case HOLD_EFFECT_SHELL_BELL:",
        "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
        "gSpecialStatuses[gBattlerTarget].shellBellDmg != 0",
        "gSpecialStatuses[gBattlerTarget].shellBellDmg != IGNORE_SHELL_BELL",
        "gBattlerAttacker != gBattlerTarget",
        "gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP",
        "gBattleMons[gBattlerAttacker].hp != 0",
    ]
    cursor = util.index("case ITEMEFFECT_KINGSROCK_SHELLBELL:")
    for token in ordered:
        cursor = util.index(token, cursor) + len(token)
    require("case MOVEEND_KINGSROCK_SHELLBELL:" in commands and "ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)" in commands, "MOVEEND state 12 dispatcher drifted")
    return {
        "profile": "battle-scene-off",
        "stimulus": "faster no-item Swellow Pound damages a slower durable Shuckle first; Shuckle's own Pound this same turn then records shellBellDmg on Swellow and heals Shuckle if it holds Shell Bell",
        "orderedGuards": ordered,
    }


def run_arm(oracle_cls, battle_lab_cls, harness, fixture: Path) -> dict:
    from battle_lab import validate_request  # type: ignore

    request = validate_request(json.loads(fixture.read_text()), "battle-scene-off")
    oracle = oracle_cls(
        rom_path=(harness / "reference/pokeemerald/pokeemerald.gba").resolve(),
        map_path=(harness / "reference/pokeemerald/pokeemerald.map").resolve(),
        bootstrap_path=harness / "oracle/bootstrap/factory-battle-scene-off.json",
    )
    battle_lab_cls(oracle, "battle-scene-off").prepare(request)
    rand_count_addr = 0x020249C0
    rng_addr = oracle.symbols["gRngValue"]
    battle_mons = oracle.symbols["gBattleMons"]
    special_statuses = oracle.symbols["gSpecialStatuses"]
    holder_base = battle_mons + HOLDER_BATTLER * BATTLE_MON_STRIDE
    target_special_addr = special_statuses + TARGET_BATTLER * SPECIAL_STATUS_STRIDE + SHELL_BELL_DMG_OFFSET

    holder_item = oracle.read_u16(holder_base + ITEM_OFFSET)
    holder_max_hp = oracle.read_u16(holder_base + MAXHP_OFFSET)
    holder_hp_before = oracle.read_u16(holder_base + HP_OFFSET)

    def total_pp(base: int) -> int:
        return sum(oracle.read_u8(base + PP0_OFFSET + slot) for slot in range(4))

    target_base = battle_mons + TARGET_BATTLER * BATTLE_MON_STRIDE
    holder_pp_before = total_pp(holder_base)
    target_pp_before = total_pp(target_base)

    previous_rand = oracle.read_u32(rand_count_addr)
    draws = []
    hp_writes = []
    last_hp = holder_hp_before
    shell_bell_writes = []
    last_shell_bell = oracle.read_u32(target_special_addr) & 0xFFFFFFFF

    def signed32(value: int) -> int:
        value &= 0xFFFFFFFF
        return value - 0x100000000 if value & 0x80000000 else value

    for frame, buttons in frames(request["trace"]):
        oracle.advance(buttons)
        current_rand = oracle.read_u32(rand_count_addr)
        delta = (current_rand - previous_rand) & 0xFFFFFFFF
        if delta:
            rng_value = oracle.read_u32(rng_addr)
            draws.append({"frame": frame, "count": delta, "rngValue": rng_value, "randomValue": rng_value >> 16})
        previous_rand = current_rand

        hp = oracle.read_u16(holder_base + HP_OFFSET)
        if hp != last_hp:
            hp_writes.append({"frame": frame, "before": last_hp, "after": hp})
            last_hp = hp

        shell_bell_raw = oracle.read_u32(target_special_addr)
        if shell_bell_raw != last_shell_bell:
            shell_bell_writes.append({"frame": frame, "before": signed32(last_shell_bell), "after": signed32(shell_bell_raw)})
            last_shell_bell = shell_bell_raw

    holder_hp_after = oracle.read_u16(holder_base + HP_OFFSET)
    holder_pp_after = total_pp(holder_base)
    target_pp_after = total_pp(target_base)
    return {
        "profile": "battle-scene-off",
        "holderItem": holder_item,
        "holderMaxHp": holder_max_hp,
        "holderHpBefore": holder_hp_before,
        "holderHpAfter": holder_hp_after,
        "holderPpBefore": holder_pp_before,
        "holderPpAfter": holder_pp_after,
        "targetPpBefore": target_pp_before,
        "targetPpAfter": target_pp_after,
        "draws": draws,
        "holderHpWrites": hp_writes,
        "targetShellBellDmgWrites": shell_bell_writes,
    }


def capture_arm(arm: str, output: Path) -> None:
    """Run exactly one fixture through one EmeraldOracle instance and dump its raw ledger.

    Two EmeraldOracle instances cannot safely share one process (observed native
    segfault mid-run), so each arm is captured by its own `run-mgba-probe.py`
    invocation and the two raw ledgers are combined afterward by `merge_arms`,
    which touches no emulator state.
    """
    fixture = {"heal": HEAL_FIXTURE, "control": CONTROL_FIXTURE}[arm]
    harness = ROOT
    while not (harness / "oracle/emerald_core.py").is_file():
        require(harness.parent != harness, "could not find oracle harness")
        harness = harness.parent
    sys.path.insert(0, str(harness / "oracle"))
    from battle_lab import BattleLab  # type: ignore
    from emerald_core import EmeraldOracle  # type: ignore

    data = run_arm(EmeraldOracle, BattleLab, harness, fixture)
    output.write_text(json.dumps(data, indent=2) + "\n")


def merge_arms(heal_raw: Path, control_raw: Path, output: Path) -> dict:
    heal = json.loads(heal_raw.read_text())
    control = json.loads(control_raw.read_text())

    require(heal["holderItem"] == 219, f"heal arm did not hold Shell Bell: {heal['holderItem']}")
    require(control["holderItem"] == 0, f"control arm unexpectedly held an item: {control['holderItem']}")
    # Shell Bell draws no Random() (source: no Random() call in the HOLD_EFFECT_SHELL_BELL arm), so the two
    # arms' action RNG values/order/counts must be identical; only the *frame* each draw lands on may differ,
    # since the heal arm's extra "restored HP a little" message pushes later same-content draws later in time.
    heal_values = [{"count": row["count"], "rngValue": row["rngValue"], "randomValue": row["randomValue"]} for row in heal["draws"]]
    control_values = [{"count": row["count"], "rngValue": row["rngValue"], "randomValue": row["randomValue"]} for row in control["draws"]]
    require(heal_values == control_values, "heal and control arms must consume identical action RNG values/order/counts")

    require(len(heal["holderHpWrites"]) >= 2, f"heal arm expected a damage write then a heal write: {heal['holderHpWrites']}")
    damage_write = heal["holderHpWrites"][0]
    require(damage_write["after"] < damage_write["before"], f"first holder HP write was not the incoming Pound: {damage_write}")
    require(damage_write["after"] != 0, f"holder fainted from the incoming Pound: {damage_write}")
    heal_write = heal["holderHpWrites"][-1]
    require(heal_write["after"] > heal_write["before"], f"heal arm's final holder HP write was not a heal: {heal_write}")
    require(heal["holderHpAfter"] > damage_write["after"], f"heal arm holder HP did not net-increase after being damaged: {heal}")

    require(len(heal["targetShellBellDmgWrites"]) >= 2, f"heal arm expected shellBellDmg set then cleared: {heal['targetShellBellDmgWrites']}")
    set_write = next(row for row in heal["targetShellBellDmgWrites"] if row["after"] not in (0, -1) and row["before"] == 0)
    require(set_write["after"] > 0, f"shellBellDmg was not recorded as a positive value: {set_write}")
    clear_write = next(row for row in heal["targetShellBellDmgWrites"] if row["before"] == set_write["after"] and row["after"] == 0)
    require(clear_write["frame"] >= set_write["frame"], f"shellBellDmg was not reset to 0 after being consumed: {clear_write}")
    expected_heal = max(1, set_write["after"] // 8)
    actual_heal = heal_write["after"] - heal_write["before"]
    require(actual_heal == expected_heal, f"heal {actual_heal} != max(1, floor(shellBellDmg={set_write['after']}/8))={expected_heal}")

    require(len(control["holderHpWrites"]) == 1, f"control arm holder HP must change exactly once (the incoming Pound only): {control['holderHpWrites']}")
    require(control["holderHpAfter"] == control["holderHpWrites"][0]["after"], "control arm holder HP moved after the recorded write")
    require(control["holderHpAfter"] < control["holderMaxHp"], "control arm holder is unexpectedly at full HP")

    require(heal["holderPpBefore"] - heal["holderPpAfter"] == 1, f"heal arm holder must spend exactly 1 PP: {heal}")
    require(control["holderPpBefore"] - control["holderPpAfter"] == 1, f"control arm holder must spend exactly 1 PP: {control}")
    require(heal["targetPpBefore"] - heal["targetPpAfter"] == 1, f"heal arm target must spend exactly 1 PP: {heal}")
    require(control["targetPpBefore"] - control["targetPpAfter"] == 1, f"control arm target must spend exactly 1 PP: {control}")

    result = {"heal": heal, "control": control, "expectedHeal": expected_heal, "actualHeal": actual_heal}
    output.write_text(json.dumps({"static": static_checks(), "oracle": result}, indent=2) + "\n")
    return result


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(json.dumps(static_checks(), indent=2))
        return
    if len(args) == 3 and args[0] == "--arm":
        require(args[1] in ("heal", "control"), f"unknown arm: {args[1]}")
        capture_arm(args[1], Path(args[2]))
        print(f"wrote {args[1]} arm ledger to {args[2]}", flush=True)
        return
    if len(args) == 4 and args[0] == "--merge":
        result = merge_arms(Path(args[1]), Path(args[2]), Path(args[3]))
        print(
            f"PASS: Shell Bell healed holder by {result['actualHeal']} "
            f"(control holder HP {result['control']['holderHpBefore']}->{result['control']['holderHpAfter']}, "
            f"heal holder HP {result['heal']['holderHpBefore']}->{result['heal']['holderHpAfter']})",
            flush=True,
        )
        return
    raise SystemExit(f"usage: {sys.argv[0]} [--arm heal|control RAW.json | --merge HEAL_RAW.json CONTROL_RAW.json OUTPUT.json]")


if __name__ == "__main__":
    main()
