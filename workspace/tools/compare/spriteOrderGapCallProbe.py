#!/usr/bin/env python3
"""Whole-trace sprite allocator CALL stream (CreateSprite*/DestroySprite + caller LR chain) from battle ResetSpriteData to end of trace.

usage: spriteOrderGapCallProbe.py <scenario.json> <output.json> [--profile battle-scene-on]
Pass 1 (fast, ordinary frame API) finds every frame whose sprite occupancy/template identity changes.  Pass 2 (fresh run) single-steps
only those frames and records each allocator entry: caller LR (symbolized), a stack-scanned return-address chain, the template
tile/palette tag + callback, battle context (gBattleMainFunc, gBattlerAttacker/Target, gCurrentMove, gMoveResultFlags, gAnimScriptActive,
sAnimMoveIndex, gBattleOutcome, gBattlerControllerFuncs).  Also a per-frame sparse context log on every frame in which the context changes.
No framebuffer, ROM patch or breakpoint; direct mGBA only.  Adapted from lightScreenAllocatorCallProbe.py.
"""
from __future__ import annotations
import bisect, gc, hashlib, json, os, subprocess, sys
from pathlib import Path

args = [a for a in sys.argv[1:] if not a.startswith("--")]
PROFILE = "battle-scene-on"
if "--profile" in sys.argv:
    PROFILE = sys.argv[sys.argv.index("--profile") + 1]
    args = [a for a in args if a != PROFILE]
if len(args) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <output.json> [--profile P]")
SCENARIO, OUTPUT = map(Path, args)
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

SPRITE_SIZE = 0x44
THUMB_PIPELINE = 2
MAX_FRAME_STEPS = 20_000_000


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def symbol_data():
    elf = ROOT / "reference/pokeemerald/pokeemerald.elf"
    text = subprocess.run(["arm-none-eabi-nm", "--defined-only", "-n", str(elf)], check=True, capture_output=True, text=True).stdout
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
# Exact entry markers (LR + r0) for wrappers whose stack-scanned chain would otherwise be ambiguous.
MARKERS = {NAMES[n]: n for n in ("CreateInvisibleSpriteWithCallback", "DoHitAnimHealthboxEffect", "DoBounceEffect")}


def sym(address: int) -> str:
    address &= ~1
    i = bisect.bisect_right(FUNC_ADDRS, address) - 1
    if i < 0:
        return f"<unknown {address:#010x}>"
    base, name = FUNCTIONS[i]
    return name if address == base else f"{name}+0x{address - base:x}"


def new_stage():
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = ROOT / "reference/pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    return oracle, BattleLab(oracle, PROFILE), request


def occupied(o):
    out = {}
    for slot in range(64):
        base = NAMES["gSprites"] + SPRITE_SIZE * slot
        if o.read_u8(base + 0x3E) & 1:
            out[slot] = (o.read_u32(base + 0x14), o.read_u32(base + 0x1C))
    return out


def context(o):
    u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
    mf = u32(NAMES["gBattleMainFunc"])
    cf = [u32(NAMES["gBattlerControllerFuncs"] + 4 * i) for i in range(2)]
    return {
        "mainFunc": sym(mf), "ctrl": [sym(c) for c in cf],
        "attacker": u8(NAMES["gBattlerAttacker"]), "target": u8(NAMES["gBattlerTarget"]),
        "curMove": u16(NAMES["gCurrentMove"]), "resultFlags": u8(NAMES["gMoveResultFlags"]),
        "animActive": u8(NAMES["gAnimScriptActive"]), "animMove": u16(NAMES["sAnimMoveIndex"]),
        "animScript": hex(u32(NAMES["sBattleAnimScriptPtr"])),
        "execFlags": hex(u32(NAMES["gBattleControllerExecFlags"])),
        "hp": [u16(NAMES["gBattleMons"] + 0x58 * i + 0x28) for i in range(2)],
        "dmg": u32(NAMES["gBattleMoveDamage"]),
        "scriptPtr": sym(u32(NAMES["gBattlescriptCurrInstr"])),
    }


def stack_chain(o, limit=48):
    sp = int(o.core.cpu.gprs[13])
    chain = []
    for i in range(limit):
        if not (0x02000000 <= sp + 4 * i < 0x03007FFC):  # reading past IWRAM/EWRAM end faults the core
            break
        w = o.read_u32(sp + 4 * i)
        if 0x08000001 <= w < 0x09000000 and (w & 1):
            chain.append(sym(w - 1))
    return chain


def first_trace_frames(trace):
    for seg in trace["segments"]:
        for _ in range(int(seg["frames"])):
            yield seg.get("buttons", [])


