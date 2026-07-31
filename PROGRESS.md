# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 767 — [BOUNDED MAIN WORKER 2026-07-31 ~03:15] #56: species-keyed ready lag applied, MAGNETON app-side proof built, ONIX regression found

- **State:** YOSHI **699/751** (up from 650/751 — real personalities +
  species-keyed ready lag both landed). MAGNETON app-side proof built:
  **424/751** (new; exact 0..423, diverges 424..750 with no recovery —
  masks a clean shadow-branch check, see below). GROVYLE
  `battle-command-generated-off` **128/128** unchanged. GROVYLE
  `interactive-generated-intro-off` **699/715, regressed from 715/715**
  (honest, characterized — not silently fixed, see Did). Battle-2 insurance
  pins unaffected: `battle2-turn1-rockslide` **191/191**,
  `battle2-action-menu-dense` **209/209**. `npx tsc --noEmit` clean; focused
  suite (`cryDurationsExtraction`, `factoryBattleStartIntro`,
  `executableFrontierRatchet`, `factoryRoundBattleOrchestrator`) **44/44**
  green. Full `npm test`/`npm run build` **not run this step** per the brief
  (side worker live concurrently).
- **Did:** (1) `GENERATED_PLAYER_READY_LAG` (flat 185) replaced with
  `generatedPlayerReadyLag(state)` keyed off the player's own active species
  (`98 + cryDurationTicks(playerLeadSpecies) + generatedPlayerVisualLag`),
  per docs/intro-cry-shadow-evidence.md Part 1. Settled the "98 vs 99"
  residual by fixing `cry-durations.json`'s extractor
  (`Math.round`→`Math.ceil`, matching the real per-VBlank "still playing"
  poll) and regenerating the 376-species file — invariant for the already-
  validated opponent dispatch-delay species, resolves DELCATTY's own +1.
  (2) Built the MAGNETON `AppStage` (`generatedBattleStartIntroMagnetonStage`,
  `tools/compare/appTrace.ts`) + compare trace
  (`factory-arbitrary-intro-magneton-off.json`), reproducing trainerId 109/
  RICARDO exactly. (3) Staged real ROM personalities (from
  `bin/oracle lab`'s own dense `state.parties`) in both the YOSHI and
  MAGNETON stages, closing the round-6 gender-icon residual. (4) Found (not
  fixed) a **new regression**: `interactive-generated-intro-off`'s real
  canonical Battle-1 lead (ONIX) needs ready-lag 185, but the 3-species
  formula predicts 179 — a clean 6-tick miss that survived several
  hypotheses (extraction bug, line-length, floor/max term). Left
  precisely characterized rather than force-fit. Full write-up:
  `docs/trainer-pic-off-window-scout.md` §D "Round 7 resolution".
- **Next:** ISSUES #56 — item 1 has a real regression (ONIX/canonical-
  route ready-lag) needing a 5th data point or a source read of
  `battlerAnimsDone`; item 3's MAGNETON shadow-branch check is blocked by
  an earlier, unrelated affine-emerge/tint divergence in
  `drawGeneratedOpponentRelease` (first at handoff+19, well before the
  shadow's own handoff+104 onset) that needs isolating against a second
  species; item 2 (frames 444/536) untouched this round — no budget left
  after the above.
- **Notes:** `tools/extract/extract-cry-durations.ts` and
  `src/data/gen/cry-durations.json` are normally side-lane files; touched
  here because task 1 required the ceil fix to reconcile the three
  triangulated species — flagged for the supervisor's awareness of the
  lane boundary, not hidden.

---
## 766 — [SUPERVISOR 2026-07-31 ~02:25] #39 rank-1 RETIRED (flip verified); player-cry mechanism confirmed on 3 species; round 8 dispatched

- **State:** union gate green **557 files / 5671 tests + 1 deliberate
  animation-lane skip** (net delta = deleted legacy fixture tests), build
  clean. M7's flip verified: legacy files gone, supervisor personally
  re-ran `battle2-turn1-rockslide` **191/191** and
  `battle2-action-menu-dense` **209/209** (worker verified 16/16, 128/128,
  715/715, ground-truth 38/179 unchanged). S7 merged: player-cry
  triangulation (GRIMER/KADABRA/DELCATTY → `readyLag = 98 + cryDuration`
  within 1 tick — round-6's 8-tick miss was a wrong anchor) + committed
  MAGNETON/RICARDO fixture with landmark map incl. pixel-confirmed
  shadow-elevation frame 1687.
- **Supervisor actions:** #39 issue text + inventory rank-1 row marked
  retired; `battle2-turn1-rockslide.json` given explicit
  `appRoute: canonical-recorded` (fixes the wrong-route crash from the
  M7 papercut); PAPERCUTS bumped (pixel-inspection helper).
- **Round 8 dispatched:** main M8 — implement species-keyed player ready
  lag (canonical route untouched; GRANBULL flat-286 flagged as a separate
  path), build the MAGNETON app-side comparison (second arbitrary-species
  proof; first shadow-path exercise), stage real personalities in the
  staged stages (gender-icon residual), then frames 444/536. Side S8 —
  #39 rank-2 (turn-13 DRAGON_BREATH→faint→switch-in) equivalence
  groundwork, new-files-only, tsc mandatory.
- **Notes:** GRANBULL flat-286 non-reconciliation is recorded in
  `docs/intro-cry-shadow-evidence.md` — treat as a flag on the canonical
  path, not a defect claim.

---
## 765 — [BOUNDED MAIN WORKER 2026-07-31 ~02:45] #39 rank-1 FLIPPED: Battle-2 command turn now kernel-driven; three legacy fixture files deleted

- **State:** all six mandated pins hold at their recorded counts:
  `battle2-turn1-rockslide.json` **191/191**, `battle2-action-menu-dense.json`
  **209/209**, `battle2-off-turn1-staged.json` **16/16**,
  `battle-command-generated-off.json` **128/128**,
  `interactive-generated-intro-off.json` **715/715**; ground-truth-only
  `battle2-off-turn1.json` unchanged at its known-incomplete **38/179**
  (never committed to app acceptance, docs/battle-resolution-seam-
  design.md:452). `npx tsc --noEmit` clean. Focused suite (every touched
  module + `executableFrontierRatchet`) **537/537 green**
  (`battle2CommandAdapterEquivalence` 13, `battle2ActionMenu` 8,
  `battle2Turn1` 3, `battle2PartyGroundTruth` 6, `battleCommandPresentation`
  32, `battleTurnPortability` 5, `executableFrontierRatchet` 6,
  `battle2OffKernelSeamScout` 2, `battleScene` 276,
  `factoryRoundBattleOrchestrator` 30, + 4 more). Full `npm test`/`npm run
  build` **not run this step** per the brief (side worker live concurrently).
- **Did:** redirected `battle2CommandPresentationForRender`'s field/request
  construction and `drawBattle2RockSlideAttack`'s HP sourcing
  (`battleScene.ts`) from the `BATTLE2_ACTION_MENU_MODEL`/`battle2Turn1.ts`
  fixtures to the real kernel via the promoted adapter (`battle2CommandAdapter
  .ts`, renamed from `...Preview.ts` — production now, not a proof). Added
  the real RAM-probed personalities (ONIX 1205102525, KABUTO 2507133325) and
  player bench (`playerBenchHp:[138,153]`, MAGBY/BAYLEEF override) to the
  kernel config per docs/battle2-party-ground-truth.md's two FINDINGs — both
  now closed, evidenced in the new equivalence test and
  `battle2PartyGroundTruth.test.ts`'s updated "fixed" assertions. Deleted
  `battle2Turn1.ts`/`battle2ActionMenu.ts`/`battle2OffScenario.ts`; relocated
  their still-needed timing/RNG-advancement helpers
  (`battle2Turn1RngCalls`+delays, `battle2RockSlideMechanismPressTick`,
  `actionMenu*`/`battle2PreTurnRngCalls`, `BATTLE2_ACTION_MENU_MODEL`,
  `BATTLE2_OFF_TURN1_COMMAND_DURATIONS`) into `battleScene.ts`/
  `battle2CommandAdapter.ts` rather than dropping them — core.ts's RNG-
  advancement loop (accuracy/spread/secondary Random() calls) is unchanged,
  only its source module moved. Dropped genuinely dead code that no renderer
  or RNG loop ever consumed: the `state.battle2Turn1` EngineState field
  (only read by its own now-rewritten test), `battle2RockSlideDamage`,
  `battle2Turn1Order`, `advanceBattle2PreTurnRng` (all unused outside their
  own tests). Kept the ROCK_SLIDE rock-sprite visual's private draw
  primitives untouched (no generic move-visual owner yet, per brief). Rock-
  sprite HP-drain boundary now reads `{from:91,to:63}` off the adapter's
  resolution instead of the deleted `BATTLE2_KABUTO_START_HP`/`END_HP`
  constants. Rewrote `tests/battle2CommandAdapterPreviewEquivalence.test.ts`
  as `tests/battle2CommandAdapterEquivalence.test.ts` (production-path pin,
  not a pre-flip proof) and updated the 5 dependent test files' imports.
- **Next:** ISSUES #39's rank-1 row (docs/battle-scene-retirement-
  inventory.md) is retired — supervisor should trim #39's text to drop the
  rank-1 window from the worklist (rank 2, Turn-13 DRAGON_BREATH→faint→
  Murkrow switch-in, is next per the inventory's stated order) and update
  the retirement-inventory doc's rank-1 row/ref-count census (not touched
  this step, out of scope for a main worker per the brief).
- **Notes:** PAPERCUT: the acceptance list's "battle2-off-turn1.json (179)"
  and "battle2-turn1-rockslide.json (191)" traces both lack `oracleProfile`/
  `appRoute` fields (pre-existing; unrelated to this step), so plain `npm
  run compare -- <trace>` silently uses the wrong default route
  (`generated-orchestrator`) and either crashes (pre-existing, unrelated
  `STRINGID_PKMNSITEMRESTOREDHEALTH` bug, reproduces identically on master)
  or diffs wrong. Verified both via scratch copies with `"appRoute":
  "canonical-recorded"` added (not committed) — ~10 min lost chasing this.
  Worth a real fix (add the field to the two committed trace files) in a
  future docs/tooling pass.

---
