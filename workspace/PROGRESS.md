# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1262 — [MAIN worker, 2026-08-14] **Gold Brain-reveal compare built (478/701, new fade-in-onset residual named); three audit-driven pins landed**

- **State:** first-ever GOLD Brain-battle compare (`factory-round-battle7-noland-gold-reveal-off`,
  seed 2/challengeNum 5/factorySymbolsCount 1, the gold-eligible config from
  `tests/factoryBrainRoundShape.test.ts`'s `GOLD_SEED`/`GOLD_STREAK` case)
  replicates the silver r4 recipe: new app stage
  (`generatedGoldRoundRevealProofStage`/`generatedRoundBattle7NolandGoldRevealStage`,
  `factoryRoundIntroGeneralizationStage.ts`) + oracle `factoryBrain` scenario
  with `overrides.parties` pinned to the app's own generated party on both
  sides (player DUGTRIO/MEDICHAM/MISDREAVUS — setIds 564/565/566, reused
  from the scout's own legal gold triple since the round-shape test's
  664/678/527 fails the oracle's real challenge-5/rank-0 legality check even
  though the app's pure `currentRecords` path lets it through; opponent
  SKARMORY/JOLTEON/ELECTRODE, the app's real `generateFactoryOpponent`
  output for this seed — differs from the scout's BLAZIKEN-led roster as
  expected, same seed-mismatch reason 1260 documented). Trace includes an
  `A` press this time (the r4 lesson) at app-relative tick 388, estimated by
  transplanting silver's own hold-end-relative delta (press ≈ pic-reveal-
  hold-end − 4) onto gold's own dense-capture-verified pic-reveal-hold end
  (frame 1544, sha-identical to the existing gold ground-truth doc's
  independent fixture) rather than a full app-vs-oracle bisection — time
  budget did not allow the multi-pass bisection r4 used.
  `preCheckpointFrameOffset` (1152) derived the same way as every prior
  fixture (`speciesPopulateFrame(1186) − 26 − 8`), with `speciesPopulateFrame`
  itself re-probed fresh for this fixture (not borrowed from the scout's
  dossier): a live dense self-diff showed this fixture's own pre-transition
  swirl/black-flash-hold lengths differ from the scout's gold fixture (black
  hold 39f here vs. their 44f) even though the *downstream* pic-reveal
  window (1404–1544) is sha-identical to theirs — confirming the "per-fixture
  landmark re-probe" caveat is load-bearing: upstream transition timing is
  seed-sensitive, downstream message/reveal timing is not.
