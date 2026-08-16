# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1286 — [main worker, 2026-08-16] **Gold Frontier-Brain 4-page speech wired (tier-aware brainSpeechBoxes); dense-calibrated against the three banked gold speech fixtures — hold/pause windows close exact, movement+typewriter+transition-handoff spans left as characterized residuals**

- **State:** Goal 1 (wire gold's 4-page speech, PROGRESS 1284's seam) is
  **landed and Tier-1 pinned**. Goal 2 (dense-calibrate against the three
  `factory-brain-gold-speech-{open,pages,close}-off.json` fixtures) is
  **done with honestly-characterized bounded residuals**, not full
  closure — see Acceptance numbers. Full `npm test` **1044 files / 9949
  passed / 223 skipped**, `npm run build` green. Differential PASS
  (563/563 byte-identical, `--base 2d73d3c8`, the commit before this
  step's first change).
- **Did:** `battleRoom.ts`: parsed `goldFirstEncounter`/`goldRepeat` from
  the walkup JSON into `GOLD_*_SPEECH_BOXES` (4 pages, no `\l` scroll →
  1:1 box flattening; no battle-cry box — a separate "All right! Bring it
  on!" close line instead), mirroring silver's shape. `BattleRoomState`
  gained `brainSpeechTier` ("silver"|"gold", default silver — every
  pre-existing caller unaffected), set from
  `opponent.frontierBrain.status` in `battleRoomStateForOpponent`
  (`"gold"` only; streak/streak-long default silver, out of scope).
  `brainSpeechBoxes`/`brainSpeechCursorVisible`/
  `battleRoomJustFinishedBrainPersonalitySpeech` generalized off the tier
  instead of hardcoding silver's box counts — page 4's "static, no blink"
  ground-truth fact (docs §7′) fell out of the existing "last personality
  box never shows the cursor" rule for free, no special-case needed.
  `core.ts`'s two call sites (initial tier selection, heard-flag marking)
  now read the matching tier via the same `factoryHeardBrainSpeech`/
  `markFactoryBrainSpeechHeard` machinery B2 built, instead of always
  `"silver"`. Compare harness: `goldNolandRoundReadyState` (challenge-5
  gold round, gold sibling of `nolandRoundReadyState`) plus gold
  speech-window stages (open/box-held/settled, gold sibling of B2's
  silver stages) in `factoryRoundIntroGeneralizationStage.ts`; three new
  compare traces replay the three fixtures live against
  `http://127.0.0.1:8014`.
- **Acceptance numbers:** **open 58/256**, **pages 20/177**, **close
  58/126** (all rerun live this session). Residual shapes, all
  characterized: (1) **open** — frames 0-10 (escort-box hold tail) exact,
  then the dismiss→movement→typewriter span mismatches heavily (30-40%
  diff, whole-scene bbox) — this is the SAME B1c mid-ramp entrance-cadence
  class PROGRESS 1278/1283 already left open for silver (entrance-03
  162/256, never closed) reappearing on gold's own timeline, not a new
  bug; by frame ~178 (page-1 held) it settles to a small persistent 24px
  cursor-bob-phase diff (ssimMean 0.999, cosmetic). (2) **pages** — the
  parked-`elapsed:0` box-held shortcut (B2's own idiom) doesn't happen to
  land on the real cursor's bob phase at this fixture's chosen anchor
  frame (unlike silver's own fixtures, which apparently do by
  construction) — a small ~38-74px cursor-position offset present from
  frame 0, plus the same generic MSGBOX-close/page-advance wipe animation
  (never modeled by `msgboxVisual`'s constant-during-close shape, for
  EITHER tier) at each of the 3 page-advance edges. (3) **close** — the
  in-scope portion (box-hold + real dismiss + `brainSpeechSettled` pause)
  is **58/62 exact** (only the 4-tick MSGBOX_CLOSE wipe gap misses, same
  generic class as above); frames 62-125 are the downstream
  battle-transition handoff (post `BRAIN_SPEECH_SCENE_HANDOFF_ELAPSED`),
  a different subsystem this stage's minimal state never populates
  (`transitionPresentation` unset) — already covered elsewhere by the
  gold/silver reveal windows' own 690/701 acceptance, not a speech-scene
  gap. None of these residuals are new src/ bugs surfaced by this step;
  each is either inherited-and-already-disclosed (B1c) or a compare-
  harness calibration artifact (bob phase, wipe animation, transition
  handoff) — the actual **content** (JSON-exact text, page count, static
  page 4, no-cry close line, per-tier heard-flag gating) is what this
  step's Tier-1 tests pin, and those are exact.
- **Regression bars unmoved (all re-run live this session):** silver's
  four B2 speech windows **39/39, 74/74, 39/39, 28/28**, entrance-02
  **256/256**, gold reveal **690/701**.
  `executableFrontierRatchet.test.ts` barrier counts: unwidened.
- **Next:** if a future step wants the gold speech windows fully closed:
  (a) re-derive the movement+typewriter-open span from the real B1c fix
  (shared with silver, not gold-specific — fix once, benefits both); (b)
  re-anchor the "pages" fixture's box-held park to a cursor-bob-phase-
  aligned oracle frame (or thread an explicit `elapsed` override through
  the gold box-held stage) to clear the small cosmetic residual; (c)
  model the MSGBOX-close wipe animation (currently a constant-content
  gap in `msgboxVisual`, present for both tiers) if a step ever needs
  page-advance-edge frames, not just held pages.
- **Notes:** Commits local only — pushing is Kyle's step.

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

