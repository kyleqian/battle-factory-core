# Animation coverage

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

> **Layout (since 2026-07-26, PROGRESS entry 480):** animation-lane modules
> live in `src/animation/` and their tests in `tests/animation/` — no longer
> mixed into `src/engine/`. `tests/animation/animationBoundaryRatchet.test.ts`
> pins the import boundary (animation→engine: `battleMenu`/`bg`/`rng` only;
> engine→animation: `battleScene.ts`+`core.ts` only; kernel/AI imports
> forbidden). Comparators stay in `tools/compare/`. Path citations in this
> file and the coverage JSON are updated; `ANIMATION_PROGRESS-archive.md`
> keeps historical `src/engine/` paths as written.

## Priority and acceptance

1. Level 50 Factory: all **276** reachable, executable moves (`MOVE_NONE`
   empty slots are excluded).
2. Open Level additions: **1** move (`OUTRAGE`), plus a geometry audit of
   **8** exclusive species across **32** sets and **37** overlapping moves.
   Overlapping moves retain Level 50 evidence unless that audit finds a real
   variant dependency.
3. The **77** remaining Emerald moves, after Factory coverage.

Moves remain the acceptance unit. Components—scripts, assets, sprites, tasks,
and visual commands—are the implementation unit. A track may overlap other
tracks; FIRE PUNCH can belong to both punch and fire work. Prove a component
with one representative, batch-check siblings, and keep separate move-level
oracle evidence. Do not build one absolute-tick timeline per move.

Move acceptance covers the move-owned animation body and its evidence-required
geometry variants. Generic hit reactions, HP/result presentation, statuses,
held-item use, and controller/menu handoffs are reusable presentation
components with independent coverage; they neither block nor promote a move
animation. A status caused by a move is not part of that move's animation.

- `staged`: a deterministic matching ON-oracle/app case exists.
- `partial`: a meaningful dense window is green, but portability or a required
  variant remains.
- `exact`: the complete dense animation window is green through the shared
  presentation seam and all source- or evidence-required variants are covered.
- No entry means unsupported.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.

## Psychic-family window-2 boundary closed through the shared mode/matrix seam: CONFUSION 140/140, PSYCHIC 140/140 (2026-07-26)

**Verdict:** the remaining boundary frames are exact with no absolute-tick or
move-specific branch. `MOVE_CONFUSION` and `MOVE_PSYCHIC` stay `partial` only
because their opposite KADABRA-front orientation remains unstaged; the complete
player-attacker windows are now **140/140** each, reproduced twice with fresh
Scene-ON evidence.

**Evidence first:** a fresh `dump-scale-window-oam-scanline.py` run separated
three states that the old `targetScale.active` splice conflated. At CONFUSION
tick146, source `AnimTask_ShakeMon` has already synchronously cleared RAM
`x2` to 0, but the OAM shadow still holds the raw creation write
`oamExtra=+3`; the framebuffer displays that creation latch at frame147.
At the restore edge, `objMode`/`affineMode` revert after the one-tick display
lag while the affine matrix retains its two-tick lag, leaving one real
normal/single-size but still-scaled tail frame. This is the same asymmetric
state already modeled exactly by `MOVE_FUTURE_SIGHT`.

**Fix:** `confusionTargetShakeDisplayX2` and
`psychicTargetShakeDisplayX2` query the literal shared `AnimTask_ShakeMon`
sequence at `displayAge - windowStart - 1`, closing the creation edges with
the script amplitudes (+3/+5). `sceneOnConfusionView`/
`sceneOnPsychicView` now expose `targetBlendActive` separately from the
two-tick-lagged `targetScale`; `battleScene.ts` keeps `monbg`'s frozen copy
under the opaque, single-size, still-scaled tail OBJ. This mirrors
FUTURE_SIGHT's existing source-derived mechanism and closes CONFUSION
frames147/176 plus PSYCHIC frames145/174.

