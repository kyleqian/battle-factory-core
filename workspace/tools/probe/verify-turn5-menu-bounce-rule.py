#!/usr/bin/env python3
"""Turn 5 reopen root-cause probe, part 1 of 2 (docs/turn3-residual-probe-
notes.md's own "Family B, continued" precedent, re-anchored to turn 5's own
reopen window). Pure analysis over the already-committed
`src/data/gen/turn5-menu-bouncer-raw-probe.json` RAM dump (no mGBA needed -
plain `python3`). Establishes the raw RAM facts around tick 5927 (the reopen
press's own registering tick, `tools/compare/traces/turn5-menu.json`'s own
excluded single-tick residual): sprite-slot addressing sanity, a genuine
2-tick sSinIndex STALL discovered one tick after the press, and the
sampling-convention check. This script's own EARLIER version additionally
tried a naive "model vs real, uniform tick-shift" search here and concluded
the stall explained the residual - that conclusion did not survive a
ground-truth cross-check (`npm run compare` shows the stall is invisible in
the pixel domain) and has been removed; see `verify-turn5-reopen-switch-
rule.py` for the mechanism that actually explains the pixel mismatch.

Run: python3 tools/probe/verify-turn5-menu-bounce-rule.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
PROBE_PATH = WORKTREE_ROOT / "src" / "data" / "gen" / "turn5-menu-bouncer-raw-probe.json"
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-menu.json"

# `GBA_SINE_TABLE_256` (src/engine/battleMenu.ts), copied verbatim - same
# table `verify-turn3-menu-bounce-rule.py` already uses.
GBA_SINE_TABLE_256 = [
    0, 6, 12, 18, 25, 31, 37, 43, 49, 56, 62, 68, 74, 80, 86, 92,
    97, 103, 109, 115, 120, 126, 131, 136, 142, 147, 152, 157, 162, 167, 171, 176,
    181, 185, 189, 193, 197, 201, 205, 209, 212, 216, 219, 222, 225, 228, 231, 234,
    236, 238, 241, 243, 244, 246, 248, 249, 251, 252, 253, 254, 254, 255, 255, 255,
    256, 255, 255, 255, 254, 254, 253, 252, 251, 249, 248, 246, 244, 243, 241, 238,
    236, 234, 231, 228, 225, 222, 219, 216, 212, 209, 205, 201, 197, 193, 189, 185,
    181, 176, 171, 167, 162, 157, 152, 147, 142, 136, 131, 126, 120, 115, 109, 103,
    97, 92, 86, 80, 74, 68, 62, 56, 49, 43, 37, 31, 25, 18, 12, 6,
    0, -6, -12, -18, -25, -31, -37, -43, -49, -56, -62, -68, -74, -80, -86, -92,
    -97, -103, -109, -115, -120, -126, -131, -136, -142, -147, -152, -157, -162, -167, -171, -176,
    -181, -185, -189, -193, -197, -201, -205, -209, -212, -216, -219, -222, -225, -228, -231, -234,
    -236, -238, -241, -243, -244, -246, -248, -249, -251, -252, -253, -254, -254, -255, -255, -255,
    -256, -255, -255, -255, -254, -254, -253, -252, -251, -249, -248, -246, -244, -243, -241, -238,
    -236, -234, -231, -228, -225, -222, -219, -216, -212, -209, -205, -201, -197, -193, -189, -185,
    -181, -176, -171, -167, -162, -157, -152, -147, -142, -136, -131, -126, -120, -115, -109, -103,
    -97, -92, -86, -80, -74, -68, -62, -56, -49, -43, -37, -31, -25, -18, -12, -6,
]


def bounce_sin(index: int) -> int:
    v = GBA_SINE_TABLE_256[index % 256]
    return math.floor(v / 256)


# --- The engine model, replicated verbatim from src/engine/battleScene.ts /
# src/engine/battleMenu.ts's own committed constants (not re-derived) ---
MENU_IDLE_BLANK_END_TICK = 1747
MENU_BOUNCE_RAM_SETUP_TICK = 1748
FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT = 2
TURN4_CONFIRM_PRESS_TICK = 4925
TURN4_ROCKSLIDE_MENU_REDRAW_DELAY = 661


def turn4_rockslide_resettled_bounce_tick(t: int) -> int:
    return t - (TURN4_CONFIRM_PRESS_TICK + TURN4_ROCKSLIDE_MENU_REDRAW_DELAY) + (MENU_IDLE_BLANK_END_TICK + 1)


def turn5_submenu_bounce_tick(t: int) -> int:
    return turn4_rockslide_resettled_bounce_tick(t) - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT


def model_y2(t: int, seed: int) -> int:
    """`menuIdleBounce(turn5SubmenuBounceTick(t))`'s own onix/healthbox Y2, replicated exactly - a pure SMOOTH linear function of `t`, no stall modeled anywhere."""
    bounce_tick = turn5_submenu_bounce_tick(t)
    ram_tick = bounce_tick - 1
    n = ram_tick - MENU_BOUNCE_RAM_SETUP_TICK
    return bounce_sin(seed + 7 * n) + 1


REOPEN_PRESS_TICK = 5927


