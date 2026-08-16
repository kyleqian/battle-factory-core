# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 1282 — [main worker, 2026-08-16] **Walk-up build step A, Brief 2 LANDED: postwin.ts AskSwapBeforeHead short path + soak driver brain-branch recognition; found + cataloged an unrelated post-brain-win opponent-generation crash (#91)**

- **State:** `docs/walkup-step-a-design.md` Brief 2 is built: a brain
  postwin's `GO ON` now skips the three ordinary scouting pages, types
  the JSON-exact "I'm terribly sorry, but I can't tell you anything
  about the FACTORY HEAD." one-liner (`dialoguePage` 1), then jumps
  straight to the swap YES/NO prompt (`dialoguePage` 4) — closing the
  gap Brief 1 left open. Every pre-existing `postwin.test.ts` assertion
  passes unmodified, plus 4 new tests (47 total). Full `npm test`
  **1044 files / 9939 passed / 223 skipped**, `npm run build`, and
  `npm run typecheck` green. Differential PASS (563/563 byte-identical,
  `--base 74013f83`, the merge before this step's first change).
- **Did:** (1) `postwin.ts`: new `POSTWIN_BRAIN_CANT_TELL_TEXT`
  (pulled from `askSwapBeforeHead` in the walkup-script JSON, never
  retyped) plus a structural "+2-after-settle" accept-ready delay
  (same convention Brief 1's call-scene boxes already use, explicitly
  flagged evidence-aligned-not-calibrated per the brief — no dense
  pixel compare attempted). `postwinDialogueVisibleChars`/
  `postwinDialogueInputReady`/`acceptPostwinDialoguePage` gained a
  `frontierBrain && dialoguePage===1` branch; the jump target is
  `dialoguePage=4` instead of `+1`. Page 4 itself (swap offer text,
  cursor, decline, "Right this way") is reused byte-for-byte unchanged
  for both routes — verified (not assumed) the default-YES cursor and
  the DOWN-swallowed-while-settling gating already fall out correctly
  from the existing `swapCursorPos===null`/`postwinDialogueInputReady`
  idiom, no new gating code needed. (2) `core.ts`: the battle-win-
  completion trigger (which advances the round controller /
  orchestrator) now fires off `dialoguePage===1` for brain instead of
  `===3` — **a real functional fix**, not just rendering: unchanged,
  a brain round would never advance past its first postwin. Also fixed
  two render branches that would have shown the ORDINARY route's text
  during brain's dialoguePage-1 typing and the lingering-old-text
  window at the 1→4 transition. (3) `tools/soak/randomRoundSoakDriver.ts`
  (:665-714 region): the call-scene/one-liner surfaces get explicit
  soak-log labels (they already advanced correctly via the pre-existing
  generic `pressAdvance` fallback); the continuation-menu and swap-offer
  blocks were already brain-route-agnostic (shared machinery), confirmed
  by tracing, not assumed — only the log label gained a `brain ` prefix.
- **Soak evidence (short runs only, per the brief's own house rule —
  each ~2-3s via `runSeed` in a scratch vitest probe, not committed):**
  a `factoryRoundBattleOrchestrator` seeded with `factoryWinStreak: 20`
  (battleIndex 0 immediately silver-brain-eligible) won battle 0 under
  both `strong-route` and `winning` policy across several `rngValue`s,
  then drove the **entire call-scene (all 5 boxes) and the
  `AskReadyForHead` GO-ON-menu accept with zero issues** — confirming
  this step's own new code. Immediately after, a **pre-existing,
  unrelated engine bug** (now `ISSUES #91`) fires: `core.ts`'s
  `preGenerateFactoryRoundNextOpponent` seam (triggered every `GO ON`,
  unconditionally, to pre-generate the next opponent) throws
  `storedTrainerIds must contain the 1 prior battle selections` in
  `factoryTrainerSchedule.ts`, because a Frontier-Brain opponent
  generation never appends its own `storedTrainerIds` history entry.
  This blocks live-reaching `AskSwapBeforeHead`'s own one-liner content
  via a real soak win (it fires one tick before `dialoguePage` would
  advance to 1) — filed as `ISSUES #91` with full repro/root-cause,
  **not fixed** (out of scope: `factoryRoundBattleOrchestrator.ts`
  opponent-generation logic, not `postwin.ts`/soak-driver). The short
  path's own sequencing is still fully proven at the Tier-1 level
  (below), independent of this blocker.
- **Acceptance numbers:** 4 new Tier-1 tests in `postwin.test.ts` pin:
  the one-liner text against the JSON verbatim (incl. the shared swap-
  ask text, byte-identical between routes), the `dialoguePage` 1→4
  jump (skipping 2/3) with its input-gate boundary, the swap prompt's
  default-YES + input-gated-until-settled behavior converging into the
  unchanged decline/dismiss/handoff flow, and an explicit ordinary-
  route-unchanged (1→2→3→4) sanity check. Full `npm test`
  **1044/9939/223**; build + typecheck green; differential **PASS,
  563/563 byte-identical**. `executableFrontierRatchet.test.ts` barrier
  counts: **unwidened**.
- **Next:** `ISSUES #91` (post-brain-win `storedTrainerIds` fix, in
  `factoryRoundBattleOrchestrator.ts`/`factoryTrainerSchedule.ts` —
  blocks live soak reachability of `AskSwapBeforeHead`'s one-liner and
  any battle after a mid-round brain win); dense oracle calibration of
  step A's brain-specific timing once the side lane's fixtures are
  banked; the B1c mid-ramp pixel residual; gold entrance/speech.
- **Notes:** Commits local only — pushing is Kyle's step. PAPERCUT:
  the soak-driver reachability investigation (tracing exactly when
  `round.rules.currentOpponent` advances relative to the postwin flow)
  took a large share of this step's budget before an empirical probe
  settled it faster than the static source trace — worth remembering
  that `runSeed()` + a scratch vitest file is the fast path for this
  class of "what does the state machine actually do" question.

---
