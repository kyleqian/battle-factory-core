# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1264 — [MAIN worker, 2026-08-14] **Ready-lag `dispatchDelay(opponent)<101` discriminator FALSIFIED with clean RAM triangulation; real missing ROM span located precisely (`TryDoEventsBeforeFirstTurn`/`ChooseAction` handshake); no validated `src/` fix — honest-stop, evidence landed**

- **State:** No `src/` change this round (a speculative flat-constant fix
  was tried, empirically bisected, found insufficient, and reverted).
  `factory-round-battle7-noland-reveal-off` (silver) stays **648/701**;
  `factory-round-battle7-noland-gold-reveal-off` (gold) stays **700/701**;
  no regressions anywhere, since nothing shipped.
- **Did:** Assigned to fix the ready-lag +7/+5 family
  (`docs/ready-lag-discriminator-scout.md`'s `dispatchDelay(opponent)<101`
  discriminator). Instead **falsified that discriminator** with a clean,
  non-confounded data point: `tools/battle-lab/factory-brain-gold-intro-
  dense-off.json` is `factoryBrain` mode with **no `overrides.parties` at
  all** (a genuine, un-staged oracle RNG walk) and opponent lead BLAZIKEN
  gives `dispatchDelay=132` (deep in the "safe, should-be-exact" regime) —
  the exact untested cell the discriminator dossier's own §3 flagged. Built
  `tools/probe/probe-ready-lag-chooseaction-handshake.ts` (committed,
  rerunnable, byte-identical across 3 runs) to measure it, plus two fixtures
  the dossier calls "confirmed 0-residual" (GRIMER/YOSHI, KADABRA/SHIZUKA),
  all via live RAM (`state.engine.{controllerExecFlags,
  playerControllerCommand,opponentControllerCommand}`), not PNG citations.
  **All three show a +4/+5 tick residual**, including the two "exact" ones
  and the override-free/high-dispatchDelay one — the regime split in the
  existing dossier is best explained as an old-PNG-landmark-vs-new-RAM-
  predicate measurement-convention split, not a real ROM regime boundary.
  Traced the real missing span in `reference/pokeemerald/src/battle_main.c`:
  `TryDoEventsBeforeFirstTurn` (:3841, switch-in ability/item/weather-check
  loop) + `HandleTurnActionSelectionState`'s `ChooseAction` dispatch (:4168)
  run AFTER the player's own send-out completes and BEFORE the menu is
  interactive — a real, generic, always-present ROM span
  `generatedBattleStartCommandReady` (battleScene.ts:4590-4600) has zero
  term for. Tried it as one flat additive constant (unconditional, no
  regime gate) and bisected empirically against silver: K=9 peaks at
  690/701 (98.4%, up from 648/701) but falls short of the ~699+/701 the step
  required, with a K-insensitive residual persisting at frames 647-653
  unrelated to the correction. **Reverted the `src/` edit** — a
  non-converging fitted constant is an explicitly failed outcome per this
  step's own brief. Full writeup: `docs/trainer-pic-off-window-scout.md`
  round 13.
- **Next:** (1) the 647-653 bbox residual may be masking the true
  ChooseAction-handshake optimum — resolve it first. (2) re-run this
  round's probe against the concurrent side worker's promised real
  `factoryLegal`/low-`dispatchDelay` fixture once it lands; if its residual
  is also ~+4/+5 (not +7), the TANGELA/PUPITAR +7 carries a second,
  additional ~+2-3-tick effect on top of this round's universal gap (a
  two-term fix). (3) double check whether the compare harness has its own
  RAM-tick-to-pixel-frame offset beyond the documented "RAM leads pixel by
  1" convention before trusting a future bisection here.
- **Notes:** commits this round: probe script + dossier/PROGRESS append
  only (no `src/`, no fixture/trace changes). Regression-verified
  unaffected (nothing shipped to regress): silver **648/701**, gold
  **700/701**, `factory-round-battle6-lukas-reveal-off` **154/154**,
  `factory-arbitrary-intro-yoshi-off` **700/751**, `test:smoke`
  **375/375**. Finish gate (full `npm test` + `npm run build`) recorded
  below this entry's commit.

## 1263 — [MAIN worker, 2026-08-14] **Gold Brain-reveal alignment bisected: 478/701 → 700/701; corrected two of PROGRESS 1262's claims (its transplanted offset AND its ready-lag non-recurrence read)**

