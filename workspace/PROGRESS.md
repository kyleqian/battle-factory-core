# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1318 — [main worker, 2026-08-17] **ISSUES #96(a) fixed: swap-screen quit-return ball-slot-0 display stall — both player-quit traces 61/67 → 67/67, zero regressions across the 19-trace battle1-swap family**

- **State:** `src/engine/factorySwapPresentation.ts` +
  `tests/factorySwapPresentation.test.ts` edited (`bcab2e9e`). `npm test`
  **1,066 files / 10,031 passed (+1) / 223 skipped**, `npm run build`
  green, `tests/ballAnim.test.ts` (draft-screen checkpoints) green.
- **Did:** the diagnosed fix shape from 1317 (thread `i === 0` + a
  `confirmReveal.ts`-style `isRevealStallActive` analog) turned out
  **wrong on contact** — frame-by-frame oracle instrumentation (temp
  `console.error` at the `core.ts` call site, reverted) showed the 6
  mismatch frames (29774-94) sit inside `quitReturn` (the popup's close),
  not the `quitPrompt` shown-hold, and both draft's `i===0`/`!hasRested`
  formula and a popup-shown predicate regressed frames that were already
  exact when tried in isolation. The real boundary: ball slot 0's own
  `hasRested` latch flipping true while `phase === "quitReturn"` — every
  cmdIndex-transition frame from that latch onward needs slot 0 one tick
  further behind. Landed a narrowly-scoped
  `isFactorySwapQuitReturnSlot0StallActive(ballIndex, phase, hasRested)`
  predicate at the `factorySwapPresentation.ts:862` call site only
  (`isSlot0` stays `false`; only the `revealStallActive` arg is now
  per-ball and predicate-driven) — draft-screen call sites and
  `confirmReveal.ts` untouched, per scope.
- **Result:** `battle1-swap-player-quit-b-return.json` and
  `-no-return.json` both 61/67 → **67/67**. Full 19-trace
  `battle1-swap-*.json` family re-verified: every other trace unchanged
  from its 2026-08-17-supervisor baseline (`enemy-picker` still 129/130,
  correctly untouched — that's #96(b), separately scoped, out of this
  step). New Tier-1 test pins the predicate's exact semantics (quitReturn
  + slot 0 + post-latch → active; quitPrompt-shown, other slots, and
  ordinary picker ticks → inactive).
- **Docs:** `ISSUES.md` #96 trimmed to its still-open remainder — retitled
  to the `enemy-picker` 1-tick header-edge sliver only, part (a) deleted.
- **Next:** #96(b) enemy-picker sliver (RAM-probe the ONIX name-box border
  draw at frame 29838, per the trimmed #96 entry); #97-B turn5/6 bounce
  drift re-derivation; #71/#73-adjacent filler per standing priorities.
- **Notes:** the session's own worked example of why the contingency
  clause exists — a diagnosed "fix shape" from a read-only probe can still
  be wrong in the details; ground-truthing against fresh instrumentation
  before trusting it caught it before any regression landed.

---
## 1317 — [supervisor wind-down, 2026-08-17] **13 worker steps + 4 probes/audits, two lanes: EVERY open walk-up window closed to its full bar (6 windows to exact), #98 found→designed→CLOSED same-session, fixture-estate audit filed+fixed #96/#97 — all final gates green**

- **Final gates (tree `829b299b`, run independently AFTER the last merge):**
  full npm **1,066 files / 10,030 passed / 223 skipped**; `npm run build`
  green; soak vanilla 0:20 **20/20 OK**; soak full 0:60 **60/60 OK**
  (30+30). Fold status: animation-main and rust-main both EMPTY at orient
  AND at wind-down (no sibling sessions today). DEFERRED.md EMPTY. Only
  permanent worktrees remain; no orphan branches.
- **Window scoreboard (session start → end, all supervisor-verified
  live):** gold-pages 85/177 → **177/177**; callscene-02 171/199 →
  **199/199**; gold-open 254/256 → **256/256**; entrance-03 254/256 →
  **256/256**; gold-close 80/126 → **126/126**; NEW silver box-2 fixture
  → **100/100**; NEW gold close-edge → **54/54**; NEW silver cry-edge →
  **75/75**; NEW silver-flicker → **100/100**. Reveal canaries hold at
  the accepted #87 bar (690/701 ×2). The brain walk-up program is now
  pixel-exact at every fixtured window.
- **Mechanisms landed (all tier-general, no fitted constants):**
  later-`\p`/`\l` accept model (window's 2nd+ transition skips the
  cleared tick — closed gold 593/727 AND silver box-2 in one rule);
  real-close edge fix (mid-window box→box accept lands directly on the
  cleared-box tick, spurious 4-tick MSGBOX_HIDDEN wait removed — the
  read-only audit found the coverage hole, two dense edge fixtures
  proved the defect on both tiers); brainSettled render-clock −1
  (boundary family mech B) + nolandStep `<=` fence-post (mech A);
  per-tier transition te origins (gold waveform-derived re-base, silver
  = plain elapsed); **#98 end-to-end**: brain rooms never fired the
  transition RNG draw (phase-name mismatch) — S0 mGBA cross-check
  (gold→id 38 CIRCLES_MEET_IN_SEQ, silver→id 35 CIRCLES_CROSS, RAM-
  proven MATCH with the pixel IDs), S1+S2 renderers ported literally,
  S3 wiring via orchestrator-precomputed presentation (ordinary-path
  cursor untouched) — both windows closed, 2 latent S1 renderer bugs
  found at first pixel contact and fixed.
