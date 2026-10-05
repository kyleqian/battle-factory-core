#!/usr/bin/env python3
"""Per-frame sSpriteOrder + allocator-call/marker probe of a REAL ordinary-Factory battle history (Scene ON, direct mGBA).

usage: spriteOrderRealRouteProbe.py <trace.json> <output.json> [label]
Boots the open Level-50 rental draft (oracle/bootstrap/factory.json) in-process and plays the button segments of <trace.json>
(tools/compare/traces-groundtruth/battle1-*.json).  Pass 1 (fast) samples every frame: 64-byte sSpriteOrder, inUse mask, gAnimScriptActive,
sAnimMoveIndex, gBattleAnimAttacker, plus a sparse battle-context log (gBattleMainFunc, controller funcs, gBattlerAttacker/Target, gCurrentMove,
gBattleOutcome).  Frames where occupancy/template identity changes or an animation is launched are flagged.  Pass 2 (fresh identical run)
single-steps only flagged frames and records every CreateSprite*/DestroySprite entry (slot, caller LR) and exact-entry markers
(DoHitAnimHealthboxEffect, DoBounceEffect, EndBounceEffect, LaunchBattleAnimation, TryHandleLaunchBattleTableAnimation, InitAndLaunchSpecialAnimation,
LaunchStatusAnimation).  Adapted from spriteOrderFactoryEntryProbe.py + spriteOrderGapCallProbe.py.
"""
from __future__ import annotations
import bisect, gc, hashlib, json, os, subprocess, sys
from pathlib import Path

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
if len(ARGS) not in (2, 3):
    raise SystemExit("usage: spriteOrderRealRouteProbe.py <trace.json> <output.json> [label]")
SCENARIO, OUTPUT = map(Path, ARGS[:2])
LABEL = ARGS[2] if len(ARGS) == 3 else SCENARIO.stem
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

IDENT = list(range(64))
SPRITE_SIZE = 0x44
THUMB_PIPELINE = 2
MAX_FRAME_STEPS = 20_000_000
REF = ROOT / "reference" / "pokeemerald"


