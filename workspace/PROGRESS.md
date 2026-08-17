# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
- **Open (ordered for next session):** (a) #96 3-trace remainder
  (frames 29838/29774, shared narrow signature, pixel-first recipe in
  the entry); (b) #97-B turn5/6 bounce drift (re-derive against the
  CURRENT oracle per the banked forward path — regression framing is
  dead); (c) #71/#73-adjacent filler per standing priorities. No
  deferred questions; no blockers.

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
## 1315 — [main worker, 2026-08-17] **`docs/brain-transition-wiring-design.md` slice S1 landed: `B_TRANSITION_FRONTIER_CIRCLES_CROSS` renderer (id 35), unwired by design — guards unmoved, red-verified Tier-1 coverage**

- **State:** `src/engine/battleTransition.ts` +109/-12,
  `tests/battleTransition.test.ts` +67, `tests/battleTransitionFrontier.test.ts`
  +16. `npm test` **1065 files / 10019 passed** (+8, unmoved shape)
  **/ 223 skipped**, `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` barrier counts unmoved.
- **Did:** Per the design doc's S1 (§4, ~30-45 min slot): generalized
  `CIRCLE_SPECS`/`circleCenter` into per-family spec tables
  (`MEET_CIRCLE_SPECS`/`CROSS_CIRCLE_SPECS`, CROSS's own 3 rows from
  `transitionMeta.table[5].params.sprites`, `battle_transition_frontier.c:
  459-467`), registered `transitionId === 35 → "circlesCross"` in
  `frontierTransitionRenderKind`, wired the new kind into
  `applyBattleTransitionOverlay`'s existing fixed-order draw path. One
  correction to the design doc's own "no new timing mechanism" framing:
  CROSS's left/right circles need `CreateSlidingLogoCircleSprite`'s
  `delayX`/`delayY` per-axis throttle (`SpriteCB_LogoCircleSlide`,
  MEET's own 3 circles are all `delay=(0,0)` so the original formula never
  needed it) — ported literally (`slideMoves`, cross-checked call-by-call
  against a Python port of the actual C algorithm, zero divergence) rather
  than hand-fit. `centerLogoEva`/`exitFadeY` gained a `"circlesCross"`
  branch (`CROSS_BLEND_START_TE`/`CROSS_EXIT_FADE_START_TE`, derived by
  reapplying MEET's own already-established "+1"/"+50" deltas — both from
  family-independent shared code — against CROSS's 38-tick slide instead
  of MEET's 48).
- **Result:** 8 new Tier-1 tests, **red-verified** (reverted the delay
  throttle, reran, exactly the 2 delay-dependent tests failed, confirming
  they're load-bearing before restoring). Acceptance run, all fresh/
  synchronous: `npm run compare -- factory-brain-silver-walkup-speech-
  flicker-off.json --summary` → **79/100, correctly unmoved** (S1 is
  UNWIRED by design — S3 threads the presentation through; confirmed by
  reading `core.ts:2528-2540` that `b.transitionPresentation` stays
  `undefined` for brain rooms today regardless of this slice). Guard
  matrix all unmoved: gold-close 113/126, silver-flicker 79/100,
  gold-pages 177/177, callscene-02 199/199, entrance-03 256/256.
  `npm run test:smoke` green (375/375). Full detail + evidence in
  `docs/brain-transition-wiring-design.md`'s new §6.
- **Next:** S2 (`CIRCLES_MEET_IN_SEQ` renderer, independent of S1) or S3
  (wire both — design doc §4's steps 1-2; S3's own partial-credit guard
  means it's safe to land now against just silver's window, with id 38
  falling through to the existing fallback until S2 also lands).
- **Notes:** No PAPERCUT.

---
