# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1101 — [supervisor, 2026-08-10] **#55 MPlayMain callback residual closed**

- **State:** side commits `5ca1367a`/`104a75a5`/`9130f99f` folded by
  `a56341fb`; #55 remains open and the construction clock stays unwired.
  Union focused **6/6**, smoke **375/375**, and production build are green;
  the worker full suite passed **894 files / 8,484 / 1 skipped**.
- **Did:** source/ELF-audited all **36** `gMPlayJumpTable` and **14**
  `gXcmdTable` slots, including `ply_xcmd`/`ply_xxx` transitive edges. Two
  fresh Scene-OFF runs per case reproduce **52/31/30 = 113** exact compact
  v3-state/cost joins with zero unequal costs; total fixtures are **136 KB**.
- **Next:** continue #55 with independently proven EWRAM word/halfword bus
  timing and field tails, or one remaining bounded command-window/
  SoundMainRAM sample-target class. Do not fit a residual or wire aggregate
  stats, audio duration, or the live clock.
- **Notes:** two audio dereference classes remain. No controller,
  presentation, barrier, recording import, animation, or canonical Battle-2
  change landed. Orient folded 31 animation commits through `11245f83`;
  `animation-main` is now four later animation commits ahead under its own
  supervisor and is intentionally left for the next orient. `DEFERRED.md`
  has no open entry.

## 1100 — [supervisor, 2026-08-10] **#55 `%24` composition + compact CgbSound evidence folded**

- **State:** main `d7820e25`/`83513d9b` plus squash-fold `d55da1ac`; #55
  remains open and the construction clock is unwired. Union focused **26/26**,
  smoke **375/375**, and production build are green; worker full suites were
  main **892 files / 8,478 passed / 1 skipped** and side **893 / 8,477 / 1**.
- **Did:** completed all **24×4** `GetSubstruct` `%24` routes and their exact
  eight-call ROM-only subtotal while retaining accessor `cycles: null`.
  Closed the finite CgbSound callback/table dereference class across **11**
  paths and **113/113** twice-fresh equal-state/equal-cost joins; compacted
  its evidence to **48,062 bytes** before squash integration.
- **Next:** continue #55 only with independently proven EWRAM word/halfword
  bus timing and field tails, or one remaining bounded MPlayMain/SoundMainRAM
  dereference class. Do not fit residuals or wire aggregate stats/the clock.
- **Notes:** orient folded **31 animation commits** through `11245f83` and the
  resulting union passed full test/build before dispatch. S8's generic
  round/controller reset remains enforced: no canonical Battle-2 work past
  tick 33331, no recording import, barrier, presentation, or controller
  change. `DEFERRED.md` has no open entry. `animation-main` is currently one
  later Heat Wave evidence commit ahead under its separate supervisor.

## 1099 — [MAIN worker, 2026-08-10] **#55 `GetSubstruct` `%24` composition is exact and bounded**

- **State:** implementation `d7820e25`; #55 remains open, accessor/stats
  totals stay `null`, and the construction clock is unwired. The Scene-OFF v2
  packets remain at `631bd214…`, `ae1282b7…`, and `3e10197a…`.
- **Did:** independently pinned the full 192-byte `__umodsi3` ELF symbol,
  GetSubstruct call/resume/three helper exits, all **24×4** routes, and the
  exact source order `[0,1,2,3,0,1,2,3]` in GetBoxMonData2/checksum. The
  narrow source-general `%24` reducer now makes each GetSubstruct complete;
  the census exposes its eight-call subtotal plus the **1,174** shared fetch
  cycles (e.g. `0xffffffff`: **6,824 / 7,998**), never an accessor total.
- **Next:** reduce only independently proven EWRAM word/halfword accesses,
  field tails, async +18, and VBlank/IRQ boundaries. Do not fit residuals,
  wire aggregate stats/the clock, or resume canonical Battle 2.
- **Notes:** all **156** OFF nested stats-accessor boundaries exceed the known
  source-only subtotal after recorded pauses, with their positive remainder
  left external. Focused **23/23**, smoke **375/375**, typecheck, full
  `npm test` **892 files / 8,478 passed / 1 skipped**, and build passed; no
  fixture/recording import, barrier, m4a, presentation, or clock change.
