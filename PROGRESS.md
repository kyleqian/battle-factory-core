# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 368 — Gate-3 scheduler family + mechanical command audit integrated

- **State:** S10 Gate 3 remains open with ten source-safe opcodes and an
  unwired immutable scheduler/controller/source-context seam.
- **Did:** accepted source-exact `PRINTSTRING`/`WAITMESSAGE`/`PAUSE`, including
  controller block, shared-u16 counter progress/wrap, and display-latch
  lifecycle. Added a lossless mechanical audit joining all **249** handlers
  to all **3306** concrete starts; its deliberately narrow lexical rule finds
  **22** fixed-literal-advance candidates without claiming runtime safety.
- **Next:** use the audit to choose one bounded source family whose complete
  battle context is explicit. Keep unsupported commands structured; do not
  wire production controllers/renderers or touch the independent PP work.
- **Notes:** exact supported IDs remain
  **16/18/40/57/58/60/61/62/65/131**. Tier-1 **110 files / 1461 tests** and
  build green; no new oracle/pixel claim.

---
## 367 — Gate-3 immutable scheduler state + wait commands

- **State:** S10 Gate 3 remains open with ten source-safe opcodes and an
  unwired immutable scheduler/controller/source-context seam.
- **Did:** modeled logical `MSG_DISPLAY` and shared `gPauseCounterBattle`
  state, plus budget-consuming same-PC scheduler progress distinct from
  identity-preserving external block. Added source-exact `WAITMESSAGE` and
  `PAUSE` with injected u16 operand resolution; `PRINTSTRING` now owns the
  display-active lifecycle while rules, RNG, and presentation stay isolated.
- **Next:** add another bounded source-mapped semantic family only when its
  complete battle context is explicit; do not wire production controllers or
  renderers and do not add message pixels/substitution here.
- **Notes:** exact supported IDs are
  **16/18/40/57/58/60/61/62/65/131**; committed IR remains **3306**.
  Tier-1 **109 files / 1455 tests** and build green; no new oracle/pixel claim.
