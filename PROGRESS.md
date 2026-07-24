# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 398 — Gate-3 attack-canceler TAUNTED source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS through
  TAUNTED decisions only; opcode 0 remains unregistered and no phase loop exists.
- **Did:** added source-derived u8 `gBattleMoves[gCurrentMove].power`,
  `DisableStruct::tauntTimer:u8:4`, and `ProtectStruct::usedTauntedMove:1`.
  Ported battle_util.c 2134-2145 exactly through the immutable multi-turn
  helper, taunted script handoff, unable marker, effect 1, and one advance.
- **Next:** begin `CANCELER_IMPRISONED` only after its imprisoned-move
  predicate, protect flag, helper, script, marker, effect, and receipts are
  explicit. Do not loop phases or register opcode 0.
- **Notes:** zero PP Ups; timer **0/15** and invalid **16+**, generated
  zero/nonzero power, both flag values, all four battlers, presets/identities,
  missing role, u32 PC, deterministic deep freezing, and receipt ownership are
  pinned. Focused **4 files / 39 tests**; integrated Tier-1 **137 files / 1751
  tests**, build, and OFF v5 info (`9c89c741…`) green. Code commit `26d9a8b`;
  pixel diff N/A.

---
## 397 — Gate-3 attack-canceler DISABLED source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS, ASLEEP,
  FROZEN, TRUANT, RECHARGE, FLINCH, and DISABLED decisions only; opcode 0
  remains unregistered and no phase loop exists.
- **Did:** modeled `DisableStruct::u16 disabledMove`,
  `ProtectStruct::usedDisabledMove:1`, and persistent typed
  `gBattleScripting.battler` ownership in the rules context. Ported the exact
  two-clause predicate and taken order through immutable
  `CancelMultiTurnMoves`, `BattleScript_MoveUsedIsDisabled`, unable marker,
  effect 1, and one advance to `CANCELER_TAUNTED`.
- **Next:** implement `CANCELER_TAUNTED` only after its timer, move-power,
  protect flag, multi-turn cancellation, script, marker, effect, and receipt
  ownership is explicit. Do not loop phases or register opcode 0.
- **Notes:** full u16 boundaries **0/1/255/256/65535**, both predicate clauses,
  both one-bit values across all four attacker ids, all scripting battler ids,
  pre-set helper/marker/flag states, identities, missing attacker/persistent
  selector, invalid widths, determinism, and deep freezing are pinned.
  Focused **4 files / 39 tests**; integrated Tier-1 **136 files / 1747
  tests**, build, OFF/ON v5 info (`9c89c741…`), and diff check green. Code
  commits `4113388` + receipt lock `741bf77`; pixel diff N/A.

---
## 396 — Gate-3 attack-canceler FLINCH source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS, ASLEEP,
  FROZEN, TRUANT, RECHARGE, and FLINCH decisions only; opcode 0 remains
  unregistered and no phase loop exists.
- **Did:** modeled `ProtectStruct::u32 flinchImmobility:1` as validated `0 | 1`
  and ported the exact `STATUS2_FLINCHED` branch: clear only flinch, set the
  protect flag, then invoke `CancelMultiTurnMoves`, hand off
  `BattleScript_MoveUsedFlinched`, OR unable-to-use, and return effect 1.
  The untaken branch preserves all owned fields with effect 0; every path
  advances once to `CANCELER_DISABLED`.
- **Next:** implement `CANCELER_DISABLED` only after its disabled-move,
  protect/scripting-battler, multi-turn cancellation, script, marker, effect,
  and receipt ownership is explicit. Do not loop phases or register opcode 0.
- **Notes:** both one-bit values across all four attacker ids, pre-set helper
  fields, unrelated status/admission fields, already-set marker/protect
  identities, missing roles, invalid one-bit/PC widths, determinism, deep
  freezing, and absence of message/RNG/controller/animation/opcode effects are
  pinned. Source lines 2110-2121 match the brief and own no message chooser.
  Focused **4 files / 38 tests**; Tier-1 **134 files / 1739 tests**, build, OFF
  info (`9c89c741…`), and diff check green. Code commit `050fd88`; pixel diff
  N/A.
