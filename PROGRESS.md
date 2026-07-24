# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 429 — S10 step (ii) RUNG 1: accuracycheck, attackstring, ppreduce registered

- **State:** RUNG 1 of the sixteen-opcode hit chain is complete and green at
  **175 files / 2040 tests**, build green. `createBattleScriptStatusRulesHandlers`
  now composes **32** opcodes (was 29): `accuracycheck`, `attackstring`,
  `ppreduce` (new `battleScriptHitChainOpcode.ts`) plus opcode 0's tail fix
  below. A staged turn runs opcode 0 → accuracycheck → attackstring → ppreduce
  for both hit and miss, matching the banked ground truth's RNG pattern
  (exactly one `Random()` call at accuracycheck either way) and PP delta, then
  hands off cleanly: hit → `critcalc` (unregistered, correct RUNG-2 boundary),
  miss → `pause` (already registered by a prior session).
- **Did:** `accuracycheck` is source-complete for the `ACC_CURR_MOVE` argument
  form (54/55 hit-chain-relevant call sites) — stat-stage accuracy formula
  (reused `damageCalc.ts` unchanged), the real Protect branch, semi-invulnerable
  `STATUS3` branches, always-hit moves, `TrySetDestinyBondToHappen`, and
  `CheckWonderGuardAndLevitate` (Levitate + type-immunity incl. the
  Foresight-vs-Ghost exception). Added three small battler fields the same way
  prior MOVEEND checkpoints did (`protected`, `types`, `ppNotAffectedByPressure`)
  plus a `set-battler-pp-data` semantic event kind for `ppreduce`'s real PP
  controller sync. Four branches are explicit `unsupported-branch` barriers,
  each Tier-1-reachability-tested: the `NO_ACC_CALC`/`NO_ACC_CALC_CHECK_LOCK_ON`/
  explicit-deferred-move top branch (not on the hit chain), `STATUS3_ALWAYS_HITS`
  Lock-On (`battlerWithSureHit` unmodeled), a nonzero target ability on a hit
  (`AbilityBattleEffects(ABILITYEFFECT_ABSORBING)` unmodeled beyond ability
  none), and the target's Enigma Berry evasion `holdEffectParam`. **Fixed an
  over-broad barrier found while wiring this rung:** opcode 0's tail
  `DEFENDER_IS_PROTECTED` check previously halted *unconditionally* once
  Snatch/Lightning Rod passed — even the common "target isn't protected" case
  — which meant no healthy attacker's turn could ever reach the hit chain at
  all. It now evaluates the real predicate (Protect flag + the `MOVE_CURSE`/
  Ghost exception + `IsTwoTurnsMove` gating) and applies `CancelMultiTurnMoves`
  + the miss flags on a genuine Protect success, advancing otherwise — this,
  not a hit-chain opcode itself, is what actually unblocks the chain.
- **Next:** RUNG 2 — register `critcalc`, `damagecalc`, `typecalc`,
  `adjustnormaldamage`, consuming `damageCalc.ts`'s already-pinned
  `getCriticalHitChanceStage`/`rollIsCriticalHit`/`calculateBaseDamage`/
  `applyStab`/`applyTypeEffectiveness`/`applyRandomDamageMultiplier` as-is.
  The new `types` battler field and `resolveBattleScriptMoveType` are already
  in place for `typecalc`/`damagecalc`'s STAB and type-effectiveness needs.
  RUNGS 3–4 (attackanimation..resultmessage; seteffectwithchance,
  tryfaintmon) remain after that. Opcode 73 (moveend) is still the step-(iii)
  boundary, not this step's.
- **Notes:** this rung alone took the full session (deep per-branch source
  tracing for `Cmd_accuracycheck`'s helpers plus the opcode-0 tail bugfix
  needed to make the chain reachable at all) — RUNGS 2–4 did not start.
  `isDefenderProtected` is exported from the new hit-chain module and reused
  by `battleScriptAttackCancelerOpcode.ts` rather than duplicated. No
  presentation/render/`battleScene` edits; no oracle traces (Tier-1 only, per
  the banked ground truth).

---
## 428 — [SUPERVISOR] round-1 merges: hit-chain ground truth + anim interpreter

- **State:** merged tree green at **174 files / 2020 tests**, build green.
  Round 1 of the 2026-07-24 supervised session landed all three lanes:
  opcode 0 registered (entry 427), hit-chain ground truth banked, and the
  user-directed anim-script interpreter spike **succeeded** on FEATHER_DANCE.
