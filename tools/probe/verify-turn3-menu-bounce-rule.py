#!/usr/bin/env python3
"""Family B root-cause verification (docs/turn3-residual-probe-notes.md,
"the named pointer-chase"). Pure analysis over the already-committed
`src/data/gen/turn3-menu-bouncer-raw-probe.json` RAM dump (no mGBA needed -
plain `python3` is fine here, unlike `ram-probe.py` itself). Derives and
computationally verifies the exact rule that produces the hardware's
1-tick-late plateau transition at ticks 3879 (onix/BOUNCE_MON region) and
3888 (healthbox/BOUNCE_HEALTHBOX region), the two ticks
`tools/compare/traces/turn3-menu.json` excludes from `captureFrames`.

Run: python3 tools/probe/verify-turn3-menu-bounce-rule.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
PROBE_PATH = WORKTREE_ROOT / "src" / "data" / "gen" / "turn3-menu-bouncer-raw-probe.json"
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn3-menu.json"

# `GBA_SINE_TABLE_256` (src/engine/battleMenu.ts), copied verbatim - the
# literal `gSineTable[0..255]` (reference/pokeemerald/src/trig.c), NOT
# re-derived via math.sin (that module's own doc explains why: it disagrees
# with the real table by 1 unit at indices 62/63).
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
    """`Sin(index, 1)` (trig.c:515) via the literal table: floor(table[index & 0xFF] / 256)."""
    v = GBA_SINE_TABLE_256[index % 256]
    return math.floor(v / 256)


# --- The engine model, replicated verbatim from src/engine/battleScene.ts /
# src/engine/battleMenu.ts's own committed constants (not re-derived) ---
MENU_IDLE_BLANK_END_TICK = 1747
MENU_BOUNCE_RAM_SETUP_TICK = 1748  # == MENU_DRAW_TICK
FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT = 2
DRAGONBREATH_MENU_REDRAW_DELAY = 391
TURN2_CONFIRM_PRESS_TICK = 2945


def dragon_breath_resettled_bounce_tick(t: int, press_tick: int) -> int:
    return t - (press_tick + DRAGONBREATH_MENU_REDRAW_DELAY) + (MENU_IDLE_BLANK_END_TICK + 1)


def turn3_submenu_bounce_tick(t: int) -> int:
    return dragon_breath_resettled_bounce_tick(t, TURN2_CONFIRM_PRESS_TICK) - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT


def model_y2(t: int, seed: int) -> int:
    """`menuIdleBounce(turn3SubmenuBounceTick(t))`'s own onix/healthbox Y2, replicated exactly."""
    bounce_tick = turn3_submenu_bounce_tick(t)
    ram_tick = bounce_tick - 1
    n = ram_tick - MENU_BOUNCE_RAM_SETUP_TICK
    return bounce_sin(seed + 7 * n) + 1


