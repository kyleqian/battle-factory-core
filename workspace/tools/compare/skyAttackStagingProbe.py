#!/usr/bin/env python3
"""Compact legal bilateral Scene-ON staging receipt for MOVE_SKY_ATTACK.

Run only through tools/run-mgba-probe.py. This proves natural two-turn setup
and successful unleash routing without retaining a dense framebuffer corpus.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: skyAttackStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 143
STATUS2_MULTIPLETURNS = 1 << 12


def stable(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def digest(value: object) -> str:
    return hashlib.sha256(stable(value).encode()).hexdigest()


def side_for_battler(battler: int) -> str:
    return "player" if battler % 2 == 0 else "opponent"


def transient_free(snapshot: dict) -> bool:
    if snapshot["battleOutcome"] or snapshot["weather"] or snapshot["weatherTurns"]:
        return False
    if snapshot["sideStatuses"] != [0, 0] or any(value != 0 for side in snapshot["sideConditions"].values() for value in side.values()):
        return False
    return all(
        battler["status1"] == battler["status2"] == battler["status3"] == 0
        and battler["status"]["kind"] == "none"
        and battler["statStages"] == [6] * 8
        and all(value in (0, None) for value in battler["volatile"].values())
        for battler in snapshot["battlers"].values()
    )


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names = {parts[2]: int(parts[0], 16) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])}
    root, setup_start, unleash_start, root_end = (names[name] for name in ("Move_SKY_ATTACK", "SkyAttackSetUp", "SkyAttackUnleash", "Move_FLASH"))
    pointer, active = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"]
    attacker_id, target_id = names["gBattleAnimAttacker"], names["gBattleAnimTarget"]
    visual, sound, anim_turn = names["gAnimVisualTaskCount"], names["gAnimSoundTaskCount"], names["gAnimMoveTurn"]
    battle_anim_turn = names["gBattleScripting"] + 0x18
    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16

    initial = lab.snapshot()
    carriers = [(side, index) for side in ("player", "opponent") for index, mon in enumerate(initial["parties"][side]) if mon["moves"] == [MOVE] * 4]
    if len(carriers) != 1:
        raise RuntimeError(f"expected one constrained Sky Attack carrier, got {carriers}")
    attacker_side, attacker_index = carriers[0]
    target_side = "opponent" if attacker_side == "player" else "player"
    target_index = initial["battlers"][target_side]["partyIndex"]
    attacker = initial["parties"][attacker_side][attacker_index]
    target_before = initial["battlers"][target_side]
    pp_before = attacker["pp"]
    benches_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    phases: dict[str, dict] = {}
    phase_observations = {"setup": 0, "unleash": 0}
    charge_seen = False
    cleanups: list[dict] = []
    was_owned = False

    def observe() -> None:
        nonlocal charge_seen, was_owned
        snapshot = lab.snapshot()
        script_pointer = u32(pointer)
        script_active = bool(u8(active))
        owned = script_active and root <= script_pointer < root_end
        if snapshot["battlers"][attacker_side]["status2"] & STATUS2_MULTIPLETURNS:
            charge_seen = True
        if owned:
            phase = "setup" if setup_start <= script_pointer < unleash_start else "unleash" if unleash_start <= script_pointer < root_end else "root"
            if phase in phase_observations:
                phase_observations[phase] += 1
                phases.setdefault(phase, {
                    "firstPointer": f"0x{script_pointer:x}", "gAnimMoveTurn": u8(anim_turn), "battleAnimTurn": u8(battle_anim_turn),
                    "attackerBattler": u8(attacker_id), "targetBattler": u8(target_id),
                    "targetHp": snapshot["battlers"][target_side]["hp"],
                })
        if was_owned and not script_active:
            cleanups.append({"visualTasks": u8(visual), "soundTasks": u8(sound)})
        was_owned = owned

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            observe()

    final = lab.snapshot()
    benches_after = {side: final["parties"][side][1:] for side in ("player", "opponent")}
    pp_after = final["parties"][attacker_side][attacker_index]["pp"]
    target_after = final["battlers"][target_side]
    if set(phases) != {"setup", "unleash"} or phases["setup"]["gAnimMoveTurn"] != 0 or phases["unleash"]["gAnimMoveTurn"] != 1:
        raise RuntimeError(f"missing two-turn Sky Attack roots: {phases}")
    if any(side_for_battler(phases[phase]["attackerBattler"]) != attacker_side or side_for_battler(phases[phase]["targetBattler"]) != target_side for phase in phases):
        raise RuntimeError("Sky Attack orientation drifted")
    if not charge_seen or final["battlers"][attacker_side]["status2"] & STATUS2_MULTIPLETURNS:
        raise RuntimeError("natural charge status did not set and clear")
    if sum(pp_before) - sum(pp_after) != 1:
        raise RuntimeError(f"two-turn move must spend one PP: {pp_before} -> {pp_after}")
    if target_after["hp"] >= target_before["hp"]:
        raise RuntimeError(f"Sky Attack did not hit: {target_before['hp']} -> {target_after['hp']}")
    if benches_before != benches_after or not all(mon["checksumValid"] for side in benches_after.values() for mon in side):
        raise RuntimeError("bench records changed or lost checksum validity")
    if not transient_free(initial) or not setup["sourceInitialized"] or not setup["customPartiesBuiltBeforeBattle"]:
        raise RuntimeError("stage was not transient-free party-before-init")

    result = {
        "schema": "sky-attack-compact-staging/v1", "oracleProfile": "battle-scene-on", "move": "MOVE_SKY_ATTACK", "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)), "sourceInitialized": setup["sourceInitialized"], "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "partyIndex": attacker_index, "species": attacker["species"], "level": attacker["level"], "moves": attacker["moves"]},
        "target": {"side": target_side, "partyIndex": target_index, "species": initial["parties"][target_side][target_index]["species"], "initialHp": target_before["hp"], "maxHp": target_before["maxHp"], "finalHp": target_after["hp"]},
        "sourceRoot": {"start": f"0x{root:x}", "endExclusive": f"0x{root_end:x}", "setup": phases["setup"], "unleash": phases["unleash"], "observations": phase_observations},
        "twoTurn": {"chargeStatusSeen": charge_seen, "chargeStatusCleared": True, "setupAnimTurn": 0, "unleashAnimTurn": 1, "pp": {"before": pp_before, "after": pp_after, "spent": 1}},
        "romOutcome": {"kind": "successful-two-turn-sky-attack", "targetInitialHp": target_before["hp"], "targetFinalHp": target_after["hp"], "battleOutcome": final["battleOutcome"]},
        "cleanups": cleanups,
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True, "beforeSha256": digest(benches_before), "afterSha256": digest(benches_after)},
        "transientFreeSetup": True,
        "scope": {"framebuffersRetained": False, "rawRgbRetained": False, "denseWindowCaptured": False, "semanticFramesRetained": False, "latchMeasured": False, "productionChanged": False, "reducerAdded": False, "typedSceneOnSeam": False, "compositorAdded": False, "coveragePromotion": False, "coverageEntryAdded": False, "componentTrackFulfilled": False, "battleStateInjected": False, "transientOverrides": [], "boundaryOrBarrierChanged": False},
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(f"wrote {OUTPUT}: {attacker_side} Fearow reached setup and unleash; one PP spent; target damaged")


if __name__ == "__main__":
    main()
