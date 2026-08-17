# Single-tick frame-index boundary family — dedicated probe

Read-only diagnostic (no src/tools/trace edits). Goal: determine the real
mechanism behind the four currently-open single-frame mismatches attributed
to the standing "single-tick frame-index boundary" label, and test whether
they share one mechanism or are independent.

## Correction to the assigned frame numbers first

The brief lists entrance-03's second member as local frame **508**. A fresh
`npm run compare -- factory-brain-silver-walkup-entrance-03-off --summary`
(run twice, byte-identical both times) shows **254/256** with mismatches at
frames **368 and 405**, not 368/508. `PROGRESS.md`'s own history confirms
this: entry 1302 (stale) says "entrance-03 frames 368/508"; entry 1303
(later, same day) already corrects this to "entrance-03 frames 368/405" — the
508 number is leftover from before a since-landed fix moved the second
residual. This probe diagnoses the trace's **actual current** residual pair,
368 and 405.

## Method

1. Fresh `npm run compare -- <trace> --summary` for both traces, then read
   the saved `oracle-*.png`/`app-*.png` pairs for each mismatched frame and
   its neighbors directly (pixel crops, per-tick numpy diffs: pixel count,
   bbox, color histograms).
2. A scratch instrumentation script (`tools/compare/out/scratch/instrument.ts`
   — **not committed**, `tools/compare/out/` is gitignored) replays each
   trace through the real engine (`createInitialState`/`tick` from
   `src/engine/core.ts`, the same `APP_STAGES`/`traceAdvances` machinery
   `tools/compare/appTrace.ts` uses) and prints `state.battleRoom`
   (phase/elapsed) plus the exact `historicElapsed`/`camPanY`/`nolandStep`/
   `entryStep` values the render call site (`battleRoomRender.ts`'s
   `renderBattleRoomBrainEntranceScene`) computes at each tick — the same
   formula, called directly, not reverse-engineered from pixels.
3. Classify each frame using the app's own live per-tick state, not guesses.

## Frame pair A: gold-open 58 & entrance-03 368

**Pixel evidence (identical in both traces byte-for-byte):** 156px diff,
bbox `129,38-142,54`, ssimMean 0.9955, ssimMin 0.0488. Neighbors (57/59 for
gold-open, 367/369 for entrance-03) are exact matches per the compare
summary. Direct crop of that bbox shows a single sprite — Noland — in a
"walk" pose (back-facing, frame 1) on both app and oracle at the frame
*before*, but the app has already switched to the "settled/face-west" pose
(frame 2) one tick before the oracle does; the oracle only switches at the
*next* frame, where the app is still showing frame 2 (matches again, hence
"self-healing").

**App-state cross-reference** (`instrument.ts` on both traces, identical
result at the frame-58/368-relative tick):

```
...57/367  elapsed=48 historicElapsed=69 camPanY=47 camPanY<WALK_PX=true  noland={frame:1,screenY:24}
58/368     elapsed=49 historicElapsed=70 camPanY=48 camPanY<WALK_PX=false noland={frame:2,screenY:24}
59/369     elapsed=50 historicElapsed=71 camPanY=49 camPanY<WALK_PX=false noland={frame:2,screenY:25}
```

`nolandStep` (`src/engine/battleRoom.ts:893`):

```ts
export function nolandStep(elapsed: number): NolandStep {
  const { camPanY, decoyFrame } = entryStep(elapsed);
  if (camPanY < NOLAND_WALK_PX) {                 // NOLAND_WALK_PX = 48
    return { frame: decoyFrame, hFlip: false, screenY: NOLAND_INITIAL_SCREEN_Y };
  }
  return { frame: 2, hFlip: false, screenY: NOLAND_INITIAL_SCREEN_Y + (camPanY - NOLAND_WALK_PX) };
}
```

