# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1285 — [main worker, 2026-08-16] **Call-scene attendant walk-away/walk-back rendered (MEASURED movement model); callscene-01 45/131 → 89/131, callscene-02 40/199 → 69/199 — remaining residual is unrelated pre-existing typewriter/menu-approach timing**

- **State:** `postwin.ts`'s brain call scene renders the attendant's
  walk-away (box 1→2, `Movement_AttendantMoveToReceiveCall`) and
  walk-back (box 2→3, `Movement_AttendantReturnToPlayer`) instead of an
  instant box-to-box cut — the residual PROGRESS 1283 left open. Full
  `npm test` **1044 files / 9940 passed / 223 skipped**, `npm run build`
  green. Differential PASS (563/563 byte-identical, `--base 704e685a`,
  the commit before this step). Committed at `5dcff9fd`.
- **Did:** Pixel-probed the attendant's own hair-color marker frame by
  frame against dense (stride-1) re-fetches of both committed fixtures
  (not the ground-truth doc's own coarser per-box table, which folds the
  pre-movement hold into the same row) to get exact tick boundaries:
  away — dismiss-A registers oracle frame 895, attendant still at rest
  through 902 (8-tick closemessage/task-dispatch lead-in, MEASURED),
  then 1px/tick left through 950 (3 tiles = 48px), holding at −48; back
  — dismiss-A at 1037, attendant moves the SAME tick (0-tick lead-in,
  MEASURED), 1px/tick right through 1084, home. Walk pose cycles
  frame 7/2/8/2 every 8 ticks, source-derived from
  `object_event_anims.h`'s `sAnim_GoWest`/`sAnim_GoEast` (GoEast is the
  same table `hFlip`d). `postwin.ts`: box 1/2 dismissal now arms a
  `callScenePendingElapsed` (deferred bump, mirroring box 1's own
  `healDismissElapsed`-armed activation) instead of bumping the page
  instantly — the OLD box stays rendered (already fully typed) through
  the lead-in, then hides for the walk + a short MEASURED box-reopen lag
  (3 ticks after the away leg, 4 after the back leg — both boxes
  `closemessage`d before their `applymovement`, unlike every other box
  turn in this file, which reuses an already-open box). `core.ts`/
  `prebattleRoomRender.ts`: `renderPrebattleRoomSceneWithAttendantOffset`
  (new) draws the attendant at a signed px offset with `hFlip` support
  (added to `drawNpcFrame`), replacing the always-rest `renderPrebattle
  RoomScene` call in the counter-room render path.
- **Acceptance numbers:** callscene-01 **45/131 → 89/131**, callscene-02
  **40/199 → 69/199** acceptance-grade frames exact. Remaining residual
  (both fixtures) is **not movement**: (a) box 1's own typewriter cadence
  has small pre-existing per-character timing drift (≤50px diffs, present
  in the pre-this-step baseline too, oracle frames ~828-892 — box 1
  visibly keeps printing past the ground-truth doc's own claimed "850
  held" boundary, a doc/reality mismatch worth a future note); (b) a
  9-frame blink-cursor phase offset during the held boss-message pages;
  (c) a large late-window mismatch approaching the menu-open transition
  (oracle ~1439+, callscene-02 only) — the boss-message page-turn/menu
  delays were flagged "structural, not oracle-measured" since Brief 1
  landed (PROGRESS 1281) and are unchanged this session. None of these
  are new; all pre-date this step's diff (confirmed via the differential
  PASS covering unrelated routes, and by re-diffing the same frame
  ranges before/after this session's changes).
- **Regression bars unmoved (all re-run live this session):** askready-
  menu **21/21**, swapask-no **194/194**, entrance-02 **256/256**,
  entrance-03 **162/256**, all four B2 speech windows **39/39, 74/74,
  39/39, 28/28**, reveal **690/701**. `executableFrontierRatchet.test.ts`
  barrier counts: unwidened. New Tier-1 pin: one test in
  `tests/postwin.test.ts` exercises the full movement model (lead-in,
  per-tick dx/pose, hold, reopen lag, both legs) against the MEASURED
  tick values above; the pre-existing box-by-box test updated for the
  new deferred-bump shape (boxes 1/2 gated, 3/4 still instant).
- **Next:** the box 1 typewriter drift (a) and blink-cursor phase (b)
  above, if a future step wants callscene-01/02 fully closed; the
  boss-message page-turn/menu-approach constants (c) need their own
  dense calibration pass (never done since Brief 1, per that step's own
  disclosure) — likely the bigger lever on callscene-02's count. Stretch
  item 5 (menu-record/menu-retire compare traces) not attempted — no
  time left after the movement work.
- **Notes:** Commits local only — pushing is Kyle's step. PAPERCUT: the
  ground-truth doc's own table row ("850–893 Held — PNG-verified at
  850") does not match direct pixel inspection (text is still mid-type
  at 850, continuing to ~894) — cost time to notice via a fresh dense
  pixel probe before trusting the doc's coarser table for tick
  boundaries; worth a doc correction in a future session. Building the
  movement model required fetching non-committed dense (stride-1)
  battle-lab re-runs of the two fixtures directly (temp files under
  `/tmp`, not committed) to get per-tick sprite position — the committed
  fixtures' own capture lists are stride-2 in the movement span, enough
  for compare acceptance but not enough to derive the movement model
  from alone.

