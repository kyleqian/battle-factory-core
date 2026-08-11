# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1103 — [MAIN worker, 2026-08-10] **#55 synchronous GetBoxMonData outer shell closed**

- **State:** implementation `8aa00042`; #55 remains open,
  `GetBoxMonData2.cycles` stays `null`, and the construction clock stays
  unwired. Focused **27/27**, smoke **375/375**, typecheck, full `npm test`
  **894 files / 8,488 passed / 1 skipped**, and production build are green.
- **Did:** source/ELF-reduced the complete synchronous outer shell at
  **314 cycles**: GetBoxMonData2 **216** plus checksum-function setup/return
  **98**. The typed composition excludes all eight GetSubstruct bodies and
  crypt/checksum/crypt components, covers every receipt field/checksum/bad-egg
  route across all 24 layouts, and matches **77/156** clean OFF direct joins.
- **Next:** continue #55 only with independently closed async +18 service and
  VBlank/IRQ entry/body/return costs; do not fit residuals, wire aggregate
  stats/the clock, or resume canonical Battle 2.
- **Notes:** fresh wrapper-validated Scene-OFF mGBA boundaries give 2-cycle
  clean joins for all eight scattered personality reads; the frozen packet was
  not mutated. Final full suite used an explicit 10-minute foreground timeout.
  No fixture/production import, barrier, controller, presentation, animation,
  or canonical Battle-2 change.

## 1102 — [MAIN worker, 2026-08-10] **#55 encrypted EWRAM loops and receipt field tails closed**

- **State:** implementation `54368a1e` corrected/pinned by `fd4c79c1` and
  supervisor-reconciled in this entry; #55
  remains open, `GetBoxMonData2.cycles` stays `null`, and the construction
  clock stays unwired. Focused **25/25**, smoke **375/375**, typecheck, full
  `npm test` **894 files / 8,486 passed / 1 skipped**, and production build
  are green.
- **Did:** context-composed aligned EWRAM u8/u16/u32 timing now closes decrypt /
  checksum / encrypt at **448 / 518 / 448** cycles and **528** total bus cycles.
  All **180** dependency rows expose checksum-valid/invalid and species/EXP/
  EV/IV tail widths, counts, exact PCs, bus totals, and component cycles.
- **Next:** continue #55 only with independently source-reduced outer
  `GetBoxMonData2` prologue/setup/dispatch/common-return instruction and
  memory work, or async/IRQ state; do not fit residuals or wire the clock.
- **Notes:** twice-fresh compact Scene-OFF instruction/component receipt is
  byte-identical at `bff98549…`; misaligned u16/u32 behavior is rejected, not
  claimed. Supervisor reconciliation passed focused **25/25**, smoke
  **375/375**, typecheck, and build. No fixture import into production,
  barrier, controller, presentation, animation, or canonical Battle-2 change.

## 1101 — [supervisor, 2026-08-10] **#55 MPlayMain callback residual closed**

- **State:** side commits `5ca1367a`/`104a75a5`/`9130f99f` folded by
  `a56341fb`; #55 remains open and the construction clock stays unwired.
  Union focused **6/6**, smoke **375/375**, and production build are green;
  the worker full suite passed **894 files / 8,484 / 1 skipped**.
- **Did:** source/ELF-audited all **36** `gMPlayJumpTable` and **14**
  `gXcmdTable` slots, including `ply_xcmd`/`ply_xxx` transitive edges. Two
  fresh Scene-OFF runs per case reproduce **52/31/30 = 113** exact compact
  v3-state/cost joins with zero unequal costs; total fixtures are **136 KB**.
- **Next:** continue #55 with independently proven EWRAM word/halfword bus
  timing and field tails, or one remaining bounded command-window/
  SoundMainRAM sample-target class. Do not fit a residual or wire aggregate
  stats, audio duration, or the live clock.
- **Notes:** two audio dereference classes remain. No controller,
  presentation, barrier, recording import, animation, or canonical Battle-2
  change landed. Orient folded 31 animation commits through `11245f83`;
  `animation-main` is now four later animation commits ahead under its own
  supervisor and is intentionally left for the next orient. `DEFERRED.md`
  has no open entry.
