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

---
## 483 — [2026-07-26] SpDefUp/CosmicPower/CalmMind CBM+CV pair ported (§22)

- **State:** tree committed and green at **226 files / 3081 tests** (+27
  over entry 482's 3054), build green (`tsc -b && vite build`). Census
  **unchanged at 92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted, all 32 self-checks pass** — this AI-decision port
  touches a wholly separate subsystem (`battle_ai_scripts.s`) from the one
  the census measures (`battle_scripts_1.s` effect execution), so no
  refresh was expected or needed; reran `tools/report/executable-frontier-
  census.ts` to confirm (file byte-identical, no diff). `executableFrontier
  Ratchet.test.ts`'s per-module barrier counts **unmoved** (no new
  unsupported-branch barrier — this step only widened reachability of four
  effects already present in each file's own table-lookup fallback set).
- **Did:** landed §22's full pair per its exact ground truth (`docs/factory-
  ai-checkviability-ground-truth.md` §22, merged last round at `c5d0848`).
  (1) `factoryAiCheckBadMove.ts`: added `runCbmCosmicPower`/`runCbmCalmMind`
  — two genuinely SEPARATE dual-stat handlers (the `AI_CBM_BulkUp`/
  `DragonDance` shape, §18.1 precedent), not aliases of each other or of
  `AI_CBM_DefenseUp`/`AI_CBM_SpAtkUp`: `CosmicPower` composes
  `runCbmDefenseUp` (DEF, -10) + inlines SPDEF (-8); `CalmMind` composes
  `runCbmSpAtkUp` (SPATK, -10) + inlines SPDEF (-8) — exactly mirroring how
  `runCbmBulkUp` already composes `runCbmAttackUp`. Added `spDefStage?`
  to `FactoryAiCheckBadMoveAttacker` (same optional/`DEFAULT_STAT_STAGE`
  convention as `speedStage`/`spAtkStage`). (2) `factoryAiCheckViability.ts`:
  added `runCvSpDefUp`, the single shared CV target for all four dispatching
  effects (`EFFECT_SPECIAL_DEFENSE_UP(_2)`/`EFFECT_COSMIC_POWER`/
  `EFFECT_CALM_MIND`) — byte-for-byte `AI_CV_DefenseUp`'s own gate topology
  and odds (`STAT_DEF`→`STAT_SPDEF`) with Gate F's **`if_in_bytes` polarity
  INVERTED** vs `DefenseUp`'s own `if_not_in_bytes` (re-verified against the
  raw assembly per §22.1, not copied from the sibling) — reused the existing
  `AI_CV_DEFENSE_UP_PHYSICAL_TYPES` set directly rather than duplicating an
  identical byte list under a second name. (3) Tier-1 tests: 10 CBM tests
  (both handlers' independent/combined/omitted-field gates), 12 CV
  handler-level tests (Gates A-F, DRAW SITES 1-5, Gate F's inverted verdict
  proven on the same Seismic Toss/Dragon Rage moves `DefenseUp`'s own tests
  use, plus a pass-through barrier check), 5 mask-7
  `chooseFactoryAiScoredDecision` end-to-end reproduction tests (Anorith/
  Machamp, both dispatch moves × both reach/control fixtures, policy-own-
  draws model: reach = clean 4 `sp-def-up-roll-4` draws, control =
  deterministic 0, CosmicPower≡CalmMind draw-count parity) — 27 tests
  total, following the SpeedUp/SpAtkUp (§20/§21, entry 478) port pattern
  exactly. The oracle's own live window totals (control 8/8, reach 14/13,
  §22.3) are a documented superset (extra per-slot draws outside this
  engine's own AI-decision scope, plus the still-unresolved "5-6 not 4"
  anomaly §18.4/§22.3-22.4 first flagged for `DefenseUp` and now confirmed
  recurring here) — same subset relationship every prior HP-banded/last-
  move pair (`DefenseUp`/`AccuracyDown`) already established, not a
  mismatch; not independently re-verified against the live oracle this
  round (that verification is the already-merged, supervisor-rerun §22.6
  ground truth work, not this porting step).
- **Next:** LightScreen/Reflect/EvasionUp/EvasionDown/weather-trio pairs
  (the last 8 of 22 CV handlers, a side-lane scout is staging §23
  concurrently); §19.5's unstaged AccuracyDown sites 2-6 (need mixed
  movesets); entry 476's §18 5-6-draw window discrepancy (probe candidate,
  sRandCount attribution — now a 2-handler-wide anomaly per this step);
  ENDTURN_ITEMS2 after Yawn/Thrash. DRAW SITE 1/2/3 + site 5's empty-last-
  move sub-case remain documented recipe-only for `SpDefUp` too (same
  deferred status as every prior pair). Seam — turn-4
  `anchorOpponentAfterTurn4Hp` staging gap and seam-scout §9 items remain
  carried from entry 468. Animation program is independent (its own
  supervisor, entry 481).
- **Notes:** no ISSUES.md changes (none were open on this pair). No
  PAPERCUTS this step.

---
## 482 — [2026-07-26] Counter/Mirror Coat registered end-to-end (closes ISSUES #46)

- **State:** tree committed and green at **226 files / 3054 tests** (+19
  tests over entry 481's 3035), build green (`tsc -b && vite build`).
  Census **92/214 effects, 187/355 moves, 150/276 Factory-L50, 1884/2957
  weighted** (was 90/214/185/355/148/276/1830/2957; +54 weighted, exactly
  entry 479's estimate — EFFECT_COUNTER +40, EFFECT_MIRROR_COAT +14), all
  32 self-checks pass. `executableFrontierRatchet.test.ts`'s per-module
  barrier counts **unmoved** (no new unsupported-branch barrier added).
  `battleScriptRulesContext.test.ts`'s opcode-handler-count pin moved
  106→108 (the 2 new opcodes).
- **Did:** landed `docs/counter-retaliation-design.md` §4's full 8-step
  checklist in 5 commits. (1) Added `protectPhysicalDmg`/
  `protectPhysicalBattlerId`/`protectSpecialDmg`/`protectSpecialBattlerId`
  to `BattleScriptMoveEndBattlerMetadata`/`BattleScriptRulesBattler` +
  the materialization loop + the 3 zero-construction sites. (2) Wired
  `createDatahpupdateOpcodeHandler`'s physical/special branches to also
  write the 2 new fields each (stale doc comment corrected). (3) Added
  the full-`ProtectStruct`-table per-turn clear at
  `mapFaintedActionsResult`'s `"no-fainted-battlers"` branch — **this is
  the ISSUES #46 fix**: every modeled `ProtectStruct` bit on every
  battler now resets once per turn, matching source's
  `TurnValuesCleanUp(FALSE)`, instead of persisting forever once set.
  Deleted the mislabeled top-of-function `flinchImmobility` clear it
  superseded (it never matched `TurnValuesCleanUp(TRUE)`'s real
  protected/endured-only semantics and was redundant with the new tail
  clear). (4) Registered `B_SCR_OP_COUNTERDAMAGECALCULATOR`/
  `B_SCR_OP_MIRRORCOATDAMAGECALCULATOR` per §1.4's exact 3-gate success
  branch + `ppNotAffectedByPressure` failure branch; Follow Me redirect
  is a structural no-op (this engine's `BattleScriptSideTimerState` has
  no `followmeTimer` field at all). (5)/(6) TYPECALC2 and both
  `BattleScript_EffectCounter`/`EffectMirrorCoat` script blocks were
  already present (entry 479/pre-existing) — re-verified fresh, no
  changes needed. (7) Added 2 new Mirror Coat live battle-lab fixtures
  (prep-scout §1d: not yet fixtured) and reran
  `tools/probe/verify-fixed-damage-cluster-ground-truth.ts` against the
  live Battle Scene OFF oracle: **all 8 scenarios PASS** (Counter hit
  2→4 both seeds; Mirror Coat hit 16→32 seed 1 / 15→30 seed 4; both
  fail cases 0/0). (8) `npm test` stayed green throughout — no test
  pinned the pre-existing cross-turn staleness bug, so no test needed
  fixing.
- **Side merge (supervisor, same round):** §22 ground truth for the
  SpDefUp/CosmicPower/CalmMind pair staged and merged at `c5d0848` —
  4 live-verified fixtures (`mechanic-factory-ai-cv-spdefup-*`), ledgers
  control 8/8, reach 14/13 (reproduces §18's 5-6-draw anomaly on the
  shared DRAW SITE 4/5 region), CosmicPower ≡ CalmMind numerically
  (same `AI_CV_SpDefUp` body); Gate F `if_in_bytes` inversion vs
  DefenseUp supervisor-verified against raw assembly; verify command
  `node --experimental-strip-types
  tools/probe/verify-factory-ai-checkviability-ground-truth.ts`
  rerun by supervisor: ALL PASS. DRAW SITE 1/2/3 + site 5's empty-last-
  move sub-case documented recipe-only (same status as prior pairs).
- **Next:** SpDefUp/CosmicPower/CalmMind CBM+CV pair **port** (ground
  truth ready, §22); then
  LightScreen/Reflect/EvasionUp/EvasionDown/weather-trio pairs (the last
  8 of 22 CV handlers); §19.5's unstaged AccuracyDown sites 2-6 (need
  mixed movesets); entry 476's §18 5-6-draw window discrepancy (probe
  candidate, sRandCount attribution); ENDTURN_ITEMS2 after Yawn/Thrash.
  Seam — turn-4 `anchorOpponentAfterTurn4Hp` staging gap and seam-scout
  §9 items remain carried from entry 468. Animation program is
  independent now (entry 481's separate supervisor).
- **Notes:** 26 new Tier-1 tests total (13 opcode-level success/failure-
  gate/cross-gate-isolation, 4 full-committed-script live-oracle-pinned
  reproduction, 1 per-turn-clear-across-all-battlers, 2 datahpupdate
  write-through, 2 attack-canceler helper-fixups, 4 misc). DisableStruct
  `isFirstTurn`/rechargeTimer` decrements and substitute-status2 sync
  stayed out of scope per the design doc (noted for a future struct, not
  modeled). No PAPERCUTS this step.

---
## 481 — [USER-DIRECTED 2026-07-26 ~20:00] Separate animation supervisor stood up: `--lane animation` launcher, `animation-main` branch + persistent worktree, session-boundary merge protocol

- **State:** tree committed and green (226 files / 3035 tests, build green —
  unchanged from entry 480; this step is launcher + docs + branch plumbing,
  zero engine/test changes). New branch `animation-main` created at this
  commit with its persistent worktree at `.worktrees/animation-main`
  (npm deps installed, `reference` symlinked, suite green in the worktree).
- **Did:** `run-supervisor.sh` gained `--lane main|animation`: the animation
  lane bootstraps/reuses the persistent worktree, cds into it, gates on
  `ANIMATION_DEFERRED.md` (new, lane-scoped — DEFERRED.md no longer blocks
  animation sessions or vice versa), ensures only the Battle-Scene-ON
  oracle, defaults `POKEBENCH_ORACLE_URL` to ON, and launches with an
  animation-specific prompt pointing at `ANIMATION_SUPERVISOR.md` (new
  guide). Both supervisors may run concurrently, either provider
  (`--provider claude|codex` orthogonal to `--lane`). Merge protocol
  (recorded in both guides): inbound `master`→`animation-main` by the
  animation supervisor at its session start; outbound
  `animation-main`→`master` only by the main supervisor at orient (git
  itself blocks the animation worktree from writing `master` while the main
  tree has it checked out). Worker launching needed zero changes —
  `tools/run-subagent.sh` self-scopes to the tree it's invoked from (lane
  locks, worktrees, branches all base off `animation-main` there).
  SUPERVISOR.md's pause note replaced with the permanent split protocol +
  fold-at-orient instruction; main launcher prompt updated to match.
- **Next:** main program — unchanged (entry 479's list: Counter/Mirror Coat
  per `docs/counter-retaliation-design.md` + ISSUES #46 first). Animation
  program — entry 468's deferred items, now via
  `./run-supervisor.sh --lane animation`: window-2 splice defect class
  (CONFUSION/PSYCHIC each 138/140), PSYCHIC opposite orientation, next
  coverage track from `npm run animation:coverage`.
- **Notes:** the per-move draw cases inside `battleScene.ts` remain the one
  shared surface; carving them into a registry consumed via
  `sceneOnPresentation.ts` is the named follow-up if fold conflicts ever
  stop being boring. First animation session will hit the
  `ANIMATION_PROGRESS.md` layout note (entry 480, archived to
  `PROGRESS-archive.md`) for the new paths.

