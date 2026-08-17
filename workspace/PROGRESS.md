# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 1314 — [main worker, 2026-08-17] **#97-B bisect recipe executed: assumed-good ref `c5563c72` DISPROVED — bisect range `c5563c72..HEAD` is unbisectable (both endpoints identical), no code fix attempted**

- **State:** Docs-only (`ISSUES.md`, `PROGRESS.md`); no `src/` edit. `npm
  test` **1065 files / 10011 passed / 223 skipped** (unmoved), `npm run
  build` (includes typecheck) green, `executableFrontierRatchet` barrier
  counts unmoved. Isolated bisect worktree (`../bisect-97`) fully removed;
  no bisect state left anywhere (`git bisect` was never even started —
  the recipe's own pre-flight check failed first); no temp branch created.
- **Did:** Followed `ISSUES.md #97-B`'s banked recipe exactly: isolated
  worktree at `c5563c72` (sibling of `workspace/`, `reference/pokeemerald`
  symlinked to the vendor checkout, `npm install`), then — per the
  recipe's own flagged caveat — manually confirmed the assumed-good ref
  **before** trusting the automated `git bisect run`. It failed: at
  `c5563c72`, `turn5-action-off` scores **1/32** (first mismatch frame
  5927, `bbox=127,74-229,110`) and `turn6-reopen-off` scores **11/46**
  (first mismatch frame 7305, `bbox=44,49-99,110`) — byte-for-byte
  identical to the HEAD symptom this bisect was meant to explain. Ruled
  out artifacts before accepting that: control trace `turn5-reset-off`
  still 256/256 at `c5563c72` (tooling/oracle not broadly broken); both
  trace fixtures byte-identical between `c5563c72` and HEAD; the compare
  harness renders the app in-process from the checked-out commit itself,
  no dev server involved; the ROM (built 2026-07-16) and canonical save
  (2026-07-18) both predate and are unchanged since `c5563c72`
  (2026-08-02). Conclusion: `c5563c72` was never a valid "good" ref for
  this symptom — the design doc's contemporaneous 32/32 verification was
  real at the time (not fabricated; too well cross-checked to doubt), but
  is not reproducible today, most likely because the 8014 oracle process
  now running has only been up since ~2026-08-15 (a restart mentioned in
  an unrelated oracle-side commit `3e29880b`'s message), replacing
  whatever instance served the original verification — though the actual
  code diff in that restart's commits only touches the separate
  battle-lab endpoint, not plain `/v1/run`, so the mechanism of any shift
  is not pinned down, only the fact that no commit in the proposed range
  reproduces 32/32. Per this step's hard rule 2 ("if no good ref exists
  within ~3 probes, record and stop"), did not run the automated
  `git bisect` (it would have produced an arbitrary, meaningless commit
  since the check fails uniformly across the whole range) and did not
  touch any shared bounce-tick formula without a real regression boundary
  to justify a change.
- **Result:** `ISSUES.md #97-B` rewritten with the full disproof and two
  concrete paths forward for whoever resumes (widen the backward search
  past `c5563c72`, or drop the regression framing and calibrate the
  bounce-tick constants directly against the current oracle the same way
  `#87` did). Mechanism analysis from rung 1 (shared `menuIdleBounce`
  formula family, legacy-vs-shifted branch already ruled out) stands
  unchanged — still a real, reproducible pixel bug, just not one this
  git range can localize. Guards reverified: `turn5-reset-off` 256/256,
  gold-pages 177/177, callscene-02 199/199 (all spot-checked in the main
  tree, unaffected by the disposable worktree).
- **Next:** Either (1) probe further back than `c5563c72` for a real good
  ref (first check whether the turn5-reopen bounce-tick code path even
  existed that far back), or (2) treat this as a live tuning problem and
  calibrate `TURN5_LEGACY_PRESENTATION_CONTINUATION_LAG` /
  `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` / `presentationEpoch.elapsed` directly
  against the current oracle at frames 5927/7305, MEASURED-constant style
  (`#87`'s convention), instead of chasing a git culprit. Do not re-run
  this exact bisect recipe against `c5563c72..HEAD` without new evidence
  `c5563c72` is actually good.
- **Notes:** No PAPERCUT beyond the pre-existing gap this session
  confirmed: nothing in this harness currently records *when* the shared
  oracle process was last restarted independent of digging through git
  commit messages and `ps` — a future session chasing oracle-vs-code
  drift like this would benefit from the launcher stamping a start-time
  file next to the service, but that's speculative tooling, not
  implemented here (out of this step's scope).

---
