#!/usr/bin/env python3
"""Compact Scene-ON staging smoke for Factory-legal MOVE_RAPID_SPIN.

This is intentionally a source/staging receipt, not animation evidence. It
retains one source-entry observation and one final state snapshot only: no
framebuffer, RGB, capture, OAM, palette, audio, or dense per-frame material.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: rapidSpinStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 229
ROOT_LABEL = "Move_RAPID_SPIN"
END_LABEL = "Move_MOONLIGHT"


def stable(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


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
    root_start, root_end = names[ROOT_LABEL], names[END_LABEL]
    pointer = names["sBattleAnimScriptPtr"]
    active = names["gAnimScriptActive"]
    move_power = names["gAnimMovePower"]
    attacker_id = names["gBattleAnimAttacker"]
    target_id = names["gBattleAnimTarget"]

    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16

    initial = lab.snapshot()
    attacker_side = "player" if initial["parties"]["player"][0]["moves"] == [MOVE] * 4 else "opponent"
    target_side = "opponent" if attacker_side == "player" else "player"
    target_initial = initial["battlers"][target_side]
    bench_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    attacker_pp_before = initial["parties"][attacker_side][0]["pp"]
    selection = root_entry = None
    root_observations = 0

    def observe() -> None:
        nonlocal selection, root_entry, root_observations
        snapshot = lab.snapshot()
        script_pointer = u32(pointer)
        script_active = bool(u8(active))
        event = {
            "currentMove": snapshot["engine"]["currentMove"],
            "scriptActive": script_active,
            "scriptPointer": f"0x{script_pointer:x}",
            "scriptPointerParity": script_pointer & 1,
            "animationMovePower": u16(move_power),
            "attackerBattler": u8(attacker_id),
            "targetBattler": u8(target_id),
            "attackerPp": snapshot["parties"][attacker_side][0]["pp"],
        }
        if event["currentMove"] == MOVE and selection is None:
            selection = event
        if script_active and root_start <= script_pointer < root_end:
            root_observations += 1
            if root_entry is None:
                root_entry = event

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            observe()

    final = lab.snapshot()
    bench_after = {side: final["parties"][side][1:] for side in ("player", "opponent")}
    attacker_pp_after = final["parties"][attacker_side][0]["pp"]
    if selection is None or root_entry is None:
        raise RuntimeError(f"did not observe Rapid Spin selection/root: selection={selection is not None}, root={root_entry is not None}")
    if selection["currentMove"] != MOVE or not root_start <= int(root_entry["scriptPointer"], 16) < root_end:
        raise RuntimeError("Rapid Spin did not reach its pointer-owned source root")
    if root_entry["animationMovePower"] != 20:
        raise RuntimeError(f"Rapid Spin gAnimMovePower {root_entry['animationMovePower']} != 20")
    if side_for_battler(root_entry["attackerBattler"]) != attacker_side or side_for_battler(root_entry["targetBattler"]) != target_side:
        raise RuntimeError("Rapid Spin animation battlers do not match fixture orientation")
    if sum(attacker_pp_before) - sum(attacker_pp_after) != 1:
        raise RuntimeError(f"expected exactly one Rapid Spin PP spent: {attacker_pp_before} -> {attacker_pp_after}")
    if final["battlers"][target_side]["hp"] >= target_initial["hp"]:
        raise RuntimeError("Rapid Spin target did not take real ROM damage")
    if bench_before != bench_after or not all(mon["checksumValid"] for side in bench_after.values() for mon in side):
        raise RuntimeError("bench records changed during Rapid Spin staging")
    if not transient_free(initial):
        raise RuntimeError("fixture initial state contains transient battle state")

    result = {
        "schema": "rapid-spin-compact-staging/v1",
        "oracleProfile": "battle-scene-on",
        "move": "MOVE_RAPID_SPIN",
        "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)),
        "sourceInitialized": setup["sourceInitialized"],
        "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {
            "side": attacker_side, "partyIndex": 0,
            "species": initial["parties"][attacker_side][0]["species"],
            "level": initial["parties"][attacker_side][0]["level"],
            "frontierCarrier": {"setId": 281, "name": "FRONTIER_MON_WARTORTLE_2"},
        },
        "target": {
            "side": target_side, "partyIndex": 0,
            "species": initial["parties"][target_side][0]["species"],
            "initialHp": target_initial["hp"], "finalHp": final["battlers"][target_side]["hp"],
        },
        "selection": selection,
        "root": {
            "symbol": ROOT_LABEL, "start": f"0x{root_start:x}", "endExclusive": f"0x{root_end:x}",
            "observations": root_observations, "first": root_entry,
        },
        "pp": {"before": attacker_pp_before, "after": attacker_pp_after, "spent": 1},
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True},
        "transientFreeSetup": True,
        "scope": {
            "singleFinalFrameSmoke": True, "framebuffersRetained": False, "denseWindowCaptured": False,
            "latchMeasured": False, "productionChanged": False, "coveragePromotion": False,
            "transientOverrides": [],
        },
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(
        f"wrote {OUTPUT}: {attacker_side}-back Wartortle reached {ROOT_LABEL}; "
        "one PP spent; target damaged; benches unchanged"
    )


if __name__ == "__main__":
    main()
