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

## FLY `AnimTask_ShakeMon` calibration: RESOLVED, landed on the port (2026-07-24)

**Verdict: outcome (1) from the step brief — a per-call-site creation-
offset parameter reconciles the port with 248/248 + 244/244. `fly.ts` now
calls through `shakeMonOffsetAtTick` directly; `FLY_SHAKE_AGES` is deleted.**

**Root mechanism, pinned by RAM evidence, not a curve fit.** Wrote
`tools/probe/dump-fly-shakemon-tasks.py` (stages via the same
`battle_lab.BattleLab` mechanicLab request the committed strike fixtures
use, so the window is reached in ~1k frames) and dumped `gTasks` (all 16
slots, full struct) plus every in-use sprite's x2/y2 across FlyUnleash's
`create_basic_hitsplat_sprite`/`createvisualtask AnimTask_ShakeMon` window,
for both strike comparators (opponent- and player-attacker).

`RunAnimScriptCommand` is a `do...while (sAnimFramesToWait == 0 &&
gAnimScriptActive)` loop (`battle_anim.c`): `createsprite`,
`createvisualtask`, and `playsewithpan` never set `sAnimFramesToWait`, so
FlyUnleash's hitsplat creation, `AnimTask_ShakeMon` creation, the razor-wind
`playsewithpan`, and `waitforvisualfinish` all execute inside **one** call,
i.e. one RAM tick — confirmed directly (both probes: the hitsplat's new
sprite slot and the ShakeMon task appear in the same tick). But the
ShakeMon task's OWN first-observable RAM state is not a fresh creation: its
`data[1]` (numTimes) already reads one less than `AnimTask_ShakeMon` sets,
and the target sprite's x2 is already 0, not `xOffset`. `CreateTask`
inserts the new task into `gTasks`'s priority-ordered linked list
(`task.c`'s `InsertTask`), and `RunTasks` walks that list via `.next` from
wherever its traversal currently sits. FlyUnleash's call uses task priority
**5**; QUICK_ATTACK's uses priority **2**. Priority 5 lands the freshly
inserted task where `RunTasks`'s *own, already-in-progress* traversal for
that frame reaches it again, so it gets stepped a **second** time before
that frame ever renders — collapsing the port's tick 0 (the creation-time
synchronous self-call, x2 still holds `xOffset`) and tick 1 (the first
regular toggle, back to zero) into one displayed tick. QUICK_ATTACK's
priority 2 does not trigger this (confirmed by its own comparator: tick 0
is directly visible, no reconciliation needed). Every later FLY tick is a
normal 1:1 step (traced through self-destroy in both probes).

The task's own RAM creation tick converts to display age 22
(`FLY_IMPACT_FIRST_AGE`, matching the hitsplat's own first-visible age —
both are created in the same batch and share the codebase's uniform 1-tick
RAM-write-to-displayed-pixel lag) in **both** probes independently. Querying
`shakeMonOffsetAtTick(6, 0, 8, 1, age - FLY_SHAKE_CREATION_AGE + 1)`
(the `+1` skips the collapsed tick 0) reproduces `{24,25,28,29,32,33}` —
the previous hand-fit `FLY_SHAKE_AGES` — exactly.

**Landed:** `src/engine/fly.ts` — `FLY_SHAKE_AGES` deleted, `targetShakeX2`
now calls `shakeMonOffsetAtTick` through the documented
`FLY_SHAKE_CREATION_AGE` constant (guarded so ages before creation stay
zero, since the port's own tick 0 is nonzero and must not leak backward
through the `+1` shift). `tests/shakeMon.test.ts`'s FLY test rewritten from
"documents a divergence" to pin the real mechanism and the exact
reconciliation. New probe `tools/probe/dump-fly-shakemon-tasks.py` (dev-time
only, not shipped).

**Evidence.** `npm test` 2045/2045, `npm run build` green.
`fly-murkrow-onix-strike.json` **248/248**,
`fly-player-murkrow-onix-strike.json` **244/244** (both through the port,
zero mismatched pixels — previously 247/248 when the port was swapped in
naively without this mechanism). Charge-turn fixtures unaffected but
re-run as a sanity check: `fly-murkrow-onix-charge.json` **151/151**,
`fly-player-murkrow-onix-charge.json` **147/147**. QUICK_ATTACK re-run since
its own test in the shared file changed: `quick-attack-pidgeotto-onix.json`
**219/219**, `quick-attack-player-pidgeotto-onix.json` **214/214**.

