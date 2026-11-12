#!/usr/bin/env python3
"""Per-frame gRng2Value (Random2 LCG) recorder + caller attribution, direct mGBA.

Pass 1 (fast): replay a trace from a bootstrap anchor one frame at a time and
read `gRng2Value` (`src/random.c:9`) after every frame; convert each frame's
delta to an ISO_RANDOMIZE1 step count (`src/random.c:31`) by forward search.
Context per frame: gMain.callback2, gBattleMainFunc, gAnimScriptActive,
sBattleAnimScriptPtr (mapped to the enclosing Move_/General_/... label).

Pass 2 (targeted, fresh session): fast-forward through unflagged frames and
single-step (`core.step()`) ONLY the selected flagged frames, recording every
entry into Random2 (pipelined Thumb PC == Random2 + 2, as in
tools/probe/attribute-factory-ai-random-callers.py) with its LR, plus any
gRng2Value change that happens outside Random2 (should be none).

usage (harness mGBA interpreter):
  python3 tools/run-mgba-probe.py OUT.json -- ../../vendor/mgba-venv/bin/python \
      tools/integration/random2RouteProbe.py <trace.json|lab.json> OUT.json \
      [--bootstrap factory.json] [--lab] [--frames N] [--step-sample K]
"""
from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("trace")
ap.add_argument("output")
ap.add_argument("--bootstrap", default="factory.json")
ap.add_argument("--lab", action="store_true", help="trace is a BattleLab request (Scene ON)")
ap.add_argument("--frames", type=int, default=0, help="stop after N frames (0 = whole trace)")
ap.add_argument("--step-sample", type=int, default=3,
                help="single-step the first K flagged frames of each (context, steps) class")
ap.add_argument("--step-frames", default="", help="extra comma-separated frames to single-step")
ap.add_argument("--controller-ctx", action="store_true",
                help="add gBattlerControllerFuncs[0] (player controller state) to the frame context")
ap.add_argument("--step-anim", action="store_true",
                help="also single-step every gAnimScriptActive frame and every frame with >1 step")
args = ap.parse_args()

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
ELF = REF / "pokeemerald.elf"


def lcg(x: int) -> int:
    return (x * 1103515245 + 24691) & 0xFFFFFFFF  # ISO_RANDOMIZE1, include/random.h


def steps_between(a: int, b: int, limit: int = 20000) -> int | None:
    n = 0
    while a != b:
        if n >= limit:
            return None
        a, n = lcg(a), n + 1
    return n


nm_out = subprocess.run(["arm-none-eabi-nm", "-n", "--defined-only", str(ELF)],
                        check=True, capture_output=True, text=True).stdout
syms: dict[str, int] = {}
text_table: list[tuple[int, str]] = []
for line in nm_out.splitlines():
    parts = line.split()
    if len(parts) != 3:
        continue
    addr, kind, name = int(parts[0], 16), parts[1], parts[2]
    syms.setdefault(name, addr)
    if kind in "tTdDrR" and addr >= 0x08000000:
        text_table.append((addr & ~1, name))
text_table.sort()
text_addrs = [a for a, _ in text_table]


def label(addr: int) -> str:
    if addr < 0x08000000:
        return f"0x{addr:08x}"
    i = bisect.bisect_right(text_addrs, addr & ~1) - 1
    if i < 0:
        return f"0x{addr:08x}"
    base, name = text_table[i]
    off = (addr & ~1) - base
    return name if off == 0 else f"{name}+0x{off:x}"


RNG2 = syms["gRng2Value"]
RNG = syms["gRngValue"]
RANDOM2_ENTRY_PC = (syms["Random2"] & ~1) + 2  # pipelined Thumb PC
RANDOM2_END = RANDOM2_ENTRY_PC + 0x40
GMAIN = syms["gMain"]
BMF = syms["gBattleMainFunc"]
ANIM_ACTIVE = syms["gAnimScriptActive"]
ANIM_PTR = syms["sBattleAnimScriptPtr"]
WCT = syms["gWirelessCommType"]
CTRL = syms["gBattlerControllerFuncs"]


def fresh() -> tuple[EmeraldOracle, list[list[str]]]:
    if args.lab:
        from battle_lab import BattleLab, validate_request  # noqa: E402
        oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map",
                               HARNESS / "oracle/bootstrap/factory.json")
        request = validate_request(json.loads(Path(args.trace).read_text()), "battle-scene-on")
        BattleLab(oracle, "battle-scene-on").prepare(request)
        trace = request["trace"]
    else:
        oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map",
                               HARNESS / "oracle/bootstrap" / args.bootstrap)
        oracle.new_session()
        trace = json.loads(Path(args.trace).read_text())
    frames: list[list[str]] = []
    for seg in trace["segments"]:
        frames.extend([seg.get("buttons", [])] * int(seg["frames"]))
    if args.frames:
        frames = frames[: args.frames]
    return oracle, frames


def context(o: EmeraldOracle) -> tuple:
    active = o.read_u8(ANIM_ACTIVE)
    return (label(o.read_u32(GMAIN + 4)), label(o.read_u32(BMF)), active,
            label(o.read_u32(ANIM_PTR)) if active else "-",
            label(o.read_u32(CTRL)) if args.controller_ctx else "-")