`camPanY` reaches exactly `48` (`NOLAND_WALK_PX`) at this tick, and the
strict `<` flips the branch to the settled pose immediately — one tick
before the oracle's real walk-completion transition (the oracle still shows
the walk pose while `camPanY===48`, only settling once `camPanY` exceeds
48). This is a **fence-post in a picture-frame lookup table**, not a
trace/press-offset artifact: the whole scene (camera pan, background tiles,
every other sprite) is byte-exact at this tick; only Noland's own picture
frame is one tick premature.

**Classification: (b) render-clock/table boundary.** Table/mechanism:
`nolandStep`'s `camPanY < NOLAND_WALK_PX` branch condition
(`src/engine/battleRoom.ts:895`).

**Fix shape (not applied):** loosen the inequality by one tick so the walk
pose holds through `camPanY === NOLAND_WALK_PX` and only settles once it's
exceeded — `camPanY < NOLAND_WALK_PX` → `camPanY <= NOLAND_WALK_PX` (the
`else` branch's own `screenY` formula, `NOLAND_INITIAL_SCREEN_Y +
(camPanY - NOLAND_WALK_PX)`, stays correct unmodified since it already
evaluates to the flat `NOLAND_INITIAL_SCREEN_Y` at `camPanY === 
NOLAND_WALK_PX`). No other constant needs to move.

## Frame pair B: gold-open 95 & entrance-03 405

**Pixel evidence (identical in both traces byte-for-byte):** 822px diff,
bbox `18,35-221,119`, ssimMean 0.9688, ssimMin 0.2378. Neighbors (94/96 for
gold-open, 404/406 for entrance-03) are exact. The bbox spans all six
scientist sprites (two x-clusters, `18-29` and `210-221`, three
vertically-stacked scientists each). Color-histogram comparison of the
mismatched pixels shows the **same palette**, not a black overlay or fade
bug — it's a genuine picture-frame swap (the scientists' turn-in-place
animation's transient frame 8 vs. its settled frame 2), confirmed only by
cross-referencing live state (visually the two poses are similar enough
that eyeballing crops alone was inconclusive and initially misleading — the
instrumentation was decisive here, not the pixels alone).

**App-state cross-reference** (identical shape in both traces):

```
...94/404  phase=brainMoving  elapsed=85 historicElapsed=106 (scientistTurnFrame=8, transient)
95/405     phase=brainSettled elapsed=0  historicElapsed=108 (scientistTurnFrame=2, settled)  <- jumps 106->108, skips 107
96/406     phase=brainSettled elapsed=1  historicElapsed=108 (scientistTurnFrame=2, settled)
```

Root cause, read directly from `src/engine/battleRoom.ts` and
`battleRoomRender.ts`:

- The render call site computes `historicElapsed` during `"brainMoving"` as
  `(state.elapsed - 1) + BRAIN_MOVEMENT_CLOCK_OFFSET` (`battleRoomRender.ts:449-457`)
  — the `- 1` is a **later** fix (the B1c mid-ramp correction, documented in
  `battleRoom.ts`'s module doc directly above `nolandStep`) layered on top of
  the *original* clock.
- The **phase transition itself** (`"brainMoving"` → `"brainSettled"`,
  `battleRoom.ts:338-344`) still fires on the *original*, unshifted clock:
  `if (state.elapsed + 1 >= BRAIN_MOVEMENT_SETTLE_ELAPSED) transition`, with
  `BRAIN_MOVEMENT_SETTLE_ELAPSED = 86` derived (per its own doc comment,
  `battleRoom.ts:929`) as `scientistTurnFrame`'s own unshifted threshold
  (108) minus `BRAIN_MOVEMENT_CLOCK_OFFSET` (22) = 86 — a derivation that
  predates the B1c `-1` render fix and was never updated to account for it.
- Net effect: the transition fires when `state.elapsed` reaches 86, one tick
  before the render formula's own `historicElapsed` would naturally reach
  108 on its own (`86 - 1 + 22 = 107`, not 108). The render-side value at
  `state.elapsed=86` (had `"brainMoving"` still been in effect) would be
  107 — still `scientistTurnFrame`'s transient frame 8 — but that tick is
  never rendered as `"brainMoving"` at all; the reducer already jumped to
  `"brainSettled"`, which hardcodes `historicElapsed` to the clamped
  settled value (108) unconditionally. `historicElapsed` therefore skips
  107 outright, landing on the settled scientist pose one tick early.

**Classification: (b) render-clock boundary** — but the boundary lives in
the **phase-transition threshold**, not a per-tick table lookup:
`BRAIN_MOVEMENT_SETTLE_ELAPSED` (`src/engine/battleRoom.ts:930`), consumed
by the `"brainMoving"` case of the phase reducer
(`src/engine/battleRoom.ts:338-344`).

**Fix shape (not applied):** `BRAIN_MOVEMENT_SETTLE_ELAPSED` should be `87`,
not `86` — i.e. re-derive it as `108 - BRAIN_MOVEMENT_CLOCK_OFFSET + 1` (the
`+1` compensating for the render site's own `-1`), not `108 -
BRAIN_MOVEMENT_CLOCK_OFFSET`. This delays the `"brainMoving"` →
`"brainSettled"` transition by exactly one tick, letting `state.elapsed=86`
render once more inside `"brainMoving"` (historicElapsed 107, still the
transient scientist pose, matching oracle) before settling on the following
tick. No other constant moves: `scientistTurnFrame`'s own thresholds
(106/108) and the settled clamp (108) are already correct as originally
RAM-derived; only the transition's own trigger tick was never adjusted for
the later `-1` render fix.

## Explicit one-mechanism-or-not test

Cross-checked deliberately, not assumed:

- **58 ≡ 368**: same bbox, same pixel count, same SSIM, same app-state
  boundary (`nolandStep`'s `camPanY < NOLAND_WALK_PX`) at the tick where
  `camPanY` hits exactly 48 in both traces. **Same mechanism.**
- **95 ≡ 405**: same bbox, same pixel count, same SSIM, same app-state
  boundary (`BRAIN_MOVEMENT_SETTLE_ELAPSED`'s missing tick,
  `historicElapsed` skipping 106→108) in both traces. **Same mechanism.**
- **58/368 vs. 95/405**: different bbox, different pixel count/SSIM,
  different code location (a per-tick rendering-formula inequality vs. a
  state-machine phase-transition threshold), different affected sprites
  (Noland alone vs. all six scientists). **Not the same mechanism.**

Both pairs are still genuinely class (b) — a table/threshold-driven element
crossing to its next value exactly one tick before the oracle, with every
neighbor frame byte-exact — so the "single-tick frame-index boundary" genus
label is accurate as a *description*, but it is not one shared bug: it is
**two independent, single-constant boundary bugs**, each reproduced
identically across both traces because both traces replay the same shared
`brainMoving` walk-up sequence through the same two boundaries at their own
respective tick offsets.

## Verdict

- **Not one mechanism.** Two distinct, precisely located boundary bugs, each
  confirmed to affect exactly one frame pair (one member per trace):
  1. `nolandStep`'s `camPanY < NOLAND_WALK_PX` fence-post (gold-open 58,
     entrance-03 368) — fix: `<` → `<=`.
  2. `BRAIN_MOVEMENT_SETTLE_ELAPSED`'s stale derivation, missing the later
     `-1` render-site correction (gold-open 95, entrance-03 405) — fix:
     `86` → `87`.
- Neither is a trace-side press/wait artifact (class a) — the surrounding
  scene (camera pan, every other sprite, message box) is byte-exact at
  every one of these ticks; only the one table-driven element is off, and
  only by exactly one tick, self-healing immediately at the next frame.
- Both fixes are single-constant, mechanically clean, and were derived from
  the app's own live per-tick state, not fitted to the pixels after the
  fact. Neither was applied — this is a diagnosis-only probe per the step
  brief.
- All four originally-assigned frames are now fully diagnosed; nothing
  remains half-diagnosed.

## Notes / scratch

`tools/compare/out/scratch/instrument.ts` was used for the app-state
cross-reference above. `tools/compare/out/` is gitignored, so this file was
never staged or committed; it can be regenerated from this document's
excerpts if needed. No file under `src/`, `tools/` (outside the gitignored
scratch dir), `tools/compare/traces/`, or any doc other than this new file
was modified.

## RESOLVED (partial) — main worker, 2026-08-17

Applied verbatim per this probe's own fix shapes, verified one at a time as
instructed (not landed together blind):

- **Fix A landed, verified clean.** `nolandStep`'s `camPanY < NOLAND_WALK_PX`
  → `camPanY <= NOLAND_WALK_PX` (`src/engine/battleRoom.ts`). Red state was
  exactly {58, 95} (gold-open) / {368, 405} (entrance-03) as predicted;
  post-fix, exactly {95} / {405} remained — nothing else moved. Matches the
  probe's model precisely.
- **Fix B attempted, reverted — the probe's model was incomplete.**
  `BRAIN_MOVEMENT_SETTLE_ELAPSED` 86 → 87, applied exactly as prescribed.
  Result was **not** the predicted "only 95/405 fixed": gold-open regressed
  from 255/256 to **189/256** (new mismatches from frame 145 through 250+,
  the entire rest of the `brainSpeech` page-scroll window) and entrance-03
  regressed from 255/256 to **199/256** (new mismatches from frame 443
  onward, same shape). The probe correctly diagnosed *that* the transition
  fires one tick early and *why* (`historicElapsed` skips 106→108), but its
  fix shape treated the +1 as a local, contained correction. It is not
  local: delaying the `"brainMoving"` → `"brainSettled"` transition by one
  tick shifts every subsequent phase's own `elapsed` clock (brainSettled,
  brainSpeech, and its per-page scroll timing) by one tick for the rest of
  the sequence, since each phase's `elapsed` restarts at its own transition
  tick rather than tracking a global clock. The probe's own instrumentation
  only checked the single boundary tick, not the cascade forward through
  the rest of the window — the decisive negative the step brief anticipated
  ("if anything ELSE moved, stop and revert — the probe's model is wrong").
  Reverted cleanly (confirmed back to 255/256 / exactly {95} / {405} on
  both traces after revert). `BRAIN_MOVEMENT_SETTLE_ELAPSED` stays 86.
- **Net result:** gold-open 254/256 → **255/256** (frame 58 fixed, 95
  remains open), entrance-03 254/256 → **255/256** (frame 368 fixed, 405
  remains open). Guard matrix (gold-pages 177/177, silver box2 100/100,
  gold-close 113/126, entrance-02 256/256, callscene-01 131/131,
  callscene-02 199/199, B2 speech box0-held 39/39 / cry-held 74/74 /
  page8-held 39/39 / close-pause 28/28, askready 21/21, swapask-no 194/194)
  reverified unmoved. `npm test` 1065 files/10010 passed/223 skipped
  (unmoved), `npm run build` + `npm run typecheck` green, ratchet barrier
  counts unmoved. No Tier-1 test pins the exact `camPanY===48` boundary or
  a numeric `BRAIN_MOVEMENT_SETTLE_ELAPSED` value, so none needed updating.
- **Open remainder:** gold-open 95 / entrance-03 405 (the scientist
  turn-in-place settle) still needs a real fix. The root cause read (stale
  derivation predating the B1c `-1` render fix) still looks right; what's
  missing is a fix shape that corrects the *render-side* `historicElapsed`
  value read during the transition tick without moving the transition
  itself (and thus without re-basing every later phase's own clock) — e.g.
  a one-tick special case at the transition boundary, or decoupling
  `historicElapsed`'s computation from `state.elapsed`'s own phase-relative
  reset. Not attempted this step; left honestly open per the step brief's
  instruction not to improvise a third change.
