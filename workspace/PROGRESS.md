# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.


---
## 1310 — [main worker, 2026-08-17] **Silver's own `te` origin landed: flicker fixture 32→79/100 (ENTIRE gray-flicker span exact), circle-sprite onset residual documented for rung 2**

- **State:** Landed and green. `npm test` **1065 files / 10011 passed /
  223 skipped** (unmoved), `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` barrier counts unmoved.
- **Did:** Rung 1 of this step's brief. Implemented the verdict
  `docs/silver-flicker-evidence.md` banked last session (dense per-frame
  gray-flicker coefficient inversion over
  `factory-brain-silver-walkup-speech-flicker-off.json`, 100 stride-1
  frames): silver's true transition `te` is `b.elapsed` **directly**, no
  re-basing at all — NOT a `+0`-coefficient instance of gold's own §8″
  `MSGBOX_CLOSE_TICKS + frontierTransitionFlickerStartTe` correction
  (silver's pause happens to equal `FLICKER_START_TE`, so gold's
  closing-lag term has nothing left to compensate for). Restructured
  `renderBattleRoomState`'s (`src/engine/core.ts`) single
  `(tier === "gold" ? goldRebaseTe : 0)` ternary into an honest per-tier
  branch: gold keeps §8″'s formula unchanged, silver takes `b.elapsed`
  bare. Docs extended: `docs/noland-brain-intro-gold-ground-truth.md` new
  §8‴, `docs/silver-flicker-evidence.md` new "Landed" section — both cite
  the banked evidence and the exact result.
- **Result:** `factory-brain-silver-walkup-speech-flicker-off.json`
  **32/100 → 79/100** — frames 0–78 exact, the ENTIRE gray-flicker span
  (elapsed 28–75) with zero mismatches, matching the required acceptance
  bar. Mismatches resume at frame 79 (elapsed 79, one tick past
  `CIRCLE_ANCHOR_TE=78`) through frame 99 — the circle-sprite build
  region, the same distinct second mechanism as gold's own unfixed
  113–125 residual (§8″), not this fix's bug; that's rung 2's mechanism,
  not attempted this step (ran out of budget after landing rung 1 +
  docs; see Next). Guard matrix reverified unmoved (fresh `--summary`
  reruns): gold-pages 177/177, silver box-2 100/100, gold-open 256/256,
  entrance-03 256/256, entrance-02 256/256, callscene-01 131/131,
  callscene-02 199/199, gold close-edge 54/54, silver cry-edge 75/75, B2
  box0-held 39/39 / cry-held 74/74 / page8-held 39/39 / close-pause
  28/28, askready 21/21, gold-close 113/126 (unmoved, its own residual
  untouched by this step).
- **Next:** Rung 2 (circle-sprite onset unification) — gold-close
  113–125 and silver-flicker 79–99 are the same mechanism on different
  tiers; cross-check whether both show the same onset delta on their own
  verified `te` clocks (gold: real onset later than
  `CIRCLE_ANCHOR_TE=78`, exact tick TBD from a fresh per-frame circle-
  pixel probe of the banked gold §8″ PNGs; silver: raw-pixel bottom-row
  probe in `silver-flicker-evidence.md` item (c) already puts onset at
  elapsed 80, close to on-time, but top-row onset was never observed in
  the banked 100-frame window). If both tiers share one onset delta, fix
  the shared `CIRCLE_ANCHOR_TE`-relative anchor once; if not, land only
  whichever piece is itself tier-safe (silver-flicker fixture is the
  regression canary) or document the split precisely.
- **Notes:** No blind offset sweep attempted — §8′/§8″'s own two-failed-
  realignment history is binding precedent, and this step's own dense
  evidence (banked last session, implemented this session) is what made
  rung 1 a clean derivation rather than a fit. No PAPERCUT.

---
## 1309 — [main worker, 2026-08-17] **brainSpeech REAL-CLOSE edge FIXED, both tiers: gold close-edge 28/54→54/54, silver cry-edge 13/75→75/75 — MSGBOX_HIDDEN 4-tick wait was never real, oracle shows one cleared-border tick and lands straight on it**

- **State:** Landed and green. `npm test` **1065 files / 10011 passed /
  223 skipped** (unmoved), `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` barrier counts unmoved.
