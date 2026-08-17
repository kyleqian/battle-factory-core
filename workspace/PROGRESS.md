# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 1311 — [main worker, 2026-08-17] **Rung 2 attempted: circle-sprite onset residual documented, not fixed — gold's own onset is a small sliver (+6 from CIRCLE_ANCHOR_TE), silver's is an abrupt full-width block, not the same shape**

- **State:** Docs/scratch-tooling only, no `src/` edit. `npm test` **1065
  files / 10011 passed / 223 skipped** (unmoved), `npm run build` + `npm
  run typecheck` green, `executableFrontierRatchet` barrier counts
  unmoved.
- **Did:** 1310's rung 2: derive the true circle-sprite onset per tier
  from the already-banked oracle PNG sets (gold's own §8″ span, silver's
  new flicker fixture) and check whether both tiers show the same onset
  delta on their now-verified `te` clocks. Full-frame scan for the
  circle sprite's own distinctive palette colors (excluding black/white/
  gray, which also occur in the baseline scene) plus a direct engine
  probe to convert frame numbers to `te` without hand arithmetic
  (`tools/compare/scratch/circle-onset-probe.mjs`, `circle-onset-
  probe2.mjs`, `gold-te-verify.ts`, `silver-onset-diag.mjs`, all
  committed). Found gold's onset (abs 2613, `te=84`, +6 past
  `CIRCLE_ANCHOR_TE=78`) is a small 28-pixel sliver matching the existing
  slide-in model; silver's onset (abs 3280, `te=79` directly, +1 past
  anchor) is a 2568-pixel block spanning the full screen width, appearing
  in a single tick (abs 3279 has zero circle-palette pixels) — not
  explainable by the same "sprite slides in, `te` needs a constant shift"
  model at any offset. The render-compare tool's own mismatch onset
  happens to coincide at `te=79` for both tiers, but the underlying
  content differs in kind, not just magnitude, so that coincidence isn't
  trustworthy as a shared mechanism.
- **Result:** No fix landed — per the rung's own decision tree ("if they
  differ, document the split precisely and stop"), guessing an offset
  for silver's unexplained abrupt-block shape would repeat the blind-
  realignment failure mode `docs/noland-brain-intro-gold-ground-
  truth.md` §8′/§8″ already warn against (two prior failures, one
  37/126 regression). Full derivation in that doc's new "Rung 2 attempt"
  section and `docs/silver-flicker-evidence.md`'s own matching addendum.
  Guards unmoved: silver-flicker 79/100 (rung 1's result), gold-close
  113/126.
- **Next:** Silver's abrupt abs 3279→3280 full-width jump needs cross-
  referencing against `reference/pokeemerald/src/
  battle_transition_frontier.c`'s real sprite creation/movement code to
  identify what's actually different about silver's path before any
  offset is tried — not more pixel probing of the already-banked window
  (already at stride-1, max resolution). Gold's own sliver-shaped
  residual (113–125) is the lower-risk piece if a future session wants
  to isolate and fix only gold's own small `+6`-relative correction
  without touching silver. Otherwise pick up: (b) silver's own
  unfixtured post-te-99 top-row circle onset (never observed in any
  banked window); (c) soak remainder (vanilla 20:60 + winning 0:10 at 2×
  maxFrames).
- **Notes:** No blind offset sweep attempted, consistent with the step
  brief's explicit instruction. No PAPERCUT.

