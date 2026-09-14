#!/usr/bin/env python3
"""Compact legal bilateral Scene-ON staging receipt for MOVE_PSYCH_UP.

The target's Swords Dance is an ordinary first action and Psych Up is the
stock ROM's later action in that same turn.  The probe retains only endpoint
and pointer-root facts; it intentionally writes no framebuffer, RGB, dense
semantic stream, latch, or map data.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: psychUpStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PSYCH_UP = 244
SWORDS_DANCE = 14
ROOT_LABEL = "Move_PSYCH_UP"
END_LABEL = "Move_DIZZY_PUNCH"


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
    names = {parts[2]: int(parts[0], 16) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(char in "0123456789abcdefABCDEF" for char in parts[0])}
    start, end = names[ROOT_LABEL], names[END_LABEL]
    pointer = names["sBattleAnimScriptPtr"]
    active = names["gAnimScriptActive"]
    attacker_id = names["gBattleAnimAttacker"]
    target_id = names["gBattleAnimTarget"]
    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16

    initial = lab.snapshot()
    attacker_side = next(side for side in ("player", "opponent") if initial["parties"][side][0]["moves"] == [PSYCH_UP] * 4)
    target_side = "opponent" if attacker_side == "player" else "player"
    if initial["parties"][target_side][0]["moves"] != [SWORDS_DANCE] * 4:
        raise RuntimeError("Psych Up target lacks the legal Swords Dance constraint")
    attacker = initial["parties"][attacker_side][0]
    target = initial["parties"][target_side][0]
    if initial["battlers"][target_side]["stats"]["speed"] <= initial["battlers"][attacker_side]["stats"]["speed"]:
        raise RuntimeError("target must act first through its stock speed stat")
    benches_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    psych_pp_before = attacker["pp"]
    dance_pp_before = target["pp"]
    root_entry = None
    root_observations = 0
    swords_dance_seen = None

    def observe() -> None:
        nonlocal root_entry, root_observations, swords_dance_seen
        snapshot = lab.snapshot()
        script_pointer = u32(pointer)
        script_active = bool(u8(active))
        if snapshot["engine"]["currentMove"] == SWORDS_DANCE and snapshot["battlers"][target_side]["statStages"][1] == 8:
            swords_dance_seen = {"targetStages": snapshot["battlers"][target_side]["statStages"], "attackerStages": snapshot["battlers"][attacker_side]["statStages"]}
        if script_active and start <= script_pointer < end:
            root_observations += 1
            if root_entry is None:
                root_entry = {
                    "currentMove": snapshot["engine"]["currentMove"], "scriptPointer": f"0x{script_pointer:x}", "scriptPointerParity": script_pointer & 1,
                    "attackerBattler": u8(attacker_id), "targetBattler": u8(target_id),
                    "attackerStages": snapshot["battlers"][attacker_side]["statStages"], "targetStages": snapshot["battlers"][target_side]["statStages"],
                }

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            observe()
    final = lab.snapshot()
    benches_after = {side: final["parties"][side][1:] for side in ("player", "opponent")}
    psych_pp_after = final["parties"][attacker_side][0]["pp"]
    dance_pp_after = final["parties"][target_side][0]["pp"]
    if root_entry is None or swords_dance_seen is None:
        raise RuntimeError(f"did not observe real Swords Dance and Psych Up root: dance={swords_dance_seen is not None}, root={root_entry is not None}")
    if root_entry["currentMove"] != PSYCH_UP or not start <= int(root_entry["scriptPointer"], 16) < end:
        raise RuntimeError("Psych Up did not reach its pointer-owned source root")
    if side_for_battler(root_entry["attackerBattler"]) != attacker_side or side_for_battler(root_entry["targetBattler"]) != target_side:
        raise RuntimeError("Psych Up source-root orientation drifted")
    if sum(psych_pp_before) - sum(psych_pp_after) != 1 or sum(dance_pp_before) - sum(dance_pp_after) != 1:
        raise RuntimeError("expected exactly one real Psych Up and one real Swords Dance PP use")
    if swords_dance_seen["targetStages"] != [6, 8, 6, 6, 6, 6, 6, 6] or final["battlers"][attacker_side]["statStages"] != [6, 8, 6, 6, 6, 6, 6, 6]:
        raise RuntimeError("stock Psych Up did not copy the real Swords Dance stages")
    if benches_before != benches_after or not all(mon["checksumValid"] for side in benches_after.values() for mon in side):
        raise RuntimeError("bench records changed or lost checksum validity")
    if not transient_free(initial) or not setup["sourceInitialized"] or not setup["customPartiesBuiltBeforeBattle"]:
        raise RuntimeError("staging was not transient-free complete-party-before-init")

    result = {
        "schema": "psych-up-compact-staging/v1", "oracleProfile": "battle-scene-on", "move": "MOVE_PSYCH_UP", "moveId": PSYCH_UP,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)), "sourceInitialized": setup["sourceInitialized"], "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "partyIndex": 0, "species": attacker["species"], "level": attacker["level"], "moves": attacker["moves"]},
        "target": {"side": target_side, "partyIndex": 0, "species": target["species"], "level": target["level"], "moves": target["moves"], "speed": initial["battlers"][target_side]["stats"]["speed"]},
        "choiceConstraint": {"attackerMoveSlots": attacker["moves"], "targetMoveSlots": target["moves"], "targetActsFirst": True},
        "root": {"symbol": ROOT_LABEL, "start": f"0x{start:x}", "endExclusive": f"0x{end:x}", "observations": root_observations, **root_entry},
        "romOutcome": {"kind": "copies-real-swords-dance-stages", "swordsDance": swords_dance_seen, "attackerFinalStages": final["battlers"][attacker_side]["statStages"], "targetFinalStages": final["battlers"][target_side]["statStages"], "battleOutcome": final["battleOutcome"]},
        "pp": {"psychUpBefore": psych_pp_before, "psychUpAfter": psych_pp_after, "psychUpSpent": 1, "swordsDanceBefore": dance_pp_before, "swordsDanceAfter": dance_pp_after, "swordsDanceSpent": 1},
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True, "beforeSha256": digest(benches_before), "afterSha256": digest(benches_after)},
        "transientFreeSetup": True,
        "scope": {"framebuffersRetained": False, "rawRgbRetained": False, "denseWindowCaptured": False, "semanticFramesRetained": False, "latchMeasured": False, "productionChanged": False, "reducerAdded": False, "typedSceneOnSeam": False, "compositorAdded": False, "coveragePromotion": False, "componentTrackFulfilled": False, "transientOverrides": [], "battleStateInjected": False, "entryHooksSkipped": False, "noTimingOrLatchTransfer": True},
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(f"wrote {OUTPUT}: {attacker_side} Jumpluff copied real Ninjask Swords Dance at {ROOT_LABEL}; one PP each; benches unchanged")


if __name__ == "__main__":
    main()
