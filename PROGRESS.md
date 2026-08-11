# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1129 — [bounded MAIN worker, 2026-08-11] **#55 sixth-player selector closed**

- **State:** the exact v3 zero/one-pass selector defect is repaired by an
  additive packet; #55 remains open for timing composition and its construction
  clock stays null/unwired.
- **Did:** captured real sixth-entry `tempoI/tempoC` with `memAccArea`
  zero-normalized and joined **113/113** frozen v3 state/cost rows: **108 one-
  pass / 5 zero-pass**. All three v3 hashes are unchanged.
- **Next:** reduce per-call MPlay execution only from the now-exact selector
  plus source-proven command reads; do not fit a duration or wire the clock.
- **Notes:** two serial fresh OFF captures per case are byte-identical; compact
  hashes anchor `35fe3e32…`, LILIANA `4dbb8aba…`, varied `1e77d465…`.
  Focused selector/v3/read-contract **8/8**, smoke **375/375**, forced
  typecheck, full `npm test` **922 files / 8,619 passed / 1 skipped**
  (**84.03s**), and build (**631 modules**, Vite **6.23s**) are green.

## 1128 — [supervisor, 2026-08-11] **#55 audio read closure folded; final union green**

- **State:** master is green through `60d95120`; the actual mixer-entry target,
  mutable-route provenance, and command/pattern read-safety classes are closed.
  #55 remains open only for exact timing composition, and its construction
  clock stays null/unwired.
- **Did:** folded the 13-target `ply_note` classification (**6 inline / 0
  keysplit / 7 rhythm**) and the source-general MPlay command contract
  (**100/100** candidate tracks complete, max **5 commands / 11 reads**).
  Independently regenerated the combined evidence union at **9/9**.
- **Next:** capture a versioned player scalar selector that preserves
  `tempoI`/`tempoC` before attempting exact per-call MPlay cost reduction.
  Do not alter frozen v3, infer the erased selector, fit a duration, or wire
  `runFactoryConstructionClock`.
- **Notes:** orient folded animation-main through `77e3d325`; subsequent
  animation commits remain owned by the active animation supervisor. Final
  union `npm test` **921 files / 8,617 passed / 1 skipped** (**146.46s**),
  build **631 modules** (Vite **6.29s**), vanilla soak **20/20** (**32.2s**),
  and full-policy soak **60/60** (**278.9s**) are green with **0 crash / 0
  hang**. OFF oracle is healthy; no material decision was deferred.

## 1127 — [bounded MAIN worker, 2026-08-11] **#55 MPlay read bounds closed; selector isolated**

- **State:** the remaining v3 MPlayMain command/pattern dereferences are fully
  bounded for all committed states; exact zero/one-pass selection remains
  unavailable, #55 stays open, and the construction clock remains unwired.
- **Did:** source-replayed **1,130** track snapshots: **1,017 active**, **917
  wait>0**, and all **100/100** wait-zero candidates complete with **0**
  incomplete, **90** read sets, max **5 commands / 11 byte reads**. All
  pointers normalize to 9 symbol-relative song roles and fail closed.
- **Next:** repair/capture a versioned player scalar selector only if exact
  per-call MPlay execution is needed for a duration reducer; do not alter v3
  or infer the erased `tempoI/tempoC` values.
- **Notes:** evidence hash `a158fff7…`; all three prior v3 fixture hashes are
  preserved. No oracle run, duration, cost, clock/controller, presentation,
  animation, barrier, or canonical recording change. Focused **4/4**, smoke,
  forced typecheck, full `npm test` **921 files / 8,617 passed / 1 skipped**
  (**84.06s**), and build (**631 modules**, Vite **6.36s**) are green.
