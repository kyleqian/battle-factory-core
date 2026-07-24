# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 374 — Gate-3 table-selected selection message integrated

- **State:** S10 Gate 3 remains open with **16** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** added only `PRINTSELECTIONSTRINGFROMTABLE` (opcode 20): locally
  idle-gates, then resolves its 4-byte `u16` table pointer plus
  `MULTISTRING_CHOOSER` through a typed port and reuses opcode 17's validated,
  frozen player-only event/pending-controller transition.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep generic pointers/table commands, escape mechanics,
  selection completion, PP, production controllers, rendering/audio,
  damage/accuracy, animation, and pixels out of this seam.
- **Notes:** exact supported IDs are
  **16/17/18/20/37/38/39/40/57/58/60/61/62/65/131/141**. Focused **52/52**;
  Tier-1 **115 files / 1546 tests**, build, and Scene-OFF oracle contract
  green; sole start **2230** (`BattleScript_PrintCantEscapeFromBattle`,
  `gNoEscapeStringIds`) and opcode-17 distinction are pinned.

---
## 373 — Gate-3 source-exact selection message integrated

- **State:** S10 Gate 3 remains open with **15** source-safe opcodes and an
  unwired immutable controller/scheduler/rules/RNG/source-context seam.
- **Did:** added only `PRINTSELECTIONSTRING` (opcode 17): resolves attacker,
  u16 string ID, and named `BattleMsgData` snapshot through an injected port;
  unconditionally activates/marks the battler pending, emits one frozen
  player-only event, advances, and sets `MSG_DISPLAY`. Added explicit
  idempotent controller acknowledgement without wait/latch side effects.
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Keep opcode 20, selection input/completion, rendering,
  damage, accuracy, PP, production controllers, animation, pixels, and audio
  out of this seam.
- **Notes:** exact supported IDs are
  **16/17/18/37/38/39/40/57/58/60/61/62/65/131/141**. Focused **36/36**;
  Tier-1 **113 files / 1526 tests**, build, and Scene-OFF oracle contract
  green; no RNG/rules/presentation or pixel change.

---
## 372 — Gate-3 source-exact move-values cleanup integrated

- **State:** S10 Gate 3 remains open with **14** source-safe opcodes and an
  unwired immutable control/scheduler/rules/RNG/source-context seam.
- **Did:** added only `MOVEVALUESCLEANUP` (opcode 37) through a typed,
  immutable move-values slice: resets result/effect/miss fields and both
  multipliers, clears only hit-marker bits 6/14, then advances once. Pinned
  the helper/Cmd/macro/table and all six starts (**116/292/911/1262/1352/1843**).
- **Next:** choose another bounded source family only when its complete rules
  context is explicit. Do not add damage, accuracy, loops, PP, message
  buffers, production controller/rendering, animation, pixels, or other opcodes.
- **Notes:** exact supported IDs are
  **16/18/37/38/39/40/57/58/60/61/62/65/131/141**. Focused **49/49**;
  Tier-1 **112 files / 1511 tests**, build, and Scene-OFF oracle contract
  green; no RNG/scheduler/event/controller/presentation or pixel change.