**Dense evidence (fresh, twice each):** CONFUSION **140/140 ×2**; PSYCHIC
**140/140 ×2**; FUTURE_SIGHT **114/114 ×2**; GROWTH **63/63 component +
framebuffer ×2 in both orientations**; BIND **45/45 component + framebuffer
×2 in both orientations**. Tier-1 literals pin the creation OAM values and
the separate mode/matrix edges.

**Coverage:** both moves remain honest `partial`; their staged complete
windows have zero remaining frames, while the opposite KADABRA-front
orientation remains the sole named coverage gap. Commit:
`3b443cd fix(animation): separate psychic scale boundary states`.
Final verification: **226 test files / 3037 tests green**; production build
green; coverage census remains **21/276 exact, 5 partial**.

## Psychic-family shared boundary defect: window-1 creation-tick off-by-one closed (137→138/140 both moves); window-2 splice unification tried and refuted, banked (2026-07-26)

**Verdict: real, shared-mechanism fix landed for one of the family's two boundary classes; the other was tested and honestly refuted, not special-cased. `MOVE_CONFUSION` and `MOVE_PSYCHIC` both move 137/140 → 138/140, stay `partial`. No regressions.**

**Instrument first (per this step's brief):** `tools/compare/scratch/confusion-boundary-instrument.ts` (new) prints RAM ground truth (fresh `dump-scale-window-oam-scanline.py` run against `mechanic-confusion-kadabra-onix.json`) side by side with `sceneOnConfusionView`'s own prediction at each of the 3 named defect ticks (119/147/176) and their neighbors. Finding for window 1 (frame119): the OAM shadow shows `AnimTask_ShakeMon2`'s own raw pre-flip creation value (`shakeMon2Sequence` index 0) directly at the creation tick — RAM-confirmed (`oamX` extra reads `+1` = `xOffset`, not `0` "not yet active" nor `-1` = the steady-state index-1 value) — for exactly one tick, before the already-proven one-tick OAM-copy lag takes over. The old formula's "+1" is a RAM-**sample**-alignment idiom only (RAM itself never observes index 0), wrongly reused for the **display** formula too, clamping this transitional tick to 0. A genuine off-by-one in which tick becomes active, exactly as the brief hypothesized — not a new lag value.

**Fix:** new `confusionAttackerShakeDisplayX2`/`psychicAttackerShakeDisplayX2` (`confusion.ts`/`psychic.ts`) call `shakeMon2OffsetAtTick` directly with `displayAge - START_AGE - 1`, letting the function's own `tick<0` clamp handle "not yet created" — no separate guard, no "+1" skip. Used directly by `sceneOnConfusionView`/`sceneOnPsychicView` in place of the old `confusionAttackerEffectAtAge(state.age-2)`/psychic equivalent for the shake read (the tint read is unaffected). Dense comparators: `confusionPortable.ts` 137/140 → **138/140** (frame119's 777px bbox fully closed); `psychicPortable.ts` 137/140 → **138/140** (frame145, this fixture's own relative-age-38 tick, 1583px bbox closed) — both reproduced, byte-identical result.

**Window 2's splice (frame147/176, and PSYCHIC's frame174) tried and REFUTED as one shared mechanism.** The natural unification hypothesis: drop the separate age-1 `targetActive` read, use the same age-2 read as the magnitude for both (no "genuine intermediate" — `scaleMonAndRestoreAtAge` already returns `{active, xScale, yScale}` as one unit). Tested directly against the dense comparator: frame147 unchanged (1460px, still the whole target silhouette), frame176 **regressed** 33px → 881px — reproducing almost exactly the regression the original rung-13 session already found trying the mirror-image fix ("forcing xScale to neutral whenever [the less-lagged read] is inactive" also grew 176's residual to 881px). The age-1-leads-age-2 splice is empirically correct for nearly the entire window-2 tail (RAM-confirmed via the OAM-scanline probe); frame147/176 are the two ticks where that edge itself is off by one, not evidence the splice is wrong in general. Per this lane's own no-per-tick-patch rule: **refuted, banked, not special-cased.** Reverted to the proven splice.

**Coverage.** `MOVE_CONFUSION`: stays `partial`, 137/140 → **138/140** (`confusionPortable.ts`). `MOVE_PSYCHIC`: stays `partial`, 137/140 → **138/140** (`psychicPortable.ts`), mirrored fix (not independently re-probed — the family's byte-identical script/argv already established every relative age transfers unchanged). New Tier-1 tests (`tests/animation/confusion.test.ts`, `tests/animation/psychic.test.ts`) pin both display-formula fixes against literal RAM-probed oracle-tick values. Regression gates green, reproduced **once each** (this session's time cap did not allow the mandated second repro — flagged honestly, not silently skipped): `futureSightPortable.ts` 114/114, `growthPortable.ts` 63/63 both orientations, `bindPortable.ts` 45/45 both orientations.

**Evidence.** `npm test` 2709/2709. `npm run build` green.

**Next action for a future session:** 2 frames remain on each move (CONFUSION: 147/176; PSYCHIC: 174, plus its own already-known window-1 defect is now closed) — all window-2 splice-boundary ticks. Closing them needs a genuinely different, asymmetric correction to the active-edge threshold alone (not a blanket unification, which this session proved makes things worse) — e.g. investigate whether the active edge itself needs its OWN off-by-one at exactly the 2 boundary ticks while keeping the current lag everywhere else, the same shape of fix window 1 just got. Separately, unchanged from prior sessions: PSYCHIC's opposite orientation (KADABRA front sprite) and CONFUSION's second orientation remain open.

**Housekeeping (this session):** moved the "Defect A closed... MOVE_FUTURE_SIGHT promoted to exact" entry to `ANIMATION_PROGRESS-archive.md` to keep ~3 live (AGENTS.md's convention) after adding this session's new top entry.

## MOVE_PSYCHIC staged: 137/140, byte-identical to CONFUSION's own three-frame remainder — psychic family now fully staged (2026-07-26)

**Verdict: cheap-once-staged confirmed exactly as the ledger predicted.** `Move_PSYCHIC` (`battle_anim_scripts.s:4733-4748`) is byte-for-byte CONFUSION's own script shape, differing only in three literal argv values (blend tint color, target shake amplitude, target scale delta). No genuinely new task, curve, or palette mechanism appeared, so no RAM-probe-first gate was triggered beyond the routine per-move timeline probe. `MOVE_PSYCHIC` lands `partial` at 137/140 — the exact same count, and the exact same three relative-age boundary frames, as CONFUSION's own still-open banked remainder.

**Enumeration (rung 1, before writing code):** compared the real script against the already-proven CONFUSION component set — `monbg`/`SetPsychicBackground`/`setalpha`/`AnimTask_ShakeMon2`/`blend_color_cycle`/`AnimTask_ShakeMon`/`AnimTask_ScaleMonAndRestore` (objMode=1 blend path)/`UnsetPsychicBackground` are all identical instructions in identical order to `Move_CONFUSION`. Only three argv literals differ: `blend_color_cycle`'s target color (`RGB(31,23,0)`, not `RGB_WHITE`), the target `AnimTask_ShakeMon`'s x amplitude (`5`, not `3`), and the target `AnimTask_ScaleMonAndRestore`'s xDelta/yDelta (`-6,-6`, not `-4,-4`). KADABRA confirmed as the real carrier via `src/data/gen/battle-frontier-mons.json` (`FRONTIER_MON_KADABRA_2`), not assumed from the family map alone.

**RAM-probed (rung 2):** new fixture `tools/battle-lab/mechanic-psychic-kadabra-onix.json` (same KADABRA/ONIX pair, zero new sprite extraction), probed via the already-committed `tools/probe/dump-future-sight-psychicbg.py` (no new probe script), oracle ticks 70-260. This move's own `fadetobg BG_PSYCHIC` creation tick (age 0) lands at oracle tick 79 — 2 ticks earlier than CONFUSION/FUTURE_SIGHT's own tick 81 (shorter "PSYCHIC!" message text), a difference that lands entirely in the fixture's own age-0 anchor. Every RELATIVE age matched CONFUSION's own already-coded constants exactly: window 1 (attacker shake+blend, task `data[5]=767=RGB(31,23,0)` packed BGR555 confirming the real blend task) creates at age 37; window 2 (target shake+scale, task data reads `-6,-6,duration=15` directly, RAM matrix `250`/`244` at ticks 144/145) creates at age 65; fade 2 starts at age 101 with the identical 16/20/36 ramp/hold/ramp shape; the BG-palette-2 rotation pause lands at the same breakpoint age 97.

**Port (rung 3):** `src/animation/psychic.ts` reuses `blendColorCycleObjYAtAge`/`scaleMonAndRestoreAtAge`/`shakeMonOffsetAtTick`/`shakeMon2OffsetAtTick`/`psychicBackground.ts` verbatim — zero new mechanism code. Tier-1-pinned (`tests/animation/psychic.test.ts`, 13/13, every constant checked against the probe output including the two directly-probed matrix values 250/244). Wired `sceneOnPsychicView` + `SceneOnPsychicConfig`/`View` into `sceneOnPresentation.ts` and a `battleScene.ts` `MOVE_PSYCHIC` draw case mirroring `MOVE_CONFUSION`'s structure exactly, with `PSYCHIC_BLEND_TINT_COLOR` (`RGB(31,23,0)` expanded 5-bit-to-8-bit as `(255,189,0)`, the same `(v5<<3)|(v5>>2)` expansion `RGB_WHITE` already uses) standing in for CONFUSION's hardcoded white attacker tint.

**Dense window (rung 4):** applied CONFUSION's own known lag conventions directly (window-1 shake -2, window-2 OAM-shadow -2 on target x2/scale, monbg copy -1, tint -1 — hardware-level, move-independent OAM-shadow-copy/framebuffer-capture latencies, not move-specific formulas) rather than a blind sweep, then verified by evidence: `tools/compare/psychicPortable.ts` landed **137/140 on the first run**, reproduced byte-identical on a second run (same 3 mismatched frames, same bbox sizes both times). The 3 remaining frames (117, 145, 174 — relative ages 38, 66, 95) sit at the EXACT SAME relative ages as CONFUSION's own still-open remainder (frames 119/147/176, ages 38/66/95): window 1's own creation-tick boundary, window 2's own creation-tick boundary, and window 2's own tail boundary. Strong evidence this is the identical banked defect transferring unchanged, not a new one — per this step's own OUT OF SCOPE list (CONFUSION's 3-frame remainder), not chased further here.

**Coverage (rung 5).** `MOVE_PSYCHIC`: new, `partial`, 137/140 (`psychicPortable.ts`, reproduced twice, byte-identical both times). Regression gates green, reproduced twice each: `MOVE_FUTURE_SIGHT` 114/114 ×2, `MOVE_CONFUSION` 137/140 ×2 (unchanged, its own 3-frame remainder is the same banked class, not chased here), `MOVE_GROWTH` 63/63 both orientations ×2 each, `MOVE_BIND` 45/45 both orientations ×2 each.

**Evidence.** `npm test` 2672/2672. `npm run build` green.

**Next action for a future session:** the psychic family's third and final sibling is now staged; all three (`GROWTH`'s own zero-new-mechanism representative aside) share the exact same 3-frame creation/tail-boundary remainder class. A future session chasing CONFUSION's 3-frame remainder (per that entry's own note: model the active/magnitude edges as a genuine 2-tick ramp rather than a hard step) should close all three moves' remainders together, not just CONFUSION's — they're evidently the same underlying mechanism, not three independent defects. Separately: PSYCHIC's opposite orientation (KADABRA front sprite, not yet extracted) remains open, same as CONFUSION/FUTURE_SIGHT's own still-open opposite-orientation gap.

**Housekeeping (this session):** moved the "Defect A's texture-space
instrument run to exhaustion" entry to `ANIMATION_PROGRESS-archive.md` to
keep ~3 live (AGENTS.md's convention) after adding this session's new top
entry.