RUNG B (MIST_BALL rung 3, wiring `AnimThrowMistBall`) was not attempted
this step — RUNG A's RAM-probe investigation and verification used the full
session; no safe margin remained to start a second bounded oracle-facing
change.

## MIST_BALL remainder rung 3: AnimThrowMistBall wired, RAM-probe-validated (2026-07-24)

**Verdict: rung 3 lands clean, first try, zero test-fix iterations — the RAM
evidence matched the ported chain exactly once the real tick semantics were
derived from the probe (not assumed).** `src/engine/mistBall.ts` ports
`AnimThrowMistBall` → `TranslateAnimSpriteToTargetMonLocation` →
`StartAnimLinearTranslation` (`battle_anim_ice.c:1090-1095`,
`battle_anim_mons.c:1546-1568`), driven by the script's own single
`createsprite gMistBallSpriteTemplate, ANIM_TARGET, 0, 0,0,0,0, 30, 0`
(`durationTicks` read directly from `battle-move-anim-scripts.json`'s
`createspriteArgvMapping`, not hand-copied) and the already-ported
`animLinearTranslation.ts` primitive.

**The anim-script interpreter is now a real shared primitive, not a
FEATHER_DANCE-only helper.** `interpretCreateSpriteSchedule` moved out of
`featherDance.ts` into a new `src/engine/animScriptInterpreter.ts`; both
`featherDance.ts` and `mistBall.ts` import the one function. This is the
"interpreter's createsprite path" the step brief names — MIST_BALL's own
schedule is the trivial one-element case (a single createsprite before its
first `delay`), so this generalization step didn't need new interpreter
logic, only extracting the existing one for reuse.

**RAM probe** (`tools/probe/dump-mist-ball-sprite.py` against a new
`tools/battle-lab/mechanic-mist-ball-latias-onix.json` `overrides.parties`
mechanicLab scenario — opponent Latias forced into MIST_BALL on all four
slots, player Onix — staged in ~1k frames). Sprite identified unambiguously
by its `template` pointer (`gSprites+0x14`) matching `gMistBallSpriteTemplate`
(`0x08595c70`, from `bin/oracle symbols`), not by OAM-slot guessing. Full
window captured: absent before creation, in-use ticks 88-119 (32 ticks),
absent after. Committed as dev-time evidence,
`src/data/gen/mist-ball-sprite-probe.json` (38 rows, ticks 85-122).

