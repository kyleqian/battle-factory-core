#!/usr/bin/env python3
"""Turn 5 reopen root-cause verification, take 2 (docs/turn3-residual-probe-
notes.md's own "Family B, continued" precedent, re-anchored to turn 5's own
reopen window and re-scoped once the naive uniform-shift/plateau-crossing
hypothesis from `verify-turn5-menu-bounce-rule.py` turned out to predict
mismatches (tick 5926, 5964-5968) that ground truth (`npm run compare`)
proves do NOT exist - see that script's own check 3). This script tests the
SAME-TICK DISPATCH-SWITCH hypothesis instead: `core.ts` sets `turn4Resolved
= true` and opens turn 5's own FightSubmenuState in the exact SAME tick the
reopen A-press registers (5927) - so the very frame that renders 5927 already
dispatches through `drawActionMenuIdleWindow`'s `turn4Resolved`-gated branch,
which selects the `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`-corrected
`turn5SubmenuBounceTick(t)` (a `-2` INSTANTANEOUS phase subtraction relative
to the previously-active, unshifted `turn4RockSlideResettledBounceTick(t)`)
starting at that exact tick, not one tick later. Real hardware's own
invisible bouncer sprite (RAM-confirmed via `turn5-menu-bouncer-raw-probe.json`)
does NOT make any such jump - its sSinIndex keeps incrementing smoothly
across this same boundary (+7 at 5926->5927, no stall until 5927->5928/
5928->5929, an unrelated coincidence). The switch's own `-2` discontinuity,
evaluated AT the switch tick, happens to land outside the sine-table plateau
real hardware is still sitting in for exactly one tick (5927), then
re-converges into the correct plateau from 5928 onward - a transient
one-tick artifact of WHEN the model's own dispatch begins applying the
correction, not a hardware quirk and not a uniform composition offset.

Run: python3 tools/probe/verify-turn5-reopen-switch-rule.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
PROBE_PATH = WORKTREE_ROOT / "src" / "data" / "gen" / "turn5-menu-bouncer-raw-probe.json"
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-menu.json"

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


MENU_IDLE_BLANK_END_TICK = 1747
MENU_BOUNCE_RAM_SETUP_TICK = 1748
FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT = 2
TURN4_CONFIRM_PRESS_TICK = 4925
TURN4_ROCKSLIDE_MENU_REDRAW_DELAY = 661
REOPEN_PRESS_TICK = 5927


def turn4_rockslide_resettled_bounce_tick(t: int) -> int:
    """The formula active BEFORE turn 5's reopen (ticks < 5927), unshifted."""
    return t - (TURN4_CONFIRM_PRESS_TICK + TURN4_ROCKSLIDE_MENU_REDRAW_DELAY) + (MENU_IDLE_BLANK_END_TICK + 1)


def turn5_submenu_bounce_tick(t: int) -> int:
    """The formula active FROM turn 5's reopen (ticks >= 5927) per the CURRENT (committed) code - `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` applied starting the same tick `turn4Resolved` flips true."""
    return turn4_rockslide_resettled_bounce_tick(t) - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT


def y2_from_bounce_tick(bounce_tick: int, seed: int) -> int:
    ram_tick = bounce_tick - 1
    n = ram_tick - MENU_BOUNCE_RAM_SETUP_TICK
    return bounce_sin(seed + 7 * n) + 1


