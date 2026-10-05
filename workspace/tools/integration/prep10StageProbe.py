#!/usr/bin/env python3
"""prep10: the prep10Probe.py recording, driven through the STAGED route of tools/probe/stage-fire-punch-portable-on.py (the route the accepted
fire-punch / endeavor / ice-punch / rock-slide windows come from, so frame numbers are directly comparable with the accepted denseWindow frames).
usage: prep10StageProbe.py <output.json> <player|opponent> <fire-punch|endeavor|ice-punch|rock-slide|double-team|faint-attack>
Same staging as tools/integration/censusStageActivation.py: canonical battle1-turn1 trace through tick 1886 (action menu), then ONE write of the staged move id + PP into
battler 0 slot 0 (player) or the AI slot 3 (opponent), then trace segments 40..42 and 1480 idle frames.  Output schema = prep10Probe.py."""
import json, subprocess, sys
from pathlib import Path
OUT = Path(sys.argv[1]); SIDE = sys.argv[2]; MOVE = sys.argv[3]
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
o.new_session()
trace = json.loads((ROOT / "tools/compare/traces-groundtruth/battle1-turn1.json").read_text())["segments"]
IDS = {"fire-punch": 7, "ice-punch": 8, "faint-attack": 185, "rock-slide": 157, "double-team": 104, "endeavor": 283}
PP = {"faint-attack": 20, "double-team": 15, "rock-slide": 10, "endeavor": 5, "ice-punch": 15, "fire-punch": 15}
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
def s32(a):
    v = u32(a); return v - (1 << 32) if v >= 1 << 31 else v
def mon(b):
    a = sym["gBattleMons"] + 0x58 * b
    return {"species": u16(a), "hp": u16(a + 0x28), "maxHP": u16(a + 0x2c), "status1": u32(a + 0x4c), "status2": u32(a + 0x50), "friendship": u8(a + 0x2b)}
def sg(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
def sprites():
    b = sym["gSprites"]; return [i for i in range(64) if u8(b + i * 0x44 + 0x3e) & 1]
def tasks():
    b = sym["gTasks"]; return [i for i in range(16) if u8(b + i * 0x28 + 4)]
def state():
    sc = sym["gBattleScripting"]
    return {"gAnimMovePower": u16(sym["gAnimMovePower"]), "gBattleMovePower": u16(sym["gBattleMovePower"]), "gDynamicBasePower": u16(sym["gDynamicBasePower"]),
            "gAnimMoveDmg": s32(sym["gAnimMoveDmg"]), "gBattleMoveDamage": s32(sym["gBattleMoveDamage"]), "animTurn": u8(sc + 24), "animTargetsHit": u8(sc + 25),
            "multiHitCounter": u8(sym["gMultiHitCounter"]), "currentMove": u16(sym["gCurrentMove"]), "attacker": u8(sym["gBattlerAttacker"]), "target": u8(sym["gBattlerTarget"]),
            "mons": [mon(0), mon(1)], "bitmap": u32(sym["gOamMatrixAllocBitmap"]), "tasks": tasks(), "sprites": sprites(), "spriteOrder": [u8(sym["sSpriteOrder"] + i) for i in range(64)]}
bodies, changes, spawns = [], [], []
prev_sp = set()
cur = None; prevp = (None, None, None); pending_end = []
f = 0
def step():
    global cur, prevp
    a, m = bool(u8(sym["gAnimScriptActive"])), u16(sym["sAnimMoveIndex"])
    p = (u16(sym["gBattleMovePower"]), u16(sym["gDynamicBasePower"]), u16(sym["gAnimMovePower"]))
    if p != prevp:
        changes.append({"f": f, "gBattleMovePower": p[0], "gDynamicBasePower": p[1], "gAnimMovePower": p[2], "currentMove": u16(sym["gCurrentMove"]), "animActive": a}); prevp = p
    for e in pending_end:
        if f == e[0]: e[1]["atEnd+1"] = {k: v for k, v in state().items() if k in ("mons", "bitmap", "tasks", "sprites", "gAnimMovePower", "gBattleMovePower")}
    global prev_sp
    if cur is not None or a:  # sprite spawn/free log only while an animation script is active (+ the frame it ends)
        sp = set(sprites())
        base = sym["gSprites"]
        for i in sorted(sp - prev_sp): spawns.append({"f": f, "slot": i, "ev": "+", "tmpl": u32(base + i * 0x44 + 0x14), "attr": [u16(base + i * 0x44), u16(base + i * 0x44 + 2), u16(base + i * 0x44 + 4)],
                                                                 "x2": sg(base + i * 0x44 + 0x24), "y2": sg(base + i * 0x44 + 0x26), "cb": u32(base + i * 0x44 + 0x1c), "data": [sg(base + i * 0x44 + 0x2e + 2 * k) for k in range(8)], "sub": u8(base + i * 0x44 + 0x43)})
        for i in sorted(prev_sp - sp): spawns.append({"f": f, "slot": i, "ev": "-"})
        prev_sp = sp
    else: prev_sp = set(sprites())
    if cur is None and a:
        cur = {"move": m, "start": f, "end": None, "atActivation": state()}; bodies.append(cur)
    elif cur is not None and (not a or cur["move"] != m):
        cur["end"] = f; pending_end.append((f + 1, cur)); cur = None
        if a: cur = {"move": m, "start": f, "end": None, "atActivation": state()}; bodies.append(cur)
step()
def adv(b):
    global f
    o.advance(b); f += 1; step()
for seg in trace[:40]:
    for _ in range(int(seg["frames"])): adv(seg.get("buttons", []))
assert f == 1886, f
base = sym["gBattleMons"] + (0 if SIDE == "player" else 1) * 0x58
slot = 0 if SIDE == "player" else 3
mv = IDS[MOVE]; a = base + 0x0c + slot * 2
o.write_u8(a, mv & 255); o.write_u8(a + 1, mv >> 8); o.write_u8(base + 0x24 + slot, PP[MOVE])
for seg in trace[40:43]:
    for _ in range(int(seg["frames"])): adv(seg.get("buttons", []))
for _ in range(1480): adv([])
OUT.write_text(json.dumps({"scenario": f"staged-{MOVE}-{SIDE}", "frames": f, "bodies": bodies, "powerChanges": changes, "spawns": spawns}, separators=(",", ":")))
