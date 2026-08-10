# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1080 — [supervisor, 2026-08-10] **Gate-6 route branches classified across the full source graph**

- **State:** side commit `abaec104` is folded by merge `d3faa43c`; focused
  route/manifest coverage is **16/16**, typecheck and byte-identical artifact
  regeneration pass. Final union gates follow after the next main increment.
- **Did:** every one of **2,812** emitted route certificates now declares a
  source-derived `success` (**2,664**) or `failure-tail` (**148**) branch.
  Among **845** promoted certificates, **73** are legitimate failure tails
  (**41** item MoveEnd, **32** immunity MoveEnd) because `Cmd_moveend` runs its
  post-move state loop on both branches. The full dynamic-dispatch audit found
  no missing exception: Assist, Metronome, Mirror Move, and Sleep Talk remain
  the only four exceptions on both axes.
- **Next:** continue #55 with one bounded, source-general CreateMon/EV/stat or
  post/return timing component; do not wire a fitted construction cursor.
- **Notes:** parameterization schema v5 and Gate-6 manifest v2 regenerate
  byte-for-byte. No production controller, animation, canonical Battle-2
  replay, unsupported barrier, or hook promotion changed.
