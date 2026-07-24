# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 386 — FLY terrain occlusion closes the last excluded charge frames

- **State:** S10 remains open; animation coverage is now **11 exact / 3
  partial / 262 unsupported**. FLY is exact in both legal orientations and
  the canonical Scene-ON window; ISSUES #34 is removed.
- **Did:** added an optional bottom clip to the generic affine-sprite blitter
  and reused the already-evidenced opponent terrain cutoff in the canonical
  layered FLY path. No affine table, sampler equation, move outcome, status,
  PP, RNG, controller rule, or absolute-tick branch changed.
- **Next:** continue the Level-50 animation queue with DRAGON_BREATH while the
  OFF lane extends the source-shaped rules context by a fully evidenced
  family. DIVE still needs independent dense evidence.
- **Notes:** canonical FLY charge/miss **213/213**; portable opponent
  **151/151 + 248/248** and player **147/147 + 244/244**, all with zero
  exclusions. Focused animation tests **304/304**, Tier-1 and build green in
  the lane. Fresh Bounce outcome probes changed on the refreshed Mechanics
  Lab even on the untouched base, so no animation claim or policy change was
  made from those outcomes. Commit `4b9cd44`.