- **Did:** **Result: 478/701 (68.2%).** Frames 0–33 exact (post-checkpoint
  handoff through the tail of the black-flash hold). First divergence at
  frame 34 — oracle-absolute 1186, exactly `speciesPopulateFrame`, the fade-in
  span's own first frame: a thin horizontal bar (bbox 0,80-239,80) growing
  over ~15 frames into a symmetric vertical band before subsiding — distinct
  in character from silver's missing-A-press mistake (an A press is present
  here) and from silver's known 420/503 tint-dot residuals (this is
  wider/earlier/growing, not a sparse single-frame dot). Intermittent small
  residuals (mostly <1%, a few 2-7% patches around frames 178-231, matching
  where the opponent send-out sequence would sit) continue through frame
  464; **465-700 are fully exact** (the ready-menu cycle matches, unlike
  silver's +7 tail — a different residual shape, not the same construction-
  route gap). **Not investigated further — named, not fixed, per the step's
  explicit "do not fix-by-fitting" instruction and the time budget spent on
  landmark re-derivation.** Two live hypotheses, neither chased: (a) the
  fade-in bar onset is a genuine alignment error in this session's estimated
  A-press tick or `preCheckpointFrameOffset` (both computed by formula/
  transplant, not bisected against this specific fixture's own oracle
  captures the way r4 bisected silver's); (b) a real, new rendering gap in
  the fade-in mechanism specific to this species/party combination. Hypothesis
  (a) is favored: the divergence's onset lands exactly on the formula-derived
  landmark frame, the classic signature of an off-by-a-few-frames alignment
  issue rather than a mechanism bug. The expected **silver +7 ready-lag
  tail was explicitly not chased** (out of scope, concurrent side probe owns
  it) and does not appear to recur in gold's own tail (465-700 exact) — worth
  noting as a data point for that side probe, not interpreted further here.
  **Rung 2 (three audit-driven pins, each its own commit):** (a) new test
  `factoryBrainRoundShape.test.ts` "losing to the silver Frontier Brain at
  battleIndex 6" — drives to the sixth win, publishes the silver Brain at
  battleIndex 6, resolves via the public `resolveRoundBattle({outcome:
  "loss"})` seam (mirrors `advanceProofWin`'s technique, swapped to loss),
  asserts `roundLost` fires with `battleIndex 6` and `frontierBrain
  {status: "silver"}` intact on both the command and `round.rules`
  end-to-end; red-verified (flipped the command-side expectation to "gold",
  saw the real `AssertionError`, reverted). (b) `TRAINER_FRONTIER_BRAIN`
  deduped: `factoryRoundBattleOrchestrator.ts` now imports it from its
  exported owner `factoryAiMaskSelection.ts` instead of a local redeclare.
  (c) streak%7 invariant: documented (not enforced) on
  `FactoryRoundBattleOrchestratorConfig.factoryWinStreak` — a validation
  throw was rejected because `factoryRoundBattleOrchestrator.test.ts`'s
  "Noland rung 2" cases deliberately pass non-multiple-of-7 streaks (19/20/
  40) to exercise brain eligibility at battleIndex 0/1 with a synthetic
  mid-round streak; a throw would break those legitimate callers.
- **Next:** closing gold's 34-onward gap needs the same oracle self-diff
  bisection method r4 used for silver's A-press (multi-pass, app-vs-oracle
  and oracle-self, not attempted this step — time). If hypothesis (a) is
  right, a few frames of `preCheckpointFrameOffset`/press-tick adjustment
  may close most of the window at once; re-derive independently rather than
  curve-fitting to this session's specific numbers. The gold +7-tail
  non-recurrence (465-700 exact here) is a data point the concurrent +7 side
  probe may want.
- **Notes:** own commits this step: dedup+comment pin (b+c), loss-pin test
  (a), gold trace/stage/fixture (rung 1) — each green at commit
  (`npm run typecheck` + targeted suites, then `test:smoke` 375/375).
  Zero `src/` engine changes for rung 1 (new `tools/compare/`,
  `tools/battle-lab/`, `tools/probe/` files only) — regression fixtures
  re-verified unaffected by construction, not just by inference: silver
  **648/701**, Lukas **154/154**, Yoshi **700/751**, `test:smoke`
  **375/375**. Finish gate (full `npm test` + `npm run build`) recorded
  below this entry's commit.

## 1261 — [MAIN worker, 2026-08-14] **Brain-reveal send-out window: 350/701 → 648/701; 1260's attribution corrected (missing trace A-press, not a cry-duration gap); new construction-route ready-lag finding named, not fixed**

- **State:** `factory-round-battle7-noland-reveal-off` compare now
  **648/701** (92.4%), up from 1260's 350/701. Root cause of the frame-350
  divergence was **not** the §D cry-duration family 1260 suspected — it was
  that the compare trace itself had zero `A` presses
  (`"segments": [{"frames": 700, "buttons": []}]`), unlike every other
  send-out-reaching fixture, so the app never left the pre-acknowledgement
  "wants to battle!" hold while the oracle's own scripted capture pressed
  `A` and moved on. Fixed the trace (`tools/compare/traces/`, dev-time
  only — press placed via dense oracle/app self-diff bisection, same
  method §D round 5 used): 0-646 now pixel-exact, including opponent
  TANGELA's full send-out (the first live species with
  `dispatchDelay < 101`, confirmed the existing generic formula needs no
  change for it).
