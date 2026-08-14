# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1259 — [MAIN worker, 2026-08-14] **Brain presentation seam landed: rungs A-C green (data, wiring, pins); rung D not attempted (time)**

- **State:** `getFactoryTrainerPresentation(1022)` now resolves NOLAND's
  real identity instead of throwing; `beginFactoryRoundBattleStartIntro`
  constructs a real battle-start command for the Frontier Brain. The rung-4
  blocker 1257 found (`factoryTrainerPresentation.ts:78` throwing `missing
  Battle Frontier trainer 1022`) is closed.
- **Did:** **Rung A (data)** — every §2.3 field re-derived directly against
  `reference/pokeemerald` this session (not just the design doc's
  citations): `GetFrontierBrainTrainerPicIndex`/`…Class`/
  `CopyFrontierBrainTrainerName` (`frontier_util.c:2443-2481`) all read
  `gTrainers[TRAINER_NOLAND]` (`src/data/trainers.h:9712-9722`) via
  `sFrontierBrainTrainerIds[FRONTIER_FACILITY_FACTORY] = TRAINER_NOLAND`
  (`frontier_util.c:719-728`): `trainerPic = TRAINER_PIC_FACTORY_HEAD_NOLAND`
  (86, `include/constants/trainers.h:105`; size 8/yOffset 1,
  `front_pic_tables.h:89`), `trainerClass = TRAINER_CLASS_FACTORY_HEAD`
  (0x3e=62, `include/constants/trainers.h:350`; display name "FACTORY HEAD",
  `trainer_class_names.h:64`), `trainerName = "NOLAND"`; gender via
  `IsFrontierBrainFemale` (`frontier_util.c:2483-2487`) reads
  `sFrontierBrainObjEventGfx[FACTORY][1] = FALSE` (`frontier_util.c:674`) —
  male. **Architecture decision:** ported as a source-cited special case in
  `factoryTrainerPresentation.ts`, NOT injected into the generated 300-row
  `battle-frontier-trainers.json` — the ROM itself never routes the brain
  through `gFacilityTrainers`, and folding him in would corrupt that table's
  "ordinary corpus" invariant the same way design §1 argues against widening
  the `trainerId` field itself. Same reasoning applied to the pic asset:
  Noland's `FACTORY_HEAD_NOLAND` sprite sheet was missing from
  `frontier-trainer-pics.json` (that catalog's own test suite pins it as
  "all and only" the ordinary 50-picture surface), so a new sibling
  extractor (`extract-frontier-brain-trainer-pic.ts`, reusing the same
  PNG/tile helpers) writes a separate additive file
  (`frontier-brain-trainer-pic.json`); `battleScene.ts`'s
  `resolveFrontierTrainerPic` now unions both catalogs so callers stay
  provenance-agnostic. Also fixed `generatedOpponent`'s frontier-brain
  placeholder `trainerName` (was `"Frontier Brain"`, now sourced from the
  real presentation) — the identity mismatch check in
  `factoryTrainerPresentationForOpponent` would otherwise reject it now that
  1022 resolves to real data. **Rung B (wiring)** —
  `generatedRoundRevealProofStage`'s `targetBattleIndex` union now admits
  `6`; live-verified seed 70 / entering streak 14 lands battleIndex 6 at
  effective streak 21 (silver) with `factorySymbolsCount` defaulted 0, so
  this exact proof-stage config reaches the Brain deterministically. New
  test in `factoryRoundIntroGeneralization.test.ts` proves the command
  builds without throwing. **Rung C (pins)** —
  `tests/factoryBrainPresentation.test.ts` (new) pins every
  `CANONICAL_NOLAND_PRESENTATION` field + the special-case-only reachability
  (1021/300 still throw) + the real pic resolution; extended both existing
  real-round-shape cases (silver seed 4, gold seed 2) in
  `factoryBrainRoundShape.test.ts` to drive to battleIndex 6 through the
  genuine six-real-win orchestrator path and assert the battle-start command
  carries NOLAND's identity while `currentOpponent.frontierBrain`
  ({status: silver}/{status: gold}) stays consistent before/after.
- **Next:** rung D (stretch) was not attempted — time budget. The real next
  step is exactly what 1257 deferred: a Brain-reveal `APP_STAGES` entry in
  `tools/compare/appTrace.ts` (the proof-stage plumbing for battleIndex 6 now
  exists, see rung B) + a paired oracle-side `factoryBrain` scenario (reuse
  `tools/battle-lab/factory-brain-silver-turn1-off.json` or a dense variant)
  + a live `npm run compare` FIRST-frame probe. Acceptance is the compare
  running with an honest mismatch inventory, not pixel exactness — Brain
  pixels have never been rendered app-side, so a nonzero mismatch count on
  the first attempt is expected and is the deliverable, not a failure.
- **Notes:** each rung its own commit (`feat: ... data`, `feat: ... wiring`,
  `test: ... rung C`), tree green at each; `npm run typecheck` +
  `test:smoke` between rungs. Finish gate: full `npm test` **1,014 files /
  9,764 passed, 44 skipped** (the gated CGB4 family per merge `dc57b7c3` —
  not a regression) in ~2 min; `npm run build` green (669 modules, +1 for
  the new brain-pic asset/test module). No `unsupported-branch` barrier
  moved. Nothing outside `workspace/` touched; no oracle service restarted;
  did not read/edit any `docs/noland-brain-intro-*` doc or
  `tools/battle-lab/factory-brain-intro-*` fixture (side lane's concurrent
  scout territory, per this step's OUT OF SCOPE).

