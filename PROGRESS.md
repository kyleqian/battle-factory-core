# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 381 — Gate-3 WAITANIMATION controller barrier integrated

- **State:** S10 Gate 3 remains open with **24** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** added only `WAITANIMATION` (opcode **10 / 0x0a**) as the exact
  zero-operand `gBattleControllerExecFlags` barrier: idle advances one
  instruction/one source byte; busy identity-blocks and retries at the same
  instruction. It owns no animation or presentation state.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep move timelines, callbacks, sprites, rendering,
  raw controller bytes, Scene-ON state, rules/RNG/PP, and other opcodes out.
- **Notes:** exact supported IDs are
  **10/16/17/18/20/37/38/39/40/57/58/60/61/62/65/83/84/85/86/98/111/131/141/248**.
  All **92** generated starts have zero operand widths and are pinned.
  Focused **118/118**; Tier-1 **121 files / 1615 tests**, build, and Scene-OFF
  oracle contract green. Pixel/oracle diff is N/A for this logical barrier.

---
## 380 — Gate-3 trainer-slide controller receipts integrated

- **State:** S10 Gate 3 remains open with **23** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** added only `TRAINERSLIDEIN`/`TRAINERSLIDEOUT` (opcodes **83/248**):
  each validates one u8 position, resolves it through a dedicated typed
  `GetBattlerAtPosition` port, activates/marks the battler pending, emits one
  frozen direction-specific receipt, and advances one instruction/two source
  bytes without an idle guard.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep trainer sprites/resources, coordinates,
  callbacks/tasks, controller-family completion, waitstate, presentation,
  rules/RNG/PP, animation, and pixels out.
- **Notes:** exact supported IDs are
  **16/17/18/20/37/38/39/40/57/58/60/61/62/65/83/84/85/86/98/111/131/141/248**.
  Focused **112/112**; Tier-1 **120 files / 1608 tests**, build, and Scene-OFF
  oracle contract green. All **10+5** committed starts are pinned; the Wally
  `battle_scripts_2` start is outside this program. Ack means receipt/work
  initiation only; pixel/oracle diff is N/A for this semantic seam.

---
## 379 — Selected-battler controller lifecycle consolidated

- **State:** S10 Gate 3 remains open with **21** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** replaced the duplicated `PLAYFAINTCRY`,
  `HIDEPARTYSTATUSSUMMARY`, and `MAKEVISIBLE` lifecycle with one local,
  strongly typed helper. It alone validates one u8 selector, resolves or
  blocks/halts, activates and marks the battler pending, freezes the
  command-specific event, and advances once; exact payloads are unchanged.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep presentation, raw controller bytes, rules/RNG,
  PP, turn/round state, and other opcodes out.
- **Notes:** exact supported IDs remain
  **16/17/18/20/37/38/39/40/57/58/60/61/62/65/84/85/86/98/111/131/141**.
  Command-focused **34/34**; Tier-1 **119 files / 1597 tests**, build, and
  Scene-OFF oracle contract green. Pixel/oracle diff is N/A for this semantic
  refactor; all existing command-specific authoritative tests remain intact.
