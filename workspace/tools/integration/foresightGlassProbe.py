#!/usr/bin/env python3
"""#145b: per-frame OBJ dump of the Foresight magnifying glass (slot with AnimForesightMagnifyingGlass_Step) from direct mGBA, Scene ON.
usage: foresightGlassProbe.py <scenario.json> <out.json>   (workspace root, mgba venv)"""
import json, subprocess, sys
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
_d = json.loads(SCEN.read_text()); _d["profile"] = "battle-scene-on"
req = validate_request(_d, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
step_fn = sym["AnimForesightMagnifyingGlass_Step"] | 1
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
sg = lambda a: (lambda v: v - 0x10000 if v >= 0x8000 else v)(u16(a))
rows, f = [], 0
def snap():
    b = sym["gSprites"]
    for i in range(64):
        a = b + i * 0x44
        if u8(a + 0x3e) & 1 and u32(a + 0x1c) in (step_fn, step_fn & ~1):
            rows.append({"f": f, "slot": i, "x": sg(a + 0x20), "y": sg(a + 0x22), "x2": sg(a + 0x24), "y2": sg(a + 0x26),
                         "tx2": sg(b + u8(sym["gBattlerSpriteIds"] + 1) * 0x44 + 0x24), "ty2": sg(b + u8(sym["gBattlerSpriteIds"] + 1) * 0x44 + 0x26), "oam": [u16(a), u16(a + 2), u16(a + 4)], "data": [sg(a + 0x2e + 2 * k) for k in range(8)]})
snap()
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; snap()
coords = {"battlerXY": [[sg(sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + bb) * 0x44 + k) for k in (0x20, 0x22)] for bb in (0, 1)]}
OUT.write_text(json.dumps({"scenario": SCEN.name, "frames": f, "coords": coords, "rows": rows}))
