# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  Focused **4 files / 39 tests**; Tier-1 **135 files / 1744 tests**, build,
  OFF info (`9c89c741…`), and diff check green. Pixel diff N/A.

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

---
## 395 — Gate-3 attack-canceler RECHARGE source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS, ASLEEP,
  FROZEN, TRUANT, and RECHARGE decisions only; opcode 0 remains unregistered
  and no phase loop exists.
- **Did:** audited `DisableStruct::u8 rechargeTimer` and ported the exact
  `STATUS2_RECHARGE` branch: clear only recharge, zero its timer, invoke
  `CancelMultiTurnMoves`, OR unable-to-use, and hand off
  `BattleScript_MoveUsedMustRecharge` with effect 1. The untaken branch
  preserves those fields with effect 0. Every path advances once.
- **Next:** implement `CANCELER_FLINCH` only after its exact status,
  multi-turn cancellation, script/message, marker, effect, and receipt
  ownership is explicit. Do not loop phases or register opcode 0.
- **Notes:** all four attacker ids, set/unset recharge, timer boundaries
  **0/255**, unrelated status bits, already-zero/helper identities, marker,
  script-owned `STRINGID_PKMNMUSTRECHARGE`, missing roles, invalid u8/PC
  widths, determinism, and deep freezing are pinned. The source has no
  `B_MSG_MUST_RECHARGE` chooser write. Focused **4 files / 39 tests**;
  Tier-1 **133 files / 1734 tests**, build, OFF info (`9c89c741…`), and diff
  check green. Code commits `d3a42c6` + repair `6b98729`; pixel diff N/A.
