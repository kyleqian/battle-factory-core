#!/usr/bin/env python3
"""prep13 (copy of prep11Probe.py + spawn x/y, personality, IVs word, gRng2Value/gRngValue at activation): direct-mGBA (Scene ON, fresh process) per-body input probe for the S10A SMALL-INPUT moves.
usage: prep11Probe.py <scenario.json> <output.json>      (run from the workspace root with the mgba venv; see prep11Probes.sh)
Per frame: gAnimScriptActive / sAnimMoveIndex -> every animation body (move id, start frame, end frame).  At each body's activation frame and at end+1 records
gAnimMovePower, gBattleMovePower, gDynamicBasePower, gAnimMoveDmg, gBattleMoveDamage, gBattleScripting.animTurn/animTargetsHit, gMultiHitCounter, gCurrentMove,
gBattlerAttacker/Target, both battlers' hp/maxHP/status1/species, gOamMatrixAllocBitmap, active task count, sSpriteOrder (64), in-use sprite slots.
Also logs every CHANGE of gBattleMovePower / gDynamicBasePower / gAnimMovePower with the frame and gCurrentMove (the stale-power writers)."""
import json, os, subprocess, sys
ALWAYS = os.environ.get("PREP11_ALWAYS") == "1"  # log series/spawns/tasks for the whole run (forced-switch continuation)
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
_d = json.loads(SCEN.read_text()); _d["profile"] = "battle-scene-on"  # scene-off lab files: same logic; animation bodies only run Scene ON
req = validate_request(_d, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
def s32(a):
    v = u32(a); return v - (1 << 32) if v >= 1 << 31 else v
def mon(b):
    a = sym["gBattleMons"] + 0x58 * b
    return {"species": u16(a), "hp": u16(a + 0x28), "maxHP": u16(a + 0x2c), "status1": u32(a + 0x4c), "status2": u32(a + 0x50), "friendship": u8(a + 0x2b), "personality": u32(a + 0x48), "ivWord": u32(a + 0x14), "otId": u32(a + 0x4c + 8) if False else 0}
def sg(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
def sprites():
    b = sym["gSprites"]; return [i for i in range(64) if u8(b + i * 0x44 + 0x3e) & 1]
def tasks():
    b = sym["gTasks"]; return [i for i in range(16) if u8(b + i * 0x28 + 4)]
def banks(base):
    return ["".join("%04x" % u16(base + 0x200 + 32 * b + 2 * c) for c in range(16)) for b in range(16)]
def bgb(base):
    return ["".join("%04x" % u16(base + 32 * b + 2 * c) for c in range(16)) for b in range(16)]
def regs():
    return {n: u16(0x04000000 + a) for n, a in (("dispcnt", 0), ("bg0", 8), ("bg1", 10), ("bg2", 12), ("bg3", 14), ("bldcnt", 0x50), ("bldalpha", 0x52), ("bldy", 0x54))}
def tfuncs():
    b = sym["gTasks"]; return {i: u32(b + i * 0x28) for i in range(16) if u8(b + i * 0x28 + 4)}
def state():
    sc = sym["gBattleScripting"]
    return {"battlerSub": [u8(sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + b) * 0x44 + 0x43) for b in (0, 1)], "battlerSpriteIds": [u8(sym["gBattlerSpriteIds"] + b) for b in (0, 1)], "battlerX2Y2": [[sg(sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + b) * 0x44 + o) for o in (0x24, 0x26)] for b in (0, 1)], "battlerXY": [[sg(sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + b) * 0x44 + o) for o in (0x20, 0x22)] for b in (0, 1)], "battlerPalNum": [u16(sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + b) * 0x44 + 4) >> 12 for b in (0, 1)], "regs": regs(), "objUnfaded": banks(sym["gPlttBufferUnfaded"]), "objFaded": banks(sym["gPlttBufferFaded"]),
            "bgUnfaded": bgb(sym["gPlttBufferUnfaded"])[:8], "taskFuncs": tfuncs(), "animTurn2": u8(sc + 24),
            "gBattleMovePower_": u16(sym["gBattleMovePower"]),"gAnimMovePower": u16(sym["gAnimMovePower"]), "gBattleMovePower": u16(sym["gBattleMovePower"]), "gDynamicBasePower": u16(sym["gDynamicBasePower"]),
            "gAnimMoveDmg": s32(sym["gAnimMoveDmg"]), "gBattleMoveDamage": s32(sym["gBattleMoveDamage"]), "animTurn": u8(sc + 24), "animTargetsHit": u8(sc + 25),
            "multiHitCounter": u8(sym["gMultiHitCounter"]), "currentMove": u16(sym["gCurrentMove"]), "attacker": u8(sym["gBattlerAttacker"]), "target": u8(sym["gBattlerTarget"]),
            "mons": [mon(0), mon(1)], "rng2": u32(sym["gRng2Value"]), "rng": u32(sym["gRngValue"]), "bitmap": u32(sym["gOamMatrixAllocBitmap"]), "tasks": tasks(), "sprites": sprites(), "spriteOrder": [u8(sym["sSpriteOrder"] + i) for i in range(64)]}
