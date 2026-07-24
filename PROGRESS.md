# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 371 — Gate-3 source-exact random multi-hit counter integrated

- **State:** S10 Gate 3 remains open with **13** source-safe opcodes and an
  unwired immutable control/scheduler/rules/RNG/source-context seam.
- **Did:** added only `SETMULTIHITCOUNTER` (opcode 141): nonzero u8 operands
  replace frozen `multiHitCounter` with no draw; zero follows the exact
  one/two-draw `Random() & 3` branch through the audited RNG ledger. Pinned
  `Cmd_setmultihitcounter`, its two-byte macro, and all real values (**0/2/2**).
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Do not add damage, attack loops, PP, production
  controller/rendering, animation, pixels, or other opcodes.
- **Notes:** exact supported IDs are
  **16/18/38/39/40/57/58/60/61/62/65/131/141**. Tier-1 **111 files / 1504
  tests**, focused **42/42**, build, and Scene-OFF oracle contract green;
  exact u32 RNG advancement/reasons/provenance are pinned with no pixel claim.

---
## 370 — Gate-3 conditional multi-hit decrement integrated

- **State:** S10 Gate 3 remains open with **12** source-safe opcodes and an
  unwired immutable control/scheduler/rules/source-context seam.
- **Did:** added only `DECREMENTMULTIHIT` (opcode 39): u8 pre-decrement
  immutably replaces frozen `multiHitCounter`, zero falls through, and nonzero
  resolves the one 4-byte operand through typed program labels. Pinned all
  three real loop targets, counts **1/2/3**, 0→255 wrap, repeat branching,
  source provenance, and source-first mutation on invalid-target halt.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Do not add random/setmultihitcounter selection, damage,
  attack loops, PP, production controller/rendering, animation, or pixels.
- **Notes:** exact supported IDs are
  **16/18/38/39/40/57/58/60/61/62/65/131**. Tier-1 **111 files / 1487 tests**,
  focused **26/26**, build, and Scene-OFF oracle contract green; scheduler/
  RNG/event identities are pinned and there is no pixel claim.

---
## 369 — Gate-3 first immutable rules mutation integrated

- **State:** S10 Gate 3 remains open with **11** source-safe opcodes and an
  unwired immutable control/scheduler/rules/source-context seam.
- **Did:** added only `SETMULTIHIT` (opcode 38) behind the generic interpreter:
  its injected byte resolver immutably replaces frozen `multiHitCounter`, null
  identity-blocks, and malformed/non-u8 values structured-halt. Pinned
  `Cmd_setmultihit`, its macro, and all three real values (**3/1/2**).
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Do not add decrement/multihitloop, damage, move
  selection, PP, production controller/rendering, animation, or other opcodes.
- **Notes:** exact supported IDs are
  **16/18/38/40/57/58/60/61/62/65/131**. Tier-1 **111 files / 1474 tests**,
  build, and Scene-OFF oracle contract green; no RNG/event/scheduler or pixel
  claim.