def state_sha1(o: EmeraldOracle) -> str:
    """sha1 over EWRAM + IWRAM (the raw savestate blob is not byte-stable across identical runs)."""
    h = hashlib.sha1()
    for base, size in ((0x02000000, 0x40000), (0x03000000, 0x8000)):
        h.update(b"".join(o.read_u32(base + i).to_bytes(4, "little") for i in range(0, size, 4)))
    return h.hexdigest()


# ---- pass 1 ------------------------------------------------------------
o, frames = fresh()
anchor = o.read_u32(RNG2)
anchor_rng = o.read_u32(RNG)
anchor_wct = o.read_u8(WCT)
prev = anchor
rows = []  # (frame, steps, ctx, value, loops)
for i, buttons in enumerate(frames, 1):
    o.advance(buttons)
    cur = o.read_u32(RNG2)
    rows.append((i, steps_between(prev, cur), context(o), cur, 0))
    prev = cur
final_sha1 = state_sha1(o)

# run-length encode by (steps, ctx)
runs = []
for f, s, c, v, lp in rows:
    if runs and runs[-1]["steps"] == s and tuple(runs[-1]["ctx"]) == c:
        runs[-1]["to"] = f
        runs[-1]["endValue"] = v
    else:
        runs.append({"from": f, "to": f, "steps": s, "ctx": list(c), "endValue": v})

# pick frames to single-step
classes: dict[tuple, list[int]] = {}
for f, s, c, _v, _lp in rows:
    if s:
        classes.setdefault((s if s and s <= 1 else "multi", c[1], c[2], c[3]), []).append(f)
pick = set()
for fs in classes.values():
    pick.update(fs[: args.step_sample])
pick.update(int(x) for x in args.step_frames.split(",") if x)
if args.step_anim:  # exhaustive: every animation-active frame and every multi-step frame
    pick.update(r[0] for r in rows if r[1] and (r[2][2] or r[1] > 1))
pick = sorted(pick)

# ---- pass 2 ------------------------------------------------------------
o2, frames2 = fresh()
by_frame: dict[int, list] = {}
stray: list = []
pickset = set(pick)
for i, buttons in enumerate(frames2, 1):
    if i not in pickset:
        o2.advance(buttons)
        continue
    o2._set_buttons(buttons)
    fc = o2.core.frame_counter
    hits = []
    last = o2.read_u32(RNG2)
    n = 0
    while o2.core.frame_counter == fc:
        pc = o2.core.cpu.pc
        if pc == RANDOM2_ENTRY_PC:
            hits.append(o2.core.cpu.lr)
        o2.core.step()
        n += 1
        v = o2.read_u32(RNG2)
        if v != last:
            pcn = o2.core.cpu.pc
            if not (RANDOM2_ENTRY_PC <= pcn <= RANDOM2_END):
                stray.append({"frame": i, "pc": label(pcn)})
            last = v
        if n > 30_000_000:
            raise RuntimeError("frame did not end")
    o2._screen_stale = False
    o2.frame += 1
    by_frame[i] = hits

expected = {f: s for f, s, _c, _v, _lp in rows}
attrib = []
caller_totals: dict[str, int] = {}
for f in pick:
    lrs = by_frame.get(f, [])
    callers = [label(lr) for lr in lrs]
    for c in callers:
        caller_totals[c] = caller_totals.get(c, 0) + 1
    if callers == ["RfuMain1+0x10"] and expected[f] == 1:
        continue
    attrib.append({"frame": f, "pass1Steps": expected[f], "random2Calls": len(lrs),
                   "callers": callers, "ctx": list(rows[f - 1][2])})

summary: dict[str, int] = {}
for f, s, c, _v, _lp in rows:
    if s is None:
        key = "unresolved"
    else:
        key = f"{c[1]}|anim={c[2]}"
    summary[key] = summary.get(key, 0) + (s or 0)

out = {
    "trace": args.trace,
    "bootstrap": "lab:" + args.trace if args.lab else args.bootstrap,
    "frames": len(frames),
    "anchorRng2": anchor,
    "anchorRng": anchor_rng,
    "finalRng2": prev,
    "anchorWirelessCommType": anchor_wct,
    "totalSteps": sum(r[1] for r in rows if r[1]),
    "zeroStepFrames": sum(1 for r in rows if r[1] == 0),
    "unresolvedFrames": [r[0] for r in rows if r[1] is None],
    "finalStateSha1": final_sha1,
    "runsSha1": hashlib.sha1(json.dumps(runs, separators=(",", ":")).encode()).hexdigest(),
    "stepsByBattleMainFuncAndAnimActive": summary,
    "runs": runs,
    "singleSteppedFrames": len(pick),
    "singleSteppedCallerTotals": caller_totals,
    "singleSteppedNonTrivial": attrib,
    "rng2WritesOutsideRandom2": stray,
    "attributionMatches": all(a["pass1Steps"] == a["random2Calls"] for a in attrib) and not stray,
    "steppedFrameList": pick,
}
Path(args.output).write_text(json.dumps(out, separators=(",", ":")) + "\n")
print(f"wrote {args.output}: frames={len(frames)} anchor=0x{anchor:08x} total={out['totalSteps']} "
      f"stepped={len(pick)} match={out['attributionMatches']} sha1={final_sha1}", flush=True)