bodies, changes, spawns, bseries, oseries = [], [], [], [], []
rngser = []
species_ev, prev_species = [], None
taskev, prev_tasks, bgev, prev_bg = [], None, [], None
prev_order = None
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
    global prev_sp, prev_order
    if cur is not None: rngser.append([f, u32(sym["gRng2Value"])])
    global prev_species
    sp_now = [u16(sym["gBattleMons"] + 0x58 * b) for b in (0, 1)] + [u8(sym["gBattlerPartyIndexes"] + 2 * b) for b in (0, 1)]
    if sp_now != prev_species: species_ev.append([f, sp_now, u16(sym["gCurrentMove"]), bool(a), [u8(sym["gBattlerSpriteIds"] + b) for b in (0, 1)]]); prev_species = sp_now
    global prev_tasks, prev_bg
    if ALWAYS or cur is not None or a:  # task table changes (slot -> func) and BG/blend register changes while a body is active
        tf = tfuncs()
        if tf != prev_tasks:
            tb = sym["gTasks"]; taskev.append([f, {str(k): v for k, v in tf.items()}, {str(k): [sg(tb + k * 0x28 + 8 + 2 * j) for j in range(8)] for k in tf}]); prev_tasks = tf
        rg = regs()
        if rg != prev_bg: bgev.append([f, rg]); prev_bg = rg
    if ALWAYS or cur is not None:  # sSpriteOrder whenever it changes inside a body (hardware tie-order derivation)
        od = [u8(sym["sSpriteOrder"] + i) for i in range(64)]
        if od != prev_order: oseries.append([f, od]); prev_order = od
    if ALWAYS or cur is not None:  # battler sprite y2/x2 + matrix per frame inside a body (Pain Split offsets, shake)
        r = [f]
        for b in (0, 1):
            sa = sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + b) * 0x44
            mn = (u16(sa + 2) >> 9) & 31; ma = sym["gOamMatrices"] + 8 * mn
            r += [sg(sa + 0x24), sg(sa + 0x26), mn, u8(sa + 0x3e) >> 2 & 1, sg(ma), sg(ma + 2), sg(ma + 4), sg(ma + 6)]  # x2, y2, matrixNum, invisible, matrix a b c d
        bseries.append(r)
    if ALWAYS or cur is not None or a:  # sprite spawn/free log only while an animation script is active (+ the frame it ends)
        sp = set(sprites())
        base = sym["gSprites"]
        for i in sorted(sp - prev_sp): spawns.append({"f": f, "slot": i, "ev": "+", "tmpl": u32(base + i * 0x44 + 0x14), "attr": [u16(base + i * 0x44), u16(base + i * 0x44 + 2), u16(base + i * 0x44 + 4)],
                                                                 "x": sg(base + i * 0x44 + 0x20), "y": sg(base + i * 0x44 + 0x22), "x2": sg(base + i * 0x44 + 0x24), "y2": sg(base + i * 0x44 + 0x26), "cb": u32(base + i * 0x44 + 0x1c), "data": [sg(base + i * 0x44 + 0x2e + 2 * k) for k in range(8)], "sub": u8(base + i * 0x44 + 0x43)})
        for i in sorted(prev_sp - sp): spawns.append({"f": f, "slot": i, "ev": "-"})
        for e in spawns:
            if e["ev"] == "+" and "attrLate" not in e and f == e["f"] + 3 and e["slot"] in sp:
                e["attrLate"] = [u16(base + e["slot"] * 0x44), u16(base + e["slot"] * 0x44 + 2), u16(base + e["slot"] * 0x44 + 4)]
        prev_sp = sp
    else: prev_sp = set(sprites())
    if cur is None and a:
        cur = {"move": m, "start": f, "end": None, "atActivation": state()}; bodies.append(cur)
    elif cur is not None and (not a or cur["move"] != m):
        cur["end"] = f; pending_end.append((f + 1, cur)); cur = None
        if a: cur = {"move": m, "start": f, "end": None, "atActivation": state()}; bodies.append(cur)
step()
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; step()
OUT.write_text(json.dumps({"scenario": SCEN.name, "frames": f, "bodies": bodies, "powerChanges": changes, "spawns": spawns, "battlerSeries": bseries, "orderSeries": oseries, "rng2Series": rngser, "speciesEvents": species_ev, "taskEvents": taskev, "regEvents": bgev, "battlerPal": [(u16(sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + b) * 0x44 + 4) >> 12) for b in (0, 1)], "taskFuncNames": {str(v): k for k, v in sym.items() if k.startswith(("Task_", "AnimTask_", "sub_"))} }, separators=(",", ":")))
