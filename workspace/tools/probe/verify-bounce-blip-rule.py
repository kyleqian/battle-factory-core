#!/usr/bin/env python3
"""ISSUES #28 root-cause probe (S7 worktree, oracle/RAM only - no engine
changes). Pure analysis over the two committed RAM dumps
(`src/data/gen/turn6-bounce-blip-probe.json`, `turn8-bounce-blip-probe.json`,
both from `tools/probe/ram-probe.py` reusing `turn6-menu.json`'s/
`turn8-menu.json`'s own committed segments verbatim + `turn5-menu-bouncer-
raw.json`'s own watch list verbatim). See `docs/bounce-blip-notes.md` for the
narrative; this script reproduces every numeric claim there.

Run: python3 tools/probe/verify-bounce-blip-rule.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent

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
    return math.floor(GBA_SINE_TABLE_256[index % 256] / 256)


# --- Engine constants, copied verbatim from src/engine/battleMenu.ts / battleScene.ts ---
MENU_IDLE_BLANK_END_TICK = 1747
MENU_BOUNCE_RAM_SETUP_TICK = 1748
FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT = 2
TURN5_SITRUS_MENU_REDRAW_TICK = 7222
TURN6_ROCKSLIDE_PRESS_TICK = 7372
TURN6_ROCKSLIDE_MENU_REDRAW_DELAY = 750
TURN7_ROCKSLIDE_PRESS_TICK = 8406
TURN7_ROCKSLIDE_MENU_REDRAW_DELAY = 738

TURN8_REGIME3_TO_REGIME1_SHIFT = TURN5_SITRUS_MENU_REDRAW_TICK - (TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY)


def turn5_sitrus_resettled_bounce_tick(t: int) -> int:
    return t - TURN5_SITRUS_MENU_REDRAW_TICK + (MENU_IDLE_BLANK_END_TICK + 1)


def menu_idle_bounce(t: int) -> dict:
    ram_tick = t - 1
    if ram_tick < MENU_BOUNCE_RAM_SETUP_TICK:
        return {"onixY2": 0, "healthboxY2": 0}
    n = ram_tick - MENU_BOUNCE_RAM_SETUP_TICK
    return {
        "onixY2": bounce_sin(192 + 7 * n) + 1,
        "healthboxY2": bounce_sin(128 + 7 * n) + 1,
    }


def turn6_model(t: int, shift: int = 0) -> dict:
    """`drawTurn6FightSubmenuWindow`'s browsing dispatch: bounceTick=t (CURRENT
    code, shift=0) fed straight to `drawTurn6FieldBase` ->
    `turn5SitrusResettledBounceTick` -> `menuIdleBounce`. `shift` lets us test
    the hypothesis that a `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`-style correction
    (as EVERY turn <=5's own analogous reopened-submenu code applies) is
    simply missing here."""
    bounce_tick = t - shift
    return menu_idle_bounce(turn5_sitrus_resettled_bounce_tick(bounce_tick))


def turn8_model(t: int, shift: int = 0) -> dict:
    """`drawTurn8FightSubmenuWindow`'s browsing dispatch: bounceTick=t (CURRENT
    code, shift=0) -> `drawTurn8FieldBase` (+TURN8_REGIME3_TO_REGIME1_SHIFT) ->
    `drawTurn6FieldBase` -> `turn5SitrusResettledBounceTick` -> `menuIdleBounce`."""
    bounce_tick = t - shift
    regime1 = bounce_tick + TURN8_REGIME3_TO_REGIME1_SHIFT
    return menu_idle_bounce(turn5_sitrus_resettled_bounce_tick(regime1))


TURN6_EXCLUDED_PAIRS = [(7315, 7316), (7324, 7325), (7333, 7334), (7342, 7343)]
TURN8_EXCLUDED_PAIRS = [(9383, 9384), (9392, 9393), (9402, 9403), (9411, 9412), (9420, 9421)]


def load_rows(name: str) -> dict:
    probe = json.loads((WORKTREE_ROOT / "src" / "data" / "gen" / name).read_text())
    return {r["tick"]: r for r in probe["ticks"]}


def check_stalls(rows: dict, ticks: list, label: str) -> None:
    print(f"\n=== [{label}] sSinIndex stall/skip check (both regions) ===")
    stalls = []
    active = 0
    for a, b in zip(ticks, ticks[1:]):
        if b != a + 1:
            continue
        for region, field, amp_field in (
            ("onix", "onixSinIndex", "onixAmplitude"),
            ("healthbox", "healthboxSinIndex", "healthboxAmplitude"),
        ):
            if rows[a][amp_field] == 0 or rows[b][amp_field] == 0:
                continue
            active += 1
            delta = (rows[b][field] - rows[a][field]) % 256
            if delta != 7:
                stalls.append((region, a, b, delta))
    if stalls:
        print(f"  FOUND {len(stalls)} non-+7 steps (of {active} active steps checked):")
        for region, a, b, delta in stalls:
            print(f"    {region} @ {a}->{b}: delta={delta}")
    else:
        print(f"  PASS: every tick-to-tick step is exactly +7 (mod 256), {active} active steps checked - "
          f"NO stall/skip anywhere in this window, including at the excluded ticks.")


def check_sampling(rows: dict, ticks: list, label: str) -> None:
    print(f"\n=== [{label}] sampling convention: y2(T) == bounceSin(sinIndex(T-1))+amp ===")
    mism = []
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
                mism.append((region, t, predicted, actual))
    if mism:
        print(f"  FAIL: {len(mism)} mismatches: {mism[:10]}")
    else:
        print("  PASS: zero exceptions - the read-before-increment sampling convention holds exactly.")


def check_model(rows: dict, ticks: list, model_fn, pairs: list, label: str) -> dict:
    """real_screen_y2(T) = probed y2 at RAM tick T-1 (the established +1 render
    lag). Compares against model_fn(T) for shift in {0 (current code), 2
    (FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT applied)}."""
    print(f"\n=== [{label}] model (shift=0, CURRENT code) vs shift=2 (FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT) vs real ===")
    results = {}
    for shift in (0, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT):
        mism_onix = []
        mism_hb = []
        for t in ticks:
            if t - 1 not in rows:
                continue
            real_onix = rows[t - 1]["onixY2"]
            real_hb = rows[t - 1]["healthboxMainY2"]
            model = model_fn(t, shift)
            if model["onixY2"] != real_onix:
                mism_onix.append((t, model["onixY2"], real_onix))
            if model["healthboxY2"] != real_hb:
                mism_hb.append((t, model["healthboxY2"], real_hb))
        results[shift] = (mism_onix, mism_hb)
        print(f"  shift={shift}: onix mismatches={len(mism_onix)} {mism_onix[:8]}")
        print(f"  shift={shift}:  hb  mismatches={len(mism_hb)} {mism_hb[:8]}")

    print(f"\n  --- per named excluded pair (shift=0 current code) ---")
    for lo, hi in pairs:
        for t in (lo, hi):
            if t - 1 not in rows:
                print(f"  tick {t}: no RAM data (t-1={t-1} outside probed range)")
                continue
            real_onix = rows[t - 1]["onixY2"]
            real_hb = rows[t - 1]["healthboxMainY2"]
            model0 = model_fn(t, 0)
            model2 = model_fn(t, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)
            onix_bad0 = model0["onixY2"] != real_onix
            hb_bad0 = model0["healthboxY2"] != real_hb
            onix_bad2 = model2["onixY2"] != real_onix
            hb_bad2 = model2["healthboxY2"] != real_hb
            which = "onix" if (onix_bad0 or onix_bad2) and not (hb_bad0 or hb_bad2) else (
                "healthbox" if (hb_bad0 or hb_bad2) and not (onix_bad0 or onix_bad2) else
                ("both" if (onix_bad0 or hb_bad0 or onix_bad2 or hb_bad2) else "neither")
            )
            print(f"  tick {t}: real(onix={real_onix},hb={real_hb}) "
                  f"model0(onix={model0['onixY2']},hb={model0['healthboxY2']},"
                  f"{'MISMATCH' if onix_bad0 or hb_bad0 else 'match'}) "
                  f"model2(onix={model2['onixY2']},hb={model2['healthboxY2']},"
                  f"{'MISMATCH' if onix_bad2 or hb_bad2 else 'match'}) region={which}")
    return results


def main() -> None:
    t6_rows = load_rows("turn6-bounce-blip-probe.json")
    t6_ticks = sorted(t6_rows)
    t8_rows = load_rows("turn8-bounce-blip-probe.json")
    t8_ticks = sorted(t8_rows)

    check_stalls(t6_rows, t6_ticks, "turn6")
    check_sampling(t6_rows, t6_ticks, "turn6")
    check_model(t6_rows, t6_ticks, turn6_model, TURN6_EXCLUDED_PAIRS, "turn6")

    check_stalls(t8_rows, t8_ticks, "turn8")
    check_sampling(t8_rows, t8_ticks, "turn8")
    check_model(t8_rows, t8_ticks, turn8_model, TURN8_EXCLUDED_PAIRS, "turn8")

    # --- Retrodiction check: does shift=2 fix ALL 26 excluded ticks across
    # all three turns (turn 6/7/8), with zero NEW mismatches introduced in
    # the surrounding (currently-green) ticks? Turn 7 has no RAM probe this
    # session (time-bounded to two turns per the brief) - flagged, not
    # claimed.
    print("\n=== Retrodiction summary ===")
    for label, rows, ticks, model_fn, pairs in (
        ("turn6", t6_rows, t6_ticks, turn6_model, TURN6_EXCLUDED_PAIRS),
        ("turn8", t8_rows, t8_ticks, turn8_model, TURN8_EXCLUDED_PAIRS),
    ):
        excluded = {t for lo, hi in pairs for t in (lo, hi)}
        for shift in (0, FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT):
            bad_on_excluded = 0
            bad_off_excluded = 0
            for t in ticks:
                if t - 1 not in rows:
                    continue
                real_onix = rows[t - 1]["onixY2"]
                real_hb = rows[t - 1]["healthboxMainY2"]
                model = model_fn(t, shift)
                bad = model["onixY2"] != real_onix or model["healthboxY2"] != real_hb
                if t in excluded:
                    bad_on_excluded += 1 if bad else 0
                else:
                    bad_off_excluded += 1 if bad else 0
            print(f"  {label} shift={shift}: mismatches ON excluded ticks = {bad_on_excluded}/{len(excluded)}, "
                  f"mismatches OFF excluded ticks (regression risk) = {bad_off_excluded}/{len(ticks) - len(excluded)}")


if __name__ == "__main__":
    main()
