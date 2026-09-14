#!/usr/bin/env python3
"""Compact legal bilateral Scene-ON staging receipt for MOVE_MACH_PUNCH.

Run through tools/run-mgba-probe.py. This retains endpoints and source-root
execution only: no dense semantics, RGB, framebuffer, or latch evidence.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: machPunchStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 183
ROOT_LABEL = "Move_MACH_PUNCH"
END_LABEL = "Move_FORESIGHT"


def stable(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def digest(value: object) -> str:
    return hashlib.sha256(stable(value).encode()).hexdigest()


def side_for_battler(battler: int) -> str:
    return "player" if battler % 2 == 0 else "opponent"


def transient_free(snapshot: dict) -> bool:
    if snapshot["battleOutcome"] != 0 or snapshot["weather"] != 0 or snapshot["weatherTurns"] != 0 or snapshot["sideStatuses"] != [0, 0]:
        return False
    if any(value != 0 for side in snapshot["sideConditions"].values() for value in side.values()):
        return False
    for battler in snapshot["battlers"].values():
        if battler["status1"] != 0 or battler["status2"] != 0 or battler["status3"] != 0 or battler["status"]["kind"] != "none" or battler["statStages"] != [6] * 8:
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
    names = {parts[2]: int(parts[0], 16) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(char in "0123456789abcdefABCDEF" for char in parts[0])}
    start, end = names[ROOT_LABEL], names[END_LABEL]
    pointer, active = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"]
    attacker_id, target_id = names["gBattleAnimAttacker"], names["gBattleAnimTarget"]
    result_flags, move_damage = names["gMoveResultFlags"], names["gBattleMoveDamage"]
    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16
    s32 = lambda address: (lambda value: value - 0x100000000 if value >= 0x80000000 else value)(u32(address))

    initial = lab.snapshot()
    attacker_side = "player" if initial["parties"]["player"][0]["moves"] == [MOVE] * 4 else "opponent"
    target_side = "opponent" if attacker_side == "player" else "player"
    attacker = initial["parties"][attacker_side][0]
    target_battle = initial["battlers"][target_side]
    benches_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    pp_before = attacker["pp"]
    selection = root_entry = None
    root_observations = 0

    def observe() -> None:
        nonlocal selection, root_entry, root_observations
        snapshot = lab.snapshot()
        script_pointer = u32(pointer)
        event = {
            "currentMove": snapshot["engine"]["currentMove"], "scriptActive": bool(u8(active)),
            "scriptPointer": f"0x{script_pointer:x}", "scriptPointerParity": script_pointer & 1,
            "attackerBattler": u8(attacker_id), "targetBattler": u8(target_id),
            "moveResultFlags": u8(result_flags), "moveDamage": s32(move_damage),
            "attackerPp": snapshot["parties"][attacker_side][0]["pp"],
            "targetPartyHp": snapshot["parties"][target_side][0]["hp"], "targetBattleHp": snapshot["battlers"][target_side]["hp"],
            "targetStatus": snapshot["battlers"][target_side]["status"], "battleOutcome": snapshot["battleOutcome"],
        }
        if event["currentMove"] == MOVE and selection is None:
            selection = event
        if event["scriptActive"] and start <= script_pointer < end:
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
    target_final = final["battlers"][target_side]
    if selection is None or root_entry is None or selection["currentMove"] != MOVE or not start <= int(root_entry["scriptPointer"], 16) < end:
        raise RuntimeError("MOVE_MACH_PUNCH did not reach its pointer-owned source root")
    if side_for_battler(root_entry["attackerBattler"]) != attacker_side or side_for_battler(root_entry["targetBattler"]) != target_side:
        raise RuntimeError("Mach Punch source-root orientation drifted")
    if sum(pp_before) - sum(pp_after) != 1 or target_final["hp"] >= target_battle["hp"]:
        raise RuntimeError(f"Mach Punch PP/damage invariant failed: {pp_before}->{pp_after}, {target_battle['hp']}->{target_final['hp']}")
    if benches_before != benches_after or not all(mon["checksumValid"] for side in benches_after.values() for mon in side):
        raise RuntimeError("bench records changed or lost checksum validity")
    if not transient_free(initial) or not setup["sourceInitialized"] or not setup["customPartiesBuiltBeforeBattle"]:
        raise RuntimeError("staging was not transient-free complete-party-before-init")

    result = {
        "schema": "mach-punch-compact-staging/v1", "oracleProfile": "battle-scene-on", "move": "MOVE_MACH_PUNCH", "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)), "sourceInitialized": setup["sourceInitialized"], "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "partyIndex": 0, "species": attacker["species"], "level": attacker["level"], "moves": attacker["moves"]},
        "target": {"side": target_side, "partyIndex": 0, "species": initial["parties"][target_side][0]["species"], "level": initial["parties"][target_side][0]["level"], "initialHp": target_battle["hp"], "maxHp": target_battle["maxHp"], "finalHp": target_final["hp"]},
        "choiceConstraint": {"attackerMoveSlots": attacker["moves"], "opponentAiMoveSlots": initial["parties"]["opponent"][0]["moves"]},
        "selection": selection,
        "root": {"symbol": ROOT_LABEL, "start": f"0x{start:x}", "endExclusive": f"0x{end:x}", "observations": root_observations, "first": root_entry},
        "romOutcome": {"kind": "damaging-priority-hit", "moveResultFlags": root_entry["moveResultFlags"], "moveDamage": root_entry["moveDamage"], "targetFinalPartyHp": final["parties"][target_side][0]["hp"], "targetFinalBattleHp": target_final["hp"], "targetFinalStatus": target_final["status"], "battleOutcome": final["battleOutcome"]},
        "pp": {"before": pp_before, "after": pp_after, "spent": 1},
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True, "beforeSha256": digest(benches_before), "afterSha256": digest(benches_after)},
        "transientFreeSetup": True,
        "scope": {"framebuffersRetained": False, "rawRgbRetained": False, "denseWindowCaptured": False, "semanticFramesRetained": False, "latchMeasured": False, "productionChanged": False, "reducerAdded": False, "typedSceneOnSeam": False, "compositorAdded": False, "coveragePromotion": False, "componentTrackFulfilled": False, "transientOverrides": [], "battleStateInjected": False, "entryHooksSkipped": False, "noTimingOrLatchTransfer": True},
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(f"wrote {OUTPUT}: {attacker_side} Hitmonchan reached {ROOT_LABEL}; one PP spent; target damaged; benches unchanged")


if __name__ == "__main__":
    main()
