# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1118 — [MAIN worker, 2026-08-11] **#55 Audio-co-due row-selection checkpoint**

- **State:** the three natural Audio-co-due dual-refill rows are exactly
  identified; no new runtime packet is claimed, #55 stays open, and the clock
  and dispatcher remain unchanged.
- **Did:** pinned LILIANA encrypted-accessor 23 (Audio), varied get-nature 12
  (Audio), and varied nature-attempt 63 (Video+Audio), including exact return
  classes and instruction edges; anchor has none.
- **Next:** retain LILIANA's selected callback window twice fresh, then the two
  varied windows through the same wrapper. Do not fit cost or wire the clock.
- **Notes:** the bounded wrapper attempt did not finish a validated JSON packet
  in cap, so its probe edits were discarded. Focused Timer0 **40/40**, smoke
  **375/375**, typecheck, full `npm test` **909 files / 8,558 passed / 1
  skipped**, and build (**631 modules**) are green.

## 1117 — [MAIN worker, 2026-08-11] **#55 dual-refill deadline-work contract correction**

- **State:** the pure Timer 0 dispatcher now distinguishes work from elapsed
  time; #55 remains open, the construction clock stays unwired, and
  `serviceCostMasterCycles` remains `null`.
- **Did:** removed fabricated serialized DMA start/completion fields. Ordered
  A/DMA1→B/DMA2 deadline work is 10 each / sum 20; only the receipt-observed
  fresh dual graph exposes makespan 18, while zero/one remain `null`.
- **Next:** continue #55 only with a separately bounded unobserved runtime
  class; do not fit 18 or wire `runFactoryConstructionClock`.
- **Notes:** verified exact mGBA 0.10.5 archive SHA and source scheduling;
  focused Timer0 **34/34**, typecheck, smoke, full `npm test`, and build are
  green. No clock wiring, service cost, controller, presentation, animation,
  barrier, or canonical Battle-2 change.

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
