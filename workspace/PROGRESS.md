# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1288 — [supervisor wind-down, 2026-08-16] **Walk-up step A BUILT + calibrated end-to-end, gold post-fix program executed (reveal 0/701→690/701, tier-aware 4-page speech), B1c cadence largely closed, #91 found+fixed — 12 worker steps, 2 lanes, all gates green**

- **State:** The 1279 queue is fully advanced on the fixed oracle
  (harness `3e29880b`, walkup staging + gold symbol flag — services
  verified current via `/v1/info` capability probe; the freshness
  check's FAIL was a timestamp false positive, PAPERCUTS hit 2).
  DEFERRED.md still EMPTY. Orient fold: animation-main (Pain Split
  190 exact + Yawn evidence) + rust-main (docs-only) → union gates
  npm 1,044/9,930/223, build, cargo 73 ok, wasm byte-identical
  `782c1b2a…`, forced-WASM 18/803.
- **Walk-up step A (design memo briefs 1+2 + calibration + movement):**
  postwin.ts brain branch — 5-box call-scene, AskReadyForHead (menu
  machinery reused, text-only divergence), AskSwapBeforeHead short
  path, soak-driver coverage, core.ts win-trigger fix (dialoguePage
  ===3 would stall brain rounds). Attendant walk-away/return movement
  rendered (measured boundaries + source pose cadence). Dense (vs the
  walkup fixtures banked this session): askready-menu **21/21**,
  swapask-no **194/194** EXACT; callscene-01 **89/131**, callscene-02
  **69/199** honest residuals (box-1 typewriter per-char drift,
  blink-cursor phase, page-turn delays — biggest lever callscene-02).
  RECORD/RETIRE menu windows banked (full-circle sha proof), corridor
  drift re-derived (attendant visible 432+, map doc §2 fixed).
- **B1c (queue (a)):** brainMoving cadence = ordinary ENTRY_STEPS
  rebased by a fixed 22-tick offset (fresh RAM probe; B1b's "not a
  shifted table" was wrong — the ordinary lead-in stall is a warp-fade
  artifact). Fixture 03 43→**162/256**; residual ~1px mid-ramp, RAM
  exact — next probe `gSpriteCoordOffsetY`/OAM latch. Fixture 02
  256/256 + all four B2 speech windows + reveal 690/701 unmoved.
- **Gold (queue (c), post-symbol-flag-fix reality):** ground truth
  REFRESHED (gold has its own 4-page speech, previously masked by the
  staging bug; escort text = silver's "Get a move on!" hold
  `7d806624…`; ready frame 1889→3370; pre-fix history preserved in the
  doc appendix). Reveal compare recalibrated (offset 2732, sha-search)
  + app-fixed **0/701 → 690/701** (= silver's precedent residual; the
  mechanism was the trace's A-press tick + missing gold ready-lag
  calibration, NOT a hold-duration constant). Gold 4-page speech wired
  tier-aware (`brainSpeechTier` + heard-flag tier fix), Tier-1 pinned;
  gold dense speech windows honestly bounded (58/256, 20/177, 58/126 —
  levers: park-phase alignment, generic msgbox close-wipe model,
  B1c-class entrance cadence).
- **#91 (found by M3's soak validation, FIXED by M6):** brain-win left
  storedTrainerIds one short for the NEXT generation. Source-proofed
  the ROM stores nothing for brain battles; fix folds the brain id into
  the next generation's input only — natural battleIndex-6 shape
  byte-identical (existing pin unchanged), staged/soak config fixed,
  new Tier-1 pin reproduces the pre-fix throw. ISSUES #91 removed.
  (Natural play cannot hit it: streak at round start ≡ 0 mod 7.)
- **Also:** parity-plan step 4 retired (satisfied by `3e29880b` —
  recorded in the plan doc); ROADMAP walk-up annotation updated;
  PAPERCUTS +2 (walkup input-swallow trap; freshness-check hit 2 with
  the `/v1/info` capability-probe workaround).
- **Wind-down gates (final tree `c2c5b898`+ledger):** full npm
  **1,045 files / 9,950 passed / 223 skipped**; build green; soak vanilla **20/20**; soak full 0:60
  **60/60**. (Cargo/wasm gates ran at the orient fold; no rust
  changes since — rust-main fully folded.)
- **Next (ordered):** (a) call-scene window calibration (typewriter
  drift + page-turn delays; also correct walkup-call-scene doc's box-1
  hold row — M7 found it wrong by pixel inspection); (b) gold speech
  dense closure (park-phase alignment + close-wipe model); (c) B1c
  ~1px mid-ramp latch probe; (d) RECORD/RETIRE app-side compare traces
  (fixtures banked, expected cheap); (e) wider winning-policy sweeps
  (skipped this session). **Fold at next orient: animation-main left
  unfolded (Heal Bell exact + census pin, ≥5 commits; the animation
  supervisor was LIVE at wind-down with a running worker — deliberate
  leave per protocol).** rust-main: nothing unfolded.
- **Notes:** No deferred questions (DEFERRED.md empty). Worker trap for
  next supervisor: a side-lane worker edited a MAIN-tree file via
  absolute path (S3, gold doc) leaving an uncommitted duplicate —
  check `git status` before merging side branches. Commits local only —
  pushing is Kyle's step.

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