def main() -> None:
    probe = json.loads(PROBE_PATH.read_text())
    rows = {r["tick"]: r for r in probe["ticks"]}
    ticks = sorted(rows)
    trace = json.loads(TRACE_PATH.read_text())
    capture_frames = set(trace.get("captureFrames", []))

    ok = True

    # --- 1. The driver sprites' own raw sSinIndex: is it EVER stalled/skipped? ---
    # (restricted to ticks where the bounce is still active - `sAmplitude != 0` -
    # since EndBounceEffect destroys the invisible sprite around tick 3893,
    # zeroing its whole `data[]`, which is an expected teardown, not a stall.)
    print("=== 1. sSinIndex stall/skip check (both regions, while the bounce is active) ===")
    stalls = []
    active_steps = 0
    for a, b in zip(ticks, ticks[1:]):
        if b != a + 1:
            continue  # gap in the probe itself, not a game-side stall
        for region, field, amp_field in (
            ("onix", "onixSinIndex", "onixAmplitude"),
            ("healthbox", "healthboxSinIndex", "healthboxAmplitude"),
        ):
            if rows[a][amp_field] == 0 or rows[b][amp_field] == 0:
                continue  # sprite destroyed at/around this tick - not this mechanism
            active_steps += 1
            delta = (rows[b][field] - rows[a][field]) % 256
            if delta != 7:
                stalls.append((region, a, b, delta))
    if stalls:
        ok = False
        print(f"  FAIL: {len(stalls)} non-+7 steps found: {stalls[:10]}")
    else:
        print(f"  PASS: every tick-to-tick step is exactly +7 (mod 256), both regions, "
              f"ticks {ticks[0]}-{ticks[-1]} ({active_steps} active steps checked). "
              f"No stall/skip anywhere in the window.")

    # --- 2. Driver sprite id + sBouncerSpriteId + sWhich: constant identity check ---
    print("\n=== 2. Driver sprite identity (constant across the whole window?) ===")
    for region, id_field, target_field, which_field, amp_field, expect_target, expect_which in (
        ("onix", "onixDriverId", "onixBouncerTarget", "onixWhich", "onixAmplitude", 6, 0),
        ("healthbox", "healthboxDriverId", "healthboxBouncerTarget", "healthboxWhich", "healthboxAmplitude", 0, 1),
    ):
        active = [t for t in ticks if rows[t][amp_field] != 0]
        ids = {rows[t][id_field] for t in active}
        targets = {rows[t][target_field] for t in active}
        whiches = {rows[t][which_field] for t in active}
        print(f"  {region}: driver sprite id={ids}, bouncerTarget(gSprites slot driven)={targets}, "
              f"sWhich={whiches} (expect target={expect_target}, which={expect_which}), "
              f"active ticks={active[0]}-{active[-1]}")
        if targets != {expect_target} or whiches != {expect_which}:
            ok = False
            print(f"  FAIL: {region} driver identity does not match expectation")

    # --- 3. The hardware sampling convention: y2(T) == bounceSin(sinIndex(T-1)) + amplitude ---
    print("\n=== 3. Sampling convention: resultant y2(T) vs bounceSin(sinIndex(T-1)) ===")
    print("    (SpriteCB_BounceEffect, battle_main.c:2967-2979: reads sSinIndex BEFORE")
    print("    incrementing it - the callback's `index = sprite->sSinIndex` happens first,")
    print("    `sprite->sSinIndex = ... + sDelta` happens after)")
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
                continue  # bounce ended (sprite destroyed, data[] zeroed) - not this mechanism
            predicted = bounce_sin(rows[t - 1][sin_field]) + amp
            actual = rows[t][y2_field]
            if predicted != actual:
                sample_mismatches.append((region, t, predicted, actual))
    if sample_mismatches:
        ok = False
        print(f"  FAIL: {len(sample_mismatches)} ticks where y2(T) != bounceSin(sinIndex(T-1))+amp: "
              f"{sample_mismatches[:10]}")
    else:
        print(f"  PASS: y2(T) == bounceSin(sinIndex(T-1)) + amplitude at EVERY probed tick where the "
              f"bounce is active (both regions) - zero exceptions, INCLUDING at RAM ticks 3879 and 3888 "
              f"themselves. The read-before-increment convention is exact, not a quirk.")

    # --- 4. The engine model vs RAM ground truth, at the ACTUAL screen-tick alignment ---
    print("\n=== 4. Model (turn3SubmenuBounceTick+menuIdleBounce) vs real screen content ===")
    print("    real_screen_y2(T) = probed_y2(T-1)  (the already-established +1 render lag)")
    direct_mismatches = []
    shifted_matches_all = True
    checked = []
    for t in ticks:
        if t not in rows or (t - 1) not in rows:
            continue
        for region, y2_field, seed in (("onix", "onixY2", 192), ("healthbox", "healthboxMainY2", 128)):
            real_screen = rows[t - 1][y2_field]
            model = model_y2(t, seed)
            checked.append((region, t))
            if real_screen != model:
                direct_mismatches.append((region, t, real_screen, model, t in capture_frames))

    print(f"  Raw model(t) vs real_screen(t) mismatches across the whole probed range "
          f"({len(checked)} region-ticks checked): {len(direct_mismatches)}")
    for region, t, real, model, captured in direct_mismatches:
        tag = "IN captureFrames (named residual)" if captured else "NOT in captureFrames (untested by the trace)"
        print(f"    {region} @ tick {t}: real={real} model={model}  [{tag}]")

    # --- 5. The exact rule: model(t) == real_screen(t+1), i.e. the model is uniformly ---
    #         one RAM tick AHEAD of the real, continuously-running invisible sprite.
    print("\n=== 5. The derived rule: model(t) == real_screen(t+1) for ALL t? ===")
    rule_violations = []
    for t in ticks:
        if t not in rows or (t + 1) not in rows:
            continue
        for region, y2_field, seed in (("onix", "onixY2", 192), ("healthbox", "healthboxMainY2", 128)):
            real_screen_next = rows[t][y2_field]  # = probed_y2((t+1)-1) = real_screen_y2(t+1)
            model = model_y2(t, seed)
            if real_screen_next != model:
                rule_violations.append((region, t, real_screen_next, model))
    if rule_violations:
        ok = False
        print(f"  FAIL: {len(rule_violations)} violations of model(t)==real_screen(t+1): "
              f"{rule_violations[:10]}")
    else:
        print(f"  PASS, ZERO violations across every probed region-tick "
              f"({len([t for t in ticks if t in rows and (t+1) in rows])} ticks x 2 regions): "
              f"the engine's turn3SubmenuBounceTick-composed bounce-tick argument is uniformly "
              f"exactly ONE RAM TICK MORE ADVANCED than the real invisible bouncer sprite's own "
              f"continuously-incremented sSinIndex. Both named residuals (3879 onix, 3888 healthbox) "
              f"are simply the two ticks in this window where that constant 1-tick advance happens to "
              f"cross a sine-table plateau boundary and so becomes visible; everywhere else the +1 is "
              f"masked because neighboring ticks share the same quantized (0/1/2) y2 level.")

    print("\n=== VERDICT ===")
    if ok:
        print("Rule found and verified with zero exceptions: NOT a hardware quirk, NOT an accumulator "
              "stall, NOT a per-tick peak-hold artifact - the invisible bouncer sprites' own sSinIndex "
              "ticks a perfectly uniform +7/tick (RAM-confirmed, both regions, whole window) and the "
              "resultant y2 always samples it via plain read-before-increment (RAM-confirmed, zero "
              "exceptions). The engine's own composed bounce-tick formula for turn 3's reopened submenu "
              "is a UNIFORM one-RAM-tick-too-advanced phase reference; this is invisible almost "
              "everywhere and visible only at genuine sine-table plateau boundaries - exactly ticks "
              "3879 and 3888 in this window.")
    else:
        print("Some check(s) above FAILED - see detail. The rule as stated does not hold.")


if __name__ == "__main__":
    main()