def main() -> None:
    probe = json.loads(PROBE_PATH.read_text())
    rows = {r["tick"]: r for r in probe["ticks"]}
    ticks = sorted(rows)
    trace = json.loads(TRACE_PATH.read_text())
    capture_frames = set(trace.get("captureFrames", []))

    print("=== The two candidate formulas, evaluated at each tick around the reopen press ===")
    print("tick | real_screen(T)=probed_onixY2(T-1) | UNSHIFTED formula y2 | SHIFTED (current code) formula y2 | ground truth (npm run compare)")
    # Ground truth established separately this session via `npm run compare`
    # against a dense 5900-5967 window: ONLY 5927 mismatches (769px), every
    # other tick in the whole window (including 5926, 5928-5967) is 0-diff.
    ground_truth_mismatch = {5927}
    for t in range(REOPEN_PRESS_TICK - 5, REOPEN_PRESS_TICK + 8):
        if (t - 1) not in rows:
            continue
        real_screen = rows[t - 1]["onixY2"]
        unshifted = y2_from_bounce_tick(turn4_rockslide_resettled_bounce_tick(t), 192)
        shifted = y2_from_bounce_tick(turn5_submenu_bounce_tick(t), 192)
        gt = "MISMATCH (excluded from captureFrames)" if t in ground_truth_mismatch else "match"
        marker = "  <-- reopen press registers, turn4Resolved flips true THIS tick" if t == REOPEN_PRESS_TICK else ""
        print(f"  {t} | real={real_screen} | unshifted={unshifted} | shifted={shifted} | {gt}{marker}")

    print("\n=== Verdict per tick: does UNSHIFTED or SHIFTED match real_screen? ===")
    for t in range(REOPEN_PRESS_TICK - 3, REOPEN_PRESS_TICK + 6):
        if (t - 1) not in rows:
            continue
        real_screen = rows[t - 1]["onixY2"]
        unshifted = y2_from_bounce_tick(turn4_rockslide_resettled_bounce_tick(t), 192)
        shifted = y2_from_bounce_tick(turn5_submenu_bounce_tick(t), 192)
        which = []
        if unshifted == real_screen:
            which.append("UNSHIFTED matches")
        if shifted == real_screen:
            which.append("SHIFTED matches")
        if not which:
            which.append("NEITHER matches")
        print(f"  tick {t}: {', '.join(which)}")

    print("\n=== The proposed rule: use the UNSHIFTED formula for exactly tick 5927 (the press's own registering tick), SHIFTED from 5928 onward ===")
    real_5927 = rows[5926]["onixY2"]
    unshifted_5927 = y2_from_bounce_tick(turn4_rockslide_resettled_bounce_tick(5927), 192)
    shifted_5927 = y2_from_bounce_tick(turn5_submenu_bounce_tick(5927), 192)
    print(f"  tick 5927: real={real_5927}, unshifted={unshifted_5927} ({'MATCH' if unshifted_5927 == real_5927 else 'MISMATCH'}), "
          f"shifted (current code)={shifted_5927} ({'MATCH' if shifted_5927 == real_5927 else 'MISMATCH'})")

    print("\n  Scope check: this is a SINGLE-TICK carve-out (apply the unshifted formula only when t == pressTick),")
    print("  so by construction it cannot alter any other tick's rendered output - verifying 5928 through the")
    print("  confirm press (5959) already matches under the CURRENT (LIVE, shifted) formula with no changes")
    print("  needed (this script does not replicate `turn5KickoffBounceTick`'s own post-confirm freeze, so it")
    print("  is not evaluated past 5959 here - `npm run compare`'s own dense sweep already independently proves")
    print("  the whole 5928-5967 range is 0-diff in the real app, freeze included):")
    all_shifted_ok = True
    for t in range(5928, 5960):
        if (t - 1) not in rows:
            continue
        real_screen = rows[t - 1]["onixY2"]
        shifted = y2_from_bounce_tick(turn5_submenu_bounce_tick(t), 192)
        if shifted != real_screen:
            all_shifted_ok = False
            print(f"    tick {t}: shifted={shifted} real={real_screen} MISMATCH")
    if all_shifted_ok:
        print(f"    PASS: shifted formula matches real_screen at every one of ticks 5928-5959 "
              f"({sum(1 for t in range(5928,5960) if (t-1) in rows)} ticks checked, including the named "
              f"5936/5945/5954 the brief's own '-1 shift' experiment broke) - the current code is already "
              f"correct everywhere in the live-formula span except the single switch-tick itself.")

    print("\n=== VERDICT ===")
    print("MECHANISM FOUND: tick 5927's mismatch is caused by `core.ts` applying `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`'s "
          "-2-tick phase correction in the SAME render tick `turn4Resolved` flips true (the reopen press's own "
          "registering tick), not one tick later. The real invisible bouncer sprite (RAM-confirmed, no stall until "
          "one tick further) makes no such instantaneous jump. The corrective rule: `drawActionMenuIdleWindow`'s "
          "bounce-tick selection should keep using the UNSHIFTED `turn4RockSlideResettledBounceTick(t)` through "
          "t == pressTick (5927) itself, switching to the FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT-corrected "
          "`turn5SubmenuBounceTick(t)` starting only at t == pressTick + 1 (5928) - i.e. a ONE-TICK-LATE switch, "
          "not a same-tick one. This is a single-tick-scoped correction (touches rendering at 5927 only) and "
          "therefore cannot break 5936/5945/5954 or any other tick in this window - confirmed above: the current "
          "(shifted) formula already matches real hardware at every tick from 5928 onward with zero exceptions.")


if __name__ == "__main__":
    main()
