# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1122 — [MAIN worker, 2026-08-11] **#55 fresh DMA graph source-reduced**

- **State:** isolated fresh Direct Sound DMA makespans are now computed
  source-generally; #55 remains open and the construction clock stays unwired.
- **Did:** ported mGBA 0.10.5 fresh rebasing, per-word deadlines, overdue-DMA
  coalescing, ascending arbitration, completion sentinels, and CPU-blocked
  progression. Zero/one/dual graphs derive **0/10/18**; dual order is
  `1,1,1,1,2,1,2,2,2,2`, with DMA2 at +8 and DMA1 completion at +10.
- **Next:** continue #55 only with another source-general construction or
  external co-due callback slice. Do not turn 18 into `serviceCostMasterCycles`
  or wire `runFactoryConstructionClock` before the full workload closes.
- **Notes:** exact archive hash `91d6fbd…` and timing/Timer/audio/DMA/GBA source
  hashes/anchors are pinned. Focused **21/21**, smoke **375/375**, typecheck,
  full `npm test` **916 files / 8,598 passed / 1 skipped** (**77.82s**), and
  build (**631 modules**, **6.32s**) are green. No generator/controller,
  presentation, animation, barrier, recording, or side-owned audit changed.

## 1121 — [MAIN worker, 2026-08-11] **#55 varied adjacent runtime rows closed**

- **State:** both legal-varied adjacent rows are closed twice fresh; #55 stays
  open for the broader construction clock, which remains unwired.
- **Did:** generalized the LILIANA selector across encrypted-accessor,
  get-nature, and nature-attempt components. Fresh OFF scouts pin get-nature
  ordinal 12's repeated division occurrence **4** and nature-attempt ordinal
  63's occurrence **0**. Get-nature packets are byte-identical `21ea4158…`:
  Timer late 5, DMA1, Audio late 4 at D+1. Nature-attempt is `d32aa8d8…`:
  Video then Timer late 6 at D, DMA1, Audio late 5 at D+1. Both complete +18.
- **Next:** this bounded adjacent-row step is complete. Continue #55 only with
  a separately source-proven construction-clock/workload slice; do not fit a
  cost or wire the clock from these three observations.
- **Notes:** captures finished in **12.3/11.6s + 12.5/12.0s**; focused
  selector/runtime **18/18**, smoke **375/375**, typecheck, full `npm test`
  **916 files / 8,594 passed / 1 skipped**, and build (**631 modules**) are
  green. No service cost, clock, controller, presentation, animation, barrier,
  recording, or side-owned adjacent-audit artifact changed.

## 1120 — [MAIN worker, 2026-08-11] **#55 LILIANA adjacent-deadline runtime receipt**

- **State:** the selected LILIANA runtime graph is closed twice fresh; #55
  stays open for the two legal-varied adjacent rows and broader construction
  clock, which remains unwired.
- **Did:** corrected the selector to source-order division occurrence 27 and
  added a narrow Timer/Audio/DMA wrapper. The compact packet is byte-identical
  at `a0cdb0c1…`: **Timer@D**, DMA1 first service, **Audio@D+1**, remaining
  DMA1/2; completion 1→2 and prompt wrapper restoration are full-state pinned.
- **Next:** capture legal-varied get-nature 12 and nature-attempt 63 only
  through separately source-selected adjacent-deadline wrappers. Do not fit a
  cost or wire the construction clock.
- **Notes:** focused selector/runtime/audio/FIFO **18/18**, smoke **375/375**,
  typecheck, full `npm test` **913 files / 8,577 passed / 1 skipped**, and
  build (**631 modules**) are green. No service cost, clock/dispatcher,
  controller, presentation, animation, barrier, or canonical recording changed.
