# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 394 — Gate-3 attack-canceler TRUANT source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS, ASLEEP,
  FROZEN, and TRUANT decisions only; opcode 0 remains unregistered and no
  phase loop exists.
- **Did:** added only source `u8 truantCounter`, then ported TRUANT's exact
  ability/counter predicate. The taken branch immutably nests
  `CancelMultiTurnMoves`, ORs unable/missed, records `B_MSG_LOAFING`, hands
  off `BattleScript_MoveUsedLoafingAround`, and returns effect 1; all other
  combinations preserve those fields with effect 0. Every path advances once.
- **Next:** implement `CANCELER_RECHARGE` only after its exact recharge status,
  timer, multi-turn cancellation, script, marker, effect, and receipt ownership
  is explicit. Do not loop phases or register opcode 0.
- **Notes:** all four attacker ids, ordinary/Truant abilities, zero and
  representative nonzero `u8` counters, masks already set/unset, helper field
  clearing, identities, determinism/deep freezing, missing roles, and invalid
  widths are pinned. Focused **24/24**; Tier-1 **132 files / 1730 tests**,
  build, OFF info (`9c89c741…`), and diff check green. Code commit `abc915f`;
  pixel diff N/A.

---
## 393 — Gate-3 attack-canceler FROZEN source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS, ASLEEP, and
  FROZEN decisions only; opcode 0 remains unregistered and no phase loop exists.
- **Did:** added source-derived `gBattleMoves[gCurrentMove].effect` to the
  rules context, then ported FROZEN's conditional named `Random() % 5` draw,
  ordinary frozen cancellation/no-attack-string handoff, thaw-hit continuation,
  and successful thaw/internal-status clear/cursor/message handoff. Corrected
  every FROZEN receipt to record no status-controller request: this source
  phase never emits one, and `BattleScript_MoveUsedUnfroze` later owns
  `updatestatusicon`. Every path stops at `CANCELER_TRUANT`.
- **Next:** implement `CANCELER_TRUANT` only after its exact ability/counter,
  multi-turn cancellation, result flag, script/message, and receipt ownership
  is explicit. Do not loop phases or register opcode 0.
- **Notes:** every RNG remainder, ordinary vs both `EFFECT_THAW_HIT` moves,
  zero-PP-Up base PP, status/marker preservation, status-controller absence
  across every outcome, source cursor semantics, identity, validation,
  determinism, and deep freezing are pinned. Exact-phase source audit found no
  further discrepancy. Repair-focused **17/17**; Tier-1 **131 files / 1723
  tests**, build, OFF info (`9c89c741…`), and diff check green. Code commits
  `883b6e7` + `4aa41ce`; pixel diff N/A.

---
## 392 — CANCELER_ASLEEP Uproar ownership repair audited

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. FLAGS and ASLEEP remain the only attack-canceler phases; opcode 0
  is unregistered and no phase loop, FROZEN, RNG, or controller mutation was
  added.
- **Did:** added the selected target role required by the real call and made
  Uproar receipts own all source side effects. `gBattleScripting.battler`
  persists; `gBattlerTarget == 0xFF` is rejected and typed as unreachable
  because `HandleAction_UseMove` selects it before installing the move script;
  relation-based chooser writes are recorded as synchronous intermediates
  overwritten by `B_MSG_WOKE_UP_UPROAR` before any handoff.
- **Next:** implement `CANCELER_FROZEN` only after its exact move-effect, RNG,
  status, controller, script, cursor, and receipt ownership is explicit. Do
  not loop phases or register opcode 0.
- **Notes:** all **4 Uproar sources × 4 reachable targets**, same/different
  relations, first-source order, target identity, sentinel rejection, and
  deep freezing are pinned. The zero-PP-Up OFF fixture is unchanged. Focused
  **56/56**; Tier-1 **130 files / 1715 tests**, build, OFF info
  (`9c89c741…`), and diff check green. Code commit `6b36535`; pixel diff N/A.
