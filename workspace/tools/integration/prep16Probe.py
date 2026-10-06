#!/usr/bin/env python3
"""prep16: direct-mGBA (Scene ON, fresh process) palette + BG-register history probe (prep14Probe.py shape).
usage: prep16Probe.py <scenario.json> <output.json>   (workspace root, mgba venv, PYTHONPATH=libmgba-py; see prep16Run.sh)
Per animation body (gAnimScriptActive/sAnimMoveIndex): at every age 0..end+1 the sha1 of the three 512-entry palettes (hardware 0x05000000, gPlttBufferUnfaded,
gPlttBufferFaded); the full hex of all three at activation (age 0) and at ages FULL; the full IO register file 0x04000000..0x56, gBattle_BG0..3 X/Y, the software
gOamMatrices (32 x 4 s16) and gOamMatrixAllocBitmap at activation, one frame before activation (preAct), end+1 and end+30; the previous body's move (history)."""
import hashlib, json, subprocess, sys
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
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
FULL = {0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 20, 40, 80, 120, 160}
def sg(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
def pal(base): return "".join("%04x" % u16(base + 2 * i) for i in range(512))
def pals(): return {"hw": pal(0x05000000), "unfaded": pal(sym["gPlttBufferUnfaded"]), "faded": pal(sym["gPlttBufferFaded"])}
def sha(s): return hashlib.sha1(s.encode()).hexdigest()[:12]
def io(): return {"%02x" % a: u16(0x04000000 + a) for a in range(0, 0x58, 2)}
def snap():
    return {"io": io(), "bgVars": {n: sg(sym[n]) for n in ("gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y", "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y")},
            "matrices": [sg(sym["gOamMatrices"] + 2 * i) for i in range(128)], "bitmap": u32(sym["gOamMatrixAllocBitmap"])}
bodies, pending, cur, f, lastio, prevmove = [], [], None, 0, None, None
def step():
    global cur, lastio, prevmove
    a, m = bool(u8(sym["gAnimScriptActive"])), u16(sym["sAnimMoveIndex"])
    if cur is not None:
        age = f - cur["start"]; p = pals()
        cur["palSha"].append([sha(p["hw"]), sha(p["unfaded"]), sha(p["faded"])])
        if age in FULL: cur["palFull"][str(age)] = p
    for e in list(pending):
        if f == e[0]: e[1][e[2]] = snap(); pending.remove(e)
    if cur is not None and (not a or cur["move"] != m):
        cur["end"] = f; pending.append((f + 1, cur, "atEnd+1")); pending.append((f + 30, cur, "atEnd+30")); prevmove = cur["move"]; cur = None
    if cur is None and a:
        p = pals()
        cur = {"move": m, "start": f, "end": None, "prevMove": prevmove, "preAct": lastio, "atActivation": snap(), "palSha": [[sha(p["hw"]), sha(p["unfaded"]), sha(p["faded"])]], "palFull": {"0": p},
               "mons": [u16(sym["gBattleMons"] + 0x58 * b) for b in (0, 1)], "attacker": u8(sym["gBattlerAttacker"]), "target": u8(sym["gBattlerTarget"]),
               "battlerPalNum": [u16(sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + b) * 0x44 + 4) >> 12 for b in (0, 1)],
               "shiny": [u32(sym["gBattleMons"] + 0x58 * b + 0x48) for b in (0, 1)]}
        bodies.append(cur)
    lastio = io()
step()
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; step()
OUT.write_text(json.dumps({"scenario": SCEN.name, "frames": f, "bodies": bodies}, separators=(",", ":")))
