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
- **Next:** SpDefUp/CosmicPower/CalmMind CBM+CV pair (staging groundwork
  flagged in entry 477's side-merge note: separate CBM handlers
  `:576-593`, Gate F `if_in_bytes` INVERTED vs DefenseUp); then
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
  `ANIMATION_PROGRESS.md` layout note (entry 480) for the new paths.

---
## 480 — [USER-DIRECTED 2026-07-26 ~19:20] Animation lane modularized: `src/animation/` + `tests/animation/` split out of the engine

- **State:** tree committed and green at **226 files / 3035 tests** (entry
  479's 225/3032 + the new boundary-ratchet file's 3 tests), build green.
  Pure mechanical move — zero behavior changes, all existing tests pass
  unmodified apart from import paths.
- **Did:** moved the 39 animation-lane-owned modules (per-move bodies +
  anim helpers + `sceneOnPresentation.ts`) from `src/engine/` to
  `src/animation/`, and their 34 test files (+ `factoryAnimationInventory`)
  to `tests/animation/`. Ownership was derived mechanically from merge
  history + consumer analysis: every moved module was imported only by
  `battleScene.ts`, `core.ts`, or sibling animation modules.
  `ballAnim`/`kabutoSendOut`/`magbySendOut`/`summaryFrontAnimation` stay in
  the engine (draft/send-out canonical flow, not animation-lane). Tools did
  NOT move (`tools/compare` is mixed shared/animation; recorded evidence
  commands stay rerunnable) — their imports were rewritten in place, as were
  path strings in `ANIMATION_COVERAGE.json`/`ANIMATION_PROGRESS.md` and the
  generated `battle-move-anim-scripts.json` (extractor updated to match).
  New `tests/animation/animationBoundaryRatchet.test.ts` pins the boundary:
  animation→engine imports allowed only for
  `battleMenu.ts`/`bg.ts`/`rng.ts` (shared infra); animation never imports
  the kernel/AI; engine consumes animation only from
  `battleScene.ts`+`core.ts`. Widening any list is an explicit decision.
- **Next:** unchanged from entry 479 (Counter/Mirror Coat etc.). This split
  is groundwork for the animation-lane-as-separate-supervisor plan the user
  is evaluating (see the directive note above); the animation lane itself
  stays paused.
- **Notes:** future animation work lives under `src/animation/**` +
  `tests/animation/**`; the per-move draw cases inside `battleScene.ts`
  remain the one shared surface (carving them into a registry is the named
  follow-up if the separate-supervisor plan proceeds).

