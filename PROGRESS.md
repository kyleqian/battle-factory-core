# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1123 — [MAIN worker, 2026-08-11] **#55 encrypted construction writes reduced**

- **State:** the synchronous SetMonData→SetBoxMonData EV-write component is
  exact and #55 remains open; aggregate operation costs and the live clock
  stay null/unwired.
- **Did:** censused **27** committed writes and reduced all source fields
  26–31. Valid/invalid paths are 12/8 GetSubstruct calls with fixed portions
  **2,380/1,708**, plus the existing 40-cycle SetMon shell; 24 layouts,
  representative switch arms, alignment, fail-closed inputs, and immutability
  are pinned.
- **Next:** run smoke/full/build verification, then continue #55 only with a
  separately source-proven construction/VBlank component. Do not aggregate or
  wire the clock from this component.
- **Notes:** focused construction suites **41/41** and typecheck are green. No
  +18/IRQ/VBlank/external service, clock/controller/presentation/animation,
  barrier, recording, or side-owned SoundMainRAM artifact changed.

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
