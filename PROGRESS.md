# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1120 — [MAIN worker, 2026-08-11] **#55 adjacent-deadline edge selector checkpoint**

- **State:** a hermetic source-order selector now identifies the LILIANA
  encrypted-accessor ordinal 23 edge; no runtime packet is claimed, #55 stays
  open, and the construction clock remains unwired.
- **Did:** selectively recovered and corrected the stash helper/test. It arms
  once at `0x082e7c3e` inside the outer `CalculateMonStats` call and pins the
  actual adjacent timeline **Timer@D → Audio@D+1**, never equal-deadline
  Audio-first ordering.
- **Next:** attempt a bounded transparent native-wrapper capture for this one
  selected edge; accept only twice-fresh byte-identical compact JSON, otherwise
  discard the integration and retain this tooling checkpoint alone.
- **Notes:** focused selector/audio/FIFO **13/13**, smoke **375/375**,
  typecheck, full `npm test` **912 files / 8,572 passed / 1 skipped**, and
  build (**631 modules**) are green. No service cost, clock/dispatcher,
  controller, presentation, animation, barrier, or canonical recording changed.

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