- **Did:** Fixed the edge two dense fixtures banked last step
  (`docs/speech-close-edge-evidence.md` gold 28/54,
  `docs/speech-close-edge-silver-evidence.md` silver 13/75) proved: leaving
  the last personality box for the close/cry box, the oracle shows exactly
  ONE cleared-border tick then prints immediately - the app instead ran
  `brainSpeechClosing`'s `MSGBOX_HIDDEN` wait for `MSGBOX_CLOSE_TICKS` (4)
  ticks (box fully absent) before reopening, printing 4 ticks late.
  `battleRoomAcceptedState` (`battleRoom.ts`) now takes its direct
  `elapsed: 0` branch for ANY next box, not only personality-to-personality
  continuations - the real close+reopen lands straight on "brainSpeech"
  cleared (chars 0) on the accept tick itself, `speechAcceptedFast: false`
  (slow model, same shape as the window's first transition). Only the
  window's FINAL box (close/cry box's own dismiss, no next box left) still
  takes the real `brainSpeechClosing`/`MSGBOX_CLOSE_TICKS` path -
  `advanceBattleRoom`'s own real-close-reopen branch there was dead code
  post-fix, removed. `battleRoomJustFinishedBrainPersonalitySpeech` (the
  heard-speech flag's detector) and its `core.ts` call site moved from an
  `advanceBattleRoom` tick inside `brainSpeechClosing` to the
  `battleRoomAcceptedState` accept branch, since that's now where the
  transition it detects actually happens.
- **Result:** gold close-edge (`factory-brain-gold-walkup-speech-close-edge-off.json`)
  **28/54 → 54/54**; silver cry-edge
  (`factory-brain-silver-walkup-speech-cry-edge-off.json`) **13/75 → 75/75**.
  Guard matrix reverified unmoved (fresh `--summary` reruns): gold-pages
  177/177, silver box-2 100/100, gold-open 256/256, entrance-03 256/256,
  gold-close 113/126, entrance-02 256/256, callscene-01 131/131,
  callscene-02 199/199, B2 speech box0-held 39/39 / cry-held 74/74 /
  page8-held 39/39 / close-pause 28/28, askready 21/21. `speechAcceptedFast`
  field doc, `battleRoomAcceptedState`'s own doc, and the falsified
  `battleRoom.ts` comment (the deleted branch that cited the gold-close
  guard as "confirming" this edge, which that guard's own fixture never
  actually drove) all corrected/removed - see `docs/speech-close-edge-
  evidence.md` §6 for the citation-correction note. `tests/
  battleRoomBrainSpeech.test.ts` updated (red-verified against the pre-fix
  code by construction - old code routed every box boundary through
  `brainSpeechClosing`, new code only for the window's final box; old→new
  stated in the commit message).
- **Next:** Pick up 1306's remaining ordered list: (a) gold-close's 113-125
  circle-onset residual; (b) silver's unfixtured post-pause flicker window;
  (c) soak remainder (vanilla 20:60 + winning 0:10 at 2× maxFrames).
- **Notes:** Live-route cascade analyzed, not fixture-verified (both new
  edge fixtures stop ~15 ticks past the close/cry box's own settle, short of
  a full route to battle-start): the fix is a pure removal of the app's
  prior 4-tick-late start on this box, so every downstream state in a
  played-through route now arrives exactly 4 ticks earlier in absolute
  frame-time, matching the oracle - no other span's own duration changed,
  full derivation in `docs/speech-close-edge-evidence.md` §6's own
  "Live-route cascade" paragraph. No PAPERCUT.

---
## 1308 — [main worker, 2026-08-17] **Single-tick boundary family CLOSED: gold-open 256/256, entrance-03 256/256 — local render-side one-tick lag at the brainSettled transition, no state-machine timing moved**

- **State:** Landed and green. `npm test` **1065 files / 10011 passed /
  223 skipped** (+1 new test), `npm run build` + `npm run typecheck`
  green, `executableFrontierRatchet` barrier counts unmoved.
- **Did:** Closed 1307's open remainder (pair B: gold-open 95 /
  entrance-03 405, the scientist turn-in-place settle). Instrumented
  first (`entryStep`/`nolandStep`/`scientistTurnFrame` at historicElapsed
  106/107/108 via a direct node import — no scratch file needed): the
  first two are already saturated/identical at 107 vs 108, only
  `scientistTurnFrame` changes (frame 8 transient vs frame 2 settled),
  proving any fix touching only that boundary tick is provably surgical.
  Implemented shape (a) from the step brief: `battleRoomRender.ts`'s
  `renderBattleRoomBrainEntranceScene` now special-cases
  `state.phase === "brainSettled" && state.elapsed === 0` (the transition
  tick's own first render, and only that tick) to feed
  `BRAIN_MOVEMENT_SETTLE_ELAPSED - 1` instead of the general settled
  clamp — mirroring `brainMoving`'s own pre-existing `-1` render-lag
  convention (B1c). `BRAIN_MOVEMENT_SETTLE_ELAPSED` (86) and the
  `"brainMoving"`→`"brainSettled"` transition tick itself were **not**
  touched, unlike the reverted Fix B attempt.
- **Result:** gold-open 255/256 → **256/256** (frame 95 closed).
  entrance-03 255/256 → **256/256** (frame 405 closed). Guard matrix
  reverified unmoved (fresh `--summary` reruns): gold-pages 177/177,
  silver box-2 100/100, gold-close 113/126, entrance-02 256/256,
  callscene-01 131/131, callscene-02 199/199, B2 speech box0-held 39/39 /
  cry-held 74/74 / page8-held 39/39 / close-pause 28/28 — confirms the
  fix's locality empirically (nothing in the downstream `brainSpeech`
  window moved, unlike Fix B's cascade).
- **Next:** Single-tick boundary family fully closed, nothing left open
  from it. Pick up 1306's remaining ordered list: (a) gold-close's
  113-125 circle-onset residual; (b) silver's unfixtured post-pause
  flicker window; (c) soak remainder (vanilla 20:60 + winning 0:10 at 2×
  maxFrames).
- **Notes:** Full derivation in `docs/single-tick-boundary-family-probe.md`'s
  new "RESOLVED (full)" section. Tier-1 test added and red-verified
  against the pre-fix code (`tests/battleRoomBrainEntrance.test.ts`):
  renders the last `brainMoving` tick + `brainSettled` ticks 0/1 to
  framebuffers, asserts tick 0 matches the last moving tick and tick 1
  differs. No PAPERCUT.
