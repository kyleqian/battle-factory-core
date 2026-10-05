#!/usr/bin/env python3
"""prep9: direct-mGBA (Scene ON, fresh process) palette + allocator probe for a palette-snapshot move.
usage: prep9PaletteProbe.py <scenario.json> <output.json> <moveId> [tailFrames=8]
Per frame over the run: gAnimScriptActive/sAnimMoveIndex -> intervals (activation = first active frame of moveId, same detection as issue142ActivationProbe.py).
At activation-1, activation, activation+1 and end+1 of the target body: full gPlttBufferUnfaded / gPlttBufferFaded / hardware PLTT (0x05000000), 512 words each,
sSpritePaletteTags, gReservedSpritePaletteCount, gPaletteFade (12 bytes), BLDCNT/BLDALPHA/BLDY/DISPCNT, in-use gSprites (slot,tmpl,x,y,attr,subpriority), sSpriteOrder,
in-use gTasks (slot,func,priority).  Over [activation-1, end+tail] per frame: per-bank (BG 0..15 then OBJ 0..15) hashes of unfaded and faded, and hardware==faded and a spawn log
(newly in-use sprite slots with template pointer, newly active tasks with func pointer, freed slots/tasks).
"""
import json, subprocess, sys, hashlib
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3]); MOVE = int(sys.argv[3]); TAIL = int(sys.argv[4]) if len(sys.argv) > 4 else 8
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
req = validate_request(json.loads(SCEN.read_text()), "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
def words(a, n): return [u16(a + 2 * i) for i in range(n)]
PLTT = 0x05000000
def active_move(): return bool(u8(sym["gAnimScriptActive"])), u16(sym["sAnimMoveIndex"])
def s16(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
def sprites():
    b = sym["gSprites"]; r = {}
    for i in range(64):
        a = b + i * 0x44
        if u8(a + 0x3e) & 1: r[i] = {"tmpl": u32(a + 0x14), "x": s16(a + 0x20), "y": s16(a + 0x22), "attr": [u16(a), u16(a + 2), u16(a + 4)], "subpriority": u8(a + 0x43)}
    return r
def tasks():
    b = sym["gTasks"]; r = {}
    for i in range(16):
        a = b + i * 0x28
        if u8(a + 4): r[i] = {"func": u32(a), "priority": u8(a + 7)}
    return r
def pal():
    return {"unfaded": words(sym["gPlttBufferUnfaded"], 512), "faded": words(sym["gPlttBufferFaded"], 512), "hardware": words(PLTT, 512)}
def full():
    return {**pal(), "tags": words(sym["sSpritePaletteTags"], 16), "reserved": u8(sym["gReservedSpritePaletteCount"]),
            "paletteFade": [u8(sym["gPaletteFade"] + i) for i in range(12)],
            "regs": {"DISPCNT": u16(0x04000000), "BLDCNT": u16(0x04000050), "BLDALPHA": u16(0x04000052), "BLDY": u16(0x04000054),
                     "BG0CNT": u16(0x04000008), "BG1CNT": u16(0x0400000a), "BG2CNT": u16(0x0400000c), "BG3CNT": u16(0x0400000e)},
            "sprites": sprites(), "spriteOrder": [u8(sym["sSpriteOrder"] + i) for i in range(64)], "tasks": tasks()}
h = lambda w: hashlib.md5(bytes(x & 255 for x in w) + bytes(x >> 8 for x in w)).hexdigest()[:10]
# pass over the whole run: ring of last frame's full state (cheap enough: 3x512 word reads) only around the move; before that just the flag
frames = []  # (active, move)
snap, series, spawns = {}, {}, []
start = end = None
prev_full = None; prev_sp = {}; prev_tk = {}
def step(f):
    global start, end, prev_full, prev_sp, prev_tk
    a, m = active_move(); frames.append((a, m))
    if start is None and a and m == MOVE:
        start = f; snap["act-1"] = prev_full  # state one frame before (kept from previous iteration's full)
        snap["act"] = full()
    elif start is not None and end is None:
        if not a or m != MOVE: end = f
    if start is not None and f in (start + 1,): snap["act+1"] = full()
    if start is not None and (end is None or f <= end + TAIL):
        p = pal(); series[f] = {"unfaded": [h(p["unfaded"][i * 16:i * 16 + 16]) for i in range(32)], "faded": [h(p["faded"][i * 16:i * 16 + 16]) for i in range(32)], "hwEqFaded": p["hardware"] == p["faded"]}
        sp, tk = sprites(), tasks()
        for s in sp:
            if s not in prev_sp or prev_sp[s]["tmpl"] != sp[s]["tmpl"]: spawns.append({"f": f, "kind": "sprite+", "slot": s, "tmpl": sp[s]["tmpl"]})
        for s in prev_sp:
            if s not in sp: spawns.append({"f": f, "kind": "sprite-", "slot": s})
        for s in tk:
            if s not in prev_tk or prev_tk[s]["func"] != tk[s]["func"]: spawns.append({"f": f, "kind": "task+", "slot": s, "func": tk[s]["func"]})
        for s in prev_tk:
            if s not in tk: spawns.append({"f": f, "kind": "task-", "slot": s})
        prev_sp, prev_tk = sp, tk
    if end is not None and "end+1" not in snap and f == end + 1: snap["end+1"] = full()
    # keep one-frame-behind full state only until activation is found
    if start is None: prev_full = None
f = 0
# to capture act-1 we need the full state of the frame before activation: cheap trick = full() every frame is too slow, so rewind-free approach:
# sample full() lazily when the NEXT frame might activate is impossible; instead store full() every frame in a 1-deep buffer only when gAnimScriptActive was 0 and gBattleMainFunc is in the anim state.
prev_full = None
def pre_full():
    return full()
step(0)
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        # full state before this advance becomes act-1 if the advance activates the move (only costly near the move: gated on sprite/anim script pointer? keep simple: every frame once battle anim state reached)
        if start is None and u8(sym["gBattleAnimAttacker"]) is not None and u16(sym["gCurrentMove"]) == MOVE: prev_full = pre_full()
        o.advance(seg.get("buttons", [])); f += 1; step(f)
iv = []
for fr, (a, m) in enumerate(frames):
    if iv and iv[-1]["end"] is None and (not a or iv[-1]["move"] != m): iv[-1]["end"] = fr
    if a and (not iv or iv[-1]["end"] is not None): iv.append({"move": m, "start": fr, "end": None})
OUT.write_text(json.dumps({"scenario": SCEN.name, "move": MOVE, "frames": f, "intervals": iv, "activation": start, "end": end, "snapshots": snap, "series": series, "spawns": spawns}, separators=(",", ":")))
