# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1113 — [supervisor, 2026-08-11] **#55 Timer 0 conditional refill cause united**

- **State:** runtime receipt `039af5ed` and side source audit `de0270e7` are
  folded through merge `d08303af`; #55 remains open and the construction
  clock stays unwired. `serviceCostMasterCycles` remains `null`.
- **Did:** retained OFF hardware state proves all **85/85** classified members
  perform one dual-FIFO refill and all **171** retained non-refill crossings
  do not. Pinned mGBA 0.10.5 source derives **10** scheduled cycles per fresh
  IWRAM→FIFO DMA, **20** for A+B, and therefore the conditional **+18** over a
  two-cycle clean edge without fitting a fixture constant.
- **Next:** implement the smallest pure, source-general conditional FIFO
  service dispatcher and compose it with the registered Timer 0 cadence. Do
  not wire the live construction clock until phase/workload composition is
  closed.
- **Notes:** union focused **25/25** and smoke **375/375** are green. The main
  evidence checkpoint also passed typecheck, full `npm test` **903 files /
  8,524 passed / 1 skipped**, and build (**631 modules**); the side audit
  independently passed its full suite/build. No production, controller,
  presentation, animation, canonical Battle-2, barrier, or recording import
  changed.

## 1112 — [MAIN worker, 2026-08-11] **#55 Timer 0 conditional FIFO/DMA refill census**

- **State:** #55 remains open; production construction-clock wiring and every
  unresolved `cycles` field remain untouched. `serviceCostMasterCycles` stays
  `null`.
- **Did:** added opt-in `FACTORY_TIMER0_FIFO_EVIDENCE=1` compact evidence,
  fresh OFF receipts for anchor/LILIANA/legal varied, and the Tier-1 receipt
  test. The three packets are **126/57/73 = 256** retained crossings: **85**
  FIFO write/refill rows and **171** DMA-only rows. Every refill has A/B write
  pointer change and `internalRemaining 3→2`; cross-epoch clean joins are
  **83/85 exact +18**, with two named null path exceptions. All six fresh
  outputs are byte-identical; focused Timer0 suite is **16/16**.
- **Next:** source-reduce the conditional Direct Sound FIFO refill dispatcher
  and register that pure service seam. Do not wire the construction clock or
  fit 18.
- **Notes:** docs and `ISSUES.md` now record observed edge/service classes,
  FIFO thresholds, DMA1/2 controls, co-due Video/Audio classes, and exact
  hashes. Focused Timer0 **21/21**, smoke **375/375**, typecheck, full
  `npm test` **903 files / 8,524 passed / 1 skipped**, and build (**631
  modules**) are green. No production, animation, canonical Battle-2,
  barrier, or recording import changed.
