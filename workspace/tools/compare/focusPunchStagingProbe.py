#!/usr/bin/env python3
"""Compact Scene-ON staging evidence for a legal MOVE_FOCUS_PUNCH attack.

The probe samples every requested emulator frame, but keeps only the entry,
target-background, and first-inactive lifecycle summaries.  It deliberately
does not retain RGB, framebuffers, OAM, palettes, audio state, or a dense
per-frame archive; it is a staging checkpoint rather than exact evidence.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: focusPunchStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 264
ROOT_LABEL = "Move_FOCUS_PUNCH"
END_LABEL = "Move_RETURN"
CONTEST_LABEL = "FocusPunchInContest"


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
    contest_start = names[CONTEST_LABEL]
    pointer = names["sBattleAnimScriptPtr"]
    active = names["gAnimScriptActive"]
    args = names["gBattleAnimArgs"]
    attacker_id = names["gBattleAnimAttacker"]
    target_id = names["gBattleAnimTarget"]
    visual_tasks = names["gAnimVisualTaskCount"]
    sound_tasks = names["gAnimSoundTaskCount"]
    tasks = names["gTasks"]
    fade_task = names["Task_FadeToBg"] | 1

    u8 = oracle.read_u8
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16
    s16 = lambda address: (lambda value: value - 0x10000 if value >= 0x8000 else value)(u16(address))

    def active_fade_backgrounds() -> list[int]:
        backgrounds = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4) and u32(base) == fade_task:
                backgrounds.append(s16(base + 8))
        return backgrounds

    initial = lab.snapshot()
    attacker_side = "player" if initial["parties"]["player"][0]["moves"] == [MOVE] * 4 else "opponent"
    target_side = "opponent" if attacker_side == "player" else "player"
    expected_background_id = 4 if target_side == "opponent" else 5
    expected_branch = "FocusPunchOnOpponent" if target_side == "opponent" else "FocusPunchOnPlayer"
    branch_start = names[expected_branch]
    branch_end = names["FocusPunchOnPlayer"] if expected_branch == "FocusPunchOnOpponent" else contest_start
    target_initial = initial["battlers"][target_side]
    attacker_initial = initial["battlers"][attacker_side]
    bench_before = {side: initial["parties"][side][1:] for side in ("player", "opponent")}
    attacker_pp_before = initial["parties"][attacker_side][0]["pp"]
    root_entry = first_background = first_inactive = None
    root_start_frame = root_last_frame = None
    root_observations = 0
    target_background_ids: set[int] = set()
    contest_branch_observed = False
    frame = 0

    def event(script_pointer: int, script_active: bool, snapshot: dict, backgrounds: list[int]) -> dict:
        return {
            "frame": frame,
            "currentMove": snapshot["engine"]["currentMove"],
            "scriptActive": script_active,
            "scriptPointer": f"0x{script_pointer:x}",
            "returnArg": s16(args + 14),
            "attackerBattler": u8(attacker_id),
            "targetBattler": u8(target_id),
            "visualTaskCount": u8(visual_tasks),
            "soundTaskCount": u8(sound_tasks),
            "fadeBackgroundIds": backgrounds,
        }

    def observe() -> None:
        nonlocal root_entry, first_background, first_inactive
        nonlocal root_start_frame, root_last_frame, root_observations, contest_branch_observed
        snapshot = lab.snapshot()
        script_pointer = u32(pointer)
        script_active = bool(u8(active))
        backgrounds = active_fade_backgrounds()
        sample = event(script_pointer, script_active, snapshot, backgrounds)
        in_root = script_active and root_start <= script_pointer < root_end
        if in_root:
            if root_start_frame is None:
                root_start_frame = frame
                root_entry = sample
            root_last_frame = frame
            root_observations += 1
            if contest_start <= script_pointer < root_end:
                contest_branch_observed = True
            for background in backgrounds:
                if background in (4, 5, 6):
                    target_background_ids.add(background)
                    if background == expected_background_id and first_background is None:
                        first_background = sample
        elif root_start_frame is not None and first_inactive is None and not script_active:
            first_inactive = sample

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            observe()

    final = lab.snapshot()
    bench_after = {side: final["parties"][side][1:] for side in ("player", "opponent")}
    attacker_pp_after = final["parties"][attacker_side][0]["pp"]
    if root_entry is None or first_background is None or first_inactive is None:
        raise RuntimeError(
            "did not observe Focus Punch root/target background/cleanup: "
            + f"root={root_entry is not None}, background={first_background is not None}, "
            + f"inactive={first_inactive is not None}"
        )
    if root_start_frame is None or root_last_frame is None:
        raise RuntimeError("Focus Punch root window did not start")
    if side_for_battler(root_entry["attackerBattler"]) != attacker_side or side_for_battler(root_entry["targetBattler"]) != target_side:
        raise RuntimeError("observed animation battlers do not match fixture orientation")
    if set(target_background_ids) != {expected_background_id} or contest_branch_observed:
        raise RuntimeError(f"Focus Punch selected unexpected target/contest background {sorted(target_background_ids)}")
    expected_return_arg = 0 if target_side == "opponent" else 1
    if first_background["returnArg"] != expected_return_arg:
        raise RuntimeError(f"target-side selector returnArg {first_background['returnArg']} != {expected_return_arg}")
    if root_last_frame + 1 != first_inactive["frame"]:
        raise RuntimeError(f"Focus Punch root is not dense through cleanup: {root_last_frame}->{first_inactive['frame']}")
    if first_inactive["visualTaskCount"] != 0 or first_inactive["soundTaskCount"] != 0 or first_inactive["fadeBackgroundIds"]:
        raise RuntimeError(f"Focus Punch first inactive cleanup still has animation work: {first_inactive}")
    if sum(attacker_pp_before) - sum(attacker_pp_after) != 1:
        raise RuntimeError(f"expected exactly one Focus Punch PP spent: {attacker_pp_before} -> {attacker_pp_after}")
    if final["battlers"][attacker_side]["hp"] != attacker_initial["hp"]:
        raise RuntimeError("Focus Punch attacker was damaged despite the Light Screen opponent setup")
    if final["battlers"][target_side]["hp"] >= target_initial["hp"]:
        raise RuntimeError("Focus Punch target did not take real ROM damage")
    if final["sideConditions"][target_side]["lightScreenTurns"] <= 0:
        raise RuntimeError("opposing Light Screen was not staged by a real move")
    if bench_before != bench_after or not all(mon["checksumValid"] for side in bench_after.values() for mon in side):
        raise RuntimeError("bench records changed during Focus Punch staging")
    if not transient_free(initial):
        raise RuntimeError("fixture initial state contains transient battle state")

    result = {
        "schema": "focus-punch-compact-staging/v1",
        "oracleProfile": "battle-scene-on",
        "move": "MOVE_FOCUS_PUNCH",
        "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)),
        "sourceInitialized": setup["sourceInitialized"],
        "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {
            "side": attacker_side,
            "partyIndex": 0,
            "species": initial["parties"][attacker_side][0]["species"],
            "level": initial["parties"][attacker_side][0]["level"],
            "frontierCarrier": {"setId": 480, "name": "FRONTIER_MON_BRELOOM_2"},
        },
        "target": {
            "side": target_side,
            "partyIndex": 0,
            "species": initial["parties"][target_side][0]["species"],
            "initialHp": target_initial["hp"],
            "finalHp": final["battlers"][target_side]["hp"],
            "lightScreenTurns": final["sideConditions"][target_side]["lightScreenTurns"],
        },
        "root": {
            "symbol": ROOT_LABEL,
            "start": f"0x{root_start:x}",
            "endExclusive": f"0x{root_end:x}",
            "entry": root_entry,
            "sampledEveryFrame": True,
            "sourceWindow": {
                "startFrame": root_start_frame,
                "lastActiveFrame": root_last_frame,
                "firstInactiveFrame": first_inactive["frame"],
                "activeFrameCount": root_observations,
                "throughFirstInactiveCleanup": True,
            },
            "firstInactiveCleanup": first_inactive,
        },
        "branch": {
            "selector": "AnimTask_IsTargetPlayerSide",
            "label": expected_branch,
            "start": f"0x{branch_start:x}",
            "endExclusive": f"0x{branch_end:x}",
            "selectionObservedBy": "Task_FadeToBg.data[0]",
            "pointerLabelSampled": False,
            "targetBackground": {
                "expectedId": expected_background_id,
                "observedIds": sorted(target_background_ids),
                "first": first_background,
            },
            "contestBackgroundId": 6,
            "contestBranchObserved": contest_branch_observed,
        },
        "pp": {"before": attacker_pp_before, "after": attacker_pp_after, "spent": 1},
        "benches": {"partyIndices": [1, 2], "unchanged": True, "checksumValid": True},
        "transientFreeSetup": True,
        "scope": {
            "framebuffersRetained": False,
            "denseWindowRetained": False,
            "sampledEveryFrame": True,
            "latchMeasured": False,
            "productionChanged": False,
            "coveragePromotion": False,
            "transientOverrides": [],
        },
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(
        f"wrote {OUTPUT}: {attacker_side}-back Focus Punch reached {ROOT_LABEL}/{expected_branch}; "
        f"BG {expected_background_id}; frames {root_start_frame}..{first_inactive['frame']} through inactive cleanup"
    )


if __name__ == "__main__":
    main()
