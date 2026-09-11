#!/usr/bin/env python3
"""Compact Scene-ON staging receipt for legal MOVE_SHEER_COLD.

Run only through tools/run-mgba-probe.py so an mGBA teardown crash cannot
masquerade as a valid or invalid receipt.  This is intentionally endpoint-only:
it does not capture a framebuffer, dense state stream, OAM, palette, audio, or
display latch.  The move must earn those in a later bilateral dense-evidence
checkpoint under its own change maps.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: sheerColdStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 329
ROOT_LABEL = "Move_SHEER_COLD"
END_LABEL = "Move_ARM_THRUST"
MOVE_RESULT_MISSED = 1
MOVE_RESULT_ONE_HIT_KO = 16


def stable(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def digest(value: object) -> str:
    return hashlib.sha256(stable(value).encode()).hexdigest()


def side_for_battler(battler: int) -> str:
    return "player" if battler % 2 == 0 else "opponent"


def transient_free(snapshot: dict) -> bool:
    if snapshot["battleOutcome"] != 0 or snapshot["weather"] != 0 or snapshot["weatherTurns"] != 0:
        return False
    if snapshot["sideStatuses"] != [0, 0]:
        return False
    if any(value != 0 for side in snapshot["sideConditions"].values() for value in side.values()):
        return False
    for battler in snapshot["battlers"].values():
        if battler["status1"] != 0 or battler["status2"] != 0 or battler["status3"] != 0:
            return False
        if battler["status"]["kind"] != "none" or battler["statStages"] != [6] * 8:
            return False
        if any(value not in (0, None) for value in battler["volatile"].values()):
            return False
    return True


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names = {
        parts[2]: int(parts[0], 16)
        for line in nm.splitlines()
        if len(parts := line.split()) == 3 and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    }
    start, end = names[ROOT_LABEL], names[END_LABEL]
    pointer = names["sBattleAnimScriptPtr"]
    active = names["gAnimScriptActive"]
    attacker_id = names["gBattleAnimAttacker"]
    target_id = names["gBattleAnimTarget"]
    move_result = names["gMoveResultFlags"]
    move_damage = names["gBattleMoveDamage"]
    battle_communication = names["gBattleCommunication"]

    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16
    s32 = lambda address: (lambda value: value - 0x100000000 if value >= 0x80000000 else value)(u32(address))

    initial = lab.snapshot()
    attacker_side = "player" if initial["parties"]["player"][0]["moves"] == [MOVE] * 4 else "opponent"
    target_side = "opponent" if attacker_side == "player" else "player"
    attacker = initial["parties"][attacker_side][0]
    target = initial["parties"][target_side][0]
    benches_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    pp_before = attacker["pp"]
    selection = root_entry = resolution = None
    root_observations = 0

    def observe() -> None:
        nonlocal selection, root_entry, resolution, root_observations
        snapshot = lab.snapshot()
        script_pointer = u32(pointer)
        script_active = bool(u8(active))
        flags = u8(move_result)
        event = {
            "currentMove": snapshot["engine"]["currentMove"],
            "scriptActive": script_active,
            "scriptPointer": f"0x{script_pointer:x}",
            "scriptPointerParity": script_pointer & 1,
            "attackerBattler": u8(attacker_id),
            "targetBattler": u8(target_id),
            "moveResultFlags": flags,
            "moveDamage": s32(move_damage),
            "battleCommunication": [u8(battle_communication + offset) for offset in range(8)],
            "controllerExecFlags": snapshot["engine"]["controllerExecFlags"],
            "attackerPp": snapshot["parties"][attacker_side][0]["pp"],
            "targetPartyHp": snapshot["parties"][target_side][0]["hp"],
            "targetBattleHp": snapshot["battlers"][target_side]["hp"],
            "battleOutcome": snapshot["battleOutcome"],
        }
        if event["currentMove"] == MOVE and selection is None:
            selection = event
        if event["currentMove"] == MOVE and flags & MOVE_RESULT_ONE_HIT_KO and resolution is None:
            resolution = event
        if script_active and start <= script_pointer < end:
            root_observations += 1
            if root_entry is None and side_for_battler(event["attackerBattler"]) == attacker_side:
                root_entry = event

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            observe()

    final = lab.snapshot()
    benches_after = {side: final["parties"][side][1:] for side in ("player", "opponent")}
    pp_after = final["parties"][attacker_side][0]["pp"]
    if selection is None or root_entry is None or resolution is None:
        raise RuntimeError(
            "did not observe Sheer Cold selection/root/resolution: "
            + f"selection={selection is not None}, root={root_entry is not None}, resolution={resolution is not None}"
        )
    if selection["currentMove"] != MOVE or not start <= int(root_entry["scriptPointer"], 16) < end:
        raise RuntimeError("MOVE_SHEER_COLD did not reach its pointer-owned animation root")
    if side_for_battler(root_entry["attackerBattler"]) != attacker_side or side_for_battler(root_entry["targetBattler"]) != target_side:
        raise RuntimeError("Sheer Cold root orientation did not match the staged attacker/target sides")
    if attacker["level"] != target["level"] or attacker["level"] != 50:
        raise RuntimeError("Sheer Cold stage no longer probes the legal equal-level accuracy rule")
    if not resolution["moveResultFlags"] & MOVE_RESULT_ONE_HIT_KO or resolution["moveResultFlags"] & MOVE_RESULT_MISSED:
        raise RuntimeError(f"expected stock-ROM equal-level Sheer Cold OHKO result, observed flags={resolution['moveResultFlags']}")
    if root_entry["moveResultFlags"] != resolution["moveResultFlags"]:
        raise RuntimeError("Sheer Cold root did not retain the measured stock-ROM OHKO result")
    if final["parties"][target_side][0]["hp"] != 0 or final["battlers"][target_side]["hp"] != 0:
        raise RuntimeError("stock-ROM Sheer Cold OHKO did not reduce the legal Chansey target to zero HP")
    if sum(pp_before) - sum(pp_after) != 1:
        raise RuntimeError(f"expected exactly one Sheer Cold PP spent: {pp_before} -> {pp_after}")
    if benches_before != benches_after or not all(mon["checksumValid"] for side in benches_after.values() for mon in side):
        raise RuntimeError("bench records changed or lost checksum validity during Sheer Cold staging")
    if not transient_free(initial):
        raise RuntimeError("fixture initial state contains transient battle state")
    if not setup["sourceInitialized"] or not setup["customPartiesBuiltBeforeBattle"]:
        raise RuntimeError("party-only builder did not run before normal battle initialization")

    result = {
        "schema": "sheer-cold-compact-staging/v1",
        "oracleProfile": "battle-scene-on",
        "move": "MOVE_SHEER_COLD",
        "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)),
        "sourceInitialized": setup["sourceInitialized"],
        "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "partyIndex": 0, "species": attacker["species"], "level": attacker["level"], "moves": attacker["moves"]},
        "target": {"side": target_side, "partyIndex": 0, "species": target["species"], "level": target["level"], "initialHp": target["hp"], "maxHp": target["maxHp"]},
        "choiceConstraint": {"attackerMoveSlots": attacker["moves"], "opponentAiMoveSlots": initial["parties"]["opponent"][0]["moves"]},
        "selection": selection,
        "root": {"symbol": ROOT_LABEL, "start": f"0x{start:x}", "endExclusive": f"0x{end:x}", "observations": root_observations, "first": root_entry},
        "romOutcome": {
            "kind": "one-hit-ko", "moveResultFlags": resolution["moveResultFlags"],
            "missedBit": MOVE_RESULT_MISSED, "oneHitKoBit": MOVE_RESULT_ONE_HIT_KO,
            "resolution": resolution,
            "endpoint": {
                "targetPartyHp": final["parties"][target_side][0]["hp"],
                "targetBattleHp": final["battlers"][target_side]["hp"],
                "battleOutcome": final["battleOutcome"],
            },
        },
        "pp": {"before": pp_before, "after": pp_after, "spent": 1},
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True, "beforeSha256": digest(benches_before), "afterSha256": digest(benches_after)},
        "transientFreeSetup": True,
        "scope": {
            "framebuffersRetained": False,
            "denseWindowCaptured": False,
            "latchMeasured": False,
            "productionChanged": False,
            "coveragePromotion": False,
            "transientOverrides": [],
            "battleStateInjected": False,
            "entryHooksSkipped": False,
        },
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(f"wrote {OUTPUT}: {attacker_side} Dewgong reached {ROOT_LABEL}; stock-ROM OHKO; one PP spent; benches unchanged")


if __name__ == "__main__":
    main()
