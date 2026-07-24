# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 399 — S10 battle-kernel and trainer-AI architecture checkpoint queued

- **State:** the run is clean and green at **137 files / 1751 tests** with
  S10 Gate 3 still at **27** source-safe executable opcodes. The script machine
  is immutable and unit-testable, but no complete battle-level
  state/decision/result boundary or independently executable trainer AI exists.
- **Did:** recorded the user's S10 acceptance decision: RNG lives in immutable
  battle state after initialization; one submitted requested decision returns
  state, semantic events, and the next decision/outcome; forced switches are
  decision boundaries; presentation acknowledgements cannot own rules/RNG.
  Emerald AI is an injected pure policy over a source-faithful view, legal
  decisions, Factory policy, and explicit RNG.
- **Next:** before `CANCELER_IMPRISONED` or wider opcode breadth, brief one
  bounded Sol/high main-lane architecture step to publish and Tier-1 pin the
  battle-level decision-boundary ABI around the existing script machine. Keep
  production `core.ts` integration, AI implementation, further opcodes, and
  presentation migration out of that first step. A disjoint side audit may
  map native AI view/history/RNG/switch-item dependencies; animation may
  continue BIND's opposite orientation independently.
- **Notes:** unit-test builders may construct validated transient states; the
  Oracle still may not inject them. Current smells to contain rather than
  extend are the 16k-line `battleScene.ts`, legacy `turnNResolved`/absolute-tick
  production path, 1.9k-line canceler module, growing monolithic rules context,
  and move-specific Scene-ON dispatch. No code, tooling, or oracle lifecycle
  changed in this handoff; no deferred user decision is open.

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
