#!/usr/bin/env python3
"""forced-switch: direct-mGBA (Scene ON, fresh process) per-frame continuation probe for Roar / Whirlwind.
usage (workspace root, mgba venv): forcedSwitchRomProbe.py <scenario.json> <out.json>
Records per frame from 5 frames before the body ends (E) .. E+WINDOW: both battler sprites (x,x2,y,y2,invisible,matrix), healthbox-ish presence via the in-use
slot list, sprite spawn/free log (tmpl/callback ptr as symbol), controller callbacks (gBattlerControllerFuncs), gBattleMainFunc, gBattlescriptCurrInstr,
gBattlerPartyIndexes, species, gBattlerSpriteIds, text-printer active flag, task funcs.  E = last frame with gAnimScriptActive for the Roar/Whirlwind body."""
import json, os, subprocess, sys
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3])
WINDOW = int(os.environ.get("FS_WINDOW", "170"))
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
PROFILE = os.environ.get("FS_PROFILE", "battle-scene-on")  # battle-scene-off: no body exists; E is anchored on the gBattlerPartyIndexes change (= ON-profile E+7)
_d = json.loads(SCEN.read_text()); _d["profile"] = PROFILE
req = validate_request(_d, PROFILE)
# offs152: boot the profile's own snapshot as oracle/server.py does (idle94Probe.py's BOOT); before offs152 the OFF profile booted the
# Scene ON factory.json, so every earlier "FS_PROFILE=battle-scene-off" probe ran with the battle scene ON.
BOOT = {"battle-scene-on": "factory.json", "battle-scene-off": "factory-battle-scene-off.json"}[PROFILE]
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / BOOT)
lab = BattleLab(o, PROFILE); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
addr = sorted((v & ~1, k) for k, v in sym.items())
import bisect
keys = [a for a, _ in addr]
def name(p):
    p &= ~1
    i = bisect.bisect_right(keys, p) - 1
    return addr[i][1] if i >= 0 and p - keys[i] < 0x2000 else hex(p)
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
def sg(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
SP = sym["gSprites"]
def spr(i, off, w=2): return (sg if w == 2 else u8)(SP + i * 0x44 + off)
def inuse(): return [i for i in range(64) if u8(SP + i * 0x44 + 0x3e) & 1]
def battler(b):
    i = u8(sym["gBattlerSpriteIds"] + b); a = SP + i * 0x44
    return [i, sg(a + 0x20), sg(a + 0x22), sg(a + 0x24), sg(a + 0x26), u8(a + 0x3e) >> 2 & 1, u8(a + 0x3e) & 1, u16(a + 2) >> 9 & 31]  # slot x y x2 y2 invisible inuse matrix
def hbox(b):
    i = u8(sym["gHealthboxSpriteIds"] + b); a = SP + i * 0x44
    return [i, sg(a + 0x20), sg(a + 0x22), sg(a + 0x24), sg(a + 0x26), u8(a + 0x3e) >> 2 & 1, u8(a + 0x3e) & 1]
def frame():
    return {"ctrl": [name(u32(sym["gBattlerControllerFuncs"] + 4 * b)) for b in (0, 1)], "main": name(u32(sym["gBattleMainFunc"])),
            "bs": u32(sym["gBattlescriptCurrInstr"]), "pidx": [u8(sym["gBattlerPartyIndexes"] + 2 * b) for b in (0, 1)],
            "species": [u16(sym["gBattleMons"] + 0x58 * b) for b in (0, 1)], "b": [battler(0), battler(1)], "h": [hbox(0), hbox(1)],
            "anim": u8(sym["gAnimScriptActive"]), "txt": "".join("%02x" % u8(sym["sTextPrinters"] + k) for k in range(0x24)), "bufftext": u8(sym["gBattleTextBuff1"]), "tasks": {i: name(u32(sym["gTasks"] + i * 0x28)) for i in range(16) if u8(sym["gTasks"] + i * 0x28 + 4)}}
rows, spawns, prev, prev_sp = {}, [], None, set()
pidx_prev = None
f = 0; E = None
def step():
    global prev, prev_sp, E, pidx_prev
    a = u8(sym["gAnimScriptActive"]); m = u16(sym["sAnimMoveIndex"])
    sp = set(inuse())
    for i in sorted(sp - prev_sp): spawns.append({"f": f, "slot": i, "ev": "+", "cb": name(u32(SP + i * 0x44 + 0x1c)), "tmpl": hex(u32(SP + i * 0x44 + 0x14)), "x": spr(i, 0x20), "y": spr(i, 0x22), "x2": spr(i, 0x24), "y2": spr(i, 0x26), "oam": [u16(SP + i * 0x44 + k) for k in (0, 2, 4)]})
    for i in sorted(prev_sp - sp): spawns.append({"f": f, "slot": i, "ev": "-"})
    prev_sp = sp
    rows[f] = frame()
    if E is None and prev is not None and prev[0] and m in (46, 18) and not a: E = f - 1
    if PROFILE == "battle-scene-off" and E is None and pidx_prev is not None and rows[f]["pidx"] != pidx_prev and f > 100: E = f - 8
    pidx_prev = rows[f]["pidx"]
    prev = (a, m)
step()
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; step()
        if E is not None and f > E + WINDOW: break
    if E is not None and f > E + WINDOW: break
keep = {k: v for k, v in rows.items() if E is not None and E - 6 <= k <= E + WINDOW}
OUT.write_text(json.dumps({"scenario": SCEN.name, "E": E, "frames": f, "rows": keep, "spawns": [s for s in spawns if E is not None and s["f"] >= E - 6]}, separators=(",", ":")))
