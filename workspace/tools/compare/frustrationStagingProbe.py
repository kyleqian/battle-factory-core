#!/usr/bin/env python3
"""Compact Scene-ON staging receipt for Factory-legal MOVE_FRUSTRATION.

This deliberately records only semantic state needed to establish the legal
stage and the selected source branch.  It retains no framebuffer, screenshot,
dense per-frame corpus, latch result, or production-comparison signal.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: frustrationStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 218
ROOT_LABEL = "Move_FRUSTRATION"
END_LABEL = "Move_SAFEGUARD"
STRONGEST_LABEL = "Frustration_Strongest"
STRONG_LABEL = "Frustration_Strong"


def stable(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def side_for_battler(battler: int) -> str:
    # Emerald singles retain player battlers on the even IDs and opponents on
    # the odd IDs; recording the ID as well makes the orientation explicit.
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
    strongest, strong = names[STRONGEST_LABEL], names[STRONG_LABEL]
    pointer = names["sBattleAnimScriptPtr"]
    active = names["gAnimScriptActive"]
    friendship = names["gAnimFriendship"]
    args = names["gBattleAnimArgs"]
    attacker_id = names["gBattleAnimAttacker"]
    target_id = names["gBattleAnimTarget"]
    visual_tasks = names["gAnimVisualTaskCount"]
    sound_tasks = names["gAnimSoundTaskCount"]

    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16
    s16 = lambda address: (lambda value: value - 0x10000 if value >= 0x8000 else value)(u16(address))

    initial = lab.snapshot()
    attacker_side = "player" if initial["parties"]["player"][0]["moves"] == [MOVE] * 4 else "opponent"
    target_side = "opponent" if attacker_side == "player" else "player"
    bench_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    attacker_pp_before = initial["parties"][attacker_side][0]["pp"]
    entry = root_entry = strongest_entry = None
    root_observations = 0

    def observe() -> None:
        nonlocal entry, root_entry, strongest_entry, root_observations
        snapshot = lab.snapshot()
        current_move = snapshot["engine"]["currentMove"]
        script_pointer = u32(pointer)
        script_active = bool(u8(active))
        event = {
            "currentMove": current_move,
            "scriptActive": script_active,
            "scriptPointer": f"0x{script_pointer:x}",
            "scriptPointerParity": script_pointer & 1,
            "animationFriendship": u8(friendship),
            "returnArg": s16(args + 14),
            "attackerBattler": u8(attacker_id),
            "targetBattler": u8(target_id),
            "controllerExecFlags": snapshot["engine"]["controllerExecFlags"],
            "visualTaskCount": u8(visual_tasks),
            "soundTaskCount": u8(sound_tasks),
            "attackerPp": snapshot["parties"][attacker_side][0]["pp"],
        }
        if current_move == MOVE and entry is None:
            entry = event
        if script_active and start <= script_pointer < end:
            root_observations += 1
            if root_entry is None:
                root_entry = event
            if strongest <= script_pointer < strong and strongest_entry is None:
                strongest_entry = event

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            observe()

    final = lab.snapshot()
    bench_after = {side: final["parties"][side][1:] for side in ("player", "opponent")}
    attacker_pp_after = final["parties"][attacker_side][0]["pp"]
    if entry is None or root_entry is None or strongest_entry is None:
        raise RuntimeError(f"did not observe MOVE_FRUSTRATION entry/root/strongest: entry={entry is not None}, root={root_entry is not None}, strongest={strongest_entry is not None}")
    if entry["currentMove"] != MOVE or not start <= int(root_entry["scriptPointer"], 16) < end:
        raise RuntimeError("MOVE_FRUSTRATION source entry contract failed")
    if not strongest <= int(strongest_entry["scriptPointer"], 16) < strong or strongest_entry["returnArg"] != 0 or strongest_entry["animationFriendship"] != 0:
        raise RuntimeError("Factory friendship did not select Frustration_Strongest")
    if side_for_battler(strongest_entry["attackerBattler"]) != attacker_side or side_for_battler(strongest_entry["targetBattler"]) != target_side:
        raise RuntimeError("observed animation battlers do not match fixture orientation")
    if sum(attacker_pp_before) - sum(attacker_pp_after) != 1:
        raise RuntimeError(f"expected exactly one Frustration PP spent: {attacker_pp_before} -> {attacker_pp_after}")
    if bench_before != bench_after or not all(mon["checksumValid"] for side in bench_after.values() for mon in side):
        raise RuntimeError("bench records changed during Frustration staging")
    if not transient_free(initial):
        raise RuntimeError("fixture initial state contains transient battle state")

    result = {
        "schema": "frustration-compact-staging/v1",
        "oracleProfile": "battle-scene-on",
        "move": "MOVE_FRUSTRATION",
        "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)),
        "sourceInitialized": setup["sourceInitialized"],
        "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "partyIndex": 0, "species": initial["parties"][attacker_side][0]["species"], "friendship": initial["parties"][attacker_side][0]["friendship"]},
        "target": {"side": target_side, "partyIndex": 0, "species": initial["parties"][target_side][0]["species"]},
        "entry": entry,
        "root": {"symbol": ROOT_LABEL, "start": f"0x{start:x}", "endExclusive": f"0x{end:x}", "observations": root_observations, "first": root_entry},
        "branch": {"selector": "AnimTask_GetFrustrationPowerLevel", "returnArgIndex": 7, "result": strongest_entry["returnArg"], "label": STRONGEST_LABEL, "start": f"0x{strongest:x}", "endExclusive": f"0x{strong:x}", "first": strongest_entry},
        "pp": {"before": attacker_pp_before, "after": attacker_pp_after, "spent": 1},
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True},
        "transientFreeSetup": True,
        "scope": {"framebuffersRetained": False, "denseWindowCaptured": False, "latchMeasured": False, "productionChanged": False, "coveragePromotion": False, "transientOverrides": []},
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(f"wrote {OUTPUT}: {attacker_side} Furret reached MOVE_FRUSTRATION/root/Frustration_Strongest; one PP spent; benches unchanged")


if __name__ == "__main__":
    main()
