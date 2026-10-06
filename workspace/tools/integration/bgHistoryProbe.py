#!/usr/bin/env python3
"""BG-register history probe (S10A bg-register-history; direct mGBA, Scene ON, fresh process, prep16Probe.py shape but light: no palettes).
usage: bgHistoryProbe.py <scenario.json> <output.json>   (workspace root, mgba venv, PYTHONPATH=libmgba-py; see bgHistoryRun.sh)
Per animation body (gAnimScriptActive rising edge / sAnimMoveIndex change): signature (IO regs 0x00..0x56, gBattle_BG0..3 X/Y, software gOamMatrices sha, gOamMatrixAllocBitmap)
at activation, activation-1, end+1, end+30; attacker/target/species; plus "between": every signature change OUTSIDE a body (frame, changed regs) = the non-move units.
Also per frame outside bodies: gBattleMainFunc/battle state is not read; units are attributed by the frame window only (see bgHistoryAnalyze.py)."""
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
NAMES = {0x00: "dispcnt", 0x08: "bg0cnt", 0x0a: "bg1cnt", 0x0c: "bg2cnt", 0x0e: "bg3cnt", 0x10: "bg0hofs", 0x12: "bg0vofs", 0x14: "bg1hofs", 0x16: "bg1vofs", 0x18: "bg2hofs", 0x1a: "bg2vofs", 0x1c: "bg3hofs", 0x1e: "bg3vofs",
         0x40: "win0h", 0x42: "win1h", 0x44: "win0v", 0x46: "win1v", 0x48: "winin", 0x4a: "winout", 0x4c: "mosaic", 0x50: "bldcnt", 0x52: "bldalpha", 0x54: "bldy"}
def sg(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
def snap():
    d = {n: u16(0x04000000 + a) for a, n in NAMES.items()}
    for n in ("BG0_X", "BG0_Y", "BG1_X", "BG1_Y", "BG2_X", "BG2_Y", "BG3_X", "BG3_Y"): d["var:" + n] = sg(sym["gBattle_" + n])
    d["matricesSha"] = hashlib.sha1(json.dumps([sg(sym["gOamMatrices"] + 2 * i) for i in range(128)]).encode()).hexdigest()[:8]
    d["bitmap"] = u32(sym["gOamMatrixAllocBitmap"]); return d
bodies, pending, cur, f, last, between = [], [], None, 0, None, []
def step():
    global cur, last
    a, m = bool(u8(sym["gAnimScriptActive"])), u16(sym["sAnimMoveIndex"]); s = snap()
    for e in list(pending):
        if f == e[0]: e[1][e[2]] = [u16(sym["gBattleAnimArgs"] + 2 * i) for i in range(4)] if e[2] == "args1" else s; pending.remove(e)
    if cur is not None and (not a or cur["move"] != m):
        cur["end"] = f; pending.append((f + 1, cur, "e1")); pending.append((f + 30, cur, "e30")); cur = None
    if cur is None and a:
        cur = {"move": m, "start": f, "end": None, "pre": last, "act": s, "attacker": u8(sym["gBattlerAttacker"]), "target": u8(sym["gBattlerTarget"]),
               "hp": [u16(sym["gBattleMons"] + 0x58 * b + 0x28) for b in (0, 1)], "species": [u16(sym["gBattleMons"] + 0x58 * b) for b in (0, 1)],
               "scriptPtr": u32(sym["sBattleAnimScriptPtr"]), "args0": [u16(sym["gBattleAnimArgs"] + 2 * i) for i in range(4)]}
        bodies.append(cur); pending.append((f + 4, cur, "args1"))
    if cur is None and last is not None and s != last:
        between.append({"f": f, "chg": {k: [last[k], s[k]] for k in s if s[k] != last[k]}})
    last = s
step()
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; step()
OUT.write_text(json.dumps({"scenario": SCEN.name, "frames": f, "bodies": bodies, "between": between}, separators=(",", ":")))
