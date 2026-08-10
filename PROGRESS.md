# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1085 — [supervisor, 2026-08-10] **#55 m4a workload split into compiled source stages**

- **State:** side commit `236e1fe4` is folded; focused receipt **2/2** and
  generated report are byte-identical under supervisor rerun. Final union
  gates follow after the next bounded main increment.
- **Did:** six fresh runs split all **113** `m4aSoundMain` observations into
  `MPlayMain`, `CgbSound`, and copied-IWRAM `SoundMainRAM` channel passes. The
  first five linked players are fixed at **55** cycles; player six, CGB sound,
  and five direct-channel spans carry the variation. All **113** bounded,
  address-free source-state keys are unique, so the receipt correctly makes
  no equal-state timing claim.
- **Next:** obtain repeated complete m4a source-state equivalence before a
  reducer claim, or continue the independent ROM-fetch/EWRAM timing required
  by CreateMon/EV/stat/post. Keep the live construction clock unwired.
- **Notes:** v1 VBlank and v2 construction receipts are unchanged. Command and
  wave prefixes remain explicitly bounded evidence, not complete audio state;
  no runtime lookup, controller, animation, or canonical Battle-2 edit.

## 1084 — [MAIN worker, 2026-08-10] **#55 EV-spread boundary audited; accepted personality exposed**

- **State:** bounded evidence checkpoint landed; focused construction **25/25**
  including red verification, smoke **375/375**, typecheck, full `npm test`
  **878 files / 8,413 passed / 1 skipped**, production build, and diff check
  are green.
- **Did:** pinned all **12** complete CreateMon-return→stats-entry spans
  (**6/3/3**, net **26,672–41,256**) and subtracted the sole contained VBlank
  pause (**36,217**, varied mon 1). Compiled `0x0806869C→0x08068D0C` audit
  proves each EV write traverses encrypted `SetBoxMonData` and 12 full-dividend
  `__umodsi3(personality,24)` calls; the clock now exposes the accepted
  personality to CreateMon/EV/stat/Factory-post operation keys.
- **Next:** port exact ROM-fetch/EWRAM timing for the audited decrypt/checksum/
  re-encrypt path, then classify any +18 residual; keep #55 open and the clock
  unwired until that reducer and live VBlank/audio arbitration are exact.
- **Notes:** no fitted duration/table, identity/tick/cursor lookup, evidence
  mutation, live wiring, canonical Battle-2 march, animation edit, or new
  unsupported barrier.

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