- **Fixture-estate work:** exhaustive 201-trace sweep
  (`docs/fixture-sweep-2026-08-17.md`) + b229076a baseline check proved
  ALL 26 deviations pre-existing (today: zero regressions). #96 filed →
  appRoute fix landed same-session (14/17 restored exactly; 3-trace
  remainder trimmed into #96). #97 filed → diagnosed: loss-terminal bar
  OBSOLETE (deliberate 2026-08-14 chaining), turn5/6 = real 1px
  menuIdleBounce drift, bisect executed and DISPROVED its good ref
  (range unbisectable; forward paths banked in #97-B). Soak coverage
  extended: vanilla 0:60, full 0:180, winning 0:180 all clean + 2×
  budget probe (no HANG masking).
- **Ops notes:** freshness-check false positive #4 at orient (8014 FAIL
  but all commits since service start are workspace-only — kept, no
  restart). One launcher killed by `| head -2` SIGPIPE (the documented
  masking trap — relaunched clean). S1∥S2 same-file parallel merge
  resolved both-sides-additive, union suite before merge commit.
- **Open (ordered for next session):** (a) #96 remainder now fully
  DIAGNOSED by a late read-only probe (bonus round): quit-pair = the
  swap screen's `advanceBallAnim` lag args hardcoded false at
  factorySwapPresentation.ts:868 (fix shape + non-cascading checks in
  the entry — a ready-made ~30-min fix brief); enemy-picker = separate
  1-tick header-edge sliver, next instrument named. (b) #97-B turn5/6
  bounce drift (re-derive against the CURRENT oracle per the banked
  forward path — regression framing is dead). (c) #71/#73-adjacent
  filler per standing priorities. No deferred questions; no blockers.

---

## 1316 — [main worker, 2026-08-17] **`docs/brain-transition-wiring-design.md` slice S3 landed: brain-room transition wiring — both target windows CLOSED (silver 100/100, gold 126/126); ISSUES #98 deleted**

- **State:** `src/engine/battleTransition.ts`, `battleScenario.ts`,
  `factoryRoundBattleOrchestrator.ts`, `battleRoom.ts`,
  `tools/compare/factoryRoundIntroGeneralizationStage.ts` edited; 3 test
  files gained/adjusted assertions. `npm test` **1066 files / 10030 passed
  / 223 skipped** (+9), `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` barrier counts unmoved.
- **Did:** Wired `generateOpponentFor`'s frontier-brain branch to call
  `selectFrontierTransition(generation.rngValue)` once and carry the result
  on `FactoryScheduledOpponentGeneration`/`BattleOpponent.frontierBrain`'s
  new `transitionPresentation` field; `battleRoomStateForOpponent`/
  `createBrainWalkupBattleRoomState` now set it on the constructed room at
  construction time (`opponentSetupExtraRngSteps` untouched — still 0 for
  every brain phase). Found and fixed 3 issues the wiring alone didn't
  cover: (1) the compare-tooling stage builders' own pinned dev seeds don't
  reproduce the oracle fixtures' real seed (no app-side seed-mapping
  exists), so the live draw picked the wrong family for both fixtures —
  fixed with a new `frontierTransitionPresentationForTableIndex` hand-
  derived override at the shared ready-state helpers, same idiom as
  `speechAcceptedFast`; (2) `CIRCLES_CROSS`'s renderer (landed unwired in
  S1, never real-pixel-tested until now) drew its edge circles from `te` 0,
  tens of ticks before the real game creates them — MEET was invisibly safe
  by off-screen geometry, CROSS's near-edge spawn position wasn't — fixed
  with a `te > CIRCLE_ANCHOR_TE` draw gate (dense-evidence-derived, strict
  `>`); (3) the fixed top/left/right paint order breaks once CROSS's top
  circle crosses below left/right in Y partway through its slide — fixed
  with a dynamic Y-ascending `slidingCirclePainterOrder`, shared by
  MEET/CROSS/MEET_IN_SEQ, both fixes empirically provably inert for MEET.
- **Result:** `factory-brain-silver-walkup-speech-flicker-off.json`
  79/100 → **100/100**; `factory-brain-gold-walkup-speech-close-off.json`
  113/126 → **126/126**. Full guard matrix unmoved (gold-pages 177/177,
  silver box-2 100/100, gold-open 256/256, entrance-02/03 256/256,
  callscene-01/02 131/131+199/199, gold close-edge 54/54, silver cry-edge
  75/75, silver close-pause 28/28, both named canaries
  battle7-noland-{,gold-}reveal-off 690/701). `ISSUES.md #98` deleted (both
  windows fully closed, no open remainder). Full detail in
  `docs/brain-transition-wiring-design.md` §8.
- **Next:** S4 (soak, supervisor-owned) should be a confirmation pass, not
  new work — this session's own full-suite/build/guard-matrix reruns
  already cover its acceptance surface. #96/#97 remain open, untouched.
- **Notes:** No PAPERCUT.

---
