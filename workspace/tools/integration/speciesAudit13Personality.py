#!/usr/bin/env python3
"""speciesAudit13: the battlers' party personalities (gBattleMons[b].personality, +0x48) of a scenario, read from a fresh direct-mGBA run
40 frames into its trace (the battle is set up; prep38Probe.py does not record them). Never the shared HTTP oracles.
usage: speciesAudit13Personality.py <scenario.json> <stem>   -> one line: stem personality0 personality1 otId0 otId1"""
import json, sys
from pathlib import Path
SCENARIO, STEM = Path(sys.argv[1]), sys.argv[2]
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402
raw = json.loads(SCENARIO.read_text()); profile = raw["profile"]; request = validate_request(raw, profile)
reference = ROOT / "reference" / "pokeemerald"
bootstrap = {"battle-scene-on": "factory.json", "battle-scene-off": "factory-battle-scene-off.json"}[profile]
oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / bootstrap)
lab = BattleLab(oracle, profile); lab.prepare(request)
n = 0
for seg in request["trace"]["segments"]:
    for _ in range(seg["frames"]):
        if n >= 40: break
        oracle.advance(seg.get("buttons", [])); n += 1
mons = oracle.symbols["gBattleMons"]
print("\n" + STEM, *(oracle.read_u32(mons + b * 0x58 + 0x48) for b in (0, 1)), *(oracle.read_u32(mons + b * 0x58 + 0x54) for b in (0, 1)), flush=True)