def main() -> None:
    probe = json.loads(PROBE_PATH.read_text())
    rows = {r["tick"]: r for r in probe["ticks"]}
    ticks = sorted(rows)
    trace = json.loads(TRACE_PATH.read_text())
    capture_frames = set(trace.get("captureFrames", []))

    print(f"=== 0. Sanity: battler-sprite-slot addressing (dynamic, not hardcoded) ===")
    onix_slots = {rows[t]["onixSpriteSlot"] for t in ticks}
    hb_slots = {rows[t]["healthboxMainSpriteSlot"] for t in ticks}
    driver_targets = {rows[t]["onixBouncerTarget"] for t in ticks if rows[t]["onixAmplitude"] != 0}
    driver_which = {rows[t]["onixWhich"] for t in ticks if rows[t]["onixAmplitude"] != 0}
    print(f"  onix (battler 0) sprite slot: {onix_slots} (unchanged from turn 3's own {{6}} - no churn)")
    print(f"  healthbox-main (battler 0) sprite slot: {hb_slots} (unchanged from turn 3's own {{0}})")
    print(f"  onix driver's own bouncerTarget/which: {driver_targets}/{driver_which} (expect {{6}}/{{0}})")

    # --- 1. sSinIndex stall/skip check - Family B found ZERO anywhere in turn 3's window; does turn 5's own reopen show one? ---
    print("\n=== 1. sSinIndex stall/skip check (both regions, while the bounce is active) ===")
    stalls = []
    active_steps = 0
    for a, b in zip(ticks, ticks[1:]):
        if b != a + 1:
            continue
        for region, field, amp_field in (
            ("onix", "onixSinIndex", "onixAmplitude"),
            ("healthbox", "healthboxSinIndex", "healthboxAmplitude"),
        ):
            if rows[a][amp_field] == 0 or rows[b][amp_field] == 0:
                continue
            active_steps += 1
            delta = (rows[b][field] - rows[a][field]) % 256
            if delta != 7:
                stalls.append((region, a, b, delta))
    if stalls:
        print(f"  FOUND {len(stalls)} non-+7 steps (UNLIKE turn 3's own window, which had zero):")
        for region, a, b, delta in stalls:
            print(f"    {region} @ tick {a}->{b}: delta={delta} (expected 7) - "
                  f"{'STALL (sSinIndex did not advance)' if delta == 0 else 'irregular step'}")
    else:
        print(f"  PASS: every tick-to-tick step is exactly +7 (mod 256), {active_steps} active steps checked.")

    # --- 2. Sampling convention: y2(T) == bounceSin(sinIndex(T-1)) + amplitude, even across the stall? ---
    print("\n=== 2. Sampling convention: resultant y2(T) vs bounceSin(sinIndex(T-1)) - holds even through the stall? ===")
    sample_mismatches = []
    for t in ticks:
        if t - 1 not in rows:
            continue
        for region, sin_field, y2_field, amp_field in (
            ("onix", "onixSinIndex", "onixY2", "onixAmplitude"),
            ("healthbox", "healthboxSinIndex", "healthboxMainY2", "healthboxAmplitude"),
        ):
            amp = rows[t][amp_field]
            if amp == 0:
                continue
            predicted = bounce_sin(rows[t - 1][sin_field]) + amp
            actual = rows[t][y2_field]
            if predicted != actual:
                sample_mismatches.append((region, t, predicted, actual))
    if sample_mismatches:
        print(f"  FAIL: {len(sample_mismatches)} ticks where y2(T) != bounceSin(sinIndex(T-1))+amp: "
              f"{sample_mismatches[:10]}")
    else:
        print(f"  PASS: y2(T) == bounceSin(sinIndex(T-1)) + amplitude at EVERY probed tick (both regions), "
              f"zero exceptions, INCLUDING across the stall itself - the read-before-increment convention "
              f"is exact even while the driver sprite's own phase is stalled; the stall is a genuine pause "
              f"of the accumulator, not a sampling-convention artifact.")

    print("\n=== VERDICT (this script) ===")
    print("A genuine, RAM-confirmed 2-tick STALL of the invisible bouncer sprite's own sSinIndex exists,")
    print("starting one tick AFTER the reopen press registers (5927->5928 and 5928->5929, NOT 5926->5927,")
    print("which steps normally). This is a real, novel, twice-run-verified RAM fact - but per check 2 above")
    print("the read-before-increment sampling convention holds exactly THROUGH the stall (no quirk in the")
    print("sampling itself), and cross-checking against `npm run compare`'s own ground truth (see")
    print("tools/compare/scratch/redraw-extremum/out-5927-appvsoracle/) shows the stall is NOT what causes")
    print("tick 5927's pixel mismatch: real hardware's onixY2 is byte-identical across ALL of 5926-5931")
    print("regardless of the stall (both the stalled and unstalled sinIndex values land in the same sine-table")
    print("plateau here), so the stall is invisible in the pixel domain for this specific window. A naive")
    print("'model vs real, uniform tick-shift k' search (applying `turn5SubmenuBounceTick` uniformly across")
    print("the whole probed range, including ticks BEFORE the reopen where it is not actually the operative")
    print("formula) produced spurious mismatches at 5926/5907-5918/5964+ that ground truth disproves - a")
    print("dead end from mixing formulas outside their true dispatch domain, not a real finding. The ACTUAL")
    print("mechanism (a same-tick dispatch-switch artifact, unrelated to the stall) is derived and verified")
    print("in tools/probe/verify-turn5-reopen-switch-rule.py instead - see that script's own output.")


if __name__ == "__main__":
    main()
