# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 391 — Gate-3 attack-canceler ASLEEP source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has immutable FLAGS and ASLEEP
  decisions only; ATTACKCANCELER opcode 0 remains unregistered and no phase
  loop exists.
- **Did:** extended each rules battler only with source `u8` ability, then
  implemented complete `CANCELER_ASLEEP` predicates/effects through a frozen
  receipt: sleep decrement, four-battler Uproar/Soundproof scan, Early Bird,
  Snore/Sleep Talk, Nightmare/wake scripts and chooser, unable marker, effect
  2 status-write request, cursor push, and tracker advance to FROZEN.
- **Next:** implement `CANCELER_FROZEN` only after its exact move-effect, RNG,
  status, controller, script, cursor, and receipt ownership is explicit. Do
  not loop phases or register opcode 0.
- **Notes:** all sleep counters × ordinary/Early Bird × ordinary/Snore/Sleep
  Talk, every Uproar position/order, Soundproof, underflow guard, identity,
  preservation, determinism/freezing, and invalid roles/widths are pinned.
  Fresh zero-PP-Up OFF lab proves Sleep Powder creates counter **4**, canceled
  Tackle decrements it **4→3**, PP/HP stay **35/136**, and RNG stays
  **4106679800** across admission. Focused **55/55**; Tier-1 **130 files /
  1708 tests**, build, OFF info, manifest/hash audit, and diff check green.
  Commit `b1cd7d3`; pixel diff N/A.

---
## 390 — Shared CancelMultiTurnMoves helper integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. The source helper is durable but deliberately uncalled;
  ATTACKCANCELER opcode 0 remains unregistered and no canceler loop exists.
- **Did:** extended each of the four rules battlers with only source-width
  `rolloutTimer` (4-bit) and `furyCutterCounter` (`u8`), then added a pure
  immutable helper that clears status2 mask **0x1f70**, only semi-invulnerable
  status3 mask **0x000400c0**, and both selected-battler counters. Its typed
  frozen receipt records every before/after value.
- **Next:** implement `CANCELER_ASLEEP` only after its complete sleep/Uproar,
  Early Bird, Nightmare, move, script-stack, controller, and effect ownership
  is explicit. Do not call this helper from FLAGS, loop phases, or register
  opcode 0.
- **Notes:** all individual masks, all **15** non-empty status2 combinations,
  each status3 constituent, four-battler selection, identity/replacement,
  unrelated HP/PP/status/admission preservation, determinism/freezing, and
  invalid ids/widths are pinned. Focused **46/46**; Tier-1 **129 files / 1698
  tests**, build, OFF info, and diff check green. Commit `5efca53`; pixel diff
  N/A and no oracle fixture added.
