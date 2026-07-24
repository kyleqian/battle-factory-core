# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 389 — DRAGON_BREATH projectile gap and hook-catalog overclaim closed

- **State:** S10 remains open. Animation coverage stays **11 exact / 3
  partial / 262 unsupported**; DRAGON_BREATH remains partial for portability
  and separate menu-bounce debt, but its compressed projectile issue #23 is
  removed. Move-to-item/ability joins remain explicitly unsupported.
- **Did:** extracted a modular eleven-spawn Dragon Breath projectile reducer
  and corrected scene composition from source `monbg` plus OAM subpriorities;
  the shared affine sampler did not change. Rejected an incomplete
  named-operand hook join that missed implicit fallthrough, then retained only
  a source-pinned partial inventory of **3 item / 9 ability** dispatch families
  with every per-move category still null.
- **Next:** prove Dragon Breath in both orientations through the shared
  presentation seam. For mechanics, implement `CANCELER_ASLEEP` only after
  its full sleep/Uproar/Early Bird/controller/script ownership is explicit.
  A future hook join needs complete script CFG fallthrough and branch guards.
- **Notes:** fresh ON checks: projectile **61/61**, full Dragon Breath
  **237/237**, ENDEAVOR **237/237**, FLY **213/213**, BOUNCE charge **24/24**.
  Focused animation **279/279**; lane full suite/build/coverage green.
  Parameter manifest regeneration, **6/6** focused, full suite/build, and OFF
  info green. Commits `5706c53` and `519accf`.

---
## 388 — Gate-3 attack-canceler FLAGS source phase integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. `AtkCanceler_UnableToUseMove` now has only its first pure source
  phase; ATTACKCANCELER opcode 0 remains deliberately unregistered.
- **Did:** added the exact `u8` attack-canceler tracker to the shared rules
  context and a frozen typed `CANCELER_FLAGS` decision/receipt. At tracker
  **0**, it clears only attacker `STATUS2_DESTINY_BOND` (bit 25) and
  `STATUS3_GRUDGE` (bit 14), advances once to `CANCELER_ASLEEP` (**1**), and
  replaces nested battler state only when a mask changes.
- **Next:** implement `CANCELER_ASLEEP` only after its complete sleep/Uproar,
  Early Bird, Nightmare, move, script-stack, controller, and effect ownership
  is explicit. Do not loop phases or register opcode 0.
- **Notes:** non-FLAGS trackers are exact identity gates; missing attacker,
  absent-bit identity, unrelated battlers/admission fields, determinism, and
  deep freezing are pinned. No RNG, controller/presentation events, status
  messages/application, PP/damage/Protect/ability/accuracy, or oracle fixture
  was added. Focused **34/34**; Tier-1 **127 files / 1681 tests**, build, OFF
  info, and diff check green. Commit `d72ed7f`; pixel diff N/A.

---
## 387 — Gate-3 action-admission preflight slice integrated

- **State:** S10 Gate 3 remains open with **27** source-safe executable
  opcodes. The first action-admission rules slice is durable; ATTACKCANCELER
  opcode 0 remains deliberately unregistered and incomplete.
- **Did:** extended the single rules context only with source `u16` HP,
  four-slot `u8` PP, `u8` outcome/selected slot, and `u16` current move.
  Two frozen pure checkpoints now own outcome-finished/fainted entry and the
  later selected-PP gate, returning exact PC/action/result/hit-marker receipts
  without skipping the intervening canceler or move-block phases.
- **Next:** add another cancellation family only after its complete tracker,
  state, mutation, controller, and RNG ownership is explicit. Keep opcode 0
  unregistered; defer Protect/intercepts/accuracy, PP deduction, damage,
  status application, round/controller behavior, and presentation.
- **Notes:** exhaustive predicates pin Struggle, allow-no-PP,
  no-attack-string, multi-turn, ordinary PP, priority, determinism, freezing,
  and nested identity. Fresh OFF Mechanics Lab uses legal Magneton and zero
  PP Ups: Toxic naturally reaches **10→0**, then the 11th ordinary selection
  is refused by `CONTROLLER_PRINTSTRINGPLAYERONLY`; this does not claim the
  attack-time no-PP branch executed. Focused **28/28**; Tier-1 **127 files /
  1675 tests**, build, OFF info, manifest/hash audit, and diff check green.
  Commit `e88cc08`; pixel diff N/A.
