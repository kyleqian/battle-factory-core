#!/usr/bin/env python3
"""lsd186: gBattleMons[0..1] hp / maxHP / speed / level / species per frame of one battle-lab scenario in a fresh direct mGBA process (companion of sub183RomFrames.py).
usage: lsd186RomHp.py <scenario.json> <on|off> <output.json>   -> {"mons": [{species,maxHP}...], "hp": [[hp0,hp1] per frame]}"""
import json, sys
from pathlib import Path
SCENARIO, MODE, OUTPUT = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402
PROFILE = {"on": "battle-scene-on", "off": "battle-scene-off"}[MODE]
BOOT = {"on": "factory.json", "off": "factory-battle-scene-off.json"}[MODE]
raw = json.loads(SCENARIO.read_text()); raw["profile"] = PROFILE
request = validate_request(raw, PROFILE)
ref = (ROOT / "reference/pokeemerald").resolve()
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap" / BOOT)
lab = BattleLab(oracle, PROFILE); lab.prepare(request)
base = oracle.symbols["gBattleMons"]; SZ = 0x58
rd = lambda i, off: oracle.read_u16(base + i * SZ + off)
hp = []
sample = lambda: hp.append([rd(0, 0x28), rd(1, 0x28)])
sample()
for seg in request["trace"]["segments"]:
    for _ in range(seg["frames"]):
        oracle.advance(seg.get("buttons", [])); sample()
        if len(hp) > 1000: break
    if len(hp) > 1000: break
OUTPUT.write_text(json.dumps({"scenario": SCENARIO.name, "mode": MODE, "maxHP": [rd(0, 0x2C), rd(1, 0x2C)], "species": [rd(0, 0), rd(1, 0)], "speed": [rd(0, 0x14), rd(1, 0x14)], "level": [oracle.read_u8(base + 0x2A), oracle.read_u8(base + SZ + 0x2A)], "hp": hp}, separators=(",", ":")))