**The one genuine derivation, from `Cmd_createsprite`'s `CreateSpriteAndAnimate`
call (`sprite.c:591-611`), not assumed from a neighbor mechanism:** the
sprite's creation tick shows `TranslateAnimSpriteToTargetMonLocation`'s
effects (`data[0]=30`, `data[2]`/`data[4]` = target coords, `callback` already
reassigned to `StartAnimLinearTranslation`) already applied, with `x2=y2=0`
(no accumulation yet). This is because `CreateSpriteAndAnimate` calls the
fresh sprite's callback (`AnimThrowMistBall`) *synchronously* at creation
(inside the `createsprite` opcode itself), then that same frame's ordinary
`AnimateSprites()` sweep advances the just-reassigned callback
(`TranslateAnimSpriteToTargetMonLocation`) a *second* time before the frame
renders — two callback steps land on one RAM tick, mirroring in spirit (but
not in cause — this is `CreateSpriteAndAnimate`'s own synchronous call, not
FLY's task-list-traversal double-step) the FLY `AnimTask_ShakeMon` finding
above. `StartAnimLinearTranslation` itself first runs — and self-invokes
`AnimTranslateLinear_WithFollowup` once inline — on the *next* tick. Net
result: `callbacks = tick` (no `+1`/`-1` fixup) maps a probe-relative tick
directly onto `linearTranslationOffsetAfterCallbacks`, landing exactly on
the primitive's own documented "first displayed tick is pre-callback" case.
Verified against **every** real probed tick (32/32), not fitted: the
Tier-1 test (`tests/mistBall.test.ts`) passed on the first run with no
constant-tuning.

**Not attempted (honest scope boundary, per the step's own OUT OF SCOPE
list and stop-and-split remainder):** `mistBall.ts` is a standalone,
RAM-validated module — it is **not** wired into `battleScene.ts`'s move
dispatch, so MIST_BALL gets no `ANIMATION_COVERAGE.json` entry and stays
fully unsupported (shared code alone never promotes coverage). No dense
oracle pixel comparator exists for the ball's flight: rendering it needs
`ANIM_TAG_SMALL_BUBBLES` sprite-sheet extraction and OAM draw wiring that
no extractor in this codebase has exercised yet, a nontrivial slice on its
own, not a quick add inside this step's remaining time. `waitforvisualfinish`
sprite-lifetime semantics, `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s
BG pipeline, and generalizing `AnimTask_BlendBattleAnimPal` past its one
DRAGON_BREATH instance are all still open — MIST_BALL needs every one of
those before it can render at all, let alone reach `partial`/`exact`.

**Evidence.** `npm test` 2125/2125 (up from 2045 — added `tests/mistBall.test.ts`,
no regressions). `npm run build` green. `featherDance.ts`'s own tests
(`tests/featherDance.test.ts`, `tests/featherDanceInterpreter.test.ts`) re-run
unchanged after the `interpretCreateSpriteSchedule` extraction (pure move,
zero behavior change) — no dense oracle comparator touches
`animScriptInterpreter.ts`'s exported surface, so none were re-run.

## `AnimTask_ShakeMon2` ported generically, DRAGON_BREATH + BLAZE_KICK re-driven (2026-07-24)

**Verdict: the port generalizes cleanly across both named representatives,
first try, zero test-fix iterations — both hand-fit shake formulas deleted,
all four comparators re-run at exactly their recorded counts.** This is the
coverage report's top task-level leverage item (64 remaining Level-50 moves
depend on `AnimTask_ShakeMon2`); this step proves the port against its two
named representatives only — no new move gets wired this step.

**Port.** `src/engine/shakeMon2.ts` (`shakeMon2Sequence`/`shakeMon2OffsetAtTick`)
is a 1:1 port of `AnimTask_ShakeMon2`/`AnimTask_ShakeMon2_Step`
(`battle_anim_mon_movement.c:155-238`) — genuinely a different source task
from `shakeMon.ts`'s `AnimTask_ShakeMon` per the prior rung's warning (no code
carried over): offsets alternate between `+offset`/`-offset` (never touching
zero mid-sequence) instead of toggling `offset`/`0`, and the final toggle
forces zero and self-destroys instead of continuing the alternation. One
implementation note: the toggle uses `0 - offset` rather than `-offset` to
avoid emitting `-0` for the `yOffset=0` both call sites pass (numerically
identical to `0` but fails strict/deep equality). Tier-1 tests
(`tests/shakeMon2.test.ts`, 6 tests) pin the alternation pattern directly
(varying `numTimes`/`frameDelay`), that mid-sequence values never land on
zero, boundary behavior before creation/after self-destroy, and both call
sites' exact reconciliation against their pre-existing hand-fit tables.

**Call-site mapping, derived from committed constants, not fitted.** Checked
each site's real source args directly against `battle_anim_scripts.s`:
- DRAGON_BREATH (`:4943`): `createvisualtask AnimTask_ShakeMon2, 2,
  ANIM_TARGET, 2, 0, 21, 1` → `shakeMon2OffsetAtTick(2, 0, 21, 1, tick)`.
- BLAZE_KICK (`:8498`): `createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET,
  3, 0, 14, 1` → `shakeMon2OffsetAtTick(3, 0, 14, 1, tick)`.

Both sites need the same "+1, guard age < creationAge" idiom `fly.ts`'s
`FLY_SHAKE_CREATION_AGE` already established for `AnimTask_ShakeMon`: the
port's own tick 0 (the creation write) is never independently displayed.
For DRAGON_BREATH the creation-age anchor is the pre-existing
`DRAGON_BREATH_SHAKE_FIRST_AGE` (13) constant itself — confirmed against the
*independently* RAM-probed old canonical-path comment in `battleScene.ts`
(`dragonBreathShakeX2`'s own doc: "by the FIRST RAM tick this task's callback
is observed, x2 ALREADY reads the FIRST FLIP's result", i.e. the exact same
collapse), not re-derived from scratch. For BLAZE_KICK the anchor is the
pre-existing `BLAZE_KICK_FIRE_SPREAD_FIRST_AGE` (35) constant: its
`AnimTask_ShakeMon2` creation coincides (zero `delay` between them, same
`RunAnimScriptCommand` pass) with `call FireSpreadEffect`'s own first tick,
so it shares that anchor exactly. Both mappings reproduce their entire
pre-existing hand-fit table exactly (verified in `tests/shakeMon2.test.ts`
before touching either call site) — this is a genuine derivation from
already-committed, already-evidenced constants, not a fresh curve fit.

Both `DRAGON_BREATH_SHAKE_FIRST_AGE`'s formerly-paired `_END_AGE` constant is
deleted: the port's own self-destroy tick now determines the end, not a
second hand-picked literal.

**`dragonBreath.ts`/`blazeKick.ts` re-driven, hand-fit constants deleted.**
`dragonBreath.ts`'s `Math.floor((age-first)/2)%2` formula and
`DRAGON_BREATH_SHAKE_END_AGE` are gone; `blazeKick.ts`'s
`Math.floor(shakeAge/2)%2 ? -3 : 3` formula and its local `shakeAge` are
gone. Both now call `shakeMon2OffsetAtTick` directly.

**Two call sites, NOT this step's scope, left untouched:** `statusAnimation.ts`
(`animTaskShakeMon2AtSourceAge`, the paralysis-shake visual component BOUNCE's
successful-paralysis variant uses) and `faintAttack.ts`
(`AnimTask_ShakeMon2(ANIM_TARGET,2,0,9,1)`) both already have their own
independent hand-fit `AnimTask_ShakeMon2` formulas. The step brief named only
`dragonBreath.ts`/`blazeKick.ts`; retiring those two through the new port is
a natural, bounded follow-up but wasn't attempted here.

**The canonical `turn2-dragonbreath.json`/`turn2-dragonbreath-projectiles.json`/
`turn13-dragonbreath-faint.json` fixtures do NOT feed through `dragonBreath.ts`
at all** — checked directly: they render through `battleScene.ts`'s own
separate, absolute-tick `drawDragonBreathScene`/`dragonBreathShakeX2`
(the frozen "retired Battle 2 march" path, independently RAM-probed via
`tools/probe/dump-dragonbreath-anim.py` when it was written), not the
portable reducer. `battleScene.ts` was not touched this step, so those three
fixtures are provably unaffected and were not re-run.

**Evidence.** `npm test` 2131/2131 (up from 2125 — added `tests/shakeMon2.test.ts`,
6 tests). `npm run build` green. All four re-driven comparators at their
exact recorded counts, zero regressions:
`dragon-breath-player-onix-opponent-murkrow.json` **85/85** component +
**85/85** framebuffer, `dragon-breath-opponent-onix-player-murkrow.json`
**85/85** + **85/85**, `blaze-kick-player-onix-opponent-murkrow.json`
**78/78** + **78/78**, `blaze-kick-opponent-onix-player-murkrow.json`
**78/78** + **78/78** (all match `ANIMATION_COVERAGE.json`'s recorded
counts exactly).

Move acceptance is unchanged: DRAGON_BREATH and BLAZE_KICK both stay `exact`,
same coverage entries, same evidence files plus the two new port/test files.
`ANIMATION_COVERAGE.json`'s move-level text is untouched (its own prose
already describes the shake generically, not as a hand-fit formula) — only
the `elemental-fire` track's implementation detail changed underneath it.

## MOVE_MUD_SLAP dense-evidence acceptance step: already complete, re-verified (2026-07-24)

**Verdict: the assigned step ("bring MOVE_MUD_SLAP to a dense-evidence
acceptance state") was already done — mis-scoped, not blocked.**
`ANIMATION_COVERAGE.json`'s `MOVE_MUD_SLAP` entry has carried `status:
"exact"` with both-orientation dense evidence since commit `c1df4a9`
("animation: prove Mud Slap in both orientations"), an ancestor of this
worktree's own branch point — the work predates this session's step brief
entirely. No source code needed changing, so no code commit was made this
step; this entry exists only to record that the assignment was checked
honestly rather than skipped or rubber-stamped.

**Verification performed, not assumed.** Read `Move_MUD_SLAP`'s script
(`reference/pokeemerald/data/battle_anim_scripts.s:5220-5241`):
`loadspritegfx ANIM_TAG_MUD_SAND`, attacker slide-to-offset/slide-to-original
choreography (shared `gSlideMonToOffsetSpriteTemplate`/
`gSlideMonToOriginalPosSpriteTemplate`, same as SAND_ATTACK), then six
`call MudSlapMud`, each spawning five `gMudSlapMudSpriteTemplate` sprites
(30 total, matching `src/engine/mudSlap.ts`'s own "30 stock
`Random2()`-resolved" doc comment) plus a `delay 2`. Read the callback
(`reference/pokeemerald/src/battle_anim_ground.c`): `gMudSlapMudSpriteTemplate`
is `.oam = &gOamData_AffineOff_ObjNormal_16x16` with `sAnim_MudSlapMud`
(frame 1) and `.callback = AnimDirtScatter` — the identical callback
SAND_ATTACK's `gSandAttackDirtSpriteTemplate` uses at 8x8, confirming
`mudSlap.ts`'s claim that it "shares `AnimDirtScatter` translation semantics
with SAND ATTACK" while modeling its own distinct 16x16/30-sprite/6-wave
geometry — not a guess, matches the actual source.

`npm test` 2147/2147, `npm run build` green (both unchanged from before this
step — no source touched). Re-ran both committed portable comparators fresh
against the live oracle rather than trusting the recorded numbers:
`mud-slap-pidgeotto-onix.json` **51/51** source OAM + **51/51** RGB,
`mud-slap-player-pidgeotto-onix.json` **51/51** + **51/51** — both match
`ANIMATION_COVERAGE.json`'s recorded counts exactly, zero regressions.
SAND_ATTACK's own module/comparators were not touched (out of scope, and
unnecessary since no shared code changed).

## Current handoff

- **State:** **18 exact / 1 partial / 257 unsupported** (unchanged — this
  step re-verified an already-`exact` move; no promotion).
- **Did:** Re-verified `MOVE_MUD_SLAP` (assigned step) is already at dense
  `exact` acceptance from a prior session (see section above); no code
  changes were needed. Confirmed against source, `npm test`, `npm run
  build`, and fresh live-oracle reruns of both orientation comparators.
- **Evidence:** `npm test` 2147/2147, `npm run build` green.
  `mud-slap-pidgeotto-onix.json` 51/51+51/51,
  `mud-slap-player-pidgeotto-onix.json` 51/51+51/51 (both re-run live,
  matching recorded counts).
- **Next:** MOVE_MUD_SLAP needs no further work. Two existing hand-fit
  `AnimTask_ShakeMon2` call sites could retire onto the generic port
  (`statusAnimation.ts`'s paralysis shake, `faintAttack.ts`'s own instance).
  Wiring a genuinely NEW move through `AnimTask_ShakeMon2` (dense evidence
  required) is the leverage step the coverage report wants next. MIST_BALL's
  remaining items in cost order: (1) `ANIM_TAG_SMALL_BUBBLES` asset
  extraction + OAM wiring so `mistBall.ts` can actually render (needed
  before any dense pixel comparator is possible); (2) generalize
  `AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH instance; (3) give
  the interpreter real `waitforvisualfinish` semantics (sprite-lifetime
  tracking); (4)/(5) the two new subsystems (`AnimComplexPaletteBlend`,
  `AnimTask_MistBallFog`'s BG pipeline) — each its own bounded step. Or
  resume the next ranked Level-50 component track (`dragon-fire-projectile`
  siblings, since `mud-sand-scatter` is now fully proven — both
  representatives exact) if a bounded win elsewhere is preferred. THUNDER
  PUNCH has no known move-owned remainder.
- **Housekeeping flag:** this file has accumulated 6+ dated sections beyond
  the ~3-most-recent lean-ledger guideline (`AGENTS.md`); no
  `ANIMATION_PROGRESS-archive.md` exists yet. Not addressed this step
  (narrowly scoped to MUD_SLAP verification) — a future step should create
  the archive file and trim, mirroring `PROGRESS-archive.md`'s convention.
