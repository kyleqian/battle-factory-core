# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 394 — Gate-3 attack-canceler TRUANT source phase integrated and repaired

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS, ASLEEP,
  FROZEN, and TRUANT decisions only; opcode 0 remains unregistered and no
  phase loop exists.
- **Did:** modeled the exact source bitfield
  `DisableStruct::u8 truantCounter:1` as `0 | 1`, rejecting values outside
  that domain, then ported TRUANT's exact ability/counter predicate. The taken
  branch immutably nests `CancelMultiTurnMoves`, ORs unable/missed, records
  `B_MSG_LOAFING`, hands off `BattleScript_MoveUsedLoafingAround`, and returns
  effect 1; all other combinations preserve those fields with effect 0. Every
  path advances once.
- **Next:** implement `CANCELER_RECHARGE` only after its exact recharge status,
  timer, multi-turn cancellation, script, marker, effect, and receipt ownership
  is explicit. Do not loop phases or register opcode 0.
- **Notes:** all four attacker ids × the exhaustive one-bit domain **0/1**,
  ordinary/Truant abilities, masks already set/unset, helper field clearing,
  identities, determinism/deep freezing, missing roles, and invalid widths are
  pinned; **2, 7, and 255** are explicitly rejected. A bounded comparison with
  `battle_util.c` and `battle.h` found no other TRUANT-phase source discrepancy;
  helper behavior/receipts are unchanged. Focused **2 files / 23 tests**;
  Tier-1 **132 files / 1730 tests**, build, OFF info (`9c89c741…`), and diff
  check green. Code commits `abc915f` + repair `50e2332`; pixel diff N/A.
