# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 1307 — [main worker, 2026-08-17] **Single-tick boundary family: Fix A landed (gold-open/entrance-03 both 255/256), Fix B reverted as a decisive negative — probe's fix shape was locally correct but globally wrong**

- **State:** Landed and green. `npm test` **1065 files / 10010 passed /
  223 skipped** (unmoved), `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` barrier counts unmoved.
- **Did:** Applied both fixes `docs/single-tick-boundary-family-probe.md`
  derived, verified one at a time per the step brief. **Fix A**
  (`nolandStep`'s `camPanY < NOLAND_WALK_PX` → `camPanY <=
  NOLAND_WALK_PX`, `src/engine/battleRoom.ts`): red state was exactly
  {58, 95} / {368, 405} as predicted; post-fix exactly {95} / {405}
  remained, nothing else moved — landed clean. **Fix B**
  (`BRAIN_MOVEMENT_SETTLE_ELAPSED` 86→87): applied verbatim, but instead
  of clearing 95/405 alone it regressed gold-open to 189/256 and
  entrance-03 to 199/256, with new mismatches cascading from frame 145 /
  443 through the rest of the `brainSpeech` window. The probe's root-
  cause read (the transition fires one tick early vs. the render site's
  own `-1`-shifted clock) was right, but its fix shape wasn't local:
  delaying the phase transition shifts every later phase's own `elapsed`
  clock by one tick too, since each phase counts elapsed from its own
  transition rather than a shared global clock. Reverted per the step
  brief's explicit instruction ("if anything ELSE moved, stop and
  revert — the probe's model is wrong, not a fixing opportunity");
  confirmed clean revert (back to 255/256 / exactly {95}/{405} both
  traces).
- **Result:** gold-open 254/256 → **255/256** (frame 58 closed, 95 open).
  entrance-03 254/256 → **255/256** (frame 368 closed, 405 open). Guard
  matrix reverified unmoved (fresh `--summary` reruns): gold-pages
  177/177, silver box2 100/100, gold-close 113/126, entrance-02 256/256,
  callscene-01 131/131, callscene-02 199/199, B2 speech box0-held 39/39 /
  cry-held 74/74 / page8-held 39/39 / close-pause 28/28, askready 21/21,
  swapask-no 194/194. No Tier-1 test pinned the exact `camPanY===48`
  boundary or a numeric `BRAIN_MOVEMENT_SETTLE_ELAPSED`, so none needed
  updating.
- **Next:** gold-open 95 / entrance-03 405 (scientist turn-in-place
  settle) still open — needs a fix shape that corrects the render-side
  `historicElapsed` at the transition tick without moving the transition
  itself (a one-tick special case, or decoupling `historicElapsed` from
  `state.elapsed`'s phase-relative reset), not attempted this step.
  Otherwise pick up 1306's remaining ordered list: (a) gold-close's
  113-125 circle-onset residual; (b) silver's unfixtured post-pause
  flicker window; (c) soak remainder (vanilla 20:60 + winning 0:10 at 2×
  maxFrames).
- **Notes:** Full negative-result writeup in
  `docs/single-tick-boundary-family-probe.md`'s new "RESOLVED (partial)"
  section. No PAPERCUT.
