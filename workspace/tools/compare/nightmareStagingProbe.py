#!/usr/bin/env python3
"""Compact, no-frame-retention Scene-ON receipt for MOVE_NIGHTMARE."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: nightmareStagingProbe.py <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 171
ROOT_LABEL = "Move_NIGHTMARE"
END_LABEL = "Move_FLAIL"
STATUS2_NIGHTMARE = 1 << 27


def stable(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def digest(value: object) -> str:
    return hashlib.sha256(stable(value).encode()).hexdigest()


def side_for_battler(battler: int) -> str:
    return "player" if battler % 2 == 0 else "opponent"


def transient_free_except_stock_entry_weather(snapshot: dict) -> bool:
    if snapshot["battleOutcome"] != 0 or snapshot["sideStatuses"] != [0, 0]:
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


def entry_weather(snapshot: dict) -> dict:
    weather = {"weather": snapshot["weather"], "weatherTurns": snapshot["weatherTurns"]}
    if weather == {"weather": 0, "weatherTurns": 0}:
        return {"stockDerived": False, **weather}
    raise RuntimeError(f"unexpected transient initial weather: {weather}")


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
    visual, sound, mons = names["gAnimVisualTaskCount"], names["gAnimSoundTaskCount"], names["gBattleMons"]
    u8 = oracle.read_u8

    def u32(address: int) -> int:
        return u8(address) | u8(address + 1) << 8 | u8(address + 2) << 16 | u8(address + 3) << 24

    initial = lab.snapshot()
    candidates = [
        (side, index)
        for side in ("player", "opponent")
        for index, mon in enumerate(initial["parties"][side])
        if MOVE in mon["moves"]
    ]
    if len(candidates) != 1:
        raise RuntimeError(f"expected one Nightmare party carrier, got {candidates}")
    attacker_side, attacker_index = candidates[0]
    target_side = "opponent" if attacker_side == "player" else "player"
    target_index = initial["battlers"][target_side]["partyIndex"]
    slots = [index for index, move in enumerate(initial["parties"][attacker_side][attacker_index]["moves"]) if move == MOVE]
    pp_before = sum(initial["parties"][attacker_side][attacker_index]["pp"][index] for index in slots)
    bench_indices = {
        side: [
            index
            for index in range(3)
            if not (side == attacker_side and index == attacker_index)
            and not (side == target_side and index == target_index)
        ]
        for side in ("player", "opponent")
    }
    benches_before = {
        side: {str(index): initial["parties"][side][index] for index in indices}
        for side, indices in bench_indices.items()
    }
    root: list[dict] = []
    nightmare_effect = None
    cleanup = None

    def observe() -> None:
        nonlocal cleanup, nightmare_effect
        ptr, on = u32(pointer), bool(u8(active))
        snapshot = lab.snapshot()
        attacker_battler, target_battler = u8(attacker_id), u8(target_id)
        target_status1 = u32(mons + target_battler * 0x58 + 0x4C)
        target_status2 = u32(mons + target_battler * 0x58 + 0x50)
        event = {
            "currentMove": snapshot["engine"]["currentMove"],
            "scriptActive": on,
            "pointer": f"0x{ptr:x}",
            "attackerBattler": attacker_battler,
            "targetBattler": target_battler,
            "targetStatus1": target_status1,
            "targetStatus2": target_status2,
        }
        if event["currentMove"] == MOVE and target_status2 & STATUS2_NIGHTMARE and nightmare_effect is None:
            nightmare_effect = event
        if on and start <= ptr < end:
            root.append({**event, "visualTasks": u8(visual), "soundTasks": u8(sound)})
        elif root and cleanup is None and not on:
            cleanup = {"visualTasks": u8(visual), "soundTasks": u8(sound)}

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            observe()
    final = lab.snapshot()
    benches_after = {
        side: {str(index): final["parties"][side][index] for index in indices}
        for side, indices in bench_indices.items()
    }
    pp_after = sum(final["parties"][attacker_side][attacker_index]["pp"][index] for index in slots)
    if not root or nightmare_effect is None or cleanup is None:
        raise RuntimeError(f"Nightmare root/effect/cleanup missing: root={len(root)} effect={nightmare_effect} cleanup={cleanup}")
    if side_for_battler(root[0]["attackerBattler"]) != attacker_side or side_for_battler(root[0]["targetBattler"]) != target_side:
        raise RuntimeError("Nightmare orientation drift")
    if root[0]["currentMove"] != MOVE or not root[0]["targetStatus1"] & 0x7:
        raise RuntimeError("Nightmare root did not retain the real sleeping-target prerequisite")
    if pp_before - pp_after != 1 or cleanup["visualTasks"] or cleanup["soundTasks"]:
        raise RuntimeError("Nightmare PP spend or animation cleanup drift")
    if final["battlers"][target_side]["status"]["kind"] != "sleep" or not nightmare_effect["targetStatus2"] & STATUS2_NIGHTMARE:
        raise RuntimeError("Nightmare did not reach the stock sleeping-target effect")
    if benches_before != benches_after or not all(mon["checksumValid"] for side in benches_after.values() for mon in side.values()):
        raise RuntimeError("unchanged checksum-valid bench contract drifted")
    if not transient_free_except_stock_entry_weather(initial) or not setup["sourceInitialized"] or not setup["customPartiesBuiltBeforeBattle"]:
        raise RuntimeError("nonlegal or injected-transient Nightmare staging")
    weather = entry_weather(initial)
    result = {
        "schema": "nightmare-compact-staging/v2",
        "oracleProfile": "battle-scene-on",
        "move": "MOVE_NIGHTMARE",
        "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)),
        "sourceInitialized": setup["sourceInitialized"],
        "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "partyIndex": attacker_index, "species": initial["parties"][attacker_side][attacker_index]["species"], "moves": initial["parties"][attacker_side][attacker_index]["moves"]},
        "target": {"side": target_side, "partyIndex": target_index, "species": initial["parties"][target_side][target_index]["species"]},
        "entryHooks": weather,
        "root": {"symbol": ROOT_LABEL, "start": f"0x{start:x}", "endExclusive": f"0x{end:x}", "observations": len(root), "first": root[0], "last": root[-1]},
        "stockOutcome": {"nightmareEffect": nightmare_effect, "targetStatus": final["battlers"][target_side]["status"], "battleOutcome": final["battleOutcome"]},
        "cleanup": cleanup,
        "pp": {"slots": slots, "before": pp_before, "after": pp_after, "spent": 1},
        "benches": {"partyIndices": bench_indices, "unchanged": True, "checksumValid": True, "beforeSha256": digest(benches_before), "afterSha256": digest(benches_after)},
        "transientFreeSetup": True,
        "scope": {"framebuffersRetained": False, "rawRgbRetained": False, "denseWindowCaptured": False, "semanticFramesRetained": False, "latchMeasured": False, "durableLatchRowAdded": False, "productionChanged": False, "reducerAdded": False, "typedSceneOnSeam": False, "compositorAdded": False, "coveragePromotion": False, "componentTrackFulfilled": False, "battleStateInjected": False, "transientOverrides": [], "noTimingOrLatchTransfer": True},
    }
    OUTPUT.write_text(stable(result) + "\n")


if __name__ == "__main__":
    main()
