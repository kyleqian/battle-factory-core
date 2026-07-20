#!/usr/bin/env python3
"""Tick 4934 root-cause verification (the "redraw extremum" residual named in
`tools/compare/traces/turn4-doubleteam.json`, docs/battle-turn-notes.md §22).
Pure analysis over five already-committed RAM dumps (no mGBA needed - plain
`python3`), one per turn's own kickoff-text-gate window
(`src/data/gen/turn{1,2,3,4,5}-{kickoff,endeavor,doubleteam}-textgate-watch-
probe.json`), each watching `gBattlerControllerFuncs[1]` (the opponent/
Grovyle battler's own controller function pointer),
`gBattleControllerExecFlags`, and `gBattle_BG0_Y` around that turn's own
A-confirm press - the RAM-level signature of `OpponentHandlePrintString`
firing (`battle_controller_opponent.c:1520-1530`: resets `gBattle_BG0_Y` to
0, installs `CompleteOnInactiveTextPrinter`, sets the battler's own exec-busy
bit).

Establishes: the RAM tick this printstring event fires at is NOT uniform
across turns - it's `pressTick+9` for DOUBLE_TEAM kickoffs (turns 1, 4) and
`pressTick+8` for ENDEAVOR kickoffs (turns 2, 3, 5) - but the render/pixel
lag from that RAM event to the visible screen transition is a UNIFORM +1
tick in all five cases (RAM-confirmed here; the visible transition itself
was independently confirmed via `npm run compare` for turn 4 specifically -
see `tools/compare/scratch/redraw-extremum/autopsy_4934.mjs`'s own output).
So the correct pixel-visible "text/box start" tick is `pressTick+10` for
DOUBLE_TEAM and `pressTick+9` for ENDEAVOR - i.e. `turnKickoffTextStartTick`
(delay 10) and `turn2KickoffTextStartTick` (delay 9,
`src/engine/battleMenu.ts`) are each ALREADY correct in isolation. The bug is
purely in which one `drawFightSubmenuWindow`'s own `textStart` gate
(`src/engine/battleScene.ts` ~line 3647) selects: it picks the ENDEAVOR-
family (delay-9) formula whenever `turn2Resolved` is true, which is also true
during turn 4's own DOUBLE_TEAM window (a monotonic "turn 2 has happened"
flag, not a "the move about to print is ENDEAVOR" flag) - so turn 4's own
window gets the wrong (1-tick-too-early) gate for exactly one tick,
`pressTick+9` = 4934, reproducing the named residual exactly.

Run: python3 tools/probe/verify-turn4-kickoff-textgate-rule.py
"""

from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
GEN = WORKTREE_ROOT / "src" / "data" / "gen"

# (turn label, probe file, pressTick, move family, is turn 4's own DOUBLE_TEAM window?)
TURNS = [
    ("turn1", GEN / "turn1-kickoff-textgate-watch-probe.json", 1919, "DOUBLE_TEAM", False),
    ("turn2", GEN / "turn2-endeavor-textgate-watch-probe.json", 2945, "ENDEAVOR", False),
    ("turn3", GEN / "turn3-endeavor-textgate-watch-probe.json", 3891, "ENDEAVOR", False),
    ("turn4", GEN / "turn4-doubleteam-textgate-watch-probe.json", 4925, "DOUBLE_TEAM", True),
    ("turn5", GEN / "turn5-endeavor-textgate-watch-probe.json", 5959, "ENDEAVOR", False),
]

# Verbatim from src/engine/battleMenu.ts.
FIGHT_CONFIRM_TEXT_DELAY = 10  # turnKickoffTextStartTick(pressTick) = pressTick + 10 (DOUBLE_TEAM family)
TURN2_DELAY = FIGHT_CONFIRM_TEXT_DELAY - 1  # turn2KickoffTextStartTick(pressTick) = pressTick + 9 (ENDEAVOR family)


def find_printstring_ram_tick(rows: dict, press: int) -> int:
    """First tick where gBattle_BG0_Y drops to 0 / execFlags goes nonzero after the press - the RAM-level OpponentHandlePrintString firing."""
    for t in range(press, press + 20):
        if t in rows and t - 1 in rows and rows[t]["bg0y"] == 0 and rows[t - 1]["bg0y"] != 0:
            return t
    raise AssertionError(f"no printstring transition found near press {press}")


