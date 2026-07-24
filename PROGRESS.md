# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 424 — move-end controller return and cases 1/8–10 landed

- **State:** dependency step 4 is complete and green at **171 files / 1990
  tests**. Opcodes **73** and **0** remain unregistered; no delegate,
  17-state/end-mode loop, cleanup, Factory continuation, core, render, or
  oracle behavior was added.
- **Did:** added generic same-PC `controller-return` and source
  `BattleScriptPushCursor`/`call-current` controls; raw STATUS1 data plus
  boolean visibility events; and source-complete single-case ownership for
  DEFROST and attacker/target visibility. Busy execution identity-blocks
  before rules reads; acknowledgement changes scheduler only; defrost returns
  from its effect script to the same opcode-73 instruction.
- **Next:** dependency step 5 only: add source-complete ability/item delegate
  ports with the same machine RNG ledger and explicit controller/script
  results. Keep the all-case loop, cleanup/next-target transfer, opcode
  registration, and Factory continuation behind their later gates.
- **Notes:** all gates, writes, active battlers, event order, both visibility
  values, pending identity, replay, unrelated frozen owners, and zero local
  RNG are pinned. Integrated suite/build and OFF v5 (`9c89c741…`) pass; pixel
  diff N/A.

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
