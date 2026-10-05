#!/usr/bin/env python3
"""prep10: after a BattleLab run, decrypt gPlayerParty[0] / gEnemyParty[0] growth substructs and print the party species next to gBattleMons species.
GetBattlerYDeltaFromSpriteId (battle_anim_mons.c:1897) reads the PARTY species, so this proves whether a lab species override reached the party.
usage: prep10PartySpecies.py <scenario.json>"""
import json, subprocess, sys
from pathlib import Path
SCEN = Path(sys.argv[1]); ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
d = json.loads(SCEN.read_text()); d["profile"] = "battle-scene-on"
req = validate_request(d, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
for seg in req["trace"]["segments"][:6]:
    for _ in range(seg["frames"]): o.advance(seg.get("buttons", []))
ORD = ["GAEM","GAME","GEAM","GEMA","GMAE","GMEA","AGEM","AGME","AEGM","AEMG","AMGE","AMEG","EGAM","EGMA","EAGM","EAMG","EMGA","EMAG","MGAE","MGEA","MAGE","MAEG","MEGA","MEAG"]
def species(base):
    pid, oid = o.read_u32(base), o.read_u32(base + 4); key = pid ^ oid
    pos = ORD[pid % 24].index("G")
    return (o.read_u32(base + 0x20 + 12 * pos) ^ key) & 0xffff
out = {"scenario": SCEN.name, "playerParty0": species(sym["gPlayerParty"]), "enemyParty0": species(sym["gEnemyParty"]),
       "gBattleMons": [o.read_u16(sym["gBattleMons"] + 0x58 * b) for b in (0, 1)]}
print(json.dumps(out))
