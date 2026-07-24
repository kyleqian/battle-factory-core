# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 431 — S10 step (ii) RUNG 2: critcalc, damagecalc, typecalc, adjustnormaldamage registered

- **State:** RUNG 2 of the sixteen-opcode hit chain is complete and green at
  **177 files / 2072 tests**, build green. `createBattleScriptStatusRulesHandlers`
  now composes **36** opcodes (was 32): `critcalc`, `damagecalc`, `typecalc`,
  `adjustnormaldamage` (all in `battleScriptHitChainOpcode.ts`, reusing
  `damageCalc.ts`'s pinned functions as-is). A staged hit turn now runs
  opcode 0 → accuracycheck → attackstring → ppreduce → critcalc → damagecalc →
  typecalc → adjustnormaldamage and hands off cleanly at `attackanimation`
  (still unregistered, the correct RUNG-3 boundary).
- **Did:** `critcalc` computes the real critChance stage (Focus Energy,
  high-crit moves, Scope Lens, species-gated Lucky Punch/Stick) and the
  Battle Armor/Shell Armor/`STATUS3_CANT_SCORE_A_CRIT`/tutorial-battle
  immunity gate as a genuine C `&&` short-circuit — immunity now consumes
  **zero** RNG, matching the source exactly rather than wasting a roll.
  `damagecalc` applies the crit ×2 step (`gCritMultiplier`) and
  `dmgMultiplier` in the correct position — **before** `typecalc`'s STAB/type
  scaling, per entry 429/430's crit-placement finding — plus Charge's
  Electric ×2 and Helping Hand's 1.5x. `typecalc` is source-complete: STAB,
  the type-effectiveness loop with real `TYPE_MUL_*` → `gMoveResultFlags`
  toggling (super/not-very-effective cancel-out), the Foresight-vs-Ghost
  immunity skip (typecalc's own independent branch, kept consistent with
  RUNG 1's `CheckWonderGuardAndLevitate`), Levitate-vs-Ground's short-circuit,
  Wonder Guard's own miss branch, and the `MOVE_STRUGGLE` no-op. `adjustnormaldamage`
  runs `ApplyRandomDmgMultiplier` unconditionally then the real False
  Swipe/Endure HP-clamp-to-1 (`MOVE_RESULT_FOE_ENDURED`); Focus Band's own
  roll is a `(b)` barrier **gated on the item actually being held**
  (`resolveBattleScriptBattlerHoldEffect === HOLD_EFFECT_FOCUS_BAND`), never
  on the plain path — verified by a same-shape non-Focus-Band-item test that
  still advances normally. Added six new battler fields the same way prior
  checkpoints did: `species`, `attack`, `defense`, `spAttack`, `spDefense`,
  `level` (required, `?? 0` defaults — `CalculateBaseDamage`'s raw stat
  inputs, previously entirely unmodeled in the rules context) plus `endured`/
  `helpingHand` (optional ProtectStruct bits, same pattern as `bounceMove`
  etc.). All pinned arithmetic from `docs/hit-chain-ground-truth.md`
  reproduces exactly via an inverse-LCG test helper (`ISO_RANDOMIZE1` is a
  bijection mod 2**32, so a target u16 roll's exact seed is solved, not
  searched): non-crit Tackle 16→15, crit 7→14→7→6, and — as the primary
  integration test — the KO scenario's **real ROM frame-0 seed 919694434**
  reproducing 142→213→213→204 with the exact 3-roll ledger
  (accuracycheck/critcalc/adjustnormaldamage, in order).
- **Next:** RUNG 3 — register `attackanimation..resultmessage` (the
  presentation/message-only middle of the hit chain: `waitanimation`,
  `effectivenesssound`, `hitanimation`, `healthbarupdate`, `datahpupdate`,
  `critmessage`, `resultmessage`). Then RUNG 4 (`seteffectwithchance`,
  `tryfaintmon` — roll 4 stays unconsumed by this rung, exactly as ground
  truth reserves it). Opcode 73 (moveend) remains the step-(iii) boundary.
- **Notes:** three pre-existing tests broke on the new required battler
  fields (two `toStrictEqual`-against-raw-input attackcanceler tests, one
  registration-count pin) and were fixed in the same commit, not left red.
  No presentation/render/`battleScene` edits; no oracle traces (Tier-1 only,
  per the banked ground truth); `damageCalc.ts` untouched, exactly as
  directed.

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