- **Did (merges + docs):** folded `worker/side-20260724-150930` —
  `tools/probe/verify-hit-chain-ground-truth.ts` + `docs/hit-chain-ground-truth.md`
  (supervisor-rerun: exit 0, all PASS; hit = exactly 4 attributed `Random()`
  rolls, miss = 1; ROM damage matches `damageCalc.ts` exactly) — and
  `worker/animation-20260724-150928` — FEATHER_DANCE now runs a minimal
  script interpreter + 1:1 `AnimFallingFeather` port instead of replaying
  recorded probes (973/973 RAM fields per turn; comparators 235/235, 145/145,
  162/162 at recorded counts, feather self-destroy ticks 7557/8591/9637
  reproduced with zero per-turn constants). Deleted ISSUES #40 (retired).
  ROADMAP step (ii) corrected: no `orbyte` on the EffectHit miss path
  (supervisor source-verified, `battle_scripts_1.s:244`); eighteen total
  registrations.
- **Next:** round 2 — main: register the sixteen hit-chain opcodes as ordered
  rungs against the banked verify script; side: KO/faint + crit edge ground
  truth via `overrides.parties` (OFF oracle restarted to pick up harness
  `b30c5d8`); animation: interpreter generalization on MOVE_MIST_BALL
  (white-feather track).
- **Notes:** both stale oracle services (started 08:26, predating today's
  14:10 `overrides.parties` harness commit) restarted by the supervisor while
  all lanes were idle.

---
## 427 — opcode 0 (Cmd_attackcanceler) registered in the production machine

- **State:** S10 step (i) is complete. Opcode 0 is registered in
  `createBattleScriptStatusRulesHandlers` (`battleScriptAttackCancelerOpcode.ts`),
  composing the entry preflight, the 14-phase `AtkCanceler_UnableToUseMove`
  loop, the ability-moves-block/selected-PP/Factory-obedience join chain, and
  Magic Coat's bounce check into one real dispatcher. Six branches halt
  explicitly via a new `unsupported-branch` `BattleScriptHaltReason` instead
  of falling through: `gBattleOutcome`'s `B_ACTION_FINISHED` round-controller
  handoff (out of scope), `CANCELER_IN_LOVE`'s immobilized-by-love
  `BattleScriptPush(explicit label)` (the machine's call stack only models
  resume-at-this-PC, not an arbitrary return address), Magic Coat's
  unimplemented `PressurePPLose`, the Snatch loop, Lightning Rod redirection,
  and the final `DEFENDER_IS_PROTECTED` check (needs unmodeled battler-type/
  two-turn-move data). Suite is **173 files / 2016 tests**, build green.
- **Did:** wired the fifteen existing phase reducers (flags through thaw, plus
  PP) and `battleScriptAttackCanceler.ts`'s loop/`battleScriptMagicCoat.ts`
  into opcode 0 (`d74df11`). Added Tier-1 coverage driving the *registered
  opcode*, not the standalone reducers, through all 15 phase transfers and
  all 6 barriers (`f4e726e`) — Snatch/Lightning Rod barriers are
  Tier-1-constructed per the S10 testability decision, since real Factory
  data never sets `stealMove`/`lightningRodRedirected` (evidence already
  pinned in `attackCancelerMagicCoatSnatchAudit.test.ts` /
  `attackCancelerLightningRodProtectAudit.test.ts`). Rewired the staged
  asleep-move adapter to start its machine at the move's own entry (real
  opcode 0) instead of hand-calling the canceler loop; pins gained the
  post-loop `REQUEST_STATUS_BATTLE` controller-sync event
  (`set-battler-status-data`, battle_util.c:2270-2274) the manual adapter
  never modeled (`4809f06`). Updated the stale "28 registered opcodes" pin
  to 29.
- **Next:** S10 step (ii) — register the sixteen-opcode standard hit chain
  (`accuracycheck` through `tryfaintmon`) plus `orbyte` on the miss branch.
  A concurrent side-lane commit (`0b3fe0c`, landed mid-session, not mine)
  already corrected ROADMAP's count to **eighteen** registrations for a
  complete damaging move and cites `tools/probe/verify-hit-chain-ground-truth.ts`
  — read that before starting.
- **Notes:** enumerated remainder from this step: Snatch/Lightning Rod/Protect/
  `PressurePPLose`/the round-controller handoff are (b) barriers, not (a)
  ports — completing any of them is new-mechanics work (battler type data,
  two-turn-move gating, real PP-loss execution with a controller emission,
  `B_ACTION_FINISHED` consumption) explicitly out of this step's scope. No
  presentation/render files touched.

---
