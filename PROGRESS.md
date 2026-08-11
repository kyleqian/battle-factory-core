# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1119 — [supervisor, 2026-08-11] **#55 IRQ/Video-DMA reachability folded**

- **State:** main row selection `361933b1` and side reachability audit
  `5d66065d` are united through merge `23a5095d`; #55 remains open and the
  construction clock stays unwired.
- **Did:** source plus finite OFF receipts exclude Timer0 IRQ, Video-started
  DMA, and queued VBlank DMA3 work from this construction epoch. Timer0 uses
  `TM0CNT_H=0x0080` at all **256/256** crossings; the exact Video-co-due window
  leaves all DMA `nextCount` values zero; all **113/113** VBlank entries have
  null HBlank callback, inactive scanline DMA, and an empty DMA3 queue.
- **Next:** optimize the selected-edge runtime receipt enough to retain the
  LILIANA Audio-only window twice fresh, then the two legal-varied Audio rows.
  Do not fit a cost or wire the clock.
- **Notes:** focused union **20/20** is green; each lane independently passed
  its full suite, typecheck, and build. DMA3 remains source-reachable only as
  CPU-triggered `START_NOW` VBlank work outside the exact selected window.

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