def symbol_data():
    text = subprocess.run(["arm-none-eabi-nm", "--defined-only", "-n", str(REF / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names, by_address, functions = {}, {}, []
    for line in text.splitlines():
        f = line.split()
        if len(f) != 3:
            continue
        address = int(f[0], 16) & ~1
        names[f[2]] = address
        by_address.setdefault(address, []).append(f[2])
        if f[1] in ("t", "T"):
            functions.append((address, f[2]))
    functions.sort()
    return names, by_address, functions


NAMES, ADDRESS_NAMES, FUNCTIONS = symbol_data()
FUNC_ADDRS = [a for a, _ in FUNCTIONS]
ALLOCATORS = {NAMES[n]: n for n in ("CreateSprite", "CreateSpriteAtEnd", "CreateSpriteAt", "DestroySprite")}
MARKERS = {NAMES[n]: n for n in ("DoHitAnimHealthboxEffect", "DoBounceEffect", "EndBounceEffect", "LaunchBattleAnimation", "TryHandleLaunchBattleTableAnimation",
                                 "InitAndLaunchSpecialAnimation", "LaunchStatusAnimation", "InitAndLaunchChosenStatusAnimation")}


def sym(address):
    address &= ~1
    i = bisect.bisect_right(FUNC_ADDRS, address) - 1
    if i < 0:
        return f"<unknown {address:#010x}>"
    base, name = FUNCTIONS[i]
    return name if address == base else f"{name}+0x{address - base:x}"


def new_oracle():
    return EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")


def context(o):
    u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
    return {"main": sym(u32(NAMES["gBattleMainFunc"])), "ctrl": [sym(u32(NAMES["gBattlerControllerFuncs"] + 4 * i)) for i in range(2)],
            "atk": u8(NAMES["gBattlerAttacker"]), "tgt": u8(NAMES["gBattlerTarget"]), "cur": u16(NAMES["gCurrentMove"]),
            "res": u8(NAMES["gMoveResultFlags"]), "out": u8(NAMES["gBattleOutcome"]), "script": sym(u32(NAMES["gBattlescriptCurrInstr"]))}


def stack_chain(o, limit=24):
    sp = int(o.core.cpu.gprs[13])
    chain = []
    for i in range(limit):
        if not (0x02000000 <= sp + 4 * i < 0x03007FFC):
            break
        w = o.read_u32(sp + 4 * i)
        if 0x08000001 <= w < 0x09000000 and (w & 1):
            chain.append(sym(w - 1))
    return chain


def segments(trace):
    for seg in trace["segments"]:
        for _ in range(int(seg["frames"])):
            yield seg.get("buttons", [])


def occupied(o):
    out = {}
    for slot in range(64):
        base = NAMES["gSprites"] + SPRITE_SIZE * slot
        if o.read_u8(base + 0x3E) & 1:
            out[slot] = (o.read_u32(base + 0x14), o.read_u32(base + 0x1C))
    return out


def pass1(trace):
    o = new_oracle()
    u8, u16 = o.read_u8, o.read_u16
    spr, oa = NAMES["gSprites"], NAMES["sSpriteOrder"]
    st = {"n": 0, "prior": occupied(o), "flag": set(), "frames": [], "ctx": [], "lastctx": None, "prevAct": 0, "prevPtr": 0, "tf": None}
    orig = o.advance

    def adv(buttons):
        r = orig(buttons)
        st["n"] += 1
        if st["tf"] is not None:
            st["tf"] += 1
        cur = occupied(o)
        if cur != st["prior"]:
            st["flag"].add(st["n"])
        st["prior"] = cur
        mask = 0
        for s in cur:
            mask |= 1 << s
        order = bytes(u8(oa + i) for i in range(64))
        act, mv = u8(NAMES["gAnimScriptActive"]), u16(NAMES["sAnimMoveIndex"])
        ptr = o.read_u32(NAMES["sBattleAnimScriptPtr"])
        if (act and not st["prevAct"]) or (ptr and (abs(ptr - st["prevPtr"]) > 0x400 or ptr < st["prevPtr"])):
            st["flag"].add(st["n"])
        st["prevAct"], st["prevPtr"] = act, ptr
        st["frames"].append((st["n"], st["tf"], order, mask, act, mv, u8(NAMES["gBattleAnimAttacker"]), u8(NAMES["gBattleAnimTarget"])))
        c = context(o)
        key = json.dumps(c, sort_keys=True)
        if key != st["lastctx"]:
            st["ctx"].append({"n": st["n"], "tf": st["tf"], **c})
            st["lastctx"] = key
        return r
    o.advance = adv
    st["tf"] = 0
    for b in segments(trace):
        adv(b)
    return o, st


def step_frame(o, buttons, n, calls):
    o._set_buttons(buttons)
    start = o.core.frame_counter
    ins = 0
    while o.core.frame_counter == start:
        pc = (int(o.core.cpu.pc) - THUMB_PIPELINE) & ~1
        marker = MARKERS.get(pc)
        if marker:
            lr = int(o.core.cpu.lr)
            row = {"n": n, "k": "m:" + marker, "caller": sym(lr), "r0": int(o.core.cpu.gprs[0])}
            if marker.startswith(("TryHandle", "InitAnd", "LaunchStatus")):
                row["args"] = [int(o.core.cpu.gprs[i]) for i in range(4)] + [o.read_u32(int(o.core.cpu.gprs[13]))]
            if marker == "LaunchBattleAnimation":
                table = int(o.core.cpu.gprs[0])
                row["table"] = ADDRESS_NAMES.get(table & ~1, [hex(table)])
                row["tableId"] = int(o.core.cpu.gprs[1]) & 0xFFFF
                row["isMove"] = int(o.core.cpu.gprs[2]) & 0xFF
                row["atk"] = o.read_u8(NAMES["gBattleAnimAttacker"])
                row["tgt"] = o.read_u8(NAMES["gBattleAnimTarget"])
                row["animArgs"] = [o.read_u16(NAMES["gBattleAnimArgs"] + 2 * i) for i in range(4)]
            calls.append(row)
        kind = ALLOCATORS.get(pc)
        if kind:
            r = [int(o.core.cpu.gprs[i]) for i in range(4)]
            lr = int(o.core.cpu.lr)
            slot = (r[0] - NAMES["gSprites"]) // SPRITE_SIZE if kind == "DestroySprite" else (r[0] & 0xFF if kind == "CreateSpriteAt" else None)
            calls.append({"n": n, "k": kind, "caller": sym(lr), "slot": slot, "chain": stack_chain(o, 8)})
        o.core.step()
        ins += 1
        if ins > MAX_FRAME_STEPS:
            raise RuntimeError("instruction limit")
    o._screen_stale = False
    o.frame += 1


def pass2(trace, flag):
    o = new_oracle()
    calls, st = [], {"n": 0}
    orig = o.advance

    def adv(buttons):
        st["n"] += 1
        if st["n"] in flag:
            step_frame(o, buttons, st["n"], calls)
            return None
        return orig(buttons)
    o.advance = adv
    for b in segments(trace):
        adv(b)
    return calls


def main():
    gc.disable()
    trace = json.loads(SCENARIO.read_text())
    o, st = pass1(trace)
    frames = st["frames"]
    # drop frames before the last all-free + identity frame (battle ResetSpriteData)
    intro = next(c["n"] for c in st["ctx"] if c["main"] == "BeginBattleIntro")
    reset = max(i for i, f in enumerate(frames) if f[3] == 0 and f[2] == bytes(IDENT) and f[0] <= intro)
    frames = frames[reset:]
    first = frames[0][0]
    flag = {n for n in st["flag"] if n >= first}
    calls = [] if "--fast" in sys.argv else pass2(trace, flag)
    rows, prev = [], None
    for i, f in enumerate(frames):
        sig = (f[2], f[3], f[4], f[5], f[6], f[7])
        if sig != prev:
            rows.append([f[0], f[1], f[2].hex(), format(f[3], "x"), f[4], f[5], f[6], f[7]])
        prev = sig
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": "sprite-order-real-route/v1", "route": "ordinary-factory", "label": LABEL, "scenario": str(SCENARIO),
        "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "frameCount": len(frames), "firstFrame": first, "lastFrame": frames[-1][0],
        "rowFormat": ["n", "traceFrame", "orderHex", "maskHex", "animActive", "sAnimMoveIndex", "gBattleAnimAttacker", "gBattleAnimTarget"],
        "rows": rows, "calls": calls, "context": [c for c in st["ctx"] if c["n"] >= first]}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} frames={len(frames)} rows={len(rows)} calls={len(calls)} flagged={len(flag)}")


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        os._exit(1)
    sys.stdout.flush()
    os._exit(0)
