#!/usr/bin/env python3
"""spark62: Spark (209) flashing-sprite creation-context probe (fresh direct mGBA process, Scene ON; never the shared HTTP oracles).

usage: spark62Probe.py <scenario.json> <output.json>     (workspace root, mgba venv; see spark62Probes.sh)
Frame numbering as prep10Probe.py (frame 0 = after BattleLab.prepare). For the first Move_SPARK body (gAnimScriptActive rising edge, sAnimMoveIndex 209):
- per frame, body ages 44..58: the screen sha256, gSprites[3..12] inUse / callback / template / data[0..7] / x2 / y2 / invisible / matrixNum, sSpriteOrder (64);
- the creation frame (first frame with a flashing sprite) is replayed from the previous frame's raw state ONE INSTRUCTION AT A TIME, logging in
  execution order every entry of CreateSpriteAndAnimate (caller via LR), AnimSparkElectricityFlashing / _Step (sprite slot from r0),
  AnimateSprite (slot: the traversal position of AnimateSprites / CreateSpriteAndAnimate), AnimateSprites, BuildOamBuffer, RunTasks,
  BattleMainCB1 / BattleMainCB2, DestroySprite (slot), and the VBlank frame-counter edge.
"""
import bisect, hashlib, json, subprocess, sys
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402
from mgba._pylib import ffi  # noqa: E402
import os  # noqa: E402
SCREENS = Path(os.environ["SPARK62_SCREENS"]) if os.environ.get("SPARK62_SCREENS") else None  # optional PNG dump, body ages 49..54

ref = ROOT / "reference" / "pokeemerald"
d = json.loads(SCEN.read_text()); d["profile"] = "battle-scene-on"
req = validate_request(d, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
pairs = [(int(p[0], 16), p[2]) for p in (l.split() for l in nm.splitlines()) if len(p) == 3]
sym = {n: a for a, n in pairs}
funcs = sorted((a, n) for a, n in pairs if 0x08000000 <= a < 0x0A000000)
faddr = [a for a, _ in funcs]
def fname(a):
    i = bisect.bisect_right(faddr, a & ~1) - 1
    return f"{funcs[i][1]}+{(a & ~1) - funcs[i][0]:#x}" if i >= 0 else hex(a)
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
def s16(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
GS = sym["gSprites"]
FLASH, FLASH_STEP = sym["AnimSparkElectricityFlashing"] & ~1, sym["AnimSparkElectricityFlashing_Step"] & ~1
def slot_row(i):
    b = GS + i * 0x44
    return {"slot": i, "inUse": u8(b + 0x3e) & 1, "cb": fname(u32(b + 0x1c)), "tmpl": u32(b + 0x14), "data": [s16(b + 0x2e + 2 * k) for k in range(8)],
            "x2": s16(b + 0x24), "y2": s16(b + 0x26), "invisible": (u8(b + 0x3e) >> 2) & 1, "matrixNum": (u16(b + 2) >> 9) & 31, "sub": u8(b + 0x43)}
def flashing_slots():
    return [i for i in range(64) if u8(GS + i * 0x44 + 0x3e) & 1 and (u32(GS + i * 0x44 + 0x1c) & ~1) in (FLASH, FLASH_STEP)]
WATCH = {sym[n] & ~1: n for n in ("CreateSpriteAndAnimate", "AnimSparkElectricityFlashing", "AnimSparkElectricityFlashing_Step", "AnimateSprite",
                                   "AnimateSprites", "BuildOamBuffer", "RunTasks", "BattleMainCB1", "BattleMainCB2", "DestroySprite", "RunAnimScriptCommand",
                                   "OpponentDoMoveAnimation", "PlayerDoMoveAnimation") if n in sym}
cpu = o.core.cpu
def trace_frame():
    """Step one emulated frame instruction by instruction; return the ordered watched-entry log."""
    log, fc0 = [], o.core.frame_counter
    seen_last = None
    while o.core.frame_counter == fc0:
        pc = cpu.gprs[15]; thumb = (cpu._native.cpsr.packed >> 5) & 1
        ex = pc - (4 if thumb else 8)
        if ex in WATCH and ex != seen_last:
            n = WATCH[ex]; r0 = cpu.gprs[0]; lr = cpu.gprs[14]
            e = {"fn": n, "lr": fname(lr)}
            if n in ("AnimSparkElectricityFlashing", "AnimSparkElectricityFlashing_Step", "AnimateSprite", "DestroySprite") and GS <= r0 < GS + 64 * 0x44:
                e["slot"] = (r0 - GS) // 0x44
            log.append(e)
        seen_last = ex
        o.core.step()
    return log
bodies, frames, ctx = [], [], None
f = 0; cur = None; prev_state = None; done = False
def anim():
    return bool(u8(sym["gAnimScriptActive"])), u16(sym["sAnimMoveIndex"])
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        if done: break
        snap = bytes(ffi.buffer(o.core.save_raw_state()))
        o.core.clear_keys(*o._key_ids.values())
        if seg.get("buttons"): o.core.set_keys(*[o._key_ids[b] for b in seg["buttons"]])
        o.core.run_frame(); f += 1
        a, m = anim()
        if cur is None and a and m == 209:
            cur = {"start": f}; bodies.append(cur)
        if cur is not None:
            age = f - cur["start"]
            if SCREENS and 49 <= age <= 54:
                SCREENS.mkdir(parents=True, exist_ok=True); o._screen_stale = False; (SCREENS / f"age{age}.png").write_bytes(o.screen_png())
            if 44 <= age <= 58:
                o._screen_stale = False
                frames.append({"f": f, "age": age, "screenSha256": hashlib.sha256(o.screen_rgb()).hexdigest(), "slots": [slot_row(i) for i in range(3, 13)], "order": [u8(sym["sSpriteOrder"] + i) for i in range(64)]})
            if ctx is None and flashing_slots():
                after = bytes(ffi.buffer(o.core.save_raw_state()))
                o.core.load_raw_state(snap)
                log = trace_frame()
                check = [slot_row(i) for i in range(3, 13)]
                ctx = {"f": f, "age": age, "flashingSlots": flashing_slots(), "log": log, "replaySlots": check}
                o.core.load_raw_state(after)
            if age > 58: done = True
OUT.write_text(json.dumps({"scenario": SCEN.name, "bodies": bodies, "frames": frames, "creation": ctx}, separators=(",", ":")))
print(OUT, bodies, ctx and ctx["age"], ctx and ctx["flashingSlots"])
