# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1124 — [supervisor, 2026-08-11] **#55 SetBox + m4a target audit folded**

- **State:** synchronous construction EV writes and the pre-`MPlayMain`
  SoundMainRAM target inventory are united; #55 remains open and the live
  construction clock stays null/unwired.
- **Did:** source-reduced all **27** committed encrypted EV writes across
  fields 26–31, including valid/invalid checksum paths. Folded side commit
  `38476663`: **13** pointer-producing branches and **4** read/range rules
  cover **565** selected-channel snapshots / **113** VBlank observations and
  **5** pinned WaveData assets without a new oracle run.
- **Next:** capture an address-free `soundMainRamEntryTargets` descriptor at
  the actual `sound-main-ram-entry`, after all six `MPlayMain` calls, before
  claiming mixer-entry target closure. Continue other #55 work only as
  separately source-proven clock components; do not aggregate or wire yet.
- **Notes:** orient folded animation-main through `77e3d325`; later animation
  commits remain owned by the active animation supervisor. Combined focused
  SetBox/DMA/m4a union **29/29** is green. Final union: `npm test` **918 files /
  8,607 passed / 1 skipped** (**110.25s**), build **631 modules** (**6.58s**),
  vanilla soak **20/20** (**34.3s**) and full-policy soak **60/60**
  (**294.3s**), both with **0 crash / 0 hang**. OFF oracle is healthy.

## 1123 — [MAIN worker, 2026-08-11] **#55 encrypted construction writes reduced**

- **State:** the synchronous SetMonData→SetBoxMonData EV-write component is
  exact and #55 remains open; aggregate operation costs and the live clock
  stay null/unwired.
- **Did:** censused **27** committed writes and reduced all source fields
  26–31. Valid/invalid paths are 12/8 GetSubstruct calls with fixed portions
  **2,380/1,708**, plus the existing 40-cycle SetMon shell; 24 layouts,
  representative switch arms, alignment, fail-closed inputs, and immutability
  are pinned.
- **Next:** continue #55 only with a separately source-proven construction or
  VBlank component. Do not aggregate or wire the clock from this component.
- **Notes:** focused **41/41**, smoke **375/375**, forced typecheck, full
  `npm test` **917 files / 8,604 passed / 1 skipped** (**110.94s**), and build
  (**631 modules**, Vite **6.73s**) are green. No +18/IRQ/VBlank/external
  service, clock/controller/presentation/animation, barrier, recording, or
  side-owned SoundMainRAM artifact changed.

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
