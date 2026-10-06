#!/usr/bin/env python3
"""prep17: per-row position track (x, y, x2, y2, data[0..7], oam attr0-2) of every in-use sprite spawned by Mud-Slap / Sand-Attack's 30 dirt sprites + the battler anchors, direct mGBA.
usage: prep17DirtTrack.py <scenario.json> <out.json>   (rows relative to the first anim-active row of move 189/28)"""
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
nm = subprocess.run(["arm-none-eabi-nm", "-n", "--defined-only", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
s16 = lambda a: (lambda v: v - 65536 if v >= 32768 else v)(u16(a))
G = sym["gSprites"]
def snap():
    out = {}
    for i in range(64):
        b = G + i * 0x44
        if u8(b + 0x3e) & 1:
            out[i] = [s16(b + 0x20), s16(b + 0x22), s16(b + 0x24), s16(b + 0x26), [s16(b + 0x2e + 2 * j) for j in range(8)], u16(b), u16(b + 2), u16(b + 4), u8(b + 0x3e) >> 2 & 1]
    return out
f = 0; A = None; rows = {}; anchors = None
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1
        a, m = u8(sym["gAnimScriptActive"]), u16(sym["sAnimMoveIndex"])
        if A is None and a and m in (189, 28):
            A = f
            anchors = {"battlerXY": [[s16(G + u8(sym["gBattlerSpriteIds"] + b) * 0x44 + k) for k in (0x20, 0x22)] for b in (0, 1)], "species": [u16(sym["gBattleMons"] + 0x58 * b) for b in (0, 1)], "attacker": u8(sym["gBattlerAttacker"]), "target": u8(sym["gBattlerTarget"])}
        if A is not None and f - A <= 60: rows[f - A] = snap()
OUT.write_text(json.dumps({"scenario": SCEN.name, "A": A, "anchors": anchors, "rows": rows}, separators=(",", ":")))
