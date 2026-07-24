# Animation coverage

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

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

## Anim-script interpreter spike: SUCCESS (2026-07-24)

**Verdict: the interpreter reproduces the move.** Built a minimal interpreter
over the committed anim command stream (`src/data/gen/battle-move-anim-scripts.json`'s
now-populated `FEATHER_DANCE` entry — previously only `ROCK_SLIDE`/
`DOUBLE_TEAM`, so this spike also had to add the FEATHER_DANCE decode to
`tools/extract/extract-battle-move-anim-assets.ts` before the "committed
stream" claim was actually true) plus a direct port of `AnimFallingFeather`/
`AnimFallingFeather_Step` (`battle_anim_flying.c:572-893`, ~320 source lines
including the four largely-symmetric quadrant cases, ported 1:1 with named
booleans replacing the packed bitfield — not the "~50 lines" estimate, which
undercounted the state-machine switch). `src/engine/featherDance.ts`'s
`makeFeatherSpriteLookup` now runs this simulation instead of replaying
`turn{6,7,8}-feather-sprites-probe.json`; those probe imports are deleted from
production and now live only in `tests/featherDanceInterpreter.test.ts` as
dev-time pinning evidence. **ISSUES #40 retired** (propose deleting its entry;
supervisor folds it).

**Evidence.** All three committed dense comparators rerun at their exact
recorded counts, zero regressions: `turn6-feathers.json` **235/235**,
`turn7-feathers.json` **145/145**, `turn8-feathers.json` **162/162**
(`turn6-featherdance.json` **90/90** and `turn11-featherdance.json`
**178/178** also unchanged). `tests/featherDanceInterpreter.test.ts` checks
every field (centerX/centerY/pa/pb/pc/pd/animNum/priority) at every real RAM
tick across all three probes — **973/973 matched** in each turn (turn6/turn8
each carry a further ~12-87-row tail of a later, unrelated sprite reusing the
same OAM slot after the real feathers self-destroy; the interpreter correctly
excludes it rather than needing a hand-picked `lastRamTick` cutoff). The
simulation's own natural self-destroy tick (from the ported `y >=
destroyThreshold` physics, no external parameter) lands on **exactly**
7557/8591/9637 — the old hand-recorded cutoffs — for all three turns.

**The one genuine derivation, not a curve fit:** the script's `delay 6`
between createsprite groups produces an 8-tick RAM spawn spacing
(0,8,8,16,16,24,24,32 across the 8 feathers), not 6. This falls straight out
of the shared script VM (`reference/pokeemerald/src/battle_anim.c`'s
`RunAnimScriptCommand`/`Cmd_delay`/`WaitAnimFrameCount`): `delay N` costs
`N+2` ticks until the next opcode runs (N decrementing calls + 1 more to
detect zero, then one more tick before `RunAnimScriptCommand` resumes) — a
property of the VM, not of FEATHER_DANCE, verified here and not yet
batch-checked against a second move (that check is the generality claim a
later step would need, per the scope rules below).

Move acceptance and dense oracle evidence are unchanged: FEATHER_DANCE stays
`exact`, same coverage entry, same evidence files plus the new
interpreter/test files (`ANIMATION_COVERAGE.json`). Only the implementation
unit changed — hand-fitted timelines are now the exception requiring
justification, not the default; the interpreter itself has one representative
(FEATHER_DANCE) and is deliberately scoped to the two ops (`delay`,
`createsprite`) that move's script actually uses. Generalizing it to a second
move (proving the `delay`-cost rule and the createsprite-schedule walk
against a different script) is a later step, not this one.

## Interpreter generalization, second-move proof: MOVE_MIST_BALL — STOP AND SPLIT (2026-07-24)

**Verdict: does NOT generalize cheaply. Enumerated the command surface per the
step brief's own rule and stopped before coding, per that rule's explicit
sanction ("that is a successful outcome, not a failure").** This directly
answers the open question the FEATHER_DANCE spike left flagged: FEATHER_DANCE's
success (`delay`/`createsprite` only, no `Random()`, no sub-tasks) does NOT
carry to a script this rich. MIST_BALL is a legitimately harder script, not a
templated repeat.

**What was done.** Extended `tools/extract/extract-battle-move-anim-assets.ts`
with a full decode of `Move_MIST_BALL` (`battle_anim_scripts.s:3955-3973`) into
`battle-move-anim-scripts.json`'s new `MIST_BALL` entry (`callback: null`,
`status` field records the stop) — additive only, every other extractor output
re-verified byte-identical (`git status` after a full re-run showed only the
one JSON file touched). No interpreter/callback port lands this step.

**Command-surface enumeration** (every op read against its real C callback,
not guessed):
- `loadspritegfx ANIM_TAG_SMALL_BUBBLES` / `ANIM_TAG_WHITE_FEATHER` — already-
  supported op; the WHITE_FEATHER load is a red herring (see below).
- `delay`, `playsewithpan`, `end` — already supported / no-op for pixel output.
- `createsprite gMistBallSpriteTemplate, ANIM_TARGET, 0, 0,0,0,0, 30, 0` —
  callback chain `AnimThrowMistBall` → `TranslateAnimSpriteToTargetMonLocation`
  → `StartAnimLinearTranslation` (`battle_anim_ice.c:1090-1095`,
  `battle_anim_mons.c:1546-1568`). **New primitive**: no move to date has a
  generic linear-translation port — `firePunch.ts`'s burn-flame particles hand-
  fit ONE instance's Q8.8 delta constant instead of porting
  `StartAnimLinearTranslation`'s accumulator generically.
- `waitforvisualfinish` — **needs real semantics**. The current interpreter
  (`featherDance.ts`) treats this op as a fixed 0-tick no-op, valid only
  because FEATHER_DANCE's own instance sits after the LAST `createsprite` (a
  script-position coincidence, calibrated around via
  `TURN6_FIRST_VISIBLE_TICK`). MIST_BALL's `waitforvisualfinish` sits in the
  MIDDLE of the script and genuinely gates continuation on the mist-ball
  sprite's own 30-tick lifetime finishing — the interpreter would need actual
  sprite-lifetime tracking to generalize this op at all.
- `createvisualtask AnimTask_ShakeMon, ...` (×2) — algorithmically simple,
  deterministic toggle-and-count state machine
  (`battle_anim_mon_movement.c:87-141`), and the mechanism is already dense-
  oracle-proven via hand-fit tables in `quickAttack.ts`/`fly.ts` — lowest-cost
  item on this list, a real port (not a fresh fit) is straightforward.
- `complex_palette_blend ... selector=F_PAL_BG ...` — this is a **script
  macro** (`asm/macros/battle_anim_script.inc:294-296`), not a raw opcode; it
  expands to `createsprite gComplexPaletteBlendSpriteTemplate, ...`. Its
  callback (`AnimComplexPaletteBlend`/`_Step1`/`_Step2`,
  `battle_anim_normal.c:344-407`) blends the WHOLE selected battle-palette set
  toward a color and back via `BlendPalettes`/`UnpackSelectedBattlePalettes`,
  gated on the unrelated global `gPaletteFade.active` being false between
  steps. **New subsystem** — no ported move touches whole-palette-set blending
  or depends on an external fade-system gate.
- `createvisualtask AnimTask_MistBallFog, 5` — **new subsystem, and the exact
  "background fade pipeline" example the step brief names as a stop trigger.**
  `AnimTask_MistBallFog`/`_Step` (`battle_anim_ice.c:1097-1170+`) loads NEW BG1
  tiles (`gWeatherFogHorizontalTiles`), a NEW tilemap (`gBattleAnimFogTilemap`),
  and a NEW palette (`gFogPalette`) via `LoadBgTiles`/
  `AnimLoadCompressedBgTilemapHandleContest`/`LoadPalette` — none of which any
  extractor in this codebase has ever exercised — then drives `BLDCNT`/
  `BLDALPHA` through a 4-phase state machine (ramp in via a lookup table, hold
  ~80 ticks, ramp out, clear both BG1 and BG2). This is a full background-
  compositing pipeline, categorically different from every sprite/palette
  mechanism ported so far.
- `createvisualtask AnimTask_BlendBattleAnimPal, ...` (×2) — the task itself
  already has ONE hardcoded fitted instance (`battleScene.ts`'s DRAGON_BREATH
  red-fade). MIST_BALL needs it **generalized** into a reusable parametric
  primitive (color/range/step all vary) rather than a second hand-fit —
  moderate cost, not free reuse.

**Tally: 6 substantive new-or-generalize items** (linear translation,
`waitforvisualfinish` real semantics, `AnimTask_ShakeMon` port,
`AnimComplexPaletteBlend`, `AnimTask_MistBallFog`, `AnimTask_BlendBattleAnimPal`
generalization), two of which are genuinely new subsystems — past the step
brief's own ">~4 substantive ops or a genuinely new subsystem" stop threshold.
Per that rule this session stopped after the enumeration + extractor decode,
rather than rushing a partial port.

**The `ANIM_TAG_WHITE_FEATHER` load is a red herring, confirmed by source, not
just inferred from the component graph:** `AnimThrowMistBall` uses
`ANIM_TAG_SMALL_BUBBLES` (`gMistBallSpriteTemplate`); `AnimTask_MistBallFog`
loads its own separate BG asset trio. Nothing in `Move_MIST_BALL`'s script ever
consumes the loaded `ANIM_TAG_WHITE_FEATHER` tile data — it's loaded but dead,
so this move shares NO real sprite/asset component with FEATHER_DANCE despite
the `battle-animation-components.json` dependency-graph edge (`goal` text in
`ANIMATION_COVERAGE.json`'s `white-feather` track updated to record this).

**Remainder for whoever picks this back up** (in cost order): port
`AnimTask_ShakeMon` generically (cheapest, evidence already exists elsewhere);
port the linear-translation primitive and wire `AnimThrowMistBall`; generalize
`AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH instance; give the
interpreter real `waitforvisualfinish` semantics (sprite-lifetime tracking);
only then tackle the two new subsystems (`AnimComplexPaletteBlend`,
`AnimTask_MistBallFog`'s BG pipeline) — each is its own extraction + engine
slice, likely each deserving its own bounded step. No Level-50 staging or dense
oracle window was attempted this step (staging happens after there's something
real to render); MIST_BALL stays unsupported (no `ANIMATION_COVERAGE.json`
entry) rather than `partial`, since zero dense window is green.

## MIST_BALL remainder, rungs 1-2: ShakeMon ported, linear translation ported (2026-07-24)

**Rung 1 — `AnimTask_ShakeMon` (`battle_anim_mon_movement.c:87-141`).** Ported
1:1 as `src/engine/shakeMon.ts` (`shakeMonSequence`/`shakeMonOffsetAtTick`,
parametric `xOffset,yOffset,numTimes,frameDelay`). `quickAttack.ts`'s
`TARGET_SHAKE_AGES` hand-fit set is deleted and replaced by a call through
the port (`quickAttackTargetShakeX2`); both QUICK_ATTACK comparators re-run
at their recorded counts: `quick-attack-pidgeotto-onix.json` **219/219**,
`quick-attack-player-pidgeotto-onix.json` **214/214**.

`fly.ts`'s own `AnimTask_ShakeMon(ANIM_TARGET,6,0,8,1)` instance
(`FlyUnleash`, `battle_anim_scripts.s:6418`) was **not** ported — a genuine
divergence, not fudged. The literal port's own state machine predicts an
isolated leading nonzero tick before settling into 2-tick pairs (any
even `numTimes` with `frameDelay=1` shakes this way: creation tick alone,
then pairs); `fly.ts`'s committed `FLY_SHAKE_AGES = {24,25,28,29,32,33}` is
exactly that pattern's three pairs with the leading isolated tick omitted,
at the best-fit creation-tick alignment (one tick before
`FLY_IMPACT_FIRST_AGE`, i.e. age 21). Swapping the port in at that alignment
was tested directly against the oracle this session and **regresses**
`fly-murkrow-onix-strike.json` from the recorded **248/248** to **247/248**
(one mismatched frame at the extra age-21 tick) — the hand-fit's omission is
correct, the port's naive alignment is not. Reverted; `fly.ts` is
byte-identical to its prior commit. `FLY_SHAKE_AGES` and the divergence
itself are pinned in `tests/shakeMon.test.ts` so the gap is visible without
re-spending the oracle round-trip. Re-confirmed unchanged after revert:
`fly-murkrow-onix-strike.json` **248/248**,
`fly-player-murkrow-onix-strike.json` **244/244**.

`AnimTask_ShakeMon2` (the coverage report's 64-remaining-move leverage item)
is a **different** source task (positive/negative alternation, not on/off
toggling) — this port's helpers do not cover its surface; only the general
"parametric task-state-machine, driven tick-by-tick" shape is reusable as a
template for a future `ShakeMon2` port, not any code from this rung.

**Rung 2 — linear-translation Q8.8 accumulator**
(`InitAnimLinearTranslation`/`AnimTranslateLinear`,
`battle_anim_mons.c:1065-1139`). Ported as
`src/engine/animLinearTranslation.ts` (`linearTranslationDeltaQ8` +
`linearTranslationOffsetAfterCallbacks`), including the direction-in-low-bit
forcing and the freeze-at-`durationTicks` behavior. `firePunch.ts`'s
hardcoded `BURN_FLAME_X_DELTA_FIXED8`/`_LEFT_FIXED8` (614/615) are deleted
and replaced by a call through the port fed the same distance (48px) and
duration (20 ticks) the burn flames' real `AnimBurnFlame` ->
`AnimTravelDiagonally` call site uses. Both FIRE PUNCH portable comparators
re-run at their recorded counts: `fire-punch-onix-grovyle.json` **225/225**,
`fire-punch-grovyle-onix.json` **277/277**.

`fly.ts`'s own private `linearDeltaQ8`/`truncDiv` helpers (the strike ball's
travel) compute the identical formula — cross-checked in
`tests/animLinearTranslation.test.ts` — but were **not** consolidated into
the shared module this step: `fly.ts`'s version never caps accumulated
callbacks at `durationTicks`, and checking whether that matters needs a
fresh oracle round-trip this step's time budget didn't allow. Left as a
documented follow-up rather than risking FLY's `exact` status unverified.

**Rung 3 (stretch — wiring `AnimThrowMistBall` through the new primitive,
RAM-probe trajectory validation) was not attempted; no time remained.**

**Remainder, recomputed in cost order:** (1) resolve the `FLY`
`AnimTask_ShakeMon` alignment — the primitive itself is now proven correct
(one clean representative, QUICK_ATTACK); this is a bounded calibration
task (find the true per-call-site creation-to-display lag), not a
re-derivation; (2) wire `AnimThrowMistBall` through the now-ported
linear-translation primitive + the interpreter's `createsprite` path, RAM-
probe-validated (rung 3 above); (3) generalize `AnimTask_BlendBattleAnimPal`
past its one DRAGON_BREATH instance; (4) give the interpreter real
`waitforvisualfinish` semantics (sprite-lifetime tracking); (5) the two new
subsystems (`AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s BG
pipeline) — each its own bounded step. MIST_BALL stays unsupported.

## Current handoff

- **State:** **18 exact / 1 partial / 257 unsupported** (unchanged — no move
  acceptance changed this step; both rungs are internal implementation
  substitutions behind already-`exact` moves, proven by rerunning their
  existing dense comparators at unchanged counts).
- **Did:** ported `AnimTask_ShakeMon` and the linear-translation Q8.8
  accumulator generically (see the rungs section above), re-drove
  QUICK_ATTACK and FIRE_PUNCH's hand-fits through them, deleted the
  superseded hand-fit constants in those two files, and left FLY's
  `AnimTask_ShakeMon` instance and `linearDeltaQ8` helper untouched pending
  the documented follow-ups (a real divergence and an unverified-but-
  plausible-safe consolidation, respectively).
- **Evidence:** `npm test` 2025/2025, `npm run build` green. QUICK_ATTACK
  219/219 + 214/214, FIRE_PUNCH 225/225 + 277/277, FLY 248/248 + 244/244 —
  all re-run this step at their previously-recorded counts.
- **Next:** pick up the remainder above in cost order, starting with the
  FLY `AnimTask_ShakeMon` alignment (cheapest — the primitive already
  works, this is calibration) or MIST_BALL rung 3 (wire
  `AnimThrowMistBall`); or resume the next ranked Level-50 component track
  (`mud-sand-scatter`/`dragon-fire-projectile`) if a bounded win elsewhere
  is preferred. THUNDER PUNCH has no known move-owned remainder.
