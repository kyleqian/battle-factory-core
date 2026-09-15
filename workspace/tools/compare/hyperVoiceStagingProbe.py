#!/usr/bin/env python3
"""Compact legal bilateral Scene-ON staging receipt for MOVE_HYPER_VOICE.

Run through tools/run-mgba-probe.py.  This deliberately retains only the
stock-ROM root, two owned HyperVoiceEffect calls, PP/outcome, and the first
inactive cleanup edge.  It writes no framebuffer, RGB, dense state, latch, or
per-frame task/resource record.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: hyperVoiceStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 304
OPPONENT_MOVE = 133
ROOT_LABEL = "Move_HYPER_VOICE"
EFFECT_LABEL = "HyperVoiceEffect"
END_LABEL = "Move_SAND_TOMB"


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
    start, effect, end = names[ROOT_LABEL], names[EFFECT_LABEL], names[END_LABEL]
    pointer, active = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"]
    visual_count, sound_count = names["gAnimVisualTaskCount"], names["gAnimSoundTaskCount"]
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
    target = initial["parties"][target_side][0]
    if target["moves"] != [OPPONENT_MOVE] * 4:
        raise RuntimeError("Hyper Voice target lacks the legal all-Amnesia AI constraint")
    if initial["battlers"][attacker_side]["stats"]["speed"] <= initial["battlers"][target_side]["stats"]["speed"]:
        raise RuntimeError("Exploud must act first through derived stock speed stats")
    benches_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    pp_before = attacker["pp"]
    target_hp_before = initial["battlers"][target_side]["hp"]
    selection = root_entry = inactive_cleanup = None
    root_observations = 0
    root_seen = False
    frame = 0

    def observe() -> None:
        nonlocal selection, root_entry, inactive_cleanup, root_observations, root_seen
        snapshot = lab.snapshot()
        script_pointer = u32(pointer)
        script_active = bool(u8(active))
        event = {
            "currentMove": snapshot["engine"]["currentMove"],
            "scriptActive": script_active,
            "scriptPointer": f"0x{script_pointer:x}",
            "scriptPointerParity": script_pointer & 1,
            "attackerBattler": u8(attacker_id),
            "targetBattler": u8(target_id),
            "visualTaskCount": u8(visual_count),
            "soundTaskCount": u8(sound_count),
            "moveResultFlags": u8(result_flags),
            "moveDamage": s32(move_damage),
            "attackerPp": snapshot["parties"][attacker_side][0]["pp"],
            "targetPartyHp": snapshot["parties"][target_side][0]["hp"],
            "targetBattleHp": snapshot["battlers"][target_side]["hp"],
            "battleOutcome": snapshot["battleOutcome"],
        }
        if event["currentMove"] == MOVE and selection is None:
            selection = event
        if script_active and start <= script_pointer < end:
            root_seen = True
            root_observations += 1
            if root_entry is None and side_for_battler(event["attackerBattler"]) == attacker_side:
                root_entry = event
        if root_seen and not script_active and inactive_cleanup is None:
            inactive_cleanup = {"frameAfterTraceStart": frame, **event}

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            observe()

    final = lab.snapshot()
    benches_after = {side: final["parties"][side][1:] for side in ("player", "opponent")}
    pp_after = final["parties"][attacker_side][0]["pp"]
    target_final = final["battlers"][target_side]
    if selection is None or root_entry is None or inactive_cleanup is None:
        raise RuntimeError(
            "did not observe Hyper Voice selection/root/inactive cleanup: "
            + f"selection={selection is not None}, root={root_entry is not None}, inactive={inactive_cleanup is not None}"
        )
    if selection["currentMove"] != MOVE or not start <= int(root_entry["scriptPointer"], 16) < end:
        raise RuntimeError("MOVE_HYPER_VOICE did not reach its complete pointer-owned root")
    if side_for_battler(root_entry["attackerBattler"]) != attacker_side or side_for_battler(root_entry["targetBattler"]) != target_side:
        raise RuntimeError("Hyper Voice root orientation drifted")
    if inactive_cleanup["visualTaskCount"] != 0 or inactive_cleanup["soundTaskCount"] != 0:
        raise RuntimeError("first inactive Hyper Voice cleanup left owned task counts")
    if sum(pp_before) - sum(pp_after) != 1:
        raise RuntimeError(f"expected exactly one Hyper Voice PP spent: {pp_before} -> {pp_after}")
    if target_final["hp"] >= target_hp_before:
        raise RuntimeError(f"expected stock Hyper Voice damage: {target_hp_before} -> {target_final['hp']}")
    if benches_before != benches_after or not all(mon["checksumValid"] for side in benches_after.values() for mon in side):
        raise RuntimeError("bench records changed or lost checksum validity")
    if not transient_free(initial) or not setup["sourceInitialized"] or not setup["customPartiesBuiltBeforeBattle"]:
        raise RuntimeError("staging was not transient-free complete-party-before-init")

    result = {
        "schema": "hyper-voice-compact-staging/v1", "oracleProfile": "battle-scene-on", "move": "MOVE_HYPER_VOICE", "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)), "sourceInitialized": setup["sourceInitialized"], "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "partyIndex": 0, "species": attacker["species"], "level": attacker["level"], "moves": attacker["moves"], "speed": initial["battlers"][attacker_side]["stats"]["speed"]},
        "target": {"side": target_side, "partyIndex": 0, "species": target["species"], "level": target["level"], "moves": target["moves"], "speed": initial["battlers"][target_side]["stats"]["speed"], "initialHp": target_hp_before, "finalHp": target_final["hp"]},
        "choiceConstraint": {"attackerMoveSlots": attacker["moves"], "opponentAiMoveSlots": initial["parties"]["opponent"][0]["moves"], "attackerActsFirst": True},
        "selection": selection,
        "root": {"symbol": ROOT_LABEL, "start": f"0x{start:x}", "hyperVoiceEffect": f"0x{effect:x}", "endExclusive": f"0x{end:x}", "observations": root_observations, "first": root_entry, "sourceOwnedEffectCalls": 2, "firstInactiveCleanup": inactive_cleanup},
        "romOutcome": {"kind": "damaging-two-effect-cry-body", "moveResultFlags": root_entry["moveResultFlags"], "moveDamage": root_entry["moveDamage"], "targetFinalPartyHp": final["parties"][target_side][0]["hp"], "targetFinalBattleHp": target_final["hp"], "targetFinalStatus": target_final["status"], "battleOutcome": final["battleOutcome"]},
        "pp": {"before": pp_before, "after": pp_after, "spent": 1},
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True, "beforeSha256": digest(benches_before), "afterSha256": digest(benches_after)},
        "transientFreeSetup": True,
        "scope": {"framebuffersRetained": False, "rawRgbRetained": False, "denseWindowCaptured": False, "semanticFramesRetained": False, "latchMeasured": False, "productionChanged": False, "reducerAdded": False, "typedSceneOnSeam": False, "compositorAdded": False, "coveragePromotion": False, "componentTrackFulfilled": False, "transientOverrides": [], "battleStateInjected": False, "entryHooksSkipped": False, "noTimingOrLatchTransfer": True},
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(f"wrote {OUTPUT}: {attacker_side} Exploud reached two {EFFECT_LABEL} calls and inactive cleanup; one PP spent; target damaged; benches unchanged")


if __name__ == "__main__":
    main()
