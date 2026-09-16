#!/usr/bin/env python3
"""Compact legal Battle Scene ON staging receipt for MOVE_OVERHEAT.

Run only through tools/run-mgba-probe.py. This verifies a stock, complete
party-before-init route into the whole Move_OVERHEAT root but deliberately
retains no framebuffer, RGB, dense semantic, OAM, palette, audio, or latch
evidence.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: overheatStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 315
ROOT_LABEL = "Move_OVERHEAT"
END_LABEL = "Move_HYDRO_CANNON"


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
    pointer, active = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"]
    attacker_id, target_id = names["gBattleAnimAttacker"], names["gBattleAnimTarget"]
    visual, sound = names["gAnimVisualTaskCount"], names["gAnimSoundTaskCount"]

    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16

    initial = lab.snapshot()
    candidates = [
        (side, index)
        for side in ("player", "opponent")
        for index, mon in enumerate(initial["parties"][side])
        if mon["moves"] == [MOVE] * 4
    ]
    if len(candidates) != 1:
        raise RuntimeError(f"expected one four-slot Overheat carrier, got {candidates}")
    attacker_side, attacker_index = candidates[0]
    target_side = "opponent" if attacker_side == "player" else "player"
    target_index = initial["battlers"][target_side]["partyIndex"]
    attacker = initial["parties"][attacker_side][attacker_index]
    target = initial["parties"][target_side][target_index]
    target_battle = initial["battlers"][target_side]
    benches_before = {
        side: {str(index): mon for index, mon in enumerate(initial["parties"][side]) if index != 0}
        for side in ("player", "opponent")
    }
    pp_before = attacker["pp"]
    selection = root_entry = cleanup = None
    root_observations = 0

    def observe() -> None:
        nonlocal selection, root_entry, cleanup, root_observations
        snapshot = lab.snapshot()
        script_pointer = u32(pointer)
        event = {
            "currentMove": snapshot["engine"]["currentMove"],
            "scriptActive": bool(u8(active)),
            "scriptPointer": f"0x{script_pointer:x}",
            "attackerBattler": u8(attacker_id),
            "targetBattler": u8(target_id),
            "visualTasks": u8(visual),
            "soundTasks": u8(sound),
            "targetPartyHp": snapshot["parties"][target_side][target_index]["hp"],
            "targetBattleHp": snapshot["battlers"][target_side]["hp"],
            "battleOutcome": snapshot["battleOutcome"],
        }
        if event["currentMove"] == MOVE and selection is None:
            selection = event
        if event["scriptActive"] and start <= script_pointer < end:
            root_observations += 1
            if root_entry is None:
                root_entry = event
        elif root_entry is not None and cleanup is None and not event["scriptActive"]:
            cleanup = {"visualTasks": event["visualTasks"], "soundTasks": event["soundTasks"]}

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            observe()

    final = lab.snapshot()
    benches_after = {
        side: {str(index): mon for index, mon in enumerate(final["parties"][side]) if index != 0}
        for side in ("player", "opponent")
    }
    pp_after = final["parties"][attacker_side][attacker_index]["pp"]
    target_final = final["battlers"][target_side]
    if selection is None or root_entry is None or cleanup is None:
        raise RuntimeError(f"Overheat selection/root/cleanup missing: selection={selection is not None}, root={root_entry is not None}, cleanup={cleanup}")
    if selection["currentMove"] != MOVE or not start <= int(root_entry["scriptPointer"], 16) < end:
        raise RuntimeError("MOVE_OVERHEAT did not reach its complete pointer-owned source root")
    if side_for_battler(root_entry["attackerBattler"]) != attacker_side or side_for_battler(root_entry["targetBattler"]) != target_side:
        raise RuntimeError("Overheat root orientation did not match the staged attacker/target sides")
    if sum(pp_before) - sum(pp_after) != 1:
        raise RuntimeError(f"expected exactly one Overheat PP spent: {pp_before} -> {pp_after}")
    if target_final["hp"] >= target_battle["hp"]:
        raise RuntimeError(f"expected stock Overheat damage: {target_battle['hp']} -> {target_final['hp']}")
    if cleanup["visualTasks"] or cleanup["soundTasks"]:
        raise RuntimeError(f"Overheat visual/sound cleanup drifted: {cleanup}")
    if benches_before != benches_after or not all(mon["checksumValid"] for side in benches_after.values() for mon in side.values()):
        raise RuntimeError("bench records changed or lost checksum validity during Overheat staging")
    if not transient_free(initial):
        raise RuntimeError("fixture initial state contains transient battle state")
    if not setup["sourceInitialized"] or not setup["customPartiesBuiltBeforeBattle"]:
        raise RuntimeError("party-only builder did not run before normal battle initialization")

    result = {
        "schema": "overheat-compact-staging/v1",
        "oracleProfile": "battle-scene-on",
        "move": "MOVE_OVERHEAT",
        "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)),
        "sourceInitialized": setup["sourceInitialized"],
        "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "partyIndex": attacker_index, "species": attacker["species"], "level": attacker["level"], "moves": attacker["moves"]},
        "target": {"side": target_side, "partyIndex": target_index, "species": target["species"], "level": target["level"], "initialHp": target_battle["hp"], "maxHp": target_battle["maxHp"], "finalHp": target_final["hp"]},
        "choiceConstraint": {"attackerMoveSlots": attacker["moves"], "opponentAiMoveSlots": initial["parties"]["opponent"][0]["moves"]},
        "selection": {"currentMove": selection["currentMove"], "attackerBattler": selection["attackerBattler"], "targetBattler": selection["targetBattler"]},
        "root": {"symbol": ROOT_LABEL, "start": f"0x{start:x}", "endExclusive": f"0x{end:x}", "observations": root_observations, "first": root_entry},
        "romOutcome": {"kind": "damaging-overheat-hit", "targetFinalPartyHp": final["parties"][target_side][target_index]["hp"], "targetFinalBattleHp": target_final["hp"], "targetFinalStatus": target_final["status"], "battleOutcome": final["battleOutcome"]},
        "pp": {"before": pp_before, "after": pp_after, "spent": 1},
        "cleanup": cleanup,
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True, "beforeSha256": digest(benches_before), "afterSha256": digest(benches_after)},
        "transientFreeSetup": True,
        "scope": {"framebuffersRetained": False, "rawRgbRetained": False, "denseWindowCaptured": False, "semanticFramesRetained": False, "latchMeasured": False, "durableLatchRowAdded": False, "productionChanged": False, "reducerAdded": False, "typedSceneOnSeam": False, "compositorAdded": False, "coveragePromotion": False, "coverageEntryAdded": False, "componentTrackFulfilled": False, "battleStateInjected": False, "transientOverrides": [], "boundaryOrBarrierChanged": False, "noTimingOrLatchTransfer": True},
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(f"wrote {OUTPUT}: {attacker_side} carrier reached {ROOT_LABEL}; one PP spent; target damaged; benches unchanged")


if __name__ == "__main__":
    main()
