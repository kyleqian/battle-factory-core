#!/usr/bin/env python3
"""Per-call-site caller attribution for every `Random()` draw in the three
banked Factory-AI fixtures' turn-2 decision window
(`docs/factory-ai-ground-truth.md`, PROGRESS entry 455's "2-roll gap").

Entry 455's paper accounting (setup 4 + CheckBadMove 6/8 + ShouldSwitch 2 +
tie 1) reached 13/13/? against the live-verified 15/15/17 pinned totals for
`mechanic-factory-ai-{unambiguous,tie,degenerate}-off.json` — 2 rolls per
scenario short. This probe closes the gap by instrument, not paper, in two
passes over the *same* `mechanicLab` staging `verify-factory-ai-ground-
truth.ts` already uses:

1. **Fast pass** (no single-stepping): drive the fixture's own trace frame
   by frame with the ordinary `oracle.advance()` API, reading
   `sRandCount` (`src/random.c:5,14` — a real, source-confirmed global call
   counter incremented on *every* `Random()` call, not a probe-injected
   hack) before and after each frame. This gives an *exact* per-frame draw
   count for the whole trace at full emulation speed — no LCG inversion
   needed (`sRandCount` already counts calls directly), and immediately
   reconciles the frame-100->732 total against the pinned 19/19/21 figures.
2. **Targeted single-step pass**: re-stage the identical fixture fresh, fast-
   forward via `oracle.advance()` through every frame pass 1 flagged as
   zero-delta, then single-step (`core.step()`, one ARM/Thumb instruction at
   a time) *only* through the frames pass 1 flagged as nonzero — reading
   `core.cpu.pc`/`core.cpu.lr` at each step to catch every entry into
   `Random()` (`0x0806f5cc`) and record the caller's return address (LR).
   Each LR is bisected against a full local+global function symbol table
   (`arm-none-eabi-nm --defined-only -n`, sections `t`/`T`) to name the
   enclosing caller function. Single-stepping is bounded to the handful of
   flagged frames (not all ~700 frames in the window), so this stays fast.

A hardware-exec-breakpoint attempt (`mDebuggerCreate(DEBUGGER_CLI, ...)` +
`mDebuggerAttach`) was tried first and segfaults on this libmgba-py build
(exit 139 inside `mDebuggerAttach`, before any breakpoint fires) — the
per-frame-count + targeted-single-step design above is the documented
fallback (`sRandCount` for the count signal instead of LCG inversion, since
it's an exact, already-instrumented counter one memory read away).

Run with the harness's mGBA-enabled interpreter (NOT system python3), through
the teardown-segfault-tolerant wrapper:
    python3 tools/run-mgba-probe.py /tmp/factory-ai-callers-unambiguous.json -- \\
        /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \\
        tools/probe/attribute-factory-ai-random-callers.py \\
        tools/battle-lab/mechanic-factory-ai-unambiguous-off.json \\
        /tmp/factory-ai-callers-unambiguous.json
"""

from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (3, 5):
    raise SystemExit(
        f"usage: {sys.argv[0]} <mechanicLab-fixture.json> <output.json> [windowStartExclusive windowEndInclusive]"
    )
FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
WINDOW_OVERRIDE = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) == 5 else None

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REFERENCE_POKEEMERALD = (HARNESS_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
ELF_PATH = REFERENCE_POKEEMERALD / "pokeemerald.elf"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
PROFILE = "battle-scene-off"

# `bin/oracle symbols Random` (§1.2 of docs/factory-ai-ground-truth.md).
RANDOM_ADDR = 0x0806F5CC
# libmgba-py's `cpu.pc` reads the *pipelined* PC (Thumb: executing-instruction
# address + 2 — the same convention real ARM7TDMI code relies on for PC-
# relative literal-pool loads, e.g. Random()'s own `ldr r2, [pc, #24]`), not
# the address of the instruction actually retiring. Empirically confirmed:
# single-stepping through Random()'s own 13-instruction body (0x806f5cc-
# 0x806f5e4) shows `cpu.pc` visiting 0x806f5ce..0x806f5e6 — every value
# shifted +2 from the real instruction addresses. So the breakpoint-by-
# polling check below must compare against RANDOM_ADDR + 2, not RANDOM_ADDR.
RANDOM_ENTRY_PC = RANDOM_ADDR + 2
# `src/random.c:5` — EWRAM_DATA static u32 sRandCount, incremented once per
# Random() call (`:14`), address confirmed by disassembling Random() itself
# (the second counter store at `806f5da-806f5e0`) and cross-checked via
# `arm-none-eabi-nm`.
SRANDCOUNT_ADDR = 0x020249C0
DECISION_WINDOW_START, DECISION_WINDOW_END = WINDOW_OVERRIDE or (100, 732)  # exclusive/inclusive


def build_symbol_table() -> list[tuple[int, str]]:
    """Every defined text-section symbol (local + global), sorted by address —
    the bisection table for mapping an LR return address to its enclosing
    function, including static (file-scope) functions the linker map omits."""
    out = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(ELF_PATH)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    table: list[tuple[int, str]] = []
    for line in out.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        addr_hex, kind, name = parts
        if kind not in ("t", "T"):
            continue
        table.append((int(addr_hex, 16), name))
    table.sort(key=lambda pair: pair[0])
    return table


def caller_of(symbol_table: list[tuple[int, str]], addr: int) -> str:
    idx = bisect.bisect_right(symbol_table, (addr, "￿")) - 1
    if idx < 0:
        return f"<unknown 0x{addr:08x}>"
    base, name = symbol_table[idx]
    offset = addr - base
    return name if offset == 0 else f"{name}+0x{offset:x}"


def load_fixture() -> dict:
    fixture = json.loads(FIXTURE_PATH.read_text())
    return validate_request(fixture, PROFILE)


def stage(oracle: EmeraldOracle) -> tuple[BattleLab, dict, dict]:
    lab = BattleLab(oracle, PROFILE)
    request = load_fixture()
    setup = lab.prepare(request)
    return lab, request, setup


def rand_count(oracle: EmeraldOracle) -> int:
    return oracle.read_u32(SRANDCOUNT_ADDR)


def iter_trace_frames(trace: dict):
    """Yield (1-based frame index, buttons) for every frame in the trace."""
    frame = 0
    for segment in trace["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, buttons


def pass1_fast_deltas(oracle: EmeraldOracle, trace: dict) -> list[tuple[int, int]]:
    """Exact per-frame Random() call counts via sRandCount — no single-step."""
    deltas: list[tuple[int, int]] = []
    prev = rand_count(oracle)
    for frame, buttons in iter_trace_frames(trace):
        oracle.advance(buttons)
        cur = rand_count(oracle)
        delta = (cur - prev) & 0xFFFFFFFF
        if delta:
            deltas.append((frame, delta))
        prev = cur
    return deltas


def step_through_flagged_frame(oracle: EmeraldOracle, buttons: list[str], hits: list[tuple[int, int]]) -> None:
    """Single-step exactly one frame's worth of instructions, recording every
    (pc, lr) pair where pc lands on Random()'s entry address."""
    oracle._set_buttons(buttons)
    start_fc = oracle.core.frame_counter
    steps = 0
    max_steps = 20_000_000  # safety backstop; a real frame is ~O(1e5) instrs
    while True:
        pc = oracle.core.cpu.pc
        if pc == RANDOM_ENTRY_PC:
            hits.append((oracle.frame + 1, oracle.core.cpu.lr))
        if oracle.core.frame_counter != start_fc:
            break
        oracle.core.step()
        steps += 1
        if steps > max_steps:
            raise RuntimeError(f"frame did not end after {max_steps} single steps")
    oracle._screen_stale = False
    oracle.frame += 1


def pass2_attribute_flagged_frames(
    oracle: EmeraldOracle, trace: dict, flagged_frames: set[int]
) -> list[tuple[int, int]]:
    """Fresh session; fast-forward via advance() through unflagged frames,
    single-step through flagged ones. Returns (frame, lr) hit pairs."""
    hits: list[tuple[int, int]] = []
    for frame, buttons in iter_trace_frames(trace):
        if frame in flagged_frames:
            step_through_flagged_frame(oracle, buttons, hits)
        else:
            oracle.advance(buttons)
    return hits


def main() -> None:
    symbol_table = build_symbol_table()

    # Pass 1: fast per-frame counts (fresh session).
    oracle = EmeraldOracle(rom_path=ROM_PATH, map_path=MAP_PATH, bootstrap_path=BOOTSTRAP_PATH)
    lab, request, setup = stage(oracle)
    trace = request["trace"]
    deltas = pass1_fast_deltas(oracle, trace)
    final_count_pass1 = rand_count(oracle)

    window_deltas = [(f, d) for f, d in deltas if DECISION_WINDOW_START < f <= DECISION_WINDOW_END]
    window_total = sum(d for _f, d in window_deltas)
    flagged_frames = {f for f, _d in window_deltas}

    # Pass 2: fresh session, targeted single-step attribution.
    oracle2 = EmeraldOracle(rom_path=ROM_PATH, map_path=MAP_PATH, bootstrap_path=BOOTSTRAP_PATH)
    stage(oracle2)
    hits = pass2_attribute_flagged_frames(oracle2, trace, flagged_frames)
    final_count_pass2 = rand_count(oracle2)

    hits.sort(key=lambda pair: pair[0])
    by_caller: dict[str, int] = {}
    ordered_table = []
    for frame, lr in hits:
        caller = caller_of(symbol_table, lr)
        by_caller[caller] = by_caller.get(caller, 0) + 1
        ordered_table.append({"tick": frame, "callerFunction": caller, "lr": hex(lr)})

    result = {
        "fixture": str(FIXTURE_PATH),
        "seed": request["seed"],
        "setup": {
            "player": [mon["species"] for mon in setup["player"]],
            "opponent": [mon["species"] for mon in setup["opponent"]],
        },
        "pass1_fast_perFrameDeltas": [{"frame": f, "count": d} for f, d in deltas],
        "pass1_finalRandCount": final_count_pass1,
        "decisionWindow": {"start_exclusive": DECISION_WINDOW_START, "end_inclusive": DECISION_WINDOW_END},
        "windowTotal_sRandCount": window_total,
        "flaggedFrames": sorted(flagged_frames),
        "pass2_hitCount": len(hits),
        "pass2_finalRandCount": final_count_pass2,
        "orderedCallerTable": ordered_table,
        "callerSummary": [
            {"callerFunction": name, "count": count}
            for name, count in sorted(by_caller.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
        "reconciliation": {
            "pass1WindowTotal": window_total,
            "pass2HitCount": len(hits),
            "matches": window_total == len(hits),
        },
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH}: window total={window_total} pass2 hits={len(hits)}", flush=True)


if __name__ == "__main__":
    main()
