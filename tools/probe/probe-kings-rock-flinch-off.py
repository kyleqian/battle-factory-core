#!/usr/bin/env python3
"""Verify one complete-parties Battle Scene OFF King's Rock flinch turn."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tools/battle-lab/mechanic-kings-rock-flinch-off.json"


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
    request = json.loads(FIXTURE.read_text())
    moves = {row["id"]: row for row in json.loads((ROOT / "src/data/gen/moves.json").read_text())["moves"]}
    items = json.loads((ROOT / "src/data/gen/item-hold-effects.json").read_text())["items"]
    util = (ROOT / "reference/pokeemerald/src/battle_util.c").read_text()
    commands = (ROOT / "reference/pokeemerald/src/battle_script_commands.c").read_text()
    scripts = (ROOT / "reference/pokeemerald/data/battle_scripts_1.s").read_text()
    require(request["profile"] == "battle-scene-off", "fixture profile drifted")
    require(request["overrides"]["parties"]["player"][0]["item"] == 187, "attacker lost King's Rock")
    require(moves[1]["move"] == "MOVE_POUND" and "FLAG_KINGS_ROCK_AFFECTED" in moves[1]["flags"], "Pound selector drifted")
    require(any(row["itemId"] == 187 and row["holdEffect"] == "HOLD_EFFECT_FLINCH" and row["holdEffectParam"] == 10 for row in items), "King's Rock hold-effect row drifted")
    ordered = [
        "if (gBattleMoveDamage)", "case HOLD_EFFECT_FLINCH:",
        "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)", "TARGET_TURN_DAMAGED",
        "(Random() % 100) < atkHoldEffectParam",
        "gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED",
        "gBattleMons[gBattlerTarget].hp", "SetMoveEffect(FALSE, 0)",
    ]
    cursor = util.index("case ITEMEFFECT_KINGSROCK_SHELLBELL:")
    for token in ordered:
        cursor = util.index(token, cursor) + len(token)
    require("case MOVEEND_KINGSROCK_SHELLBELL:" in commands and "ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)" in commands, "MOVEEND state 12 dispatcher drifted")
    require("BattleScript_MoveUsedFlinched::\n\tprintstring STRINGID_PKMNFLINCHED" in scripts, "flinch cancellation message route drifted")
    return {"profile": "battle-scene-off", "stimulus": "faster Swellow Pound + King's Rock -> slower durable Shuckle Tackle", "orderedGuards": ordered}


def oracle_check(output: Path) -> dict:
    harness = ROOT
    while not (harness / "oracle/emerald_core.py").is_file():
        require(harness.parent != harness, "could not find oracle harness")
        harness = harness.parent
    sys.path.insert(0, str(harness / "oracle"))
    from battle_lab import BattleLab, validate_request  # type: ignore
    from emerald_core import EmeraldOracle  # type: ignore

    request = validate_request(json.loads(FIXTURE.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(
        rom_path=(harness / "reference/pokeemerald/pokeemerald.gba").resolve(),
        map_path=(harness / "reference/pokeemerald/pokeemerald.map").resolve(),
        bootstrap_path=harness / "oracle/bootstrap/factory-battle-scene-off.json",
    )
    BattleLab(oracle, "battle-scene-off").prepare(request)
    rand_count_addr = 0x020249C0
    rng_addr = oracle.symbols["gRngValue"]
    battle_mons = oracle.symbols["gBattleMons"]
    script_cursor_addr = oracle.symbols["gBattlescriptCurrInstr"]
    previous = oracle.read_u32(rand_count_addr)
    draws = []
    status2_writes = []
    target_status2_addr = battle_mons + 0x58 + 0x50
    last_status2 = oracle.read_u32(target_status2_addr)
    pp_before = oracle.read_u8(battle_mons + 0x58 + 0x24)
    for frame, buttons in frames(request["trace"]):
        oracle.advance(buttons)
        current = oracle.read_u32(rand_count_addr)
        delta = (current - previous) & 0xFFFFFFFF
        if delta:
            rng_value = oracle.read_u32(rng_addr)
            random_value = rng_value >> 16
            draws.append({"frame": frame, "count": delta, "rngValue": rng_value, "randomValue": random_value, "roll100": random_value % 100})
        previous = current
        status2 = oracle.read_u32(target_status2_addr)
        if status2 != last_status2:
            status2_writes.append({"frame": frame, "before": last_status2, "after": status2, "battleScript": oracle.read_u32(script_cursor_addr)})
            last_status2 = status2
    pp_after = oracle.read_u8(battle_mons + 0x58 + 0x24)
    require(len(draws) >= 4, f"unexpected RNG ledger: {draws}")
    require(any(row["roll100"] < 10 for row in draws), f"seed has no <10 roll: {draws}")
    require(any(row["after"] & 8 for row in status2_writes), f"target flinch bit was never written: {status2_writes}")
    require(any((row["before"] & 8) and not (row["after"] & 8) for row in status2_writes), f"target flinch bit was not consumed: {status2_writes}")
    clear = next(row for row in status2_writes if (row["before"] & 8) and not (row["after"] & 8))
    require(clear["battleScript"] == oracle.symbols["BattleScript_MoveUsedFlinched"], f"flinch clear did not enter the message script: {clear}")
    require(pp_after == pp_before, f"flinched target spent Tackle PP: {pp_before}->{pp_after}")
    result = {"profile": "battle-scene-off", "draws": draws, "status2Writes": status2_writes, "targetTacklePpBefore": pp_before, "targetTacklePpAfter": pp_after, "targetMoveExecuted": False}
    output.write_text(json.dumps({"static": static_checks(), "oracle": result}, indent=2) + "\n")
    return result


def main() -> None:
    static = static_checks()
    if len(sys.argv) == 1:
        print(json.dumps(static, indent=2))
        return
    require(len(sys.argv) == 2, f"usage: {sys.argv[0]} [output.json]")
    result = oracle_check(Path(sys.argv[1]))
    print(f"PASS: King's Rock flinch written/consumed; target PP {result['targetTacklePpBefore']}->{result['targetTacklePpAfter']}", flush=True)


if __name__ == "__main__":
    main()
