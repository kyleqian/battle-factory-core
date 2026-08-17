# Brain transition wiring — design (2026-08-17, side lane)

Turns ISSUES #98 into bounded implementation slices. Read first:
`docs/noland-brain-intro-gold-ground-truth.md` §8″–Rung 3,
`docs/silver-flicker-evidence.md` + its Rung 2/3 addenda, PROGRESS 1312.

Docs-only step: no `src/` edit. One new probe script,
`tools/probe/brain-transition-rng-accounting.ts` (committed, read-only —
runs already-ported engine code, changes nothing).

## 0. What's new this session vs. what was already known

Rung 3 (PROGRESS 1312) already proved the WIRING bug (brain walk-up never
fires `opponentSetupExtraRngSteps`'s transition draw, so
`transitionPresentation` stays `undefined` and `circlesMeet` is hardcoded)
and enumerated why it's multi-piece. This session adds two things Rung
3/Rung 2 left open:

1. **Per-fixture family identification from wider oracle captures** (§1) —
   both fixtures' banked windows end too early to see the family-defining
   sprite paths; widening the capture resolves this and overturns the
   "gold is probably circlesMeet by chance" hypothesis.
2. **A working, committed RNG-accounting probe** (§2) that proves the whole
   `generateFactoryBrainOpponent` → `pickFrontierTransition` computation is
   mechanically ready today — but its demo run is **not yet seeded to match
   either fixture**, so it does not close the cross-check the brief wants.
   That gap, and exactly what closes it, is the load-bearing finding of §2.

## 1. Per-fixture transition identification

Method: `bin/oracle lab` on the banked fixture (silver) or a throwaway
`/tmp`-only copy with a widened `preCheckpointCaptureFrames` range (gold —
the committed fixture's own 2495–2620 span ends before the family-defining
shape is visible; a `/tmp` copy extended to 2495–2680, never written into
the repo, supplied the missing frames), then reading the resulting PNGs
directly.

### Silver — `factory-brain-silver-walkup-speech-flicker-off.json`, already fully banked (abs 3195–3300)

Frames abs 3279/3280/3290/3300 (`/tmp/silver-flicker-probe`, regenerated
from the committed fixture, no edits):

- **abs 3279:** plain scene, no transition graphics (matches the doc's
  "zero circle-palette pixels" finding).
- **abs 3280** (the "abrupt full-width block" tick): **two** solid blue
  ring sprites already substantially on-screen, one cut off at the far
  **left** edge, one at the far **right** edge, both near vertical
  mid-screen.
- **abs 3290:** the same two ring sprites, larger/closer to center, plus a
  **third** ring now entering from the **bottom**, moving up.
- **abs 3300:** all three rings converged near center into a
  clover/triangle cluster, the small red Frontier logo peeking through
  where they haven't fully merged.

This is visibly the **circles-superfamily** (ruling out LOGO_WIGGLE/WAVE
and SQUARES/SQUARES_SCROLL outright — those never spawn discrete ring
sprites at all) and specifically the **CROSS** shape, not **MEET**:
`CirclesCross_CreateSprites` (`battle_transition_frontier.c:459-467`,
params also pre-extracted at `src/data/gen/battle-transitions-frontier.json`
table index 5) spawns circle2/circle3 at `(241,59)`/`(-1,59)` — already
almost fully on-screen at the horizontal edges, near mid-height — and
circle1 (the "top" target) at `(120,197)`, **below** the screen, sliding
**up**. That is exactly "two edge circles first, one bottom-entering
circle later." `CirclesMeet_CreateSprites` (table index 4) would instead
show a circle entering from **above** first and two circles entering from
the **bottom corners**, diagonally — not what's on screen.

Non-sequential vs. sequential: `CirclesCross_CreateSprites` creates all
three sprites in the same tick (no `createOnTimer` stagger in the asset
JSON); `CirclesCrossInSeq_CreateSprites` (table index 9) staggers creation
16 ticks apart per circle. Both edge circles are **already** substantially
visible together in the very first post-flicker frame (abs 3280) — no
~16-tick gap between them — which matches plain **CROSS** (table index 5,
id 35), not **CROSS_IN_SEQ** (table index 9, id 39).