- **Did:** After the trace fix, found and double-confirmed a genuine new
  residual: `generatedBattleStartCommandReady` fires 7 ticks early (app
  647 vs oracle-PNG-confirmed 654). Built an independent oracle-only probe
  (`tools/battle-lab/factory-mechanic-pupitar-delcatty-readylag-probe.json`,
  PUPITAR opponent, cry 24, `dispatchDelay=67` — further below baseline
  than TANGELA) and found the **identical +7**, ruling out a
  species/cry-proportional cause (67 vs 86 dispatchDelay, same +7). What
  the two +7 fixtures share instead: both are built via `overrides.parties`
  (mechanicLab / factoryBrain-with-pinned-parties); all three previously-
  validated 0-residual points (GRIMER/YOSHI, KADABRA/SHIZUKA,
  DELCATTY/MAGNETON) use real `factoryLegal` rental generation. This is the
  same *shape* as the already-landed `isCanonicalAnchorIntro` route
  correction — but **not fixable the same way**: the app's own
  construction for this fixture (`generatedRoundRevealProofStage`) uses its
  real generation path, not `overrides.parties` — only the *oracle* side
  uses the override (to sidestep `factoryBrain`'s un-ported RNG history,
  1260's own documented reason) — so there is no app-side signal to key a
  route flag on without inventing one. Full writeup:
  `docs/trainer-pic-off-window-scout.md` §D round 11.
- **Next:** closing the +7 needs either (a) confirming it's a pure
  oracle-harness `overrides.parties` RAM-injection artifact (real play
  never hits it — likely not a `src/` fix at all) or (b) porting
  `factoryBrain`'s real RNG history so the oracle side stops needing
  `overrides.parties` in the first place (ties into 1260's own deferred
  RNG-cursor item). Frames 420/503 (single-frame, sub-100px tint dots) are
  the same unmechanized residual family as the existing 444/536 in Yoshi's
  own fixture — not new, not chased.
- **Notes:** own commits this step (trace fix, docs). Regression-verified
  unaffected (trace-only + docs change, no `src/` touched):
  `factory-round-battle6-lukas-reveal-off` **154/154**,
  `factory-arbitrary-intro-yoshi-off` **700/751**, `test:smoke`
  **375/375**. Finish gate (full `npm test` + `npm run build`) recorded
  below this entry's commit. Did not trim the compare window to exclude
  the 647-700 mismatches (explicitly disallowed by the step brief) — the
  648/701 count is the honest, un-trimmed result.

## 1260 — [MAIN worker, 2026-08-14] **Rung D landed: first live Brain-battle compare, 350/701 frames exact, honest mismatch inventory recorded**

- **State:** the Brain battle-start presentation is now compared end-to-end
  against the oracle for the first time. `tools/battle-lab/factory-round-
  battle7-noland-reveal-off.json` (new, `factoryBrain`, `seed 70`,
  `challengeNum 2`, `playerSetIds [267,268,269]` — the exact tuple
  `generatedRoundRevealProofStage(state, 6)` reaches) pairs with the new
  `factory-round-battle7-noland-reveal-off` `APP_STAGES` entry
  (`factoryRoundIntroGeneralizationStage.ts`'s
  `generatedRoundBattle7NolandRevealStage`, a one-line reuse of the existing
  generalized proof stage at `targetBattleIndex 6`).
- **Did:** **Real finding before the compare could even be honest:** the
  oracle's `factoryBrain` harness route does NOT replay the six preceding
  battles' RNG consumption the way `factoryLegal`'s `battleNum` field does
  (already validated by the existing Lukas/battleIndex-5 fixture) — an
  unpinned `factoryBrain` request with `seed 70` generated a materially
  different opponent (species 411/5/207) than the app's own
  `generateFactoryOpponent` chain for the same seed (TANGELA/JUMPLUFF/
  PUPITAR). Rather than reverse-engineer that RNG-cursor gap (out of scope,
  no generic fix in reach this step), pinned the oracle's opponent (and,
  since `overrides.parties` requires both sides, the player too) to the
  app's own already-validated generated party via the documented
  `overrides.parties` contract (precedented by rung 3's round-trip proof) —
  this removes a confound, not a pixel fit: both sides now start from the
  identical semantic party data, isolating the comparison to the
  presentation mechanism itself. `preCheckpointFrameOffset` (3389) derived
  the same way as the existing Yoshi/Lukas fixtures (species-populate
  landmark 3423, minus 26, minus `GENERATED_BATTLE_INTRO_ROOM_HANDOFF_DELAY`
  8).
  **Compare result** (`npm run compare -- tools/compare/traces/factory-
  round-battle7-noland-reveal-off.json --summary`, app-relative window
  0..700): **350/701 frames matched.** Frames 0..349 (oracle-absolute
  3389..3738 — mid black-flash through the full battle-transition swirl,
  the pic reveal, and the complete "FACTORY HEAD NOLAND would like to
  battle!" text, per `docs/noland-brain-intro-ground-truth.md` §2's tick
  table) are **pixel-exact**. First divergence: frame 350 (oracle-absolute
  3739), exactly where the trainer-vs-trainer transition-out /
  opponent-release sequence begins; bbox grows steadily through ~408
  (text/sprite entrance typing in). Divergence stays large and roughly
  constant (11-24k px, 28-43% of the frame) from ~409 through the end of
  the window (700 = oracle-absolute 4089, well past the oracle's own
  ready-menu steady state at 4047) — the app never catches up to the
  oracle's send-out/ready sequence inside this window. Every mismatched
  frame falls within the send-out-onward mechanism family the side lane's
  Yoshi/Magneton work already named and partially modeled (species-
  dependent cry-duration dispatch/visual-lag,
  `docs/trainer-pic-off-window-scout.md` §D rounds 5-6) — not a new,
  unexplained mechanism, but the magnitude here (TANGELA/JUMPLUFF/PUPITAR/
  DELCATTY, a never-before-exercised species combo for this specific
  pipeline) was not re-derived this step; STRETCH (closing it) was not
  attempted — time budget, and the walk-up dialogue (frames 0-3210 in the
  dossier's numbering) has no app-side surface yet (out of scope per this
  step's brief; stays a named remainder, not invented).
- **Next:** stretch candidates for a future step: (1) re-triangulate
  `generatedPlayerDispatchDelay`/`generatedPlayerVisualLag` cry-duration
  data for TANGELA/JUMPLUFF/PUPITAR/DELCATTY the same way Yoshi/Magneton
  were triangulated, to see how much of the 409-700 divergence it closes;
  (2) the walk-up dialogue's app-side surface (still entirely unattempted,
  out of scope every step so far); (3) the GOLD Brain window (owned by a
  concurrent side-lane scout, still out of scope here).
- **Notes:** own commit `04a8e31d`, tree green (`npm run typecheck` +
  `test:smoke` 375/375 between edits). No regression: Lukas compare
  (`factory-round-battle6-lukas-reveal-off`, the other direct consumer of
  the edited `factoryRoundIntroGeneralizationStage.ts`) still **154/154**;
  Yoshi compare still **700/751** (this session's pre-existing baseline —
  unaffected, since no shared renderer code changed, only a new stage
  function + a new `APP_STAGES` entry). Finish gate: full `npm test`
  **1,014 files / 9,764 passed, 44 skipped** (CGB4 gated, not a regression);
  `npm run build` green (669 modules). No `unsupported-branch` barrier
  moved. Nothing outside `workspace/` touched; no oracle service restarted;
  did not create or read any `factory-brain-gold-intro-*`/gold-dossier file
  (side lane's concurrent territory).

