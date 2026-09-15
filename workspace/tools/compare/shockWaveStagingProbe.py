#!/usr/bin/env python3
"""Compact, framebuffer-free bilateral staging receipt for MOVE_SHOCK_WAVE."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: shockWaveStagingProbe.py <scenario.json> <output.json>")
SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE, CONTROL_MOVE = 351, 243

def stable(value): return json.dumps(value, sort_keys=True, separators=(",", ":"))
def digest(value): return hashlib.sha256(stable(value).encode()).hexdigest()
def side(battler): return "player" if battler % 2 == 0 else "opponent"

def main():
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names = {f[2]: int(f[0], 16) for line in nm.splitlines() if len(f := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in f[0])}
    start, end = names["Move_SHOCK_WAVE"], names["Move_HARDEN"]
    pointer, active = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"]
    visual_count, sound_count = names["gAnimVisualTaskCount"], names["gAnimSoundTaskCount"]
    attacker_id, target_id = names["gBattleAnimAttacker"], names["gBattleAnimTarget"]
    u8 = oracle.read_u8
    u16 = lambda a: u8(a) | u8(a + 1) << 8
    u32 = lambda a: u16(a) | u16(a + 2) << 16
    initial = lab.snapshot()
    attacker_side = "player" if initial["parties"]["player"][0]["moves"] == [MOVE] * 4 else "opponent"
    target_side = "opponent" if attacker_side == "player" else "player"
    attacker = initial["parties"][attacker_side][0]
    target = initial["parties"][target_side][0]
    if attacker["moves"] != [MOVE] * 4 or target["moves"] != [CONTROL_MOVE] * 4:
        raise RuntimeError("active four-slot constraints drifted")
    benches_before = {s: initial["parties"][s][1:] for s in ("player", "opponent")}
    pp_before, hp_before = attacker["pp"], initial["battlers"][target_side]["hp"]
    first = cleanup = None
    observations = frame = 0
    root_seen = False

    def observe():
        nonlocal first, cleanup, observations, root_seen
        snap = lab.snapshot(); ptr = u32(pointer); is_active = bool(u8(active))
        event = {"frame": frame, "currentMove": snap["engine"]["currentMove"], "scriptPointer": f"0x{ptr:x}", "attackerBattler": u8(attacker_id), "targetBattler": u8(target_id), "visualTaskCount": u8(visual_count), "soundTaskCount": u8(sound_count)}
        if is_active and start <= ptr < end:
            root_seen = True; observations += 1
            if first is None and side(event["attackerBattler"]) == attacker_side: first = event
        if root_seen and not is_active and cleanup is None: cleanup = event

    observe()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; observe()
    final = lab.snapshot(); pp_after = final["parties"][attacker_side][0]["pp"]
    benches_after = {s: final["parties"][s][1:] for s in ("player", "opponent")}
    if first is None or cleanup is None or cleanup["visualTaskCount"] or cleanup["soundTaskCount"]: raise RuntimeError("root/clean inactive edge missing")
    if sum(pp_before) - sum(pp_after) != 1: raise RuntimeError(f"one PP not spent: {pp_before}->{pp_after}")
    if final["parties"][target_side][0]["hp"] >= hp_before: raise RuntimeError("Shock Wave did not damage target")
    if benches_before != benches_after or not all(m["checksumValid"] for v in benches_after.values() for m in v): raise RuntimeError("benches changed")
    result = {
        "schema": "shock-wave-compact-staging/v1", "oracleProfile": "battle-scene-on", "move": "MOVE_SHOCK_WAVE", "moveId": MOVE,
        "scenario": str(SCENARIO.resolve().relative_to(ROOT)), "sourceInitialized": setup["sourceInitialized"], "customPartiesBuiltBeforeBattle": setup["customPartiesBuiltBeforeBattle"],
        "attacker": {"side": attacker_side, "species": attacker["species"], "moves": attacker["moves"], "speed": initial["battlers"][attacker_side]["stats"]["speed"]},
        "target": {"side": target_side, "species": target["species"], "moves": target["moves"], "speed": initial["battlers"][target_side]["stats"]["speed"], "initialHp": hp_before, "finalHp": final["parties"][target_side][0]["hp"]},
        "root": {"symbol": "Move_SHOCK_WAVE", "start": f"0x{start:x}", "endExclusive": f"0x{end:x}", "observations": observations, "first": first, "firstInactiveCleanup": cleanup},
        "pp": {"before": pp_before, "after": pp_after, "spent": 1},
        "benches": {"unchanged": True, "checksumValid": True, "beforeSha256": digest(benches_before), "afterSha256": digest(benches_after)},
        "scope": {"framebuffersRetained": False, "rawRgbRetained": False, "denseWindowCaptured": False, "semanticFramesRetained": False, "latchMeasured": False, "productionChanged": False, "reducerAdded": False, "typedSceneOnSeam": False, "compositorAdded": False, "coveragePromotion": False, "componentTrackFulfilled": False, "battleStateInjected": False, "noTimingOrLatchTransfer": True}
    }
    OUTPUT.write_text(stable(result) + "\n")
    print(f"wrote {OUTPUT}: {attacker_side} Shock Wave; one PP spent; clean inactive edge; benches unchanged")

if __name__ == "__main__": main()
