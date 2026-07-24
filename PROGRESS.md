# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 423 — move-end topology corrected and pure state prerequisites landed

- **State:** dependency step 3 is corrected and green at **170 files / 1986
  tests**. Opcodes **73** and **0** remain unregistered; no controller,
  script-transfer, cleanup, delegate, loop/end-mode, core, render, or oracle
  behavior was added.
- **Did:** narrowed active `gBattlersCount` to the exact `2 | 4` type and
  runtime set, requiring `BATTLE_TYPE_DOUBLE` iff count is 4; illegal counts
  and flag/count mismatches are rejected. The changed-item bound test now uses
  legal singles while preserving inactive-slot identity/data assertions.
  Position/partner lookup, nine-bit `WasUnableToUseMove`, and states 13/16
  were rechecked source-faithfully without expansion.
- **Next:** dependency step 4 only: add status-data and both visibility
  controller requests/resumption. Keep move cleanup, effect-script transfer,
  delegates, loop/end modes, and opcode registration behind their later gates.
- **Notes:** assignment audit: `battle_controllers.c:149-581` assigns active
  counts only `2` or `MAX_BATTLERS_COUNT` (4); `battle_main.c:157`'s zero is
  pre-init only. State 16 still stops before cleanup/script transfer.
  Suite/build and OFF v5 (`9c89c741…`) pass; pixel diff N/A.

---
## 422 — move-end history ownership and state reducers landed

- **State:** dependency step 2 is complete and green at **168 files / 1974
  tests**. Opcodes **73** and **0** remain unregistered; no topology,
  controller, delegate, loop/end-mode, wrapper, receipt, core, render, or
  oracle behavior was added.
- **Did:** added six independent frozen four-battler history arrays plus exact
  source `u8[16]`/`u8[32]` packed histories. Pure state-14/state-15 reducers
  normalize unavailable chosen moves, swap roles before indexed writes, pin
  both absent masks and hit/result/effect gates, resolve dynamic move type and
  generated Mirror Move flags, and write little-endian target/attacker bytes.
- **Next:** dependency step 3 only: add topology (`gBattlersCount`, battle type,
  positions) and a source-shaped `WasUnableToUseMove` predicate. Then
  controllers, complete ability/item delegates, all-case loop/end modes, and
  only finally opcode-73 registration.
- **Notes:** recursive freezing, source widths/cardinality, independent-owner
  identity, JSON replay, packed byte layout, and existing player/AI verticals
  pass. Integrated suite/build and OFF v5 (`9c89c741…`) pass; pixel diff N/A.

---
## 421 — move-end choice/change ownership landed and Baton Pass repaired

- **State:** dependency step 2a plus its evidence-driven Baton Pass repair are
  committed and green at **168 files / 1968 tests**. Opcodes **73** and **0**
  remain unregistered; no move-history, topology, controller, ability/item
  delegate, script-transfer, or presentation behavior was added.
- **Did:** extended the existing frozen rules record with source `u16`
  `chosenMove`, `choicedMove[4]`, and `changedItems[4]`; the independent
  BattleStruct absent `u8` mask; `dynamicMoveType`; and four Enigma held-effect
  bytes. Pure ownership reducers pin Choice Band/Baton Pass/stale-choice order
  and changed-item copy+clear behavior. Successful Baton Pass now preserves an
  unavailable choice by taking the source break; failed Baton Pass assigns the
  chosen move and runs membership cleanup. Generated numeric item effects and
  exact `GET_MOVE_TYPE`/Enigma resolvers cover normal, dynamic-Normal, masked,
  implicit-none, and invalid-corpus cases.
- **Next:** finish dependency step 2 with the six independent move-history
  arrays plus packed mirror-history owners and source-order reducers. Then add
  topology (`gBattlersCount`, type flags, positions), `WasUnableToUseMove`,
  controller requests, complete ability/item delegates, cleanup/next-target
  transfer, and loop/end-mode control before registering opcode 73.
- **Notes:** pinned `battle_script_commands.c:4302-4315`: only successful
  Baton Pass increments/breaks before assignment and stale-choice cleanup.
  Adjacent choice/change/type/item branches match source review. Integrated
  suite/build and OFF v5 (`9c89c741…`) pass. Code commits `7a6c741`,
  repair `d9b3575`; pixel diff N/A.
