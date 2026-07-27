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

## Knock Off opposite orientation closed; promoted to exact (2026-07-26)

**Verdict:** `MOVE_KNOCK_OFF` promotes **partial → exact**. Its complete
move-owned Scene-ON body is source component/RAM-exact and framebuffer-exact
through the shared seam in both required orientations, each reproduced twice:
player-back PLUSLE → opponent-front ONIX is **59/59** (oracle 70-128), and
opponent-front PLUSLE → player-back ONIX is **59/59** (74-132). Census:
**24/276 exact, 3 partial**.

**Source/geometry:** the complete legal opposite mechanicLab fixture places
SHUPPET in opponent battle RAM and ONIX in player battle RAM, while the source
route's already-loaded chrome truthfully remains opponent-front PLUSLE and
player-back ONIX. HorizontalLunge, ShakeMonInPlace, SlideMonToOffset, and
SlideMonToOriginalPos required no new timing or species variant. The only new
display dependency is source-declared: `AnimKnockOffStrike` starts affine
program 1 when the target is player-side (`xScale=-256`, `rotation=+4`) and
applies literal argv[0] with `x -= -16` instead of the opponent target's
`x += -16`. PLUSLE's 40×48/yOffset-14 front source uses corner `(144,22)`;
ONIX reuses the established player-back corner `(40,48)`. All selection is by
battler side/species geometry—no oracle frame, turn, damage, RNG, or facility
branch.

**Evidence:** new legal fixture
`mechanic-knock-off-opponent-shuppet-player-onix.json`, portable fixture
`knock-off-opponent-onix-player-plusle.json`, generalized
`knockOffPortable.ts`, source-extracted PLUSLE front art, and focused Tier-1
asset/geometry/seam tests. Fresh acceptance: KNOCK_OFF **59/59 component +
framebuffer ×2 in both orientations**. BIND regression: **45/45 component +
framebuffer ×2 in both orientations**. `MOVE_SUPER_FANG` stays unsupported:
its full body additionally needs `gSuperFangSpriteTemplate`,
`AnimTask_BlendMonInAndOut`, palette blend, and independent dense evidence.
`MOVE_SECRET_POWER` stays unsupported: the Factory building branch dispatches
to `Move_STRENGTH`, while other environments dispatch to distinct bodies.
Shared reducers promote neither sibling. Implementation commit: `a6df4ee`.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.

## Psychic-family opposite orientation closed: CONFUSION/PSYCHIC promoted to exact; FUTURE_SIGHT stays exact (2026-07-26)

**Verdict:** opponent-front KADABRA attacking player-back ONIX is exact through
the shared Scene-ON seam for all three family moves. `MOVE_CONFUSION` and
`MOVE_PSYCHIC` promote `partial` → **`exact`**; `MOVE_FUTURE_SIGHT` remains
**`exact`**. Census: **23/276 exact, 3 partial**.

**Source/geometry:** all move tasks and psychic-background branches are
side-agnostic. The actual new dependencies were KADABRA's battle
`anim_front.png` (frame 0 genuinely differs from generic `front.png`), front
coords **56×56 / yOffset 5** (corner `(144,13)`, animation center `(176,45)`),
frame program **0×12, 1×45, 0×15**, and `ANIM_GROW_VIBRATE`. That family ends
through `ResetSpriteAfterAnim`, leaving identity affine and zero `x2/y2`;
ONIX is now player-back, so its opponent-front idle residual does not apply.
The runtime asset stays under `src/animation/assets/`; shared generated
catalogs and boundary ratchets are unchanged.

**Implementation/evidence:** the three `battleScene.ts` cases select
KADABRA front/back and ONIX back/front solely by battler side; no timing,
absolute-frame, damage, RNG, turn, or facility branch changed. Complete legal
mechanicLab party fixtures stage the opposite orientation. Fresh results,
each reproduced twice: CONFUSION opponent **140/140** (frames 85-224),
PSYCHIC opponent **140/140** (83-222), FUTURE_SIGHT opponent **114/114**
(81-194). Existing player orientations reproduced twice at **140/140,
140/140, 114/114**. Regression gates twice in both orientations: GROWTH
**63/63 component + framebuffer**, BIND **45/45 component + framebuffer**.

**Verification:** Tier-1 asset/geometry/side tests added; **227 test files /
3041 tests** and production build green. Implementation commit:
`abc5474 feat(animation): close psychic opposite orientation`.

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