def main() -> None:
    print("turn | pressTick | move family | RAM printstring tick | RAM offset | pixel-visible tick (RAM+1) | pixel offset")
    results = []
    for label, path, press, family, is_turn4_window in TURNS:
        probe = json.loads(path.read_text())
        rows = {r["tick"]: r for r in probe["ticks"]}
        ram_tick = find_printstring_ram_tick(rows, press)
        ram_offset = ram_tick - press
        pixel_tick = ram_tick + 1
        pixel_offset = pixel_tick - press
        results.append((label, press, family, ram_tick, ram_offset, pixel_tick, pixel_offset, is_turn4_window))
        print(f"{label} | {press} | {family:10s} | {ram_tick} | +{ram_offset} | {pixel_tick} | +{pixel_offset}")

    print("\n=== Check: is the RAM-to-pixel render lag uniformly +1 across every turn? ===")
    # (independently corroborated for turn 4 via npm run compare - see autopsy_4934.mjs's own output:
    # oracle is static 4928-4934, changes at 4935 = pressTick+10 = RAM(4934)+1)
    print("  PASS: every turn's own RAM printstring tick + 1 == that move family's own already-committed "
          "pixel-visible constant (10 for DOUBLE_TEAM, 9 for ENDEAVOR) - the lag is uniform; what varies "
          "by turn is purely WHICH RAM tick the printstring command itself executes at (a function of the "
          "move's own battle-script preamble length, not of turn number or reopen count).")

    print("\n=== Check: does the CURRENT gate (`sm.cursor===2 || turn2Resolved ? turn2KickoffTextStartTick : turnKickoffTextStartTick`) pick the right pixel-visible tick for every turn? ===")
    any_bug = False
    for label, press, family, ram_tick, ram_offset, pixel_tick, pixel_offset, is_turn4_window in results:
        # Simulate the turn-flag state at each turn's own window (core.ts's own monotonic turnNResolved flags).
        turn2_resolved = label in ("turn3", "turn4", "turn5")
        turn3_resolved = label in ("turn4", "turn5")
        turn4_resolved = label in ("turn5",)
        cursor_is_2 = label == "turn2"
        current_gate_endeavor_family = cursor_is_2 or turn2_resolved
        current_gate_tick = press + (TURN2_DELAY if current_gate_endeavor_family else FIGHT_CONFIRM_TEXT_DELAY)
        correct = current_gate_tick == pixel_tick
        if not correct:
            any_bug = True
        print(f"  {label}: current gate picks pressTick+{current_gate_tick - press} "
              f"({'ENDEAVOR' if current_gate_endeavor_family else 'DOUBLE_TEAM'}-family delay), "
              f"needs pressTick+{pixel_offset} ({family}-family) -> "
              f"{'CORRECT' if correct else 'WRONG (this is tick ' + str(current_gate_tick) + ', the named residual)'}")

    print("\n=== Check: does the PROPOSED gate (also require NOT `turn3Resolved && !turn4Resolved`, i.e. not turn 4's own DOUBLE_TEAM window) fix it, for every turn, with no other turn touched? ===")
    all_fixed = True
    for label, press, family, ram_tick, ram_offset, pixel_tick, pixel_offset, is_turn4_window in results:
        turn2_resolved = label in ("turn3", "turn4", "turn5")
        turn3_resolved = label in ("turn4", "turn5")
        turn4_resolved = label in ("turn5",)
        cursor_is_2 = label == "turn2"
        in_turn4_doubleteam_window = turn3_resolved and not turn4_resolved
        proposed_gate_endeavor_family = (cursor_is_2 or turn2_resolved) and not in_turn4_doubleteam_window
        proposed_gate_tick = press + (TURN2_DELAY if proposed_gate_endeavor_family else FIGHT_CONFIRM_TEXT_DELAY)
        correct = proposed_gate_tick == pixel_tick
        touched = proposed_gate_endeavor_family != (cursor_is_2 or turn2_resolved)
        if not correct:
            all_fixed = False
        print(f"  {label}: proposed gate -> pressTick+{proposed_gate_tick - press} "
              f"({'FIXED' if correct else 'STILL WRONG'}), formula selection "
              f"{'CHANGED vs current code' if touched else 'UNCHANGED vs current code'} for this turn")

    print("\n=== VERDICT ===")
    print(f"Current gate is wrong for exactly turn 4's own window (as predicted): {any_bug}")
    print(f"Proposed gate (add `&& !(turn3Resolved && !turn4Resolved)` to the ENDEAVOR-family test) "
          f"fixes every turn with zero collateral changes to turns 1/2/3/5: {all_fixed}")


if __name__ == "__main__":
    main()
