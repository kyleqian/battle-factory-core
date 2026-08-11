# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1116 — [MAIN worker, 2026-08-11] **#55 absolute Timer 0 callback-entry receipt**

- **State:** the fresh on-time dual-refill boundary is closed; #55 remains open
  for late, zero/one-refill, mixer, pending/competing DMA, and Audio/IRQ or
  Video-started-DMA classes. The clock stays unwired and service cost null.
- **Did:** banked one isolated and one exact Video-co-due OFF receipt. Timer
  entry is **1880434111 / 1880414047**, both `cyclesLate=0`; request and
  completion are DMA1→DMA2. The live graph finishes at **entry+18** because
  DMA2's first word overlaps DMA1's terminal tail, separating makespan 18 from
  the independent `10+10` work sum.
- **Next:** continue #55 only with one separately bounded missing runtime class
  above; do not fit a service constant or wire `runFactoryConstructionClock`.
- **Notes:** two fresh paths are byte-identical (`475f4731…`, 30,976 bytes).
  Focused Timer0 **22/22**, smoke **375/375**, typecheck, full `npm test`
  **907 files / 8,546 passed / 1 skipped**, and build (**631 modules**) are
  green. No production, barrier, animation, or canonical Battle-2 change.

## 1115 — [MAIN worker, 2026-08-11] **#55 isolated-fresh Timer 0 DMA hardening**

- **State:** the pure dispatcher is hardened; #55 remains open, the
  construction clock remains unwired, and
  `serviceCostMasterCycles` remains `null`.
- **Did:** modeled mGBA's global audio-enable gate; required `nextCountWords`
  zero for both represented DMA channels plus explicit no-preexisting,
  no-competing, and no-Video-started-DMA ownership. Renamed the **0/10/20**
  output as relative isolated-fresh progression, preserving A/DMA1→B/DMA2.
- **Next:** resume #55 only with a separately bounded full workload/scheduler
  composition step; absolute deadlines, `cyclesLate`, co-due arbitration, and
  live construction-clock wiring remain deliberately out of model.
- **Notes:** focused **9/9**, smoke **375/375**, typecheck, full `npm test`
  **906 files / 8,542 passed / 1 skipped**, and build (**631 modules**) are
  green. No +18 constant, cadence cost, co-due arithmetic, live wiring,
  controller, presentation, animation, barrier, or recording import changed.

## 1114 — [MAIN worker, 2026-08-11] **#55 pure conditional Direct Sound dispatcher**

- **State:** implementation `649e993d` plus typed negative-fixture correction
  `41a65725` and docs checkpoint `2675c77b` are committed; #55 remains open and
  the live construction clock stays unwired. `serviceCostMasterCycles` remains
  `null`.
- **Did:** registered the semantic Timer 0 FIFO A/B dispatcher and composed it
  with cadence using explicit state per crossing. It returns source-derived
  A/DMA1→B/DMA2 requests and scheduled progression **0/10/20**, preserves
  phase across repeated crossings, and rejects unmodeled state.
- **Next:** this bounded dispatcher step is complete. Continue #55 only in a
  separately bounded live phase/workload and VBlank/IRQ composition step.
- **Notes:** focused Timer 0 **20/20**, smoke **375/375**, typecheck, full
  `npm test` **905 files / 8,534 passed / 1 skipped**, and build (**631
  modules**) are green. No +18 constant, cadence cost, co-due service, live
  wiring, controller, presentation, animation, barrier, or recording import
  changed.
