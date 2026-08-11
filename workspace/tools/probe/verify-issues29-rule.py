#!/usr/bin/env python3
"""ISSUES #29 root-cause probe (S7 worktree, oracle/RAM only - no engine
changes). Pure analysis over three committed RAM dumps
(`src/data/gen/turn6-bounce-blip-probe.json` / `turn8-bounce-blip-probe.json`,
already committed by the #28 probe; `turn7-bounce-blip-probe.json`, freshly
probed this session from a new spec, `tools/probe/specs/turn7-bounce-blip-
raw.json`, twice-run byte-identical). See `docs/bounce-blip-notes.md`'s "S7
worktree probe: ISSUES #29" section for the narrative; this script reproduces
every numeric claim there.

Two DIFFERENT families, both the exact same underlying mechanism (a missing
`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` on the bounce-tick argument, the same shape
ISSUES #28 already fixed for the post-reveal browsing branch) recurring one
dispatch branch earlier than #28 touched:

- Family A (turn6-menu.json 7315-7316, turn8-menu.json 9383-9384): the
  PRE-REVEAL idle window (`drawTurn6ActionMenuIdleWindow` /
  `drawTurn7RockSlideTurnEndSettledMenu`, reused by turn 7/8's own pre-reveal
  branch) is called identically for BOTH "genuinely idle, no reopen press
  yet" (`sm.openElapsed === null`, correctly unshifted) and "reopen pressed,
  waiting for the submenu to redraw" (`sm.openElapsed !== null && t <
  revealTick`, WRONGLY left unshifted too) - the function receives no signal
  distinguishing the two, so today it always renders shift=0.
- Family B (turn7-menu.json 8380-8381): `turn7KickoffBounceTick`'s own
  pre-freeze branch (`t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`)
  returns plain `t` (unshifted) - the exact same shape the browsing branch
  had before #28's fix, just one function over (the confirm/kickoff bounce
  wrapper instead of the browsing ternary).

Run: python3 tools/probe/verify-issues29-rule.py
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent

# Reuse #28's own model primitives (GBA_SINE_TABLE_256, bounce_sin,
# menu_idle_bounce, turn5_sitrus_resettled_bounce_tick, the turn6/8 browsing
# models, and the committed constants) rather than re-copying them - imported
# by path since this script sits alongside, not inside, a package.
_spec = importlib.util.spec_from_file_location("verify_bounce_blip_rule", HERE / "verify-bounce-blip-rule.py")
vbr = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vbr)

FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT = vbr.FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT  # 2
FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY = 3  # battleMenu.ts:1077, verbatim
TURN7_REGIME2_TO_REGIME1_SHIFT = vbr.TURN5_SITRUS_MENU_REDRAW_TICK - (
    vbr.TURN6_ROCKSLIDE_PRESS_TICK + vbr.TURN6_ROCKSLIDE_MENU_REDRAW_DELAY
)  # battleScene.ts:6797, verbatim (== -900)
TURN7_KICKOFF_FROZEN_ANCHOR = vbr.TURN6_ROCKSLIDE_PRESS_TICK + vbr.TURN6_ROCKSLIDE_MENU_REDRAW_DELAY  # local phase 0


def load_rows(name: str) -> dict:
    probe = json.loads((WORKTREE_ROOT / "src" / "data" / "gen" / name).read_text())
    return {r["tick"]: r for r in probe["ticks"]}


# --- Family A: idle-window pre-reveal branch, shared by turn 6 (pure idle)
# and turn 7/8 (reused resettled-menu function). The bug is a MISSING
# distinction between "no press yet" (shift=0, correct) and "pressed,
# awaiting reveal" (shift=2 - same closed-form chain the already-fixed
# browsing branch uses, just fed unshifted `t` today). ---

TURN7_ROCKSLIDE_PRESS_TICK = 8406  # battleMenu.ts:2054, verbatim
TURN7_ROCKSLIDE_MENU_REDRAW_DELAY = 738  # battleMenu.ts:2089, verbatim


def turn7_rockslide_resettled_bounce_tick(t: int) -> int:
    """`turn7RockSlideResettledBounceTick(t, TURN7_ROCKSLIDE_PRESS_TICK)`,
    verbatim (battleMenu.ts:2092) - the chain turn 8's OWN idle window
    (`drawTurn7RockSlideTurnEndSettledMenu`, reused unchanged) actually uses,
    NOT `turn5SitrusResettledBounceTick` (that's the turn6/turn8 BROWSING
    branch's own chain, a different anchor entirely - conflating the two was
    this script's own first-draft bug, caught by turn8's family-A case
    failing outright rather than silently passing)."""
    return t - (TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY) + (vbr.MENU_IDLE_BLANK_END_TICK + 1)


def family_a_model_turn6(t: int, shift: int) -> dict:
    """`drawTurn6ActionMenuIdleWindow` -> `drawTurn6FieldBase(fb,t)` (bounceTick
    defaults to `t`) -> `turn5SitrusResettledBounceTick` -> `menuIdleBounce`."""
    bounce_tick = t - shift
    return vbr.menu_idle_bounce(vbr.turn5_sitrus_resettled_bounce_tick(bounce_tick))


def family_a_model_turn8(t: int, shift: int) -> dict:
    """`drawTurn7RockSlideTurnEndSettledMenu(fb,t)` (turn 7's own idle window,
    reused UNCHANGED as turn 8's own pre-reveal branch too) ->
    `turn7RockSlideResettledBounceTick` -> `menuIdleBounce`. The hypothesized
    fix threads `t - shift` into this chain the same way as turn 6's."""
    bounce_tick = t - shift
    return vbr.menu_idle_bounce(turn7_rockslide_resettled_bounce_tick(bounce_tick))


FAMILY_A_CASES = [
    # (label, model_fn, probe file, excluded pair, press_tick, pre-press
    #  sanity tick, reveal-adjacent sanity tick past the excluded pair)
    ("turn6", family_a_model_turn6, "turn6-bounce-blip-probe.json", (7315, 7316), 7313, 7307, 7317),
    ("turn8", family_a_model_turn8, "turn8-bounce-blip-probe.json", (9383, 9384), 9380, None, 9385),
]


def check_family_a() -> bool:
    print("\n" + "=" * 70)
    print("FAMILY A: pre-reveal idle-window bounce (reopen-pressed, not yet revealed)")
    print("=" * 70)
    all_ok = True
    for label, model_fn, probe_name, (lo, hi), press_tick, pre_press_tick, post_tick in FAMILY_A_CASES:
        rows = load_rows(probe_name)
        print(f"\n--- {label} (excluded pair {lo}-{hi}, hypothesized pressTick={press_tick}) ---")

        # The excluded pair itself: shift=0 (current code, applies to BOTH
        # sub-cases of the idle window today) must MISMATCH; shift=2
        # (hypothesized: apply once openElapsed!==null, i.e. t>=pressTick)
        # must MATCH.
        for t in (lo, hi):
            real = (rows[t - 1]["onixY2"], rows[t - 1]["healthboxMainY2"])
            m0 = model_fn(t, 0)
            m2 = model_fn(t, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)
            bad0 = (m0["onixY2"], m0["healthboxY2"]) != real
            ok2 = (m2["onixY2"], m2["healthboxY2"]) == real
            status = "PASS" if (bad0 and ok2) else "FAIL"
            if status == "FAIL":
                all_ok = False
            print(f"  tick {t}: real={real} shift0={ (m0['onixY2'], m0['healthboxY2']) } (must mismatch) "
                  f"shift2={ (m2['onixY2'], m2['healthboxY2']) } (must match)  [{status}]")

        # Pre-press sanity: BEFORE the reopen press (sm.openElapsed still
        # null), shift=0 must remain correct - shift=2 must NOT be applied
        # there (this is the artifact #28's own regression check already
        # caught at tick 7307 - the rule must stay scoped to openElapsed !==
        # null, never the genuinely-idle sub-case).
        if pre_press_tick is not None:
            t = pre_press_tick
            real = (rows[t - 1]["onixY2"], rows[t - 1]["healthboxMainY2"])
            m0 = model_fn(t, 0)
            m2 = model_fn(t, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)
            ok0 = (m0["onixY2"], m0["healthboxY2"]) == real
            bad2 = (m2["onixY2"], m2["healthboxY2"]) != real
            status = "PASS" if (ok0 and bad2) else "FAIL"
            if status == "FAIL":
                all_ok = False
            print(f"  tick {t} (PRE-PRESS sanity, openElapsed still null): real={real} "
                  f"shift0={(m0['onixY2'], m0['healthboxY2'])} (must match) "
                  f"shift2={(m2['onixY2'], m2['healthboxY2'])} (must mismatch - scoping guard)  [{status}]")

        # Full-window regression sweep: every RAM-covered tick from pressTick
        # through the post-excluded-pair neighbor must have shift=2 == real
        # (zero new mismatches once the fix is scoped to `t >= pressTick`),
        # and ticks strictly before pressTick must have shift=0 == real.
        bad_in_window = []
        ticks = sorted(t for t in rows if t + 1 in rows)
        lo_scan = max(min(ticks) + 1, press_tick - 10)
        hi_scan = min(max(ticks) + 1, post_tick + 5)
        for t in range(lo_scan, hi_scan + 1):
            if t - 1 not in rows:
                continue
            real = (rows[t - 1]["onixY2"], rows[t - 1]["healthboxMainY2"])
            shift = FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT if t >= press_tick else 0
            m = model_fn(t, shift)
            if (m["onixY2"], m["healthboxY2"]) != real:
                bad_in_window.append((t, shift, (m["onixY2"], m["healthboxY2"]), real))
        status = "PASS" if not bad_in_window else "FAIL"
        if bad_in_window:
            all_ok = False
        print(f"  window scan [{lo_scan},{hi_scan}] (`shift = 2 if t>=pressTick else 0`): "
              f"{len(bad_in_window)} mismatches  [{status}]")
        if bad_in_window:
            print(f"    {bad_in_window[:10]}")
    return all_ok


# --- Family B: turn 7's confirm/kickoff bounce wrapper, pre-freeze branch. ---

def turn7_kickoff_bounce_tick(t: int, press_tick: int, shift: int) -> int:
    if t < press_tick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY:
        return t - shift
    return TURN7_KICKOFF_FROZEN_ANCHOR


def family_b_model(t: int, press_tick: int, shift: int) -> dict:
    bounce_tick = turn7_kickoff_bounce_tick(t, press_tick, shift)
    regime1 = bounce_tick + TURN7_REGIME2_TO_REGIME1_SHIFT
    return vbr.menu_idle_bounce(vbr.turn5_sitrus_resettled_bounce_tick(regime1))


TURN7_CONFIRM_PRESS_TICK = 8379  # bisected this session (see docs/bounce-blip-notes.md) - any value in [8379,8381] reproduces the same result; RAM data alone can't distinguish within that 3-tick band since it doesn't affect the two excluded ticks' predictions.
TURN7_EXCLUDED_PAIR = (8380, 8381)


def check_family_b() -> bool:
    print("\n" + "=" * 70)
    print("FAMILY B: turn 7 confirm/kickoff bounce wrapper, pre-freeze branch")
    print("=" * 70)
    rows = load_rows("turn7-bounce-blip-probe.json")
    all_ok = True
    lo, hi = TURN7_EXCLUDED_PAIR
    print(f"\n--- turn7 (excluded pair {lo}-{hi}, pressTick={TURN7_CONFIRM_PRESS_TICK}) ---")
    for t in (lo, hi):
        real = (rows[t - 1]["onixY2"], rows[t - 1]["healthboxMainY2"])
        m0 = family_b_model(t, TURN7_CONFIRM_PRESS_TICK, 0)
        m2 = family_b_model(t, TURN7_CONFIRM_PRESS_TICK, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)
        bad0 = (m0["onixY2"], m0["healthboxY2"]) != real
        ok2 = (m2["onixY2"], m2["healthboxY2"]) == real
        status = "PASS" if (bad0 and ok2) else "FAIL"
        if status == "FAIL":
            all_ok = False
        print(f"  tick {t}: real={real} shift0={(m0['onixY2'], m0['healthboxY2'])} (must mismatch) "
              f"shift2={(m2['onixY2'], m2['healthboxY2'])} (must match)  [{status}]")

    # In-domain regression sweep (t >= pressTick, i.e. sm.confirmElapsed !==
    # null - the only domain `turn7KickoffBounceTick` is ever actually
    # dispatched into): shift=2 must reproduce every probed tick from
    # pressTick through the freeze boundary and beyond (the frozen branch is
    # shift-invariant by construction, so it can never regress).
    bad_in_window = []
    for t in range(TURN7_CONFIRM_PRESS_TICK, 8392):
        if t - 1 not in rows:
            continue
        real = (rows[t - 1]["onixY2"], rows[t - 1]["healthboxMainY2"])
        m2 = family_b_model(t, TURN7_CONFIRM_PRESS_TICK, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)
        if (m2["onixY2"], m2["healthboxY2"]) != real:
            bad_in_window.append((t, (m2["onixY2"], m2["healthboxY2"]), real))
    status = "PASS" if not bad_in_window else "FAIL"
    if bad_in_window:
        all_ok = False
    print(f"  in-domain window scan [{TURN7_CONFIRM_PRESS_TICK},8391] (shift=2 always, `t>=pressTick`): "
          f"{len(bad_in_window)} mismatches  [{status}]")
    if bad_in_window:
        print(f"    {bad_in_window[:10]}")
    return all_ok


def main() -> None:
    ok_a = check_family_a()
    ok_b = check_family_b()
    print("\n" + "=" * 70)
    print(f"FAMILY A: {'PASS - rule retrodicts both turn6 and turn8 with zero regressions' if ok_a else 'FAIL'}")
    print(f"FAMILY B: {'PASS - rule retrodicts turn7 with zero regressions' if ok_b else 'FAIL'}")
    print("=" * 70)
    if not (ok_a and ok_b):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
