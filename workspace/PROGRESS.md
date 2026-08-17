# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 1310 — [main worker, 2026-08-17] **Silver's own `te` origin landed: flicker fixture 32→79/100 (ENTIRE gray-flicker span exact), circle-sprite onset residual documented for rung 2**

- **State:** Landed and green. `npm test` **1065 files / 10011 passed /
  223 skipped** (unmoved), `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` barrier counts unmoved.
- **Did:** Rung 1 of this step's brief. Implemented the verdict
  `docs/silver-flicker-evidence.md` banked last session (dense per-frame
  gray-flicker coefficient inversion over
  `factory-brain-silver-walkup-speech-flicker-off.json`, 100 stride-1
  frames): silver's true transition `te` is `b.elapsed` **directly**, no
  re-basing at all — NOT a `+0`-coefficient instance of gold's own §8″
  `MSGBOX_CLOSE_TICKS + frontierTransitionFlickerStartTe` correction
  (silver's pause happens to equal `FLICKER_START_TE`, so gold's
  closing-lag term has nothing left to compensate for). Restructured
  `renderBattleRoomState`'s (`src/engine/core.ts`) single
  `(tier === "gold" ? goldRebaseTe : 0)` ternary into an honest per-tier
  branch: gold keeps §8″'s formula unchanged, silver takes `b.elapsed`
  bare. Docs extended: `docs/noland-brain-intro-gold-ground-truth.md` new
  §8‴, `docs/silver-flicker-evidence.md` new "Landed" section — both cite
  the banked evidence and the exact result.
- **Result:** `factory-brain-silver-walkup-speech-flicker-off.json`
  **32/100 → 79/100** — frames 0–78 exact, the ENTIRE gray-flicker span
  (elapsed 28–75) with zero mismatches, matching the required acceptance
  bar. Mismatches resume at frame 79 (elapsed 79, one tick past
  `CIRCLE_ANCHOR_TE=78`) through frame 99 — the circle-sprite build
  region, the same distinct second mechanism as gold's own unfixed
  113–125 residual (§8″), not this fix's bug; that's rung 2's mechanism,
  not attempted this step (ran out of budget after landing rung 1 +
  docs; see Next). Guard matrix reverified unmoved (fresh `--summary`
  reruns): gold-pages 177/177, silver box-2 100/100, gold-open 256/256,
  entrance-03 256/256, entrance-02 256/256, callscene-01 131/131,
  callscene-02 199/199, gold close-edge 54/54, silver cry-edge 75/75, B2
  box0-held 39/39 / cry-held 74/74 / page8-held 39/39 / close-pause
  28/28, askready 21/21, gold-close 113/126 (unmoved, its own residual
  untouched by this step).
- **Next:** Rung 2 (circle-sprite onset unification) — gold-close
  113–125 and silver-flicker 79–99 are the same mechanism on different
  tiers; cross-check whether both show the same onset delta on their own
  verified `te` clocks (gold: real onset later than
  `CIRCLE_ANCHOR_TE=78`, exact tick TBD from a fresh per-frame circle-
  pixel probe of the banked gold §8″ PNGs; silver: raw-pixel bottom-row
  probe in `silver-flicker-evidence.md` item (c) already puts onset at
  elapsed 80, close to on-time, but top-row onset was never observed in
  the banked 100-frame window). If both tiers share one onset delta, fix
  the shared `CIRCLE_ANCHOR_TE`-relative anchor once; if not, land only
  whichever piece is itself tier-safe (silver-flicker fixture is the
  regression canary) or document the split precisely.
- **Notes:** No blind offset sweep attempted — §8′/§8″'s own two-failed-
  realignment history is binding precedent, and this step's own dense
  evidence (banked last session, implemented this session) is what made
  rung 1 a clean derivation rather than a fit. No PAPERCUT.