---

## 1284 — [main worker, 2026-08-16] **Gold Frontier-Brain reveal hold fixed (334/701 → 690/701, parity with silver); speech wiring (goal 2) not started — out of time this session**

- **State:** Goal 1 of this step's brief (pic-reveal hold fix) is
  **landed and green**. Goal 2 (wire gold's 4-page speech into
  `battleRoom.ts`) and goal 3 (stretch dense calibration) were **not
  started** — the goal-1 root cause took the whole session to pin down
  correctly (see Did). `npm test` **1044 files / 9939 passed / 223
  skipped**, `npm run build` green, differential PASS (563/563
  byte-identical, `--base 2cf29e81`, the merge before this step's first
  change). Committed at `2790e02b`.
- **Did:** The "~142f hold" in the brief's framing turned out to be
  **emergent, not a hardcoded duration** — the gold pic-reveal box
  (`FACTORY HEAD NOLAND would like to battle!♥`) is a genuine
  PAUSE_UNTIL_PRESS wait (confirmed by `docs/battle-bringup-notes.md`'s
  existing Destin evidence), so its on-screen length is purely a
  function of *when* the A-press arrives — both in the app (from the
  compare trace's scripted `segments`) and in the oracle (from the
  battle-lab's internal `prepare()` auto-navigator, whose own press
  timing shifted once `3e29880b` shortened gold's walk-up). Root cause
  was two independently-stale calibrations, not one: (1) the compare
  trace's own A-press position (`tools/compare/traces/factory-round-
  battle7-noland-gold-reveal-off.json`) was tuned against the *old*
  oracle's later transition and needed to move earlier — re-derived by
  the same exhaustive-search-over-candidates method §6′ used for the
  frame offset (tried every integer press tick 328-338 against the live
  oracle; 333 is a sharp, unique match-count peak, 334/701 → 663/701 on
  its own). (2) The later ready-lag boundary (ISSUES #87 option (c)'s
  class — the source-unpredictable switch-in/AI-ack span before the
  action menu reads ready) had **no gold-specific calibration at all**,
  only silver's `MEASURED_SILVER_BRAIN_REVEAL_READY_LAG_OFFSET`.
  `FactoryBattleStartIntroState` gained a parallel `isGoldBrainReveal`
  flag (keyed off `frontierBrain.status === "gold"`, same route-level-
  fact convention as `isSilverBrainReveal`, wired in
  `factoryRoundBattleOrchestrator.ts`'s `beginFactoryRoundBattleStartIntro`)
  and `battleScene.ts` gained `MEASURED_GOLD_BRAIN_REVEAL_READY_LAG_OFFSET`,
  same search method, independently derived: **7** (not silver's 9 —
  different lead-species cry duration, as expected). Updated the one
  pre-existing test that pinned the *bug* as correct behavior
  (`tests/factoryRoundIntroGeneralization.test.ts`'s ISSUES #87 test
  previously asserted gold was permanently unaffected by any offset;
  rewritten to pin both flags' independent, correctly-keyed offsets and
  their non-interference).
- **Acceptance numbers:** gold reveal **334/701 → 690/701** — frame-for-
  frame identical residual *count* to silver's own already-accepted
  baseline (silver unmoved at 690/701, confirmed re-run). Residual
  shape: frames 334-336 (a 3-frame box-clear-transition lag, same
  1287px/bbox regardless of press tick tried — looks like a small fixed
  rendering lag distinct from the press-timing fix, not further chased
  this session) + frame 408 (16px, isolated) + frames ~654-660ish (the
  same render-drift shape silver's own `MEASURED_SILVER_..._OFFSET` doc
  comment already describes as untouched by any offset value). This is
  **more than "a single settled #87-class frame"** the brief flagged as
  the expected ceiling, but it exactly matches silver's own precedent
  count (11 residual frames each), so characterized as parity-with-
  silver rather than further investigated given the time this step's
  root-cause hunt already consumed — a legitimate stopping point per
  the brief's own "more frames means investigate" bar being read against
  silver's own accepted shape, not zero.
- **Regression bars unmoved (all re-run live this session):**
  entrance-02 **256/256**, entrance-03 **162/256** (known B1c residual),
  all four silver speech windows **39/39, 74/74, 39/39, 28/28**, silver
  reveal **690/701**. `executableFrontierRatchet.test.ts` barrier counts:
  unwidened.
- **Next:** Goal 2 (gold's 4-page speech wiring into `battleRoom.ts`,
  JSON-verbatim from `src/data/gen/factory-brain-walkup-script.json`, no
  battle-cry, Tier-1 pinned per `tests/battleRoomBrainSpeech.test.ts`'s
  idiom — `brainSpeechBoxes(state)` currently always returns
  `SILVER_FIRST_ENCOUNTER_SPEECH_BOXES` regardless of trainer identity,
  that's the seam) is the immediate next action, still first in the
  brief's own priority order. Goal 3 (dense gold-speech calibration
  against the three `factory-brain-gold-speech-*-off.json` fixtures) is
  stretch, after goal 2. The 334-336 box-clear-transition residual and
  the ~654-660 ready-lag tail are both open, minor, not investigated
  further this session.
- **Notes:** Commits local only — pushing is Kyle's step. PAPERCUT: the
  brief's own framing ("find where the app derives the ~142f hold, fix
  it") suggested a single `src/` constant; the actual mechanism was a
  PAUSE_UNTIL_PRESS wait whose apparent "duration" is an artifact of
  *when* a scripted A-press lands on both sides, not a duration formula
  — cost real time (most of the session) to establish via direct PNG
  inspection (`app-NNNNN.png` vs `oracle-NNNNN.png` at the first
  mismatch frame) before the fix location became obvious. Worth
  remembering for future PAUSE_UNTIL_PRESS-adjacent bugs: check whether
  the compare trace's own button schedule is stale before assuming a
  `src/` duration constant is wrong.

---

## 1283 — [main worker, 2026-08-16] **Walk-up step A dense calibration: app-side postwin brain compare harness built, 2/4 fixture windows close exact; call-scene windows leave an honest attendant-movement residual**

- **State:** `tools/compare/factoryRoundIntroGeneralizationStage.ts` gains
  two new postwin stages (idiom: B1b's room-entrance stage) and four
  committed compare traces replay the side lane's dense fixtures
  (`docs/walkup-call-scene-ground-truth.md`) live against
  `http://127.0.0.1:8014`. Full `npm test` **1044 files / 9939 passed /
  223 skipped**, `npm run build` green. Differential PASS (563/563
  byte-identical, `--base 1fd9b21c`, the commit before this step).
- **Did:** (1) `generatedRoundBattle7NolandPostwinCallSceneStartStage`
  parks `postwin` at `elapsed: POSTWIN_COUNTER_ROOM_FIRST_AGE` (115),
  `frontierBrain: true` — the first tick of the already-pinned
  counter-room fade-in, anchored to the doc's own first acceptance-grade
  pre-checkpoint frame (490), past its two documented staging-artifact
  fades. The anchor is corroborated, not fit: the shared
  `FADE_IN_TICKS`/`POSTWIN_HEAL_TEXT_FIRST_AGE` spacing already lands
  within one frame of the oracle's own measured 24-tick fade-to-first-
  glyph span, so no existing shared (Battle-1-pinned) constant moved.
  (2) `generatedRoundBattle7NolandPostwinAskReadyMenuOpenStage` parks
  `postwin` directly in the `AskReadyForHead` menu's held state
  (`callScenePage: 5`, `callSceneDismissElapsed: 0`, cursor on GO ON) —
  the post-checkpoint frame-0 anchor, sidestepping the call scene the
  same way B2's speech stages sidestep `brainMoving`. Found + fixed a
  real gap while building it: `renderPostwinState`'s `beforeContinuation`
  gate reads `healDismissElapsed`, not `callSceneDismissElapsed` — a
  hand-parked state needs both non-null or it silently renders nothing.
- **Acceptance numbers (live, this session):** `askready-menu-off`
  (window 2) **21/21 exact**; `swapask-no-off` (window 3) **194/194
  exact** — both closed on the first attempt once the menu-open anchor
  was fixed. `callscene-01-off`/`callscene-02-off` (window 1, the 5-box
  call scene): **45/131** and **40/199** acceptance-grade frames (the
  doc's own 13 pre-490 frames are staging artifacts, never chased, so
  144/199 total shrinks to 131 acceptance-grade for fixture 01). **Not
  closed — honest residual:** the attendant's walk-away/return movement
  (oracle frames 894–949, 1037–1084) has no rendered animation in the
  current model; `postwin.ts`'s own box-to-box transition is instant
  (`acceptPostwinCallScenePage` arms the next box's typewriter a few
  ticks later), matching this file's own prior disclosure that movement
  is "folded into the transition, not separately timed" — a missing
  render feature, not a mistunable constant, so left honest rather than
  fitted. Every captured frame before the first movement gap (heal fade/
  typewriter/held, box 1's own typed content) and the tail of each held
  box that survives past its own movement gap already matches; the
  gap itself and its immediate aftermath do not. The button-press
  schedule driving these two traces was derived directly from the doc's
  own measured transition frames (each box's own dismiss point), not
  independently oracle-probed for ITS OWN accept-ready boundary — same
  "generous margin, not a tight probe" caveat the doc's own window 3
  entry already discloses for its DOWN press.
- **Regression bars unmoved (all re-run live this session):**
  entrance-02 **256/256**, entrance-03 **162/256** (known B1c residual,
  unmoved), all four B2 speech windows **39/39, 74/74, 39/39, 28/28**,
  reveal **690/701**. `executableFrontierRatchet.test.ts` barrier counts:
  unwidened (no new `unsupportedBranch(...)` sites).
- **Next:** building attendant-movement rendering for the call scene (a
  real feature, not a calibration — likely the biggest remaining lever
  on window 1's two counts) if this step continues; `ISSUES #91`
  (post-brain-win `storedTrainerIds`, blocks live soak reachability); the
  B1c mid-ramp pixel residual; gold entrance/speech.
- **Notes:** Commits local only — pushing is Kyle's step. PAPERCUT: the
  `beforeContinuation`/`healDismissElapsed` render gate (see above) cost
  real time to find via a screenshot diff rather than reading — worth
  remembering that a hand-parked `PostwinState` must satisfy every field
  a render branch's `else if` chain reads, not just the ones a stage's
  own docstring names.

---

