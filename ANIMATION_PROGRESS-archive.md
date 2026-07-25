# Animation coverage — archive

Older dated sections moved out of `ANIMATION_PROGRESS.md` to keep that
file lean (`AGENTS.md`'s ~3-most-recent convention). Git history has the
full record regardless; this file is a read-only reference.

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

## MOVE_EMBER dragon-fire-projectile sibling: two sprite families ported, RAM-probed, dense-evidenced both orientations — `partial` (2026-07-24)

**Verdict: real progress, not yet `exact`.** `Move_EMBER` (`battle_anim_scripts.s:919-937`) is genuinely bounded — no monbg/splitbgprio, no new subsystem, both its sprite families (three `gEmberSpriteTemplate` projectiles via `TranslateAnimSpriteToTargetMonLocation`, three `gEmberFlareSpriteTemplate` hit flares via `AnimEmberFlare`/`AnimTravelDiagonally`, both `battle_anim_fire.c`/`battle_anim_mons.c`) collapse onto the SAME `StartAnimLinearTranslation` Q8.8 accumulator DRAGON_BREATH/FLAMETHROWER/MIST_BALL already established. `src/engine/ember.ts` derives every position/frame/subpriority field from the ported source formulas (`SetAnimSpriteInitialXOffset`'s side-signed offset, `TranslateAnimSpriteToTargetMonLocation`'s/`AnimTravelDiagonally`'s distinct coordinate-type rules, `sAnim_BasicFire`'s 5-frame cycle) — verified against fresh mgba RAM probes in both cast orientations, not fitted to them (100% match, 63/63 component frames, at every real tick in both orientations before any framebuffer work started).

**Two real bugs found via the dense pixel comparator itself, both fixed:**
- The ember/flare draw-order tie-break (equal target-relative subpriority, equal screen Y — three flares can share the same Y) was sorting ascending `spawnIndex`; the RAM-probed `sSpriteOrder` showed the EARLIER-created sprite paints last/frontmost on a Y tie — the same descending-creation-order rule `dragonBreath.ts` already established among its own eleven embers, just not carried over correctly on the first pass.
- The opponent-attacker fixture (`mechanic-ember-opponent-onix-player-murkrow.json`) initially assumed both battlers were at full HP (a fresh single-move battle). The RAM probe showed opponent ONIX's HP is actually 69/117 by the time EMBER's own dense window starts — player MURKROW's own (unforced, rental-set) move resolves first in that turn order and chips ONIX before EMBER acts. This is exactly why DRAGON_BREATH/THUNDER_PUNCH's own sibling fixtures for this same ONIX/MURKROW pair already use 69, not full HP — not a fresh-battle assumption, confirmed directly against my own probe's `opponent.hp` field per frame.

**Results.** Opponent ONIX → player MURKROW: relative ages 0-62 / oracle frames 442-504, **63/63 component AND 63/63 framebuffer**, zero exclusions — fully exact for this orientation. Player ONIX → opponent MURKROW: relative ages 0-62 / oracle frames 388-450, **63/63 component but 61/63 framebuffer** — two frames (389, 395; 3-8px each) are off, and both are exactly the FIRST displayed tick of a newly-spawned ember (ember1's own age 0, ember2's own age 0); every other tick of both embers, all three flares, and the entire opposite orientation (including its own embers' first ticks, which match exactly) are fine. Since the underlying RAM/OAM component state matches 63/63 even on the two bad frames, this reads as a framebuffer-capture-timing nuance isolated to a sprite's own creation tick (mGBA's OAM-build/VBlank-capture ordering may treat a sprite's zeroth tick differently from its continuing ticks), not a position/frame/z-order bug — not chased further this step given the size of the remainder.

**Move acceptance: `partial`, not `exact`**, per the coverage rubric's own rule ("`exact` cannot retain a known remainder"). `ANIMATION_COVERAGE.json`'s new `MOVE_EMBER` entry and the `dragon-fire-projectile` track's goal text both name the remainder explicitly.

**Evidence.** `npm test` 2153/2153 (up from 2147 — added `tests/ember.test.ts`, 6 tests, RAM-probe-pinned both orientations via `src/data/gen/ember-sprite-probe{,-opponent}.json`). `npm run build` green. Fresh live-oracle reruns of the two now-existing EMBER comparators (`tools/compare/emberPortable.ts`) at the counts above, plus both existing FLAMETHROWER (`126/126` both) and DRAGON_BREATH (`85/85` both) comparators re-run fresh after touching the shared `tools/probe/run-battle-lab-rgb.py`/`sceneOnPresentation.ts`/`battleScene.ts` — zero regressions.

## MOVE_EMBER's 2-frame remainder closed: attacker/ember OAM draw order is subpriority-parametric, not fixed — `exact` (2026-07-24)

**Verdict: the remainder was a draw-order bug, not a timing/lag bug — root-caused by RAM+pixel probe, fixed by reusing an existing function, zero curve-fitting.** The prior step's hypothesis (a per-sprite creation-tick render-lag nuance, by analogy to MIST_BALL/FLY) was investigated and falsified: `tools/probe/dump-ember-creation.py` (new, adapted from `run-battle-lab-rgb.py` + `dump-fly-shakemon-tasks.py`, dumps full `gSprites` struct — `data[]`, raw `callback` pointer — plus cropped RGB per frame) shows ember1 (slot 3) is created during oracle-tick 388's processing already carrying its post-`CreateSpriteAndAnimate`-plus-same-frame-`AnimateSprites()` "1-step" state (`x2=3,y2=-1`), exactly what `ember.ts`'s existing formula already predicted at local age 0 — the position/timing model was never wrong (component check was already 63/63). The actual defect: decoding `emberPortable.ts`'s own mismatch string correctly (`oracle!=app`, not `app!=oracle` as the step brief assumed) shows the **app was drawing fire where the real oracle still showed the attacker's own body** — the app had the ember right and was painting it *over* Onix instead of *under* Onix.

**Root mechanism, source-cited.** `Cmd_createsprite`'s subpriority for both ember families is target-relative (`GetBattlerSpriteSubpriority(target) - 2`, `battle_anim.c` around `Cmd_createsprite`), while the attacker's own battler sprite subpriority is fixed by `GetBattlerSpriteSubpriority` (`battle_anim_mons.c:2035-2061`): 30 for `B_POSITION_PLAYER_LEFT`, 40 for `B_POSITION_OPPONENT_LEFT`. `SortSprites` draws the LOWER-subpriority sprite last/on top. For this codebase's fixed ONIX/MURKROW singles pair: player-attacker Onix (30) < ember subpriority (target Murkrow 40 − 2 = 38) → **Onix occludes freshly-spawned embers still overlapping its own silhouette**; opponent-attacker Onix (40) > ember subpriority (target Murkrow 30 − 2 = 28) → **embers occlude Onix**. This exact side-parametric rule is already generalized and exported as `dragonBreathEmbersInFrontOfAttacker` (`dragonBreath.ts`) and already reused by FLAMETHROWER's own draw block (`battleScene.ts` ~14939) — DRAGON_BREATH's own module doc even states it plainly ("Onix is subpriority 30 … `SortSprites` puts Onix at the winning lower OAM index, so its opaque pixels cover compressed embers near the origin"). EMBER's draw block (`battleScene.ts` ~16872) had never been updated to use it — it always drew the attacker sprite before the embers unconditionally, which happens to be correct for the opponent-attacker orientation (why that side was already 63/63) but wrong for the player-attacker orientation, and only *visible* on each ember's first tick or two, since the small fire graphic's actual opaque pixels move clear of Onix's silhouette within 1-2 ticks even though the two sprites' bounding boxes keep overlapping much longer.

**Fix.** `battleScene.ts`'s EMBER draw block now calls `dragonBreathEmbersInFrontOfAttacker(view.attacker.geometry.side)` and conditionally draws the ember/flare loop before or after the attacker sprite, mirroring FLAMETHROWER's own call site exactly (no new function, no per-frame branch, no age/lag change — `ember.ts` itself is untouched). This is a per-orientation constant, not a per-frame special case.

**Results.** Player ONIX → opponent MURKROW: **63/63 component AND 63/63 framebuffer**, zero exclusions (both previously-bad frames 389/395 now exact). Opponent ONIX → player MURKROW: still **63/63 + 63/63** (unchanged, confirmed no regression from the conditional draw order). `MOVE_EMBER` promoted to `exact` in `ANIMATION_COVERAGE.json` — no remainder left in either orientation.

**Evidence.** `npm test` 2153/2153 (unchanged — no engine-logic module touched, so no new Tier-1 test; the fix is a draw-order line reusing an already-tested function). `npm run build` green. Both EMBER comparators re-run fresh at the counts above. Re-ran FLAMETHROWER (`126/126` both) and DRAGON_BREATH (`85/85` both) since `battleScene.ts` was touched — zero regressions. New dev-time evidence: `tools/probe/dump-ember-creation.py` (committed, same convention as `dump-fly-shakemon-tasks.py`/`dump-mist-ball-sprite.py`).


## MOVE_DRAGON_RAGE enumeration: STOP AND SPLIT (2026-07-25)

**Verdict: does NOT generalize cheaply from the existing `dragon-fire-
projectile` family. Enumerated the full command surface per the step
brief's own rule and stopped before writing any render code, per that
rule's explicit sanction ("that is a successful outcome, not a failure").**
DRAGON_RAGE is Level-50 legal (`FRONTIER_MON_CHARMELEON_2`, confirmed in
`factory-animation-inventory.json` before starting), so this is a scope
finding, not a legality block.

**What was done.** Extended `tools/extract/extract-battle-move-anim-assets.ts`
with a full decode of `Move_DRAGON_RAGE` (`battle_anim_scripts.s:5243-5273`)
into `battle-move-anim-scripts.json`'s new `DRAGON_RAGE` entry (`callback:
null`, `status` field records the stop) — additive only, `git status` after
a full re-run showed only that one extractor + its one JSON output changed.
No render/callback code lands this step.

**Command-surface enumeration** (every op read against its real C callback):
- `loadspritegfx ANIM_TAG_SMALL_EMBER` — already extracted
  (`battle-anim-small-ember.json`, DRAGON_BREATH); this move's fire-spit
  sprite uses frames 0/4 of that same sheet (that extraction's own
  `otherFramesNeedsOnly` note already flagged them as DRAGON_RAGE's).
- `loadspritegfx ANIM_TAG_FIRE_PLUME` — **NEW asset, not yet extracted
  anywhere**: `gBattleAnimSpriteGfx_FirePlume` (`fire_plume.png`, 32x160px,
  5 stacked 32x32 frames) paired with `gBattleAnimSpritePal_Fire`
  (a DIFFERENT, also-unextracted source PNG, `fire.png`, supplies only the
  palette — same tile-vs-palette split this codebase's extractor already
  handles elsewhere, just a fresh pair of source files).
- `createvisualtask AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 40, 1` —
  already-ported primitive (`shakeMon.ts`, proven via QUICK_ATTACK/FLY).
  Every prior call site shakes the TARGET; this is the first ATTACKER-side
  use, but the primitive itself is battler-agnostic — cheap render wiring,
  not a new port.
- `createsprite gSlideMonToOffsetSpriteTemplate, ANIM_TARGET, 2, 0, 15, 0, 0, 4`
  — **NEW primitive**: `SlideMonToOffset` → `InitSpriteDataForLinearTranslation`
  + `TranslateSpriteLinearByIdFixedPoint` (`battle_anim_mon_movement.c:537-576`).
  `gBattleAnimArgs[0]=0` selects the ATTACKER's own sprite (the `ANIM_TARGET`
  field only sets the dummy sprite's OAM subpriority, the same
  battler-vs-argv split MIST_BALL's own enumeration already established).
  **Confirmed NOT the same mechanism `mudSandSlide.ts` ports**: that module
  is a hand-fit lookup table for SAND_ATTACK/MUD_SLAP's own createsprite args
  (x=-10, duration 3/4), not a generic port of this accumulator — read both
  side by side: `SlideMonToOffset` writes to a REFERENCED mon sprite via
  `data[5]` with plain-division rounding, while the already-ported
  `animLinearTranslation.ts` (`InitAnimLinearTranslation`) writes to the
  sprite's OWN x2/y2 with direction-in-low-bit rounding — different layout,
  different math.
- `create_dragon_rage_fire_spit_sprite ANIM_TARGET, 2, initial_x=30,
  initial_y=15, target_x=0, target_y=10, duration=10` —
  `gDragonRageFireSpitSpriteTemplate` (`battle_anim_dragon.c:158-167`)
  shares `AnimDragonFireToTarget` → `StartDragonFireTranslation`
  (`:218-274`, comment literally says "For Dragon Breath and Dragon Rage")
  and an identically-shaped 3-frame/3-tick sheet cadence with DRAGON_BREATH's
  own ember, reusing the already-ported Q8.8 accumulator. Two genuinely new
  parts: (1) DRAGON_BREATH's own script always passes all-zero
  initial/target offsets, so `StartDragonFireTranslation`'s side-branch logic
  was never exercised — it has a real quirk, confirmed straight from source:
  the opponent-side branch uses `cmd->initialY` to offset `sprite->x` (not
  `initialX`), an asymmetry DRAGON_RAGE's nonzero args actually exercise;
  (2) its own affine anim (`AFFINEANIMCMD_FRAME(0x64,0x64,127,1)`, one step)
  uses different scale constants and shape than DRAGON_BREATH's own
  two-step ramp — DRAGON_BREATH's `MATRIX_A`/`MATRIX_B` tables are
  RAM-PROBED literals, not a closed-form derivation, so this needs its own
  fresh probe (likely simpler, given the single-step affine anim, but not
  confirmed against real RAM).
- `createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 3, 25, 1` —
  already-ported primitive, same shape as every prior target-shake site.
- `create_dragon_rage_fire_plume_sprite` ×8 (relative_to=ANIM_TARGET every
  time — the callback's ANIM_ATTACKER branch is dead code for this move, a
  red herring like MIST_BALL's unconsumed `ANIM_TAG_WHITE_FEATHER` load) —
  **NEW callback**: `AnimDragonRageFirePlume` (`battle_anim_dragon.c:246-265`)
  is a STATIC-position sprite (no translation/accumulator at all — simpler
  than every other mechanism this track uses): places itself at the target's
  `BATTLER_COORD_X/Y`, applies the already-established side-signed x-offset
  pattern (`ember.ts`'s `sideSignedOffset`) plus a plain y offset, plays a
  5-frame/5-tick-each reveal ONCE (`ANIMCMD_END`, not `JUMP`), then
  self-destroys via `RunStoredCallbackWhenAnimEnds` once `animEnded`
  latches. Per-spawn `subpriority_offset` varies (66 or 2) — a real per-spawn
  detail. Needs its own RAM probe for lifetime/render-lag; none of the
  existing ported sprite families use this "static + one-shot reveal +
  destroy-on-animEnd" shape.
- `createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_TARGET, 66, 0, 0, 4`
  — **NEW primitive** (paired with `SlideMonToOffset` above but a SEPARATE
  C function): `SlideMonToOriginalPos` (`battle_anim_mon_movement.c:478-535`)
  has its own data layout and step function — restores the attacker's
  current x2/y2 back to 0 over 4 ticks, not a fresh two-point interpolation.

**Tally: 4 substantive new items** (`ANIM_TAG_FIRE_PLUME` asset,
`SlideMonToOffset`/`SlideMonToOriginalPos` primitive pair,
`AnimDragonRageFirePlume`'s new static/one-shot/self-destroy mechanism,
`StartDragonFireTranslation`'s side-asymmetric offset quirk plus a fresh
affine probe) — at the step brief's own "~4 substantive ops" stop
threshold, though none individually rises to a "new subsystem" the way
MIST_BALL's `AnimComplexPaletteBlend`/`AnimTask_MistBallFog` did (no new
BG tiles/tilemap, no external fade-gate dependency). Combined with a real
60-minute session cap, landing all four with disciplined RAM-probe-first
evidence (per-mechanism render-lag bisection, both orientations, dense
comparators run twice for determinism) was not achievable without cutting
a corner somewhere. Per the brief's own stop-threshold rule, this session
stopped after the enumeration + additive extractor decode rather than
rushing a partial port.

**Remainder for whoever picks this back up** (in cost order): ~~(1) extract
`ANIM_TAG_FIRE_PLUME` (`fire_plume.png` tiles + `fire.png` palette) — pure
mechanical decode, same shape as every prior asset addition~~ **done, see the
"DRAGON_RAGE enumeration remainder, rungs 1-2" section below**; ~~(2) port
`SlideMonToOffset`/`SlideMonToOriginalPos` as a shared primitive (Tier-1
tests first, no move wiring needed yet — same standalone-port pattern
`shakeMon.ts`/`animLinearTranslation.ts` used)~~ **done, same section
below**; (3) RAM-probe the whole
move body in one battle-lab window (attacker shake → slide-to-offset →
fire-spit → 8 plumes → slide-to-original) to pin every cadence/render-lag
in one pass, the same technique `dump-dragonbreath-anim.py`/
`dump-ember-creation.py` already used; (4) port `AnimDragonRageFirePlume`
and wire `StartDragonFireTranslation`'s offset quirk + fresh affine table;
(5) dense comparators in both orientations, run twice for determinism.
MOVE_DRAGON_RAGE stays unsupported (no `ANIMATION_COVERAGE.json` entry) —
shared code alone never promotes coverage, and zero render code landed
this step.

**Evidence.** `npm test` 2180/2180 (unchanged — no engine module touched,
extractor-only change). `npm run build` green. `git status` after the
extractor re-run showed only `extract-battle-move-anim-assets.ts` and
`battle-move-anim-scripts.json` changed.

## DRAGON_RAGE enumeration remainder, rungs 1-2: FIRE_PLUME extracted, SlideMonToOffset/SlideMonToOriginalPos ported (2026-07-25)

**Rung 1 — `ANIM_TAG_FIRE_PLUME` asset extraction.** Mirrored the DRAGON_BREATH
small_ember block's exact layout: `fire_plume.png` (32x160, 4x20 tiles, 5
stacked 32x32 frames, `gDragonRageFirePlumeSpriteTemplate`'s tile source)
paired with `fire.png`'s own embedded palette (the `ANIM_TAG_FIRE_PLUME`
palette-table entry points at `gBattleAnimSpritePal_Fire`, a separate source
PNG — same tile-vs-palette split `extract-battle-anim-assets.ts`'s
particles.png/circle_impact.png pair already established). Writes
`src/assets/gen/battle-anim-fire-plume.json`; pinned in
`tests/moveAnimAssets.test.ts` mirroring the rocks.png per-asset pattern.
Additive only — `git status` after a full extractor re-run showed only the
new JSON output plus the extractor/test files touched.

**Rung 2 — `SlideMonToOffset`/`SlideMonToOriginalPos` primitive port.**
RAM-probed a real DRAGON_RAGE window first, per the step brief: staged a
Factory-legal CHARMELEON attacker (mirroring FRONTIER_MON_CHARMELEON_2's own
real MOVE_DRAGON_RAGE grant) vs. ONIX via a new `mechanicLab overrides.parties`
fixture (`tools/battle-lab/mechanic-dragon-rage-charmeleon-onix.json`) and a
new probe (`tools/probe/dump-dragonrage-slide.py`, committed evidence
`src/data/gen/dragonrage-slide-probe.json`) that identifies the two dummy
sprites by their own `template` pointer against
`gSlideMonToOffsetSpriteTemplate`/`gSlideMonToOriginalPosSpriteTemplate`'s
real rodata addresses (stable for the sprite's whole lifetime, unlike
`callback` which reassigns itself after the first tick).

Ported both 1:1 as `src/engine/slideMon.ts`
(`slideMonToOffsetAtTick`/`slideMonToOriginalPosAtTick`, plus
`slideMonToOffsetMirroredDeltas` for `SlideMonToOffset`'s own opponent-side
mirror and `*DestroyTick` helpers). Both share
`InitSpriteDataForLinearTranslation`'s plain-truncating-division Q8.8 setup
(confirmed distinct from `animLinearTranslation.ts`'s direction-in-low-bit
variant, per the original enumeration's own finding) but the RAM probe
surfaced **two real divergences between their step functions**, both now
encoded in the port rather than assumed: (1) `SlideMonToOriginalPos_Step`
truncates its accumulator's own contribution to `(s8)` before adding back the
base offset; `TranslateSpriteLinearByIdFixedPoint` (SlideMonToOffset's step)
does not — irrelevant at this move's own ≤15px magnitudes but part of the
real function. (2) Self-destroy timing differs by a full tick: SlideMonToOffset's
finish branch only *reassigns* `sprite->callback` to `DestroyAnimSprite`
(`SetCallbackToStoredInData6`), so the actual destroy fires the FOLLOWING
tick — RAM shows the dummy sprite alive for 5 ticks on a 4-tick duration
(168-172, tick 172 a repeated no-op), gone by 173. SlideMonToOriginalPos_Step
calls `DestroyAnimSprite` directly in its own finish branch, same tick as the
last accumulate — RAM shows exactly 4 ticks alive (235-238), gone by 239.
`tests/slideMon.test.ts` asserts the port reproduces the probed attacker `x2`
at every RAM tick across both windows (168-172 offset-out, 235-238
offset-back) plus both destroy-tick counts, all matching exactly on first
run — no curve-fitting needed once the source's two branch orders were read
correctly. The opponent-side mirror branch (`battlerSide: "opponent"`) is
unit-tested from source only — this attacker was on the player side in the
probed window, so the mirror itself is **not yet independently RAM-verified**
(named remainder, not claimed exact).

**No move wiring.** `AnimDragonRageFirePlume`, the fire-spit sprite's
asymmetric-offset branch, and `StartDragonFireTranslation`'s own fresh affine
probe are untouched — out of this step's scope per the brief.
MOVE_DRAGON_RAGE stays unsupported (no `ANIMATION_COVERAGE.json` entry).

**Evidence.** `npm test` 2190/2190 (2180 + 10 new: 3 fire-plume asset pins,
7 slideMon RAM pins). `npm run build` green.

## DRAGON_RAGE rungs 3-4: whole-move RAM probe, full engine port, interpreter generalized — still unsupported, no dense pixel evidence (2026-07-25)

**Verdict: the move body is fully ported and Tier-1-pinned against real RAM
in both attacker orientations, but zero dense oracle-pixel window was run
this step — per this codebase's own MIST_BALL precedent (a standalone,
Tier-1-pinned, not-yet-wired engine module), DRAGON_RAGE stays *unsupported*
(no `ANIMATION_COVERAGE.json` entry), not `partial`: `partial` requires "a
meaningful dense window is green," and none was attempted.**

**Rung 3 — whole-move RAM probe.** Extended rung 2's slide-only probe into
`tools/probe/dump-dragonrage-full.py`: one pass capturing `gAnimVisualTaskCount`/
`gAnimScriptActive` (ground truth for `waitforvisualfinish`'s own gating),
both `AnimTask_ShakeMon` calls (attacker then target, identified across
their self-reassignment from `AnimTask_ShakeMon` to the static, non-exported
`AnimTask_ShakeMon_Step` — resolved via `nm pokeemerald.elf`, not the map
file), the fire-spit sprite (position + its own single-step affine matrix
via `gOamMatrices`), all 8 fire-plume sprites (creation ticks, `animCmdIndex`
frame stepping, self-destroy), and both slide dummies. Staged BOTH
orientations: the existing CHARMELEON/ONIX fixture plus a new reverse
`tools/battle-lab/mechanic-dragon-rage-onix-charmeleon.json` (ONIX player,
CHARMELEON opponent) — needed to RAM-probe `StartDragonFireTranslation`'s
side-asymmetric offset branch and its own affine constants on the side
DRAGON_BREATH never exercises. Committed as
`src/data/gen/dragonrage-full-probe-{player,opponent}-attacker.json`.

**Rung 4 — port + wire the move body.** Generalized
`animScriptInterpreter.ts` with `interpretAnimSchedule`: the
`waitforvisualfinish` sprite-lifetime tracking the MIST_BALL enumeration
(2026-07-24) flagged as needed to generalize past FEATHER_DANCE's own
script-position coincidence. `Cmd_waitforvisualfinish`
(`battle_anim.c:455-465`) blocks until `gAnimVisualTaskCount == 0` — every
item active since the last wait, not just the most recent — so the
scheduler tracks each creation op's own "gone" tick (per-primitive lifetime
supplied by the caller: `shakeMonSequence(...).length - 2`,
`slideMonTo{Offset,OriginalPos}DestroyTick`, this move's own fire-spit/
fire-plume lifetimes) and resolves each `waitforvisualfinish` as
`max(activeGoneTicks) + 1` — a real, RAM-confirmed 1-tick resolution lag,
not a hand-fit. Verified exactly (all 5 of DRAGON_RAGE's own
`waitforvisualfinish` barriers, both orientations) before being trusted;
`tests/dragonRage.test.ts`'s `dragonRageSchedule` tests pin every predicted
creation tick against the rung-3 probe.

`src/engine/dragonRage.ts` drives the whole move through this scheduler
from the decoded script. Reuses `shakeMon.ts` (first ATTACKER-side
`AnimTask_ShakeMon` call site — same primitive, plus the already-established
priority-5 same-frame-double-step `+1` creation-tick adjustment
`fly.ts` documents) and `slideMon.ts` verbatim. Adds two new mechanisms:

- **Fire-spit sprite** (`StartDragonFireTranslation`): the opponent-side
  branch's `sprite->x -= cmd->initialY` asymmetry (confirmed straight from
  source, not guessed) plus a fresh, RAM-probed single-step affine matrix
  per side — player `(pa,pb,pc,pd) = (-183,-4,4,-183)`, opponent
  `(184,0,0,184)`, both distinct from DRAGON_BREATH's own matrices as
  predicted. The per-tick Q8.8 delta is a RAM-probed literal (constant
  across the sprite's life, `data[1]`/`data[2]`), not closed-form derived
  from either battler's resolved `BATTLER_COORD_X_2`/`Y_PIC_OFFSET` — those
  don't reproduce the literal via `floor(|distance|<<8/duration)` for
  reasons not fully chased down this step (same "RAM-probed literal, not a
  closed form" convention `dragonBreath.ts`'s own `MATRIX_A`/`MATRIX_B`
  tables already use for this callback family). Frame cadence reuses
  `dragonBreath.ts`'s own `((age+1)/3 % 3)` formula verbatim — RAM-confirmed
  identical shape (`sAnim_DragonRageFire` is byte-identical to
  `sAnim_DragonBreathFire_0`, exactly as the enumeration predicted).
- **Fire-plume sprites** (`AnimDragonRageFirePlume`, all 8 spawns): static
  position at the target's own `BATTLER_COORD_X`/`Y` (`targetBattlePosition`
  — solved independently from the fire-spit's own `X_2`/`Y_PIC_OFFSET`
  anchor and confirmed genuinely distinct, not a copy/paste error), offset
  by `SetAnimSpriteInitialXOffset` (side-signed, same `sideSignedOffset`
  shape `ember.ts` established) on X and a plain add on Y. RAM-probed
  26-tick lifetime per spawn, identical across all 8 independently: a
  4/5/5/5/7-tick frame-duration pattern (first frame short one tick — the
  same "creation tick already reflects one step" idiom `slideMon.ts`
  documents; last frame held 2 extra ticks after its own countdown before
  `RunStoredCallbackWhenAnimEnds`'s own deferred-destroy fires).

`tests/dragonRage.test.ts` (11 tests) pins every mechanism against BOTH
committed RAM probes at every probed tick: schedule ticks (all 6 creation
events, both orientations — exact match, validating the interpreter
generalization), attacker/target shake offsets, both slide phases, fire-spit
position/frame/matrix (both sides), and all 8 plume spawns'
position/subpriority/frame across their full 26-tick life (both sides).

**What's NOT done — the real remainder.** `dragonRage.ts` is not wired into
`sceneOnPresentation.ts`'s move-dispatch system (`SceneOnMoveConfig` union,
`createSceneOnMovePresentation`, a `sceneOnDragonRageView` function) — that
system doesn't yet know the CHARMELEON species (a new
`SceneOnPresentationBattler.species` union member + geometry constants,
which this step DID reverse-solve precisely from the RAM probe for both
roles: attacker `X_2/Y_pic` `(72,97)` player-side / `(176,49)` opponent-side;
ONIX-as-target `X_2/Y_pic` `(176,42)` opponent-side / `(72,88)` player-side,
`battlePositionCenter` `(176,40)` / `(72,80)` — see `dragonRage.ts`'s own
geometry constants and doc comments for the derivation). No portable
comparator script (`tools/compare/dragonRagePortable.ts`, mirroring
`emberPortable.ts`) or dense-window RGB probe exists yet, so no oracle-pixel
window has run at all — the acceptance bar this move still needs.
**Remainder, in cost order:** (1) add `CHARMELEON` to
`SceneOnPresentationBattler`'s species union + wire its `spriteCorner`
(not yet solved — only the two coordinate pairs above were needed for this
step's math); (2) add a `SceneOnDragonRageConfig` case + view function to
`sceneOnPresentation.ts` calling straight into `dragonRage.ts`'s exported
functions; (3) a portable comparator + RGB probe script (mirror
`emberPortable.ts`/`tools/probe/run-battle-lab-rgb.py`); (4) dense windows
at full recorded counts, both orientations, each run twice for determinism;
(5) only then promote a coverage entry (`exact` if clean, `partial` with the
remainder named otherwise).

**Evidence.** `npm test` 2201/2201 (2190 + 11 new). `npm run build` green.


## DRAGON_RAGE rung 5: wired through the Scene-ON seam, comparator built, dense run finds a multi-tier capture-lag residual — still unsupported (2026-07-25)

**Verdict: real progress on every ordered remainder item, but no green dense
window — MOVE_DRAGON_RAGE stays *unsupported*, not `partial`, per the
rubric's own "a meaningful dense window is green" bar for `partial`.**

**Rung 5.1 — presentation wiring.** Extended `tools/extract/extract-battle-mon-pics.ts`
with `CHARMELEON` (mechanical species-list addition, same shape as
SPOINK/ARCANINE/DUGTRIO — additive only, `mon-pic-coords.json` was already
complete). Added `CHARMELEON` to `SceneOnPresentationBattler`'s species
union, a `SceneOnDragonRageConfig` + `SceneOnDragonRageView` pair, and
`sceneOnDragonRageView` to `sceneOnPresentation.ts` — driven entirely by
`dragonRageSchedule(0)` plus the already-ported `shakeMonOffsetAtRenderTick`/
`slideMonToOffsetAtTick`/`slideMonToOriginalPosAtTick`/
`dragonRageFireSpitStateAtAge`/`dragonRageFirePlumeStateAtAge` (no turn-keyed
branches, no absolute-tick constants). `battleScene.ts` gained the matching
`DRAGON_RAGE` draw case: attacker/target sprites offset by the composed
shake+slide state, the fire-spit sprite drawn via the existing
`drawSpriteSheetAffineRotate` primitive (already generic enough for a fresh
matrix, no new draw code needed), and the 8 fire-plume sprites split
front/behind the target by their own per-spawn `subpriorityOffset` (2 vs 66)
— the fire-spit-vs-attacker order reuses `dragonBreathEmbersInFrontOfAttacker`
directly, since the fire-spit's own `createsprite` subpriority
(`targetSubpriority - 2`) is the identical shape EMBER's own embers use.

**Rung 5.2 — portable comparator + RGB probe.** `tools/probe/dump-dragonrage-rgb.py`
mirrors `run-battle-lab-rgb.py`'s capture-loop/CLI shape
(`<scenario> <output> <rgb-dir>`) combined with `dump-dragonrage-full.py`'s
own template-pointer sprite/task identification, so it drives exactly like
`emberPortable.ts` drives its own probe.
`tools/compare/dragonRagePortable.ts` checks both a component read (attacker/
target offset, fire-spit position/frame/matrix, fire-plume positions — self-
calibrated against ONIX's own species-specific baseline OAM residual rather
than hardcoding it, since the residual is per-orientation) and full
framebuffer pixels. Both fixtures staged with real RAM-read HP/gender
(`tools/compare/fixtures/dragon-rage-{player,opponent}-charmeleon-*.json`):
CHARMELEON 133/133, ONIX 110/110, both male in both orientations (read
directly from the probe's own `player`/`opponent`/`*Personality` fields, not
assumed).

**A real bug the first comparator run caught immediately, fixed:** the draw
block's healthbox branch had player/opponent backwards, calling ONIX's
hardcoded-117-max-HP helper (`onixPlayerHealthboxContentForState`) for what
is actually a 133-HP CHARMELEON slot in this fixture — `composePlayerHealthbox`
threw immediately (`invalid HP 133/117`), so this was caught before any
pixel comparison ran, not silently wrong. Replaced with fully generic
`composeOpponentHealthbox`/`composePlayerHealthbox` calls keyed off a new
`SceneOnDragonRageFieldProfile` (adds explicit `playerMaxHp`/`opponentMaxHp`
— no existing shared field profile carries them, since every prior move's
fixtures reused one canonical battler's own hardcoded-maxHP helper).

**Dense run: component math is exact, framebuffer capture lag is not
uniform.** At zero capture lag (comparing the view directly against the
probe's own RAM reads, no display-timing adjustment), every mechanism's
position/frame/matrix math matches the oracle's RAM state exactly — this
reconfirms rung 3-4's Tier-1 pinning, now cross-checked against a
second, independently-captured probe. The FRAMEBUFFER (photographed pixel)
comparison is where this rung stops short: probing capture-lag values 0-3
against the cached RGB dump (player-attacker fixture) shows the lag is
**not one uniform constant** the way it is for every other staged move so
far —
- Attacker `AnimTask_ShakeMon`'s own 2-tick toggle pattern needs lag=**2**
  (149/150 frames of the pure-shake window 89-238 match at lag=2, vs.
  48/150 at the codebase's normal lag=1 — checked directly, mismatch
  direction confirmed oracle-vs-app, alternates in lockstep with the
  shake's own 2-tick period, exactly the signature of a one-tick phase
  shift, not a value error).
- The fire-spit sprite's own translation wants lag=**1**: at lag=2 (tuned
  for the shake), frame 175's diff (`108-112,97-98`: oracle shows fire
  colors `255/0/0`/`255/99/16`/`255/198/33`, app shows background) is the
  fire-spit appearing one frame EARLIER in the real oracle than the
  lag=2 model predicts.
- Target `x2` drifts by an unmodeled **-1** starting exactly at the target
  shake's own creation tick (frame 186 onward in the player-attacker
  fixture) and holds through at least frame 193 — `DRAGON_RAGE_TARGET_SHAKE`'s
  own `xOffset` is 0, so the port correctly predicts a constant x2, but
  real RAM shows it stepping down by one right at that tick. Isolated via
  the comparator's own component check (self-calibrated baseline), not
  yet root-caused (candidate: some interaction between the SlideMonToOffset
  dummy sprite's own finish branch, still alive until one tick after its
  4-tick duration per `slideMonToOffsetDestroyTick`, and the target shake
  task's creation in the same window — not confirmed).

This is the same category of finding BLAZE_KICK's own module already
documents (matrix vs. palette writes reaching the framebuffer on different
ticks) — DRAGON_RAGE has five independent mechanisms sharing one move body,
and at least three distinct lag/drift behaviors among them. Properly
resolving this needs its own per-mechanism RAM-vs-photo bisection (the
"disciplined probe cycle" the step brief calls for), which this rung's
remaining time did not allow after building and running the comparator
itself. Per the step brief's own instruction, the code is left at the
codebase's normal lag=1 default (the least speculative choice, matching
every other staged move) rather than blind-fitting lag=2 to only partially
fix the picture — `battleScene.ts`'s `DRAGON_RAGE` case is real, wired,
and buildable, but its framebuffer output does not yet match the oracle.

**Not attempted:** no exhaustive per-mechanism bisection, no opponent-
attacker-orientation framebuffer run (the player-attacker fixture's own
residual already blocks a green window), no coverage entry.

**Remainder, in cost order:** (1) bisect the target x2 drift's own root
cause (likely a short, disciplined RAM probe around ticks 185-194 of the
already-staged fixture); (2) determine whether the shake/fire-spit lag
split is genuinely per-mechanism-type (as BLAZE_KICK's own precedent
suggests) or reveals a modeling bug in one of the two RAM-tick-to-display
mappings; (3) re-run the dense comparator, both orientations, twice each,
once the residuals are resolved; (4) only then promote a coverage entry.

**Evidence.** `npm test` 2201/2201 (unchanged — no new Tier-1 test this
rung; the comparator's own findings are dev-time evidence, not production
logic). `npm run build` green.

