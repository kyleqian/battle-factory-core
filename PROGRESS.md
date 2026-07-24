# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 425 — vertical move-end dependencies and exact Thunder Punch integrated

- **State:** the vertical player/AI machine slice and move-end dependency steps
  1--4 are green at **172 files / 1994 tests**. Opcodes **73** and **0** remain
  unregistered; no delegate semantics, 17-state/end-mode loop, cleanup, or
  Factory continuation was added. Scene-ON coverage is **18 exact / 1 partial
  / 257 unsupported**.
- **Did:** landed same-PC controller return/call-current ownership and
  source-complete move-end states 1/8--10. Added a mechanical receipt for
  exactly four ability and two item delegate modes: **7** `Random()` sites,
  **2** controller emissions/marks, **42** script-transfer candidates, and
  **4** loops. Independently, THUNDER PUNCH is exact in both legal orientations
  at **104/104 component and 104/104 RGB frames** each, with source-relative
  palette, inversion, sprite, shake, monbg, and teardown behavior.
- **Next:** implement dependency step 5 from the committed delegate receipt:
  source-complete ability/item ports sharing the machine RNG ledger and
  exposing controller/script results. Keep the all-case loop,
  cleanup/next-target transfer, opcode registration, and Factory continuation
  behind their later gates.
- **Notes:** full suite/build, both oracle profiles, coverage, focused
  controller tests, receipt regeneration, and both Thunder Punch dense
  comparators pass. Fire/Ice Punch, Blaze Kick, Flamethrower, and Dragon Breath
  controls remain exact.

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
