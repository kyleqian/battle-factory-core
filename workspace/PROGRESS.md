# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 1313 — [main worker, 2026-08-17] **#97 split and closed: loss-terminal-decline-continuation-off's 155/155 bar is OBSOLETE (intended `b7ae30de` continuous-play chaining, not a bug); turn5/turn6 bounce-tick drift mechanism identified, bisect recipe written (needs `c5563c72..HEAD`, 2697 commits)**

- **State:** Docs-only, no `src/` edit (one scratch `console.error` added
  and removed during diagnosis; `git diff src/` is empty). `npm test`
  **1065 files / 10011 passed / 223 skipped** (unmoved), `npm run build`
  green (includes typecheck), `executableFrontierRatchet` barrier counts
  unmoved (6/6 ratchet tests pass).
- **Did:** Pixel-first diagnosis of #97's three windows per the step
  brief. **(A) loss-terminal-decline-continuation-off** (50/155): PNG
  comparison at frames 4939-5093 shows the oracle correctly running the
  documented decline→farewell→free-roam-Lobby chain the whole time, while
  the app jumps straight to a fresh rental-draft screen at frame 4989.
  Root cause: `core.ts:821-882`'s "continuous-play chaining" branch
  (`state.appRoute === "generated-orchestrator" && recordChoice
  newly "no"`), landed deliberately in `b7ae30de` (2026-08-14,
  supervisor-approved per `ROADMAP.md`'s 2026-08-14 planning-session
  decision) — an ancestor of the `b229076a` baseline. Verdict: the old
  bar is obsolete, not regressed; the farewell/Lobby pixels are
  unreachable by design under this route. Closed as documented (not
  fixed — fixing would mean reverting a deliberate feature); honest
  remaining bar is the pre-edge span, frames 4939-4988, **50/50** (holds).
  **(B) turn5-action-off / turn6-reopen-off** (1/32, 11/46): pixel diff
  confirms a real ~1px box/sprite displacement at each turn's FIGHT-reopen
  edge (turn5: player status-box border, frame 5927; turn6: ONIX battler
  sprite, frame 7305) — both driven by the shared `menuIdleBounce`
  bounce-tick family (`battleScene.ts` turn5 legacy/shifted formulas).
  Live-instrumented (scratch, reverted) both candidate formulas at the
  mismatch window: they agree with each other and still disagree with
  the oracle, ruling out the obvious branch-flip fix. Also affects
  `turn5-confirm-off-{a,b}` and `turn5-resolve-off-{a,b,c,d}` per the
  2026-08-17 sweep — a whole-family regression, not just these two.
  Classified (c): genuinely needs bisection, NOT attempted live (shared,
  heavily-tuned formula surface + 2697-commit-wide unknown window is too
  large/risky for this session's remaining budget). Full mechanism,
  ruled-out leads, and an executable `git bisect run` recipe (isolated
  worktree, known-good `c5563c72`, known-bad `b229076a`) are written into
  `ISSUES.md #97`.
- **Result:** `ISSUES.md #97` rewritten with both findings (old leads that
  died are trimmed). Guards reverified fresh: `turn5-reset-off` 256/256,
  gold-pages 177/177, callscene-02 199/199.
- **Next:** Whoever picks up #97 part B should first manually confirm
  `c5563c72` is turn5-action-off-green (the recipe assumes it from the
  design doc's own citation but this session didn't re-verify it), then
  run the bisect recipe in `ISSUES.md #97` to find the exact regressing
  commit before touching the shared bounce-tick formulas.
- **Notes:** No `src/` edit landed (diagnose-only per the brief's own
  decision tree for both findings). No PAPERCUT.

---
## 1312 — [main worker, 2026-08-17] **Rung 3: SOURCE root cause found for the circle-sprite residual — brain walk-up never draws the real per-encounter transition selection, always hardcodes circlesMeet; fix enumerated as multi-piece, not implemented**

- **State:** Docs-only, no `src/` edit. `npm test` **1065 files / 10011
  passed / 223 skipped** (unmoved), `npm run build` + `npm run typecheck`
  green, `executableFrontierRatchet` barrier counts unmoved.
- **Did:** This step's brief (method steps 1-3): identify the TRUE
  battle-transition per tier from source, reconcile against what the app
  models. Source (`battle_tower.c:2093-2100`'s `SPECIAL_BATTLE_FACTORY`
  case) shows the Frontier Brain draws its transition from the exact same
  random 12-entry table (`sBattleTransitionTable_BattleFrontier`,
  `battle_setup.c:131-145`) as any ordinary Factory opponent — no
  brain/tier override. But `src/engine/battleRoom.ts`'s
  `opponentSetupExtraRngSteps` only fires the transition draw when
  `state.phase === "settled"`, and the brain walk-up room's own
  settled-equivalent phase is named `"brainSpeechSettled"` — never
  `"settled"` — so `b.transitionPresentation` is **always** `undefined`
  for brain battles, and `renderBattleRoomState` always falls back to the
  hardcoded `"circlesMeet"` default (`core.ts:2528`), regardless of what
  either fixture's real RNG stream drew. This reframes rung 2: silver's
  abrupt full-width block isn't a second onset mechanism to unify with
  gold's — it's the wrong transition family rendered through the
  circlesMeet slide-in model. Ruled out one candidate (`FrontierSquares_
  Draw`, `battle_transition.c:987-1004`, is a gradual 35-tick raster
  sweep, not an instant full-width reveal — doesn't match silver's
  one-tick abs-3279→3280 jump).
- **Result:** No fix landed (correctly, per the brief's own decision
  tree). The party-generation RNG replay this fix needs already exists
  (`src/engine/factoryBrainOpponentGeneration.ts`'s
  `generateFactoryBrainOpponent`, wired into
  `factoryRoundBattleOrchestrator.ts:605`, exposing the correct
  post-party RNG cursor as `generation.rngValue`) — but nothing calls
  `pickFrontierTransition` on it, and `BattleOpponent`
  (`battleScenario.ts:55`) has no field to carry a pre-computed
  presentation through to `battleRoomStateForOpponent`. Wiring it up
  requires reconciling that orchestrator-level RNG stream against
  `core.ts`'s own *separate* tick-level `rngValue` cursor (the one the
  ordinary walk-up room's own already-correct draw depends on) without
  desyncing it — a cross-cutting change, not ≤2 bounded pieces, and
  possibly a new renderer on top (9 of the 12 table entries have no
  renderer implemented yet). Full derivation + citations in
  `docs/noland-brain-intro-gold-ground-truth.md`'s new "Rung 3" section
  and `docs/silver-flicker-evidence.md`'s matching addendum. Guards
  unmoved (fresh reruns): gold-close 113/126, silver-flicker 79/100.
- **Next:** Implement per the Rung 3 enumeration: (1) thread
  `pickFrontierTransition` through `generateOpponentFor` on
  `generation.rngValue` for both branches, giving `BattleOpponent` a
  field to carry the presentation; (2) wire `battleRoomStateForOpponent`
  to consume it for brain rooms without desyncing the ordinary room's own
  tick-level draw (needs its own dense verification, not a guess); (3)
  once each fixture's real `tableIndex` is knowable, implement whichever
  renderer family it lands on if not already one of the 3 implemented
  (circlesMeet/logoWave/asymmetricSpiralInSeq). Otherwise pick up: (b)
  silver's own unfixtured post-te-99 top-row circle onset; (c) soak
  remainder (vanilla 20:60 + winning 0:10 at 2× maxFrames).
- **Notes:** No blind offset sweep attempted. PAPERCUT: none.

