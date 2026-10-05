#!/usr/bin/env python3
"""Exact in-frame CreateTask / DestroyTask / AllocOamMatrix / FreeOamMatrix call order across one move body (Scene ON).

usage: affineTaskCallProbe.py factory <trace.json> <move-id> <out.json>
       affineTaskCallProbe.py lab <move-id> <scenario.json> <out.json>
Pass 1 (fast frame API; env AFFINE_BODY=N picks the Nth body, default 0) finds the first body with sAnimMoveIndex == move-id (gAnimScriptActive rise .. fall).  Pass 2 re-stages the
same battle fresh and single-steps every frame of [rise-2, fall+1], recording function entry (args, caller via LR) and return value (r0)
of the stock functions (CreateTask, DestroyTask, AllocOamMatrix, FreeOamMatrix, CreateSprite*, DestroySprite).  No breakpoints, no ROM/RAM patching, no framebuffer.  Method follows lightScreenAllocatorCallProbe.py.
Rows: [age, kind, arg, ret, caller]; age = step - rise step (first frame whose post-advance gAnimScriptActive is 1).
"""
from __future__ import annotations
import bisect, hashlib, json, os, subprocess, sys
from pathlib import Path

mode = sys.argv[1] if len(sys.argv) > 1 else ""
if mode == "factory" and len(sys.argv) == 5:
    SCENARIO, MOVE, OUTPUT = Path(sys.argv[2]), int(sys.argv[3]), Path(sys.argv[4])
elif mode == "lab" and len(sys.argv) == 5:
    MOVE, SCENARIO, OUTPUT = int(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])
else:
    raise SystemExit(__doc__)
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
THUMB_PIPELINE = 2
MAX_FRAME_STEPS = 20_000_000


def symbol_data():
    text = subprocess.run(["arm-none-eabi-nm", "--defined-only", "-n", str(ROOT / "reference/pokeemerald/pokeemerald.elf")],
                          check=True, capture_output=True, text=True).stdout
    names, functions, anyaddr = {}, [], []
    for line in text.splitlines():
        f = line.split()
        if len(f) != 3:
            continue
        a = int(f[0], 16) & ~1
        names[f[2]] = int(f[0], 16)
        anyaddr.append((a, f[2]))
        if f[1] in "tT":
            functions.append((a, f[2]))
    return names, sorted(functions), sorted(anyaddr)


NAMES, FUNCTIONS, ALL = symbol_data()
HOOKS = {NAMES[n] & ~1: n for n in ("CreateTask", "DestroyTask", "AllocOamMatrix", "FreeOamMatrix",
                                         "CreateSprite", "CreateSpriteAtEnd", "CreateSpriteAt", "DestroySprite")}


def sym(address, table=FUNCTIONS):
    address &= ~1
    i = bisect.bisect_right(table, (address, "￿")) - 1
    if i < 0:
        return f"<unknown {address:#x}>"
    base, name = table[i]
    return name if base == address else f"{name}+0x{address - base:x}"


def stage():
    ref = ROOT / "reference/pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    if mode == "factory":
        return oracle, None, json.loads(SCENARIO.read_text())
    from battle_lab import BattleLab, validate_request
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    return oracle, BattleLab(oracle, PROFILE), request["trace"]


def frames(trace):
    for seg in trace["segments"]:
        for _ in range(int(seg["frames"])):
            yield seg.get("buttons", [])


def u16(o, a): return o.read_u8(a) | o.read_u8(a + 1) << 8


def pass1():
    oracle, lab, trace = stage()
    orig, st = oracle.advance, {"n": 0}
    series = []

    def advance(b):
        r = orig(b)
        st["n"] += 1
        series.append((st["n"], oracle.read_u8(NAMES["gAnimScriptActive"]), u16(oracle, NAMES["sAnimMoveIndex"])))
        return r
    oracle.advance = advance
    if lab:
        lab.prepare(__import__("battle_lab").validate_request(json.loads(SCENARIO.read_text()), PROFILE))
    for b in frames(trace):
        advance(b)
    rise = fall = None
    body = int(os.environ.get("AFFINE_BODY", "0"))  # Nth (0-based) body of this move (Razor Wind / Rock Blast have several)
    seen, prev_act = -1, 0
    for n, act, mv in series:
        if rise is None and act and mv == MOVE and not prev_act:
            seen += 1
            if seen == body:
                rise = n
        elif rise is not None and not act:
            fall = n
            break
        prev_act = act
    if rise is None:
        raise SystemExit(f"no body for move {MOVE}")
    return rise, fall


def step_frame(oracle, buttons, step, rise, calls):
    oracle._set_buttons(buttons)
    start = oracle.core.frame_counter
    pending, instr = [], 0
    while oracle.core.frame_counter == start:
        ex = (int(oracle.core.cpu.pc) - THUMB_PIPELINE) & ~1
        for c in list(reversed(pending)):
            if ex == c["ret_pc"]:
                c["ret"] = int(oracle.core.cpu.gprs[0]) & 0xFF
                pending.remove(c)
        kind = HOOKS.get(ex)
        if kind is not None:
            r0 = int(oracle.core.cpu.gprs[0]); lr = int(oracle.core.cpu.lr)
            if kind in ("CreateTask", "CreateSprite", "CreateSpriteAtEnd"):
                arg = sym(r0, ALL)
            elif kind == "CreateSpriteAt":
                arg = sym(int(oracle.core.cpu.gprs[1]), ALL)
            elif kind == "DestroySprite":
                arg = (r0 - NAMES["gSprites"]) // 0x44
            else:
                arg = r0 & 0xFF if kind in ("FreeOamMatrix", "DestroyTask") else None
            c = {"age": step - rise, "kind": kind, "arg": arg, "ret": None, "caller": sym(lr), "ret_pc": lr & ~1}
            if kind == "CreateTask":
                c["prio"] = int(oracle.core.cpu.gprs[1]) & 0xFF
            calls.append(c)
            if kind in ("CreateTask", "AllocOamMatrix", "CreateSprite", "CreateSpriteAtEnd", "CreateSpriteAt"):
                pending.append(c)
        oracle.core.step()
        instr += 1
        if instr > MAX_FRAME_STEPS:
            raise RuntimeError("frame step limit")
    oracle._screen_stale = False
    oracle.frame += 1


def main():
    rise, fall = pass1()
    lo, hi = rise - 2, (fall if fall else rise + 400) + 1
    oracle, lab, trace = stage()
    orig, st, calls = oracle.advance, {"n": 0}, []

    def advance(b):
        st["n"] += 1
        if lo <= st["n"] <= hi:
            step_frame(oracle, b, st["n"], rise, calls)
            return None
        return orig(b)
    oracle.advance = advance
    if lab:
        lab.prepare(__import__("battle_lab").validate_request(json.loads(SCENARIO.read_text()), PROFILE))
    for b in frames(trace):
        advance(b)
    for c in calls:
        c.pop("ret_pc")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": "affine-task-calls/v1", "mode": mode, "move": MOVE, "scenario": str(SCENARIO), "rise": rise, "fall": fall,
        "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "calls": calls}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} rise={rise} fall={fall} calls={len(calls)}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)