def pass1():
    o, lab, req = new_stage()
    st = {"n": 0, "prior": occupied(o), "flag": {}, "ctx": [], "lastctx": None, "tf": None, "resets": []}
    orig = o.advance

    def adv(buttons):
        r = orig(buttons)
        st["n"] += 1
        cur = occupied(o)
        prior = st["prior"]
        if cur != prior:
            st["flag"][st["n"]] = {"freed": sorted(set(prior) - set(cur)), "alloc": sorted(s for s, v in cur.items() if s not in prior or prior[s][0] != v[0])}
            if not cur:
                st["resets"].append(st["n"])  # last all-free frame = battle ResetSpriteData
        st["prior"] = cur
        if st["tf"] is not None:
            st["tf"] += 1
        c = context(o)
        key = json.dumps({k: c[k] for k in ("mainFunc", "ctrl", "attacker", "target", "curMove", "resultFlags", "animActive", "animMove", "hp")}, sort_keys=True)
        if key != st["lastctx"]:
            st["ctx"].append({"n": st["n"], "tf": st["tf"], **c})
            st["lastctx"] = key
        return r
    o.advance = adv
    setup = lab.prepare(req)
    st["tf"] = 0
    for b in first_trace_frames(req["trace"]):
        adv(b)
    return st, setup


def step_frame(o, buttons, n, calls):
    o._set_buttons(buttons)
    start = o.core.frame_counter
    pending, ins = [], 0
    while o.core.frame_counter == start:
        pc = (int(o.core.cpu.pc) - THUMB_PIPELINE) & ~1
        for call in list(reversed(pending)):
            if pc == call["_ret"]:
                call["result"] = (int(o.core.cpu.gprs[0]) & 0xFF) if call["kind"] != "DestroySprite" else None
                pending.remove(call)
        marker = MARKERS.get(pc)
        if marker:
            lr = int(o.core.cpu.lr)
            calls.append({"n": n, "kind": "marker:" + marker, "lr": hex(lr), "caller": sym(lr), "r0": int(o.core.cpu.gprs[0]),
                          "ctx": {k: v for k, v in context(o).items() if v is not None}})
        kind = ALLOCATORS.get(pc)
        if kind:
            r = [int(o.core.cpu.gprs[i]) for i in range(4)]
            lr = int(o.core.cpu.lr)
            if kind == "CreateSpriteAt":
                slot, tpl = r[0] & 0xFF, r[1]
            elif kind == "DestroySprite":
                slot, tpl = (r[0] - NAMES["gSprites"]) // SPRITE_SIZE, None
            else:
                slot, tpl = None, r[0]
            c = {"n": n, "kind": kind, "lr": hex(lr), "caller": sym(lr), "chain": stack_chain(o), "slot": slot, "_ret": lr & ~1}
            if tpl is not None:
                c["tpl"] = {"names": ADDRESS_NAMES.get(tpl & ~1, []), "tile": o.read_u16(tpl), "pal": o.read_u16(tpl + 2),
                            "cb": ADDRESS_NAMES.get(o.read_u32(tpl + 20) & ~1, [])}
            else:
                b = NAMES["gSprites"] + SPRITE_SIZE * slot
                c["victim"] = {"tpl": ADDRESS_NAMES.get(o.read_u32(b + 0x14) & ~1, []), "cb": ADDRESS_NAMES.get(o.read_u32(b + 0x1C) & ~1, [])}
            c["ctx"] = {k: v for k, v in context(o).items() if v is not None}
            calls.append(c)
            pending.append(c)
        o.core.step()
        ins += 1
        if ins > MAX_FRAME_STEPS:
            raise RuntimeError("instruction limit")
    o._screen_stale = False
    o.frame += 1


def pass2(flag):
    o, lab, req = new_stage()
    calls, st = [], {"n": 0}
    orig = o.advance

    def adv(buttons):
        st["n"] += 1
        if st["n"] in flag:
            step_frame(o, buttons, st["n"], calls)
            return None
        return orig(buttons)
    o.advance = adv
    lab.prepare(req)
    for b in first_trace_frames(req["trace"]):
        adv(b)
    for c in calls:
        c.pop("_ret", None)
    return calls


def main():
    gc.disable()  # cyclic GC segfaults inside the single-step loop on some scenarios (libmgba cffi objects)
    st, setup = pass1()
    if not st["resets"]:
        raise RuntimeError("no battle ResetSpriteData boundary")
    # Battle ResetSpriteData = last all-free frame at or before the first BeginBattleIntro frame (gBattleMainFunc).  Later all-free
    # frames (party-menu open / battle reshow) stay in the recorded window as evidence.
    intro = next(c["n"] for c in st["ctx"] if c["mainFunc"] == "BeginBattleIntro")
    reset = max(r for r in st["resets"] if r <= intro)
    flag = {n: v for n, v in st["flag"].items() if n > reset}
    calls = pass2(set(flag))
    ref = ROOT / "reference/pokeemerald"
    payload = {"schema": "sprite-order-gap-calls/v1", "scenario": str(SCENARIO), "profile": PROFILE, "resetFrame": reset,
               "toolSha256": sha(Path(__file__)), "referenceSha256": {n: sha(ref / n) for n in ("pokeemerald.gba", "pokeemerald.elf", "pokeemerald.map")},
               "frameDeltas": {str(n): v for n, v in sorted(flag.items())},
               "calls": calls, "contextChanges": [c for c in st["ctx"] if c["n"] >= reset]}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} flagged={len(flag)} calls={len(calls)} ctx={len(payload['contextChanges'])}")


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