**Identification: `B_TRANSITION_FRONTIER_CIRCLES_CROSS`, table index 5, id
35.** Confidence: high on family (CROSS vs. MEET vs. spiral vs.
logo/squares — unambiguous from the entry-edge shape), medium on the
CROSS-vs-CROSS_IN_SEQ call (based on eyeballing "both edges already
present together," not a per-tick automated onset probe). No further
capture is needed for the family call; a stride-1 automated onset probe
(same method as the flicker-coefficient inversion in §8″/§8‴) on the two
edge circles' own leading pixels would tighten CROSS vs. CROSS_IN_SEQ from
"medium" to "proven," and is cheap since the fixture is already banked.

### Gold — `factory-brain-gold-speech-close-off.json`, banked span (2495–2620) insufficient; widened to 2495–2680 in `/tmp` only

The committed 126-frame span ends mid-slide. A `/tmp`-only widened copy
(`/tmp/gold-close-extended.json`, never committed — `preCheckpointCaptureFrames`
2495–2680, everything else identical to the committed fixture) shows:

- abs 2612–2620: a small blue arc growing at **top-center**, entering from
  above (matches either MEET's or MEET_IN_SEQ's top circle — both use the
  same `(120,-51)` start / `(120,45)` target).
- abs 2624: still only the top circle.
- abs 2627–2630: a **second** circle appears at the **bottom-left**,
  growing quickly.
- abs 2640–2645: bottom-left circle large; **bottom-right still absent**.
- abs 2650: bottom-right circle just appearing (small sliver).
- abs 2670: all three converged into the classic top/bottom-left/bottom-right
  triangle cluster.

Top → bottom-left → bottom-right onsets land roughly 14 and then ~20 ticks
apart. `CirclesMeet_CreateSprites` (table index 4, id 34 — the currently
hardcoded fallback) creates all three sprites **simultaneously** with
symmetric geometry for circle2/circle3 — bottom-left and bottom-right
should appear **together**, not 20 ticks apart. `CirclesMeetInSeq_CreateSprites`
(table index 8, id 38, `battle_transition_frontier.c:537-555`) creates
circle1/2/3 on task timers 0/16/32 — a real ~16-tick-per-step stagger,
matching what's on screen far better.

**Identification: `B_TRANSITION_FRONTIER_CIRCLES_MEET_IN_SEQ`, table index
8, id 38 — not the hardcoded `circlesMeet` fallback.** This overturns
PROGRESS 1312's "gold's residual being close to circlesMeet is most
parsimoniously explained as this fixture landing on circlesMeet by chance"
— the wider capture shows a real, different (sequential) sibling family,
not a near-miss. Confidence: medium — same caveat as silver, frame sampling
was ~5–15-tick-spaced eyeballing of `/tmp` PNGs, not a per-tick automated
onset derivation. Missing capture: none for the family-level call (the
`/tmp` extension already reaches full convergence); a per-tick automated
probe over the same `/tmp` extension would tighten the exact stagger
constant before implementation.

### Cross-tier note

Both fixtures land on **circles**-superfamily entries neither gold nor
silver's residual previously assumed (`circlesMeet`) — one on the
**MEET** sub-shape (gold, sequential variant) and one on the **CROSS**
sub-shape (silver, non-sequential variant). Nothing here is squares, logo,
or spiral for either fixture.

## 2. RNG accounting

**Ordinary (non-brain) path — engine + source.** `opponentSetupExtraRngSteps`
(`src/engine/battleRoom.ts:261`) fires `selectFrontierTransition` from
`applyBattleTransitionOverlay`'s tick-level `rngValue` (the SAME cursor that
also advances once per VBlank elsewhere in `core.ts`'s tick loop) at a
**scenario-hardcoded** elapsed tick (`case 26: return 1` for the default
walk-up scenario, `case 23` for `"jenson"`), after replaying hardcoded step
counts (`28*2`/`16*2`/`95*2` etc.) that stand in for
`FillFactoryFrontierTrainerParty`'s own rejection-loop draws for that
*specific, pinned* scenario. Source: `GetSpecialBattleTransition`
(`battle_setup.c:864-908`) returns
`RANDOM_TRANSITION(sBattleTransitionTable_BattleFrontier)` =
`table[Random() % 12]` (`battle_setup.c:863,885`), one `Random()` call,
invoked from `DoSpecialTrainerBattle`'s `SPECIAL_BATTLE_FACTORY` case
(`battle_tower.c:2093-2100`) immediately after `FillFactoryTrainerParty()`
returns — no intervening draws. This hardcoded-step-count design is
scenario-specific by construction; it does not generalize to the brain
path, whose rejection-loop length is data-dependent (§Rung 3).

**Brain path — engine + source.** `FillFactoryBrainParty`
(`battle_factory.c:759-826`) is already fully ported as
`generateFactoryBrainOpponent` (`src/engine/factoryBrainOpponentGeneration.ts`),
invoked from `generateOpponentFor`
(`src/engine/factoryRoundBattleOrchestrator.ts:589-614`). Its returned
`.rngValue` is documented as "cursor immediately after the third opponent's
personality is accepted" — exactly the input `GetSpecialBattleTransition`'s
one `Random()` call needs per source (no draws happen between party-fill
and the transition pick). `pickFrontierTransition`
(`src/engine/opponentGen.ts:110-115`) is the exact `table[Random()%12]`
port. **Nothing new needs to be written to compute the draw** — only wired.

**Probe built and run this session (`tools/probe/brain-transition-rng-accounting.ts`,
committed).** It reuses the already-committed test-only "round 7 reveal"
stage builders
(`generatedGoldRoundRevealProofStage`/`generatedRoundRevealProofStage` in
`tools/compare/factoryRoundIntroGeneralizationStage.ts`) to build a full
round up to the brain battle, reads `opponentGenerations.at(-1).generation.rngValue`,
and calls `pickFrontierTransition` on it once. Output
(`node --experimental-strip-types tools/probe/brain-transition-rng-accounting.ts`):

```
gold (challenge 5, seed 2, streak 35):
  post-party rngValue=0x7ebee3b6
  raw=30060 tableIndex=0 transitionId=29 name=B_TRANSITION_FRONTIER_LOGO_WIGGLE
silver (challenge 2, seed 70, streak 14):
  post-party rngValue=0x4eb0e921
  raw=6369 tableIndex=9 transitionId=39 name=B_TRANSITION_FRONTIER_CIRCLES_CROSS_IN_SEQ
```

**This does NOT cross-check §1 — the seeds don't match.** The stage
builders' `rngValue: 2` (gold) / their silver equivalent (`"seed 70"` per
that file's own comment) are values pinned for
`tests/factoryBrainRoundShape.test.ts`, unrelated to the battle-lab
fixtures' own `"seed": 305419896`. There is currently **no app-side
function** that maps an oracle battle-lab request
(`{seed, challengeNum, playerSetIds, rentalSwapCount}`) to the app's own
round-start `{rngValue, factoryWinStreak, factorySymbolsCount}` — the
oracle seeds the real ROM's RNG directly and replays challenge history
inside mGBA; the app-side stage builders instead hardcode independently-
pinned equivalents for their own tests. So this run proves the **mechanism**
(the computation is deterministic, cheap, and already correct end-to-end)
but its concrete answer is for a *different* real draw than either fixture,
not a validation or refutation of §1's gold=MEET_IN_SEQ / silver=CROSS
calls. (For what it's worth: silver's demo answer landed on the same
**family** — CIRCLES_CROSS(_IN_SEQ) — that §1 independently found from
real pixels, on an unrelated seed; that's a mildly encouraging coincidence
about which families are common in the table, not evidence.)

**What closes the gap (either is sufficient, both are bounded):**

1. **App-side seed mapping.** Determine how the oracle's `factoryBrain`
   battle-lab mode turns `seed` into the ROM's initial `gRngValue` and how
   `challengeNum`/`rentalSwapCount` map to `factoryWinStreak`/round history,
   then build the same six-prior-win replay this probe already does but
   seeded to match `305419896`/challengeNum 5/2. Scope: read
   `oracle/BATTLE_LAB.md` and the oracle service's request handler (outside
   `reference/`/`src/`, so out of this step's read list) — likely a half-day,
   not a 45-minute slice, unless the mapping turns out to be a one-line
   `ANCHOR_RNG_VALUE`-style seed substitution.
2. **Direct mGBA probe (cheaper, no app-side archaeology).** `gRngValue` is
   at RAM `0x3005d80` (`bin/oracle symbols gRngValue`, run this session).
   Set a probe (`python3 tools/run-mgba-probe.py`) that runs each fixture's
   own battle-lab scenario up to the tick immediately before
   `GetSpecialBattleTransition`'s `Random()` call
   (`battle_setup.c:864-908`, called from `battle_tower.c:2093-2100`) and
   reads `gRngValue` at that instant — this is the ROM's own real value,
   no app-side replay assumptions needed at all, and directly answers "does
   `table[gRngValue' % 12]` equal §1's visual call" (where `gRngValue'` is
   `Random()`'s post-advance value, `randomU16`'s own convention,
   `opponentGen.ts:48-51`). Bounded, ≤1 slice — recommended over option 1
   for this specific cross-check.

**Trust call for now:** §1 (direct pixel identification against the real
fixtures) is the authoritative answer until one of the two probes above
lands; the RNG side is proven *computable*, not yet proven *matching*.

## 3. Renderer inventory

All 12 families' source params are **already extracted** into
`src/data/gen/battle-transitions-frontier.json` (`transitionMeta.table`,
already imported into `battleTransition.ts:94,132`) — sprite init/target/
speed/stagger constants for every circles family, and asset/mechanism notes
for squares and logo. The gap for missing families is purely the render
function; no new source reading or asset extraction is needed for any of
the circles families.

| # | table idx | id | name | family | renderer today? | needed by a fixture? |
| - | - | - | - | - | - | - |
| 1 | 0 | 29 | LOGO_WIGGLE | logoWiggle | no | no |
| 2 | 1 | 30 | LOGO_WAVE | logoWave | **yes** (`frontierTransitionRenderKind`, `battleTransition.ts:310`) | no |
| 3 | 2 | 31 | SQUARES | squares | no | no |
| 4 | 3 | 32 | SQUARES_SCROLL | squaresScroll | no | no |
| 5 | 4 | 34 | CIRCLES_MEET | circlesSlide | **yes** (`circleCenter`, `battleTransition.ts:343-347`) | no (was the fallback, not the real draw for either fixture) |
| 6 | 5 | 35 | CIRCLES_CROSS | circlesSlide | no | **silver** (§1) |
| 7 | 6 | 36 | CIRCLES_ASYMMETRIC_SPIRAL | circlesSpiral | no | no |
| 8 | 7 | 37 | CIRCLES_SYMMETRIC_SPIRAL | circlesSpiral | no | no |
| 9 | 8 | 38 | CIRCLES_MEET_IN_SEQ | circlesSlideInSeq | no | **gold** (§1) |
| 10 | 9 | 39 | CIRCLES_CROSS_IN_SEQ | circlesSlideInSeq | no | no (ruled out for silver, §1) |
| 11 | 10 | 40 | CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ | circlesSpiralInSeq | **yes** (`asymmetricSpiralCircleCenter`, `battleTransition.ts:378-390`) | no |
| 12 | 11 | 41 | CIRCLES_SYMMETRIC_SPIRAL_IN_SEQ | circlesSpiralInSeq | no | no |

Confirms PROGRESS 1312's "3 of 12" and that both fixtures need one of the
9 unimplemented entries.

**Cost for the two needed-but-missing families** (both reuse 100% of the
existing shared machinery: `Circles_Init`/`WaitForLogoCirclesAnim`/
`FadeInCenterLogoCircle`/`_End`'s blend+flicker+fade, already modeled by
`grayFlickerY`, `centerLogoEva`, `exitFadeY`, `applyCenterLogoBlend`; same
`circles.circleSprites`/`centerBg` assets already loaded):

- **CIRCLES_CROSS (id 35, silver's need).** Smallest possible addition:
  a new 3-entry `CIRCLE_SPECS`-shaped const (init/target/speed per circle,
  already sitting in `transitionMeta.table[5].params.sprites` — literally
  copy the 3 rows) fed through the **existing** linear-slide formula
  `circleCenter` already implements for MEET, generalized to take a
  per-family spec table instead of the hardcoded MEET one. No new timing
  mechanism. ~1 bounded piece.
- **CIRCLES_MEET_IN_SEQ (id 38, gold's need).** One step up: needs the
  MEET geometry (target/init already match plain MEET, params in
  `transitionMeta.table[8]`) **plus** the staggered-visibility gate the
  engine already has a working example of for `asymmetricSpiralCircleCenter`
  (`te < spec.visibleTe → null`, `battleTransition.ts:378-390`) — port the
  same gate shape onto a linear-slide (not spiral) center function, doubled
  speed per the params table. ~1 bounded piece, marginally larger than
  CROSS's because it's porting the stagger pattern to a new movement kind
  rather than reusing an existing function outright.

Neither needs new asset extraction, new blend math, or a new fade
mechanism — both are pure position-formula additions dispatched through
`applyBattleTransitionOverlay`'s existing `transition` parameter.

## 4. Slice plan

Ordered, ≤45 minutes each. Two committed canaries the wiring slice (S3)
must NOT move: `factory-round-battle7-noland-reveal-off.json` (690/701) and
`factory-round-battle7-noland-gold-reveal-off.json` (690/701) — the
ordinary (non-brain) "settled" path's own already-pinned windows, which
depend on `opponentSetupExtraRngSteps`'s tick-level draw being untouched.

**Cheap-first check: no.** Per §1/§3, neither fixture's real draw lands on
an already-implemented render kind (`circlesMeet`/`logoWave`/
`asymmetricSpiralInSeq`) — wiring alone cannot close either window this
round. Both target families are cheap **new** renderers (§3), not reuse.

```
S0 (RNG cross-check) ──┬──> S1 (renderer: CIRCLES_CROSS)   ──┐
                        └──> S2 (renderer: CIRCLES_MEET_IN_SEQ) ─┤──> S3 (wiring) ──> S4 (soak/close)
```

**S0 — Close the RNG cross-check gap (~30–45 min).** Run the mGBA
`gRngValue` probe (§2, option 2) for both fixtures at the tick immediately
before `GetSpecialBattleTransition`'s draw. Acceptance: a concrete
`table[Random()%12]` index for each fixture. **Decision gate:** if it
agrees with §1 (CROSS for silver, MEET_IN_SEQ for gold) — proceed to
S1/S2 as scoped. If it disagrees, STOP and re-open §1 with the disagreement
in hand (per the brief's own "say which you trust and why" rule) — do not
guess a renderer against an unconfirmed family. Depends on: nothing (pure
oracle probe, no code dependency on S1–S4).

**S1 — `CIRCLES_CROSS` renderer (~30–45 min, independent of S2).**
Generalize `circleCenter`/`CIRCLE_SPECS` (`battleTransition.ts:336-347`) to
take a per-family spec table; add CROSS's own 3-row spec from
`transitionMeta.table[5].params.sprites`; add `transitionId === 35 →
"circlesCross"` to `frontierTransitionRenderKind`; wire the new kind into
`applyBattleTransitionOverlay`'s dispatch (reuse the plain per-circle draw
loop, no painter-order change needed since CROSS has no stagger).
Acceptance: `npm run compare -- factory-brain-silver-walkup-speech-flicker-off.json --summary`
strictly improves from 79/100 (target 100/100, contingent on S3 also
landing — see S3's own note on partial credit); the two named canaries
unmoved; `npm run test:smoke` green. Depends on: S0 confirming silver=CROSS.

**S2 — `CIRCLES_MEET_IN_SEQ` renderer (~45 min, independent of S1).** Add
MEET_IN_SEQ's spec (from `transitionMeta.table[8].params.sprites`,
`createOnTimer` 0/16/32) and a staggered-visibility linear-slide function
mirroring `asymmetricSpiralCircleCenter`'s `visibleTe` gate
(`battleTransition.ts:378-390`) but for straight-line motion instead of
spiral. Add `transitionId === 38 → "circlesMeetInSeq"` to
`frontierTransitionRenderKind`; wire into `applyBattleTransitionOverlay`.
Acceptance: `npm run compare -- factory-brain-gold-walkup-speech-close-off.json --summary`
strictly improves from 113/126 (target 126/126, contingent on S3); the two
named canaries unmoved; `npm run test:smoke` green. Depends on: S0
confirming gold=MEET_IN_SEQ.

**S3 — Wire the brain-room draw (~45 min, depends on S1+S2 for full
window closure; the wiring itself is renderer-agnostic and can land with
only a fallback-safety check if S1/S2 aren't done yet).** Rung 3's own
enumeration, now unblocked:
1. In `generateOpponentFor`'s `"frontier-brain"` branch
   (`factoryRoundBattleOrchestrator.ts:597-614`), call
   `pickFrontierTransition(generation.rngValue)` once and thread the
   result onto `FactoryScheduledOpponentGeneration`'s `"frontier-brain"`
   variant and `BattleOpponent.frontierBrain`
   (`battleScenario.ts:55-67`) as a new `transitionPresentation` field.
2. In `battleRoomStateForOpponent`/`createBrainWalkupBattleRoomState`
   (`battleRoom.ts`, near the existing `brainSpeechTier` construction),
   set the constructed brain room's `transitionPresentation` **directly**
   from the opponent's precomputed field at room-construction time.
   **Do not touch `opponentSetupExtraRngSteps`** — it stays gated on
   `state.phase !== "settled"` exactly as today, so it keeps returning 0
   for `"brainSpeechSettled"` and the tick-level cursor is never consulted
   for brain rooms. This is how the two cursors avoid reconciling instead
   of needing to: the brain path sources its presentation entirely at the
   orchestrator level, pre-tick-loop; the ordinary path keeps its existing
   tick-level draw untouched. No double-draw, no desync — the two systems
   simply don't share this value.
3. Guard reruns: both named canaries (690/701 each) unmoved, plus every
   currently-100%-passing brain window unrelated to the transition span
   (entrance-02/03, gold-pages, silver box-2, close-pause, cry-held,
   askready, etc. — the full matrix each prior PROGRESS entry already
   reruns) unmoved.
4. **Partial-credit guard:** if S3 lands before S1/S2 (e.g. to validate the
   plumbing independently), `frontierTransitionRenderKind`'s existing
   fallback (`"circlesMeet"`) still applies for ids 35/38 since neither has
   a case yet — verify the two target windows do **not regress below**
   their current partial baseline (gold 113/126, silver 79/100) even though
   they won't reach 126/126 or 100/100 until S1/S2 also land.

**S4 — Soak/close (~15–30 min).** With S0–S3 landed: rerun both target
fixtures for 126/126 and 100/100, full `npm test` + `npm run build` +
`npm run typecheck`, `executableFrontierRatchet` barrier counts unmoved,
and fold the two ISSUES #98 window counts into a closing PROGRESS entry
(supervisor-owned, not this step).

## 5. S0 result — RNG cross-check MATCH for both fixtures

Method used: §2's option 2 (direct mGBA probe), via the frame-aligned
RAM-read variant the S0 spec itself sanctions as an alternative to a
breakpoint — no breakpoint capability was needed once the actual VBlank
gating rule (below) was found. New committed probe:
`tools/probe/probe-brain-transition-rng-cross-check.py`, run via
`python3 tools/run-mgba-probe.py <fresh-output.json> --
tools/probe/probe-brain-transition-rng-cross-check.py <fresh-output.json>`.
Confirmed deterministic: two independent runs produced byte-identical
`results` arrays.

**Why a plain per-frame RAM read is sufficient (no breakpoint needed).**
Two source facts, both reconfirmed this session, combine to make this
work:

1. `VBlankIntr` (`reference/pokeemerald/src/main.c:366`) calls `Random()`
   unconditionally every frame **unless** `gMain.inBattle &&
   (gBattleTypeFlags & (BATTLE_TYPE_LINK|BATTLE_TYPE_FRONTIER|
   BATTLE_TYPE_RECORDED))`. `gMain.inBattle` does not flip true until
   after the transition animation finishes (`BattleTransition_
   StartOnField` still runs on the overworld `CB2`), so `gRngValue`
   free-runs at exactly one LCG step (`ISO_RANDOMIZE1`,
   `include/random.h:16`: `gRngValue = 1103515245*gRngValue + 24691`)
   per frame through the **entire** walk-up **and** the entire visible
   transition animation. A first probe attempt assumed the opposite (a
   freeze at battle-start) and came back inconclusive — the corrected
   model above is what the live data actually shows.
2. `DoSpecialTrainerBattle`'s `SPECIAL_BATTLE_FACTORY` case
   (`battle_tower.c:2092-2100`) calls `FillFactoryTrainerParty()` then
   `GetSpecialBattleTransition(B_TRANSITION_GROUP_B_FACTORY)` back to
   back, synchronously, no task yield between them.
   `FillFactoryTrainerParty` → `FillFactoryFrontierTrainerParty` →
   (`gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN`) →
   `FillFactoryBrainParty(); return;` (`battle_tower.c:1849-1852`) — so
   for a brain fight this one call chain performs the *whole* 3-mon
   rejection-loop generation immediately followed by the one transition
   draw, confirming source really does have "no intervening draws"
   between them, exactly as §2 already argued from a different citation.

So the transition draw is not invisible in a per-frame sample — it shows
up as a short burst of **more than one** LCG step between two adjacent
sampled frames (the rejection-loop draws collapse into however many
frames mGBA schedules between two `preCheckpointCaptureFrames` samples),
sitting inside an otherwise uniform one-step-per-frame stream, followed
by a clean all-1-step run all the way through the transition's visible
onset. `GetSpecialBattleTransition`'s `Random()` call is always the last
draw in that chain, so the **value at the end of the last burst before
the clean tail** is already `Random()`'s post-advance state — exactly
what `randomU16`/`pickFrontierTransition`'s own convention calls `raw`
(`src/engine/opponentGen.ts:48-51,110-115`): `tableIndex = (burstEndValue
>>> 16) % 12` (`RANDOM_TRANSITION`, `battle_setup.c:863,885`,
`ARRAY_COUNT(sBattleTransitionTable_BattleFrontier) == 12`).

**Gold** (`factory-brain-gold-speech-close-off.json`, seed 305419896,
challengeNum 5, probe window abs frames 2540–2630 — committed span is
2495–2620, widened earlier to bracket the burst and later for a clean-tail
margin):

- Three bursts found: frame 2542→2543 (162 LCG steps), 2546→2547 (12
  steps), 2554→2555 (2 steps) — plausibly three mons' selection+
  personality rejection loops, though the exact per-mon attribution
  wasn't required for the verdict.
- Last burst: **frame 2555, `rngValue = 0x992cc3b2`** (raw decimal
  2569847730). Clean 1-step run confirmed from frame 2555 through 2630
  (spans past §1's abs-2612 transition-visual onset with no further
  anomaly) — the "no intervening draws" assumption holds empirically,
  not just by source citation.
- `raw = (0x992cc3b2 >>> 16) & 0xffff = 39212`; `tableIndex = 39212 % 12
  = 8`; table[8] = id 38 = **`B_TRANSITION_FRONTIER_CIRCLES_MEET_IN_SEQ`**.
- §1's visual call: `B_TRANSITION_FRONTIER_CIRCLES_MEET_IN_SEQ`, table
  index 8. **MATCH.**

**Silver** (`factory-brain-silver-walkup-speech-flicker-off.json`, seed
305419896, challengeNum 2, probe window abs frames 3220–3300 — committed
span is 3195–3300, already fully banked; widened only slightly earlier
than 3220 for a pre-burst margin):

- One burst found: frame 3226→3227 (2 LCG steps) — the only anomaly in
  the entire window, unambiguous.
- Burst end: **frame 3227, `rngValue = 0x5f99c7c4`** (raw decimal
  1603913668). Clean 1-step run confirmed from frame 3227 through 3300
  (spans past §1's abs-3280 transition-visual onset with no further
  anomaly).
- `raw = (0x5f99c7c4 >>> 16) & 0xffff = 24473`; `tableIndex = 24473 % 12
  = 5`; table[5] = id 35 = **`B_TRANSITION_FRONTIER_CIRCLES_CROSS`**.
- §1's visual call: `B_TRANSITION_FRONTIER_CIRCLES_CROSS`, table index 5.
  **MATCH.**

**Verdict: MATCH for both fixtures.** The real ROM RNG stream, read
directly from RAM at the moment `GetSpecialBattleTransition` draws,
selects exactly the families §1 identified from pixels — gold lands on
`CIRCLES_MEET_IN_SEQ` (table idx 8), silver on `CIRCLES_CROSS` (table idx
5), with clean, reproducible (byte-identical across two independent
mGBA runs), non-ambiguous evidence for both (silver had exactly one
candidate burst in its window; gold had three, and the correct one is
both the last-before-clean-tail by construction and the only one of the
three whose derived index matches §1 — the other two candidates decode
to unrelated families, ruling out a lucky 1-in-12 coincidence). **Decision
gate: proceed to S1/S2 as scoped** — no re-opening of §1 needed.

## 6. S2 result — `CIRCLES_MEET_IN_SEQ` renderer landed, unwired [side lane]

Implemented `circlesMeetInSeqCircleCenter` + `CIRCLES_MEET_IN_SEQ_SPECS`
(`src/engine/battleTransition.ts`), ported from `CirclesMeetInSeq_CreateSprites`
(`battle_transition_frontier.c:537-555`) and `transitionMeta.table[8].params.sprites`:
same 3 targets as plain MEET, doubled per-tick speed (4px vs 2px, hence a
halved 24-tick slide per circle), each circle gated `null` until its own
16-tick-staggered creation tick (0/16/32 task-timer offsets from a shared
anchor) — the "distinctive feature" §1's widened gold captures showed.
Registered `transitionId === 38 → "circlesMeetInSeq"` in
`frontierTransitionRenderKind` and one new ternary arm in `drawCircleSprite`'s
center dispatch; `applyBattleTransitionOverlay` needed **no** change (its
existing fixed-order else-branch + `drawCircleSprite`'s internal null-skip
already handle a staggered-visibility kind), matching §3's own "pure
position-formula addition, no new blend math, no new fade mechanism" framing
— `grayFlickerY`/`centerLogoEva`/`exitFadeY` all fall through to their
existing MEET-shaped default branch for this kind, untouched.

**Anchor caveat (open, flagged for S3/S4):** the gate reuses `CIRCLE_ANCHOR_TE`
(trace tick 921), plain MEET's own pixel-verified anchor — justified because
`Circles_Init` (the state this family shares verbatim with MEET) hands off to
`CreateSprites` at the same relative offset regardless of family, and no
dense per-tick trace exists yet for gold's own fixture to fit an independent
anchor (§1 used sparse ~5-15-tick eyeballing, not a per-tick derivation).
This is a source-derived default, not yet pixel-verified for this specific
family+fixture pairing.

**Verification:** new `tests/battleTransitionCirclesMeetInSeq.test.ts`
(10 tests, red-verified — failed against the pre-implementation tree with
`circlesMeetInSeqCircleCenter is not a function` / wrong render-kind, then
green after implementing), pinning per-te checkpoints against hand-derived
source expectations plus the params JSON directly, the new
`frontierTransitionRenderKind` case, and an `applyBattleTransitionOverlay`
no-op-before-creation + deterministic-after smoke check. Landed **unwired**
per this slice's scope (S3 wires the brain room's `transitionPresentation`;
`battleRoom.ts`/`factoryRoundBattleOrchestrator.ts` untouched here), so
nothing in production yet constructs a presentation with `transitionId 38` —
confirmed by fresh guard reruns, all unmoved: gold-close 113/126,
silver-flicker 79/100, gold-pages 177/177. Full `npm test` (10021 passed),
`npm run build`, `npm run typecheck` all green;
`executableFrontierRatchet` barrier counts unmoved (no new barrier added).
