# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1083 — [supervisor, 2026-08-10] **#55 VBlank variability isolated to audio; resume residual bounded**

- **State:** side commit `6df4fc19` is folded; its focused receipt test is
  **2/2** and artifact regeneration is byte-identical under supervisor rerun.
  Final union gates follow after the next bounded main increment.
- **Did:** added an opt-in source-state VBlank probe plus compact receipts for
  **52/31/30** construction-epoch interrupts. Every measured VBlank-body stage
  except `m4aSoundMain` is constant within each case; audio accounts for the
  full body range (**23,920–52,083 / 24,732–47,917 / 24,391–41,682** cycles).
  Return-to-resume is **41** cycles for **112/113** samples; the sole **59**-
  cycle sample has no observed HBlank, VCount, Serial, Timer3, or shared dummy
  ISR entry, so its +18 remains explicitly outside the reducer.
- **Next:** use the new receipt to port complete dereferenced m4a state timing
  and hardware resume arbitration, while continuing CreateMon/EV/stat/post
  source budgets. Keep the live construction clock unwired.
- **Notes:** raw fixtures are test-only and contain relative timings plus
  source-visible state—no frame, RNG, trainer, set, battle, tick, cursor, or
  construction identity. Existing v2 receipts stayed byte-identical.

## 1082 — [MAIN worker, 2026-08-10] **#55 construction-entry timing landed across all 12 v2 spans**

- **State:** source-general reducer and receipt pins are implemented; focused
  construction **13/13** (including red verification), smoke **375/375**,
  typecheck, full `npm test` **877 files / 8,410 passed / 1 skipped**,
  production build, and diff check are green.
- **Did:** reduced the shared entry-to-first-`Random` path to **58** source
  cycles: **26** sequential Thumb halfwords / **52** cycles plus one **6**-cycle
  BL refill. All anchor/LILIANA/varied spans (**6/3/3**) have **0** contained
  VBlank pause and **0** residual service; both compiled caller siblings are
  LR-pinned.
- **Next:** continue #55 with CreateMon, EV-spread, CalculateMonStats,
  factory-post/outer-loop timing, or deterministic VBlank/audio/DMA workload;
  keep the construction clock unwired until every remaining piece is exact.
- **Notes:** clock remains unwired; no identity/tick/cursor/fixture selection,
  canonical Battle-2 march, evidence regeneration, animation edit, or new
  unsupported barrier.

## 1081 — [MAIN worker, 2026-08-10] **#55 compiled source-return timing landed across all v2 cases**

- **State:** `source-return` is resolved source-generally: committed v2
  decomposition **3/3**, focused construction **11/11**, and red verification
  pass. Smoke **375/375**, typecheck, full `npm test` **877 files / 8,408
  passed / 1 skipped**, production build, and diff check are green.
- **Did:** added `reduceFactorySourceReturnTiming` for the exact pret/Thumb
  final-loop and epilogue paths. Anchor is **40** source cycles; LILIANA and
  varied are **32** each, with **0** contained VBlank pause and **0** residual
  service cycles. Both source-function siblings are pinned.
- **Next:** continue #55 with one bounded CreateMon/EV/CalculateMonStats/
  factory-post source budget or the deterministic VBlank/audio/DMA workload;
  keep the construction clock unwired until those remaining pieces are exact.
- **Notes:** no trainer/set/mon/tick/cursor/receipt timing selection, canonical
  Battle-2 march, live wiring, evidence regeneration, animation edit, or new
  unsupported barrier.
