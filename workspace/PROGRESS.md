# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1287 — [main worker, 2026-08-16] **ISSUES #91 fixed: brain-win opponent generation no longer leaves storedTrainerIds one entry short**

- **State:** Landed and green. `npm test` **1045 files / 9950 passed /
  223 skipped**, `npm run build` green.
- **Did:** Source check first (`reference/pokeemerald`): the ROM writes
  `gSaveBlock2Ptr->frontier.trainerIds` only from `GenerateOpponentMons`
  (`battle_factory.c:303-330`), and the pre-battle-room script never
  calls it for a Frontier Brain battle — `frontier_getbrainstatus`
  (`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:80-81`) jumps
  straight to `AskReadyForHead`, bypassing `AskSwapMon`'s
  `factory_generateopponentmons` call (scripts.inc:137-138) entirely; the
  brain's own party builder `FillFactoryBrainParty`
  (`battle_factory.c:759-822`) never touches the array either. Since the
  brain is always the round's 7th and final battle in natural play, this
  is genuinely a "the ROM stores nothing" case (option 2 of the brief) —
  confirmed, not guessed. Fix: added
  `storedTrainerIdsForNextGeneration()` (`factoryRoundBattleOrchestrator.ts`,
  after `generateOpponentFor`) that folds the brain's own `trainerId`
  (`TRAINER_FRONTIER_BRAIN` = 1022, verified never overlapping the
  ordinary 0-299 id range) into the **next** battle's generation input
  only — never into the brain's own scheduled `storedTrainerIds` — so the
  natural battleIndex-6 shape stays byte-identical (proven: the existing
  `factoryBrainRoundShape.test.ts` pins that exact field and needed zero
  changes). Both call sites that read `previous.storedTrainerIds` for the
  next generation (`adoptNextOpponentOrGenerate`, and
  `advanceFactoryRoundPresentation`'s simplified-round fallback) now go
  through the helper. Pure array composition — no RNG port/draw call
  added or touched on any path (confirmed by inspection: the diff never
  references `rngPort`/`draw`/`rngValue` construction, only the
  already-computed `storedTrainerIds`/`trainerId` fields).
- **Pin:** new `tests/factoryBrainWinOpponentHistory.test.ts` — builds
  the exact #91 repro (`factoryWinStreak: 20`, brain silver-eligible at
  battleIndex 0), wins it, drives `preGenerateFactoryRoundNextOpponent`
  (previously threw `storedTrainerIds must contain the 1 prior battle
  selections`; verified by re-running the test against the pre-fix tree
  via `git stash`), asserts the ordinary battleIndex-1 generation's
  `storedTrainerIds` is `[TRAINER_FRONTIER_BRAIN, <drawn id>]`, and
  confirms the round actually continues to battleIndex 1. Natural shape
  (brain at battleIndex 6 still terminates the round unchanged) is
  covered by the pre-existing, **unmodified** `factoryBrainRoundShape.test.ts`
  — re-ran green this session, not touched by the fix.
- **Soak slice:** `node --experimental-strip-types <ad-hoc script using
  tools/soak/randomRoundSoakDriver.ts's runSeed with factoryWinStreak: 20,
  testPolicy: "strong-route", stopAtFirstRoundDecision: true>` — 7 of 10
  tried orchestrator `rngValue`s reach `roundComplete` (full 7-battle win
  including the brain-then-continue path) with zero engine crash; the
  other 3 lose battle 1 outright (a real brain-battle loss, unrelated to
  this fix). No standing script committed (ad hoc, out of scope per the
  brief's "no wide soak sweep").
- **Regression check:** `factoryBrainRoundShape.test.ts`,
  `factoryRoundBattleOrchestrator.test.ts`, `factoryRoundChaining.test.ts`,
  `factoryOpponentGeneration.test.ts`, `factoryTrainerSchedule.test.ts` —
  all unmodified, all green. `executableFrontierRatchet.test.ts` barrier
  counts unwidened.
- **Next:** resume the walk-up build step A track (ISSUES #91 was
  blocking `AskSwapBeforeHead`'s live-reach through the soak driver past
  a brain win — that path should now be reachable) or continue gold
  speech dense-calibration residuals per PROGRESS-archive 1286.
- **Notes:** none. No PAPERCUT this session.

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
