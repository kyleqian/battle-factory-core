#!/usr/bin/env python3
"""Exact CreateSprite/DestroySprite call attribution for wall-family moves.

Reuses lightScreenAllocatorCallProbe.py unchanged (its allocator ABI stepping
is move-agnostic) but additionally single-steps every trace frame on which the
wall-family clock probe saw an OBJ table change, so each in-window create and
destroy is attributed with entry/return and returned slot, not only the frames
the Light Screen selector coalesced.
usage: wallFamilyAllocatorCallProbe.py <scenario.json> <clock.json> <output.json>
(<clock.json> = fresh wallFamilyClockProbe.py output for the same scenario)
"""
import importlib.util
import json
import sys
from pathlib import Path

scenario, clock_path, output = sys.argv[1:4]
clock = json.loads(Path(clock_path).read_text())
sys.argv = [sys.argv[0], scenario, output]
here = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("lsacp", here / "lightScreenAllocatorCallProbe.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

PREP = []
orig_new_stage = mod.new_stage


def new_stage():
    oracle, lab, request = orig_new_stage()
    orig_prepare = lab.prepare

    def prepare(req):
        count = [0]
        inner = oracle.advance

        def counting(buttons):
            count[0] += 1
            return inner(buttons)
        oracle.advance = counting
        try:
            return orig_prepare(req)
        finally:
            oracle.advance = inner
            PREP.append(count[0])
    lab.prepare = prepare
    return oracle, lab, request


mod.new_stage = new_stage
orig_fast = mod.fast_flagged_steps


def fast():
    flagged, changes, *rest = orig_fast()
    base = clock["prepareSteps"]
    extra = {base + e["frame"] for e in clock["allSpriteEvents"]
             if clock["activationFrame"] - 4 <= e["frame"] <= (clock["cleanupFrame"] or clock["endCommandFrame"]) + 2}
    for step in extra:
        changes.setdefault(step, {"freed": [], "allocated": [], "replacements": [],
                                  "occupiedBefore": [], "occupiedAfter": [],
                                  "note": "wall-family clock event frame"})
    # Entry-phase steps are the Light Screen probe's business (and a lag frame
    # can straddle a pending DestroySprite there); keep only the move window.
    lo, hi = base + clock["activationFrame"] - 4, base + (clock["cleanupFrame"] or clock["endCommandFrame"]) + 2
    keep = {step for step in flagged if lo <= step <= hi}
    return sorted(keep | extra), changes, *rest


mod.fast_flagged_steps = fast
# The Light Screen probe stops after 40 trace frames (battle entry only); the
# wall-family window needs the whole trace.  Its "firstMove" snapshot is then
# the end-of-trace table, kept only because both passes must agree.
_orig_frames = mod.first_trace_frames
mod.first_trace_frames = lambda trace, count: _orig_frames(trace, 10 ** 9)
mod.main()
out = json.loads(Path(output).read_text())
out["schema"] = "wall-family-allocator-calls/v1"
out["move"] = clock["move"]
out["prepareSteps"] = PREP
out["clockPrepareSteps"] = clock["prepareSteps"]
out["wallFamilyToolSha256"] = mod.sha(Path(__file__))
base = clock["prepareSteps"]
for call in out["calls"]:
    call["traceFrame"] = call["step"] - base
Path(output).write_text(json.dumps(out, separators=(",", ":")) + "\n")
sys.stdout.flush()
import os  # noqa: E402
os._exit(0)  # skip libmgba interpreter teardown (SIGBUS/SIGSEGV after the write)