- **State:** `factory-round-battle7-noland-gold-reveal-off` compare now
  **700/701 (99.86%)**, up from 1262's 478/701. Root cause was exactly
  1262's own favored hypothesis (a) — a genuine alignment error, not a
  render bug — but the actual bug was more precise than "transplanted from
  silver": 1262's own re-probed `speciesPopulateFrame` (1186) used a
  **pixel** self-diff (first sha-differing frame) instead of the §C-defined
  **RAM-state** landmark (`state.battlers.{player,opponent}.species` first
  nonzero) that every prior fixture's offset (SHIZUKA/YOSHI/MAGNETON, and
  silver's own Brain fixture per 1260) was actually keyed to. Re-ran
  `bin/oracle lab` dense against this fixture's own scenario and read the
  RAM field directly: species populate at **frame 1185**, one frame before
  the first visible pixel change (1186) — the same one-frame RAM-vs-pixel
  lag §C's own SHIZUKA table already implies but 1262 didn't re-check.
- **Did:** Corrected `preCheckpointFrameOffset` 1152→**1151**
  (`1185-26-8`) and, via 1262's own applied `press = hold-end-4` relation,
  the A-press tick 388→**389**. Verified by direct `npm run compare`
  sweep, not algebra alone: **388→481/701, 389→700/701, 390→482/701** — a
  sharp single-frame optimum, confirming a true alignment fix rather than a
  lucky combination. **Result: 700/701.** The frame-34-onward growing
  horizontal-bar mismatch 1262 named is gone entirely. Sole remaining
  residual: **frame 465** (oracle-absolute 1616), 16px/0.04%, inside the
  opponent send-out materialize span — the same unmechanized single-frame
  tint residual family as silver's 420/503 and Yoshi/Magneton's 444/536;
  not chased, per the step's no-pixel-fitting/no-per-fixture-special-case
  hard stop. **Also corrected 1262's ready-lag tail claim:** the committed
  701-frame window ends (oracle-absolute 1851) *before* this fixture's own
  true ready-menu transition (RAM predicate fires at 1865); 1262's "465-700
  exact, unlike silver's +7" reading examined a window that never reached
  the ready state at all. A throwaway (uncommitted) 730-frame diagnostic
  extension shows gold **does** have the same construction-route ready-lag
  family as silver — app's own menu appears at app-relative 711, oracle's
  settles at 716, a **5-tick early-fire gap**, same direction as silver's
  +7 but a different magnitude (not a flat cross-fixture constant) — a new,
  more precise data point left for the concurrent ready-lag side-probe to
  consume. Full writeup: `docs/trainer-pic-off-window-scout.md` §D round 12
  (this worker's doc round, as assigned).
- **Next:** the +7-family ready-lag fix itself is explicitly out of scope
  this step (side worker's discriminator dossier lands first). Frame 465's
  tint-materialize residual would need a third/fourth species data point to
  isolate, same as the existing 420/503/444/536 family. The gold ground
  truth doc's own dense-probe fixture (`factory-brain-gold-intro-dense-off`)
  still has different upstream transition timing than this reveal-off
  fixture's real generated-orchestrator construction (black-hold 39f vs
  44f, per 1262) — a reminder that landmark re-probing per fixture stays
  load-bearing, not a one-time constant.
- **Notes:** trace-only fix (`tools/compare/traces/factory-round-battle7-
  noland-gold-reveal-off.json`), zero `src/` changes. Regression matrix
  held: `factory-round-battle7-noland-reveal-off` (silver) **648/701**,
  `factory-round-battle6-lukas-reveal-off` **154/154**,
  `factory-arbitrary-intro-yoshi-off` **700/751**, `test:smoke` **375/375**.
  Finish gate: full `npm test` **1,014 files / 9,765 passed, 44 files / 223
  skipped** (pre-existing CGB4 gating, not a regression); `npm run build`
  green (669 modules). Archived 1260 to `PROGRESS-archive.md` to keep this
  ledger at 3 entries.

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
  hold 39f here vs their 44f) even though the *downstream* pic-reveal
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
  route gap).
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
- **Notes:** own commits this step: dedup+comment pin (b+c), loss-pin test
  (a), gold trace/stage/fixture (rung 1) — each green at commit
  (`npm run typecheck` + targeted suites, then `test:smoke` 375/375).
  Zero `src/` engine changes for rung 1 (new `tools/compare/`,
  `tools/battle-lab/`, `tools/probe/` files only) — regression fixtures
  re-verified unaffected by construction, not just by inference: silver
  **648/701**, Lukas **154/154**, Yoshi **700/751**, `test:smoke`
  **375/375**.
