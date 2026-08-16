#!/usr/bin/env python3
"""Find legal mechanicLab seeds with five consecutive natural Rollout bodies."""
from __future__ import annotations
import json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit("usage: rolloutSeedScout.py <scenario> <seed-start> <count> <output.json>")
SCENARIO, SEED_START, COUNT, OUTPUT = Path(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), Path(sys.argv[4])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

def main() -> None:
    base = json.loads(SCENARIO.read_text()); ref = (ROOT / "reference/pokeemerald").resolve()
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names = {p[2]: int(p[0], 16) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])}
    results = []
    for seed in range(SEED_START, SEED_START + COUNT):
        request = dict(base); request["seed"] = seed; request = validate_request(request, "battle-scene-on")
        oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
        lab = BattleLab(oracle, "battle-scene-on"); lab.prepare(request)
        u8, u32 = oracle.read_u8, oracle.read_u32
        counters, capturing, frame = [], False, 0
        def take():
            nonlocal capturing
            script = u32(names["sBattleAnimScriptPtr"]); active = bool(u8(names["gAnimScriptActive"])); in_source = names["Move_ROLLOUT"] <= script < names["Move_FALSE_SWIPE"] and active
            if in_source and not capturing:
                ptr = u32(names["gAnimDisableStructPtr"]); packed = u8(ptr + 0x11)
                damage = u32(names["gAnimMoveDmg"])
                if damage >= 0x80000000: damage -= 0x100000000
                counters.append({"frame":frame,"counter":(packed >> 4) - (packed & 15),"timer":packed & 15,"start":packed >> 4,"power":oracle.read_u16(names["gAnimMovePower"]),"damage":damage})
                capturing = True
            elif capturing and not active:
                capturing = False
        take()
        for segment in request["trace"]["segments"]:
            for _ in range(segment["frames"]):
                oracle.advance(segment.get("buttons", [])); frame += 1; take()
        for age in range(9000):
            if len(counters) >= 5 and not capturing: break
            oracle.advance(["A"] if age % 30 < 2 else []); frame += 1; take()
        results.append({"seed":seed,"counters":counters[:5],"exactFive": [x["counter"] for x in counters[:5]] == [1,2,3,4,5]})
        if results[-1]["exactFive"]: break
    OUTPUT.write_text(json.dumps({"scenario":str(SCENARIO),"results":results},separators=(",",":"))+"\n")
    print(f"wrote {OUTPUT}: {len(results)} seeds, matches {[r['seed'] for r in results if r['exactFive']]}")

if __name__ == "__main__": main()
