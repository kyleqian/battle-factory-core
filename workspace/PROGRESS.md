# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1289 — [main worker, 2026-08-16] **RECORD/RETIRE compare traces found + fixed a real brain-route bug (wrong re-ask prompt) — both close 178/178, 174/174; box-1 hold-boundary doc row pixel-corrected; call-scene 89/131 & 69/199 investigated, left unmoved**

- **State:** Landed and green. `npm test` **1045 files / 9950 passed /
  223 skipped**, `npm run build` + `npm run typecheck` green.
  Differential PASS (563/563 byte-identical, `--base 56ef0edf`).
  Committed at `6ab494fc`. **Note for the supervisor:** the wind-down
  gates in 1288 predate this step — re-run them at the next fold.
- **Did (goal 3, RECORD/RETIRE traces):** added
  `tools/compare/traces/factory-brain-silver-walkup-askready-menu-
  {record,retire}-off.json` (segments/captureFrames copied verbatim from
  the two banked read-only fixtures), replaying against the existing
  `...-askready-menu-open-off` stage. First runs surfaced a **real bug**,
  not just a timing residual: the RECORD/RETIRE re-ask (after a NO
  dismiss or a RECORD-YES-then-dismiss) unconditionally drew the
  ordinary route's short "The 2nd match is next!" prompt with its
  timing constants, even on the brain route, which has a different,
  longer `AskReadyForHead` prompt. Fixed in `postwin.ts`
  (`postwinQuestionReprintVisibleChars`/`Settled`/`MenuReady` +
  `advancePostwin`'s `reAskMenuReady` now select the right prompt/total
  per `state.frontierBrain` and re-derive settled/menu-ready delays from
  its own length, same `firstDelay+total-1[+4]` shape the ordinary
  constants were fit from — structural, not independently oracle-
  measured for this specific reprint) and `core.ts` (three `drawLines`
  call sites branch on `frontierBrain`). Both traces now close **full:
  178/178, 174/174** (was 0/178, 0/174 pre-fix).
- **Did (goal 2, doc correction):** `docs/walkup-call-scene-ground-
  truth.md`'s box-1 hold row ("850–893 Held — PNG-verified at 850"),
  flagged suspect by PROGRESS 1285 but never re-derived, was corrected
  via a fresh dense (stride-1) pixel probe of frames 815–905 (temp, not
  committed): the box is still mid-typewriter at 850 and only completes
  at 894, one frame before the already-known dismiss-A at 895. Dated
  correction note added inline; old value preserved in the note.
- **Did (goal 1, calibration — not closed):** investigated both
  fixtures' residuals with fresh dense oracle probes. Box-1's typewriter
  "drift" (callscene-01) and box-5's dismiss→menu handoff (callscene-02,
  the "biggest lever" the brief flagged) were both root-caused to
  specific oracle frames, but **two independent single-constant
  experiments regressed the fixtures badly** when tested live: shifting
  box-1's first-glyph delay by +1/+2 dropped callscene-01 from 89/131 to
  77/131 and 53/131 (a huge new 22%-diff region appeared past frame
  413); shifting box-5's dismiss edge by +1 dropped callscene-02 from
  69/199 to 44/199. Both regressions land past the point where the
  trace's own FIXED button-press timing lives — a shift that moves a
  ready-boundary across a fixed press edge triggers the documented
  input-swallow trap (a whole press cycle gets lost, not just the shifted
  span), so a naive single-constant fit makes things worse, not better.
  Both experiments were reverted; callscene-01/02 are **unmoved at
  89/131 and 69/199** (re-confirmed live this session) rather than risk
  landing a net-negative "fix." The precise oracle-frame evidence
  gathered this session (box-1: box reopens empty at 829, first glyph
  830, fully typed 894, dismiss 895 — all pixel-confirmed; box-5: app
  clears one tick before oracle at the box5→menu handoff) is recorded
  here for whoever picks this up next; it needs `core.ts`'s actual
  per-tick input-acceptance semantics understood before a safe fix,
  not just another constant guess.
- **Regression bars unmoved (all re-run live this session):**
  askready-menu **21/21**, swapask-no **194/194**, entrance-02
  **256/256**, silver reveal **690/701**, callscene-01 **89/131**,
  callscene-02 **69/199**. `executableFrontierRatchet.test.ts` barrier
  counts: unwidened. New coverage: `postwin.test.ts` (48 tests,
  unmodified, all still green — the reprint fix didn't touch any
  ordinary-route-tested behavior, confirmed by re-run).
- **Next:** call-scene calibration remains open — a future step should
  read `core.ts`'s actual button-accept tick semantics (not just
  `postwin.ts`'s state functions) before attempting another constant
  shift, given this session's two failed attempts. Otherwise the 1288
  queue's (b)/(c)/(e) items stand as before.
- **Notes:** Commits local only — pushing is Kyle's step. No PAPERCUT
  this session (tooling worked as documented throughout).

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
