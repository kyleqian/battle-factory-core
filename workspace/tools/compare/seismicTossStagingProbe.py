#!/usr/bin/env python3
"""Compact Scene-ON staging receipt for Factory-legal MOVE_SEISMIC_TOSS.

This probe establishes only the legal 3v3 setup and the source-selected
medium damage branch. It deliberately retains no framebuffer, capture,
dense-state, or latch evidence.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: seismicTossStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 69
ROOT_LABEL = "Move_SEISMIC_TOSS"
END_LABEL = "Move_MAGIC_COAT"
MEDIUM_LABEL = "SeismicTossMedium"
STRONG_LABEL = "SeismicTossStrong"


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
    start, end = names[ROOT_LABEL], names[END_LABEL]
    medium, strong = names[MEDIUM_LABEL], names[STRONG_LABEL]
    pointer = names["sBattleAnimScriptPtr"]
    active = names["gAnimScriptActive"]
    args = names["gBattleAnimArgs"]
    animation_damage = names["gAnimMoveDmg"]
    attacker_id = names["gBattleAnimAttacker"]
    target_id = names["gBattleAnimTarget"]
    visual_tasks = names["gAnimVisualTaskCount"]
    sound_tasks = names["gAnimSoundTaskCount"]

    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16
    s16 = lambda address: (lambda value: value - 0x10000 if value >= 0x8000 else value)(u16(address))
    s32 = lambda address: (lambda value: value - 0x100000000 if value >= 0x80000000 else value)(u32(address))

    initial = lab.snapshot()
    attacker_side = "player" if initial["parties"]["player"][0]["moves"] == [MOVE] * 4 else "opponent"
    target_side = "opponent" if attacker_side == "player" else "player"
    attacker_battler = 0 if attacker_side == "player" else 1
    target_battler = 1 if target_side == "opponent" else 0
    target_initial = initial["battlers"][target_side]
    bench_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    attacker_pp_before = initial["parties"][attacker_side][0]["pp"]
    entry = root_entry = medium_entry = None
    root_observations = 0

    def observe() -> None:
        nonlocal entry, root_entry, medium_entry, root_observations
        snapshot = lab.snapshot()
        current_move = snapshot["engine"]["currentMove"]
        script_pointer = u32(pointer)
        script_active = bool(u8(active))
        event = {
            "currentMove": current_move,
            "scriptActive": script_active,
            "scriptPointer": f"0x{script_pointer:x}",
            "scriptPointerParity": script_pointer & 1,
            "animationDamage": s32(animation_damage),
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
            if medium <= script_pointer < strong and medium_entry is None:
                medium_entry = event

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            observe()

    final = lab.snapshot()
    bench_after = {side: final["parties"][side][1:] for side in ("player", "opponent")}
    attacker_pp_after = final["parties"][attacker_side][0]["pp"]
    if entry is None or root_entry is None or medium_entry is None:
        raise RuntimeError(
            "did not observe MOVE_SEISMIC_TOSS entry/root/medium: "
            + f"entry={entry is not None}, root={root_entry is not None}, medium={medium_entry is not None}"
        )
    if entry["currentMove"] != MOVE or not start <= int(root_entry["scriptPointer"], 16) < end:
        raise RuntimeError("MOVE_SEISMIC_TOSS source entry contract failed")
    if medium_entry["animationDamage"] != 50 or medium_entry["returnArg"] != 1:
        raise RuntimeError("level-50 Seismic Toss did not select its 33..65 medium branch")
    if side_for_battler(medium_entry["attackerBattler"]) != attacker_side or side_for_battler(medium_entry["targetBattler"]) != target_side:
        raise RuntimeError("observed animation battlers do not match fixture orientation")
    if target_initial["hp"] != target_initial["maxHp"] or target_initial["maxHp"] <= medium_entry["animationDamage"]:
        raise RuntimeError("Onix target is not a full-HP legal non-KO geometry for the 50-damage medium branch")
    if sum(attacker_pp_before) - sum(attacker_pp_after) != 1:
        raise RuntimeError(f"expected exactly one Seismic Toss PP spent: {attacker_pp_before} -> {attacker_pp_after}")
    if bench_before != bench_after or not all(mon["checksumValid"] for side in bench_after.values() for mon in side):
        raise RuntimeError("bench records changed during Seismic Toss staging")
    if not transient_free(initial):
        raise RuntimeError("fixture initial state contains transient battle state")

    result = {
        "schema": "seismic-toss-compact-staging/v1",
        "oracleProfile": "battle-scene-on",
        "move": "MOVE_SEISMIC_TOSS",
        "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)),
        "sourceInitialized": setup["sourceInitialized"],
        "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {
            "side": attacker_side,
            "partyIndex": 0,
            "species": initial["parties"][attacker_side][0]["species"],
            "level": initial["parties"][attacker_side][0]["level"],
        },
        "target": {
            "side": target_side,
            "partyIndex": 0,
            "species": initial["parties"][target_side][0]["species"],
            "initialHp": target_initial["hp"],
            "maxHp": target_initial["maxHp"],
        },
        "entry": entry,
        "root": {
            "symbol": ROOT_LABEL,
            "start": f"0x{start:x}",
            "endExclusive": f"0x{end:x}",
            "observations": root_observations,
            "first": root_entry,
        },
        "branch": {
            "selector": "AnimTask_GetSeismicTossDamageLevel",
            "returnArgIndex": 7,
            "animationDamage": medium_entry["animationDamage"],
            "result": medium_entry["returnArg"],
            "label": MEDIUM_LABEL,
            "start": f"0x{medium:x}",
            "endExclusive": f"0x{strong:x}",
            "first": medium_entry,
        },
        "pp": {"before": attacker_pp_before, "after": attacker_pp_after, "spent": 1},
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True},
        "transientFreeSetup": True,
        "scope": {
            "framebuffersRetained": False,
            "denseWindowCaptured": False,
            "latchMeasured": False,
            "productionChanged": False,
            "coveragePromotion": False,
            "transientOverrides": [],
        },
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(
        f"wrote {OUTPUT}: {attacker_side} Kecleon reached MOVE_SEISMIC_TOSS/"
        "SeismicTossMedium with 50 level damage; one PP spent; benches unchanged"
    )


if __name__ == "__main__":
    main()
