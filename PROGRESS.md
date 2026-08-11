# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
