# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 430 — [SUPERVISOR] round-2 merges: KO/crit ground truth + generic anim primitives

- **State:** merged tree green at **177 files / 2045 tests**, build green, at
  `65727ac`. Round 2 landed: main RUNG 1 of the hit chain (entry 429), side
  KO/crit edge ground truth, and animation's stop-and-split verdict plus two
  generic primitive ports.
- **Did (merges + docs):** folded `worker/side-20260724-154507` —
  `mechanic-hit-chain-ko-off.json` (both `tryfaintmon` branches from real ROM
  captures: non-terminal faint → switch-in, last-mon faint → terminal WIN with
  `battleOutcome` 0→1) + `mechanic-hit-chain-crit-off.json` (1/16 crit
  denominator confirmed; **found `damageCalc.ts` has no crit ×2 step** — the
  multiplier applies in `Cmd_damagecalc` *before* `Cmd_typecalc`,
  battle_script_commands.c:1290) + `verify-hit-chain-edges.ts`
  (supervisor-rerun: exit 0) — and the stacked animation chain
  `worker/animation-20260724-154508`+`155546`: MIST_BALL enumerated to a
  STOP-AND-SPLIT verdict (the minimal interpreter does **not** cheaply
  generalize; 6 substantive items incl. two new subsystems; WHITE_FEATHER
  component edge is dead code), then generic `AnimTask_ShakeMon` +
  linear-translation Q8.8 ports landed with QUICK_ATTACK/FIRE_PUNCH re-driven
  through them (all six portable comparators supervisor-rerun at recorded
  counts; FLY's ShakeMon instance left hand-fit with a pinned one-tick
  divergence). Two new PAPERCUTS entries (button busy/idle signal; comparator
  round-trip cost).
- **Next:** round 3 — main: RUNG 2 (`critcalc`/`damagecalc`/`typecalc`/
  `adjustnormaldamage`, consuming the crit-placement ground truth); animation:
  FLY ShakeMon alignment calibration, then wire `AnimThrowMistBall` (stretch).
- **Notes:** side lane idle in round 3 by choice (no gate-passing bounded
  probe; the 10-roll switch-in/AI attribution flagged in the docs serves step
  (iv), not the next registration).

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

