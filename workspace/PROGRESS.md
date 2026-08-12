# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1217 — [supervisor, 2026-08-12] **CGB4 v24 independently verified**

- **State:** #55 retains the source-exact **5,740-cycle** aggregate prefix
  through the three selected `_081DD9C4` two-load successors, stopping before
  `_081DD9C8` reads the first track's flags. Both persistent lane tips remain
  contained and construction-clock wiring remains null.
- **Did:** audited the exact four-byte ROM region, source/storage offsets,
  IWRAM access classes, digest-only three-row join, and 4-cycle per-row model.
  Confirmed v23's hashes are frozen, v24 accepts no runtime field, all actual
  track operands remain excluded/null, and no production or barrier changed.
- **Next:** capture only the first-track flags discriminator needed to price
  `_081DD9C8` through its first `MPT_FLG_EXIST` decision for these same three
  rows. Stop before the `MPT_FLG_VOLCHG | MPT_FLG_PITCHG` test and retain
  track identity/count/pointer, later loop work, and construction clock null.
- **Notes:** v24 evidence/doc `288bb342…` / `be4b6a31…`; focused v23/v24
  **12/12**, smoke **375/375**, typecheck, npm **1,008 files / 9,664 passed /
  1 skipped**, and build **655 modules** are green. No ratchet, unsupported-
  barrier, animation/Rust, presentation, or canonical Battle-2 change.

## 1216 — [MAIN worker, 2026-08-12] **CGB4 v24 source-only successor prefix**

- **State:** #55's selected three-row source-exact prefix reaches **5,740**
  cycles through the two fixed _081DD9C4 loads, stopping before _081DD9C8's
  first track-flags read. No construction-clock wiring landed.
- **Did:** froze v23 evidence/report byte-for-byte, joined only its three
  selected sourceStateDigest rows, and pinned source/ELF/ROM bytes
  `3a 7a fd 6a`, field offsets 8/44, IWRAM access class, and **4×3 = 12**
  cycles. v24 rows retain only digests and timing; the 2-cycle under-price
  and runtime-field widening fail closed.
- **Next:** this receipt ends before the first _081DD9C8 track-flags read.
  Any continuation needs a separately scoped, fail-closed evidence plan.
- **Notes:** focused v23/v24 **12/12**, smoke **375/375**, typecheck,
  exactly one post-change npm **1,008 files / 9,664 passed / 1 skipped**,
  and build **655 modules** are green. No `src/**`, ratchet, unsupported-
  barrier, animation/Rust, presentation, or canonical Battle-2 change.

## 1215 — [supervisor, 2026-08-12] **CGB4 v23 and persistent-lane union verified**

- **State:** #55 retains the source-exact **5,728-cycle** aggregate prefix
  through the three selected `_081DD9BC` store/compare/branch decisions.
  Confuse Ray exact Scene-ON presentation and Rust M6a's pure Factory-AI
  switch selector are folded; both persistent lane tips are contained.
- **Did:** independently audited v23's frozen digest join, exact one-scalar
  packet schema, twice-fresh identity, 12-cycle taken route, 14-cycle
  source-general non-taken route, and all retained null boundaries. Folded
  animation through `64ec9f90` and Rust through `30641085`, rebuilt WASM,
  forced all boundary parity suites, and verified the complete union.
- **Next:** source-close only the fixed two-instruction `_081DD9C4` successor
  prefix for the same three rows, stopping before `_081DD9C8` reads track
  flags. Keep track count/value/pointer identity, loop body, the four
  EXIST-set rows, complete MPlay, service/arbitration, and construction-clock
  wiring null unless separately evidenced.
- **Notes:** v23 focused **12/12** and independent post-final-edit typecheck;
  Rust **897/897**; WASM **300,227 bytes** (`c4da2f6c…`), forced parity **9
  files / 772 passed**; union npm **1,007 files / 9,659 passed / 1 skipped**
  and build **655 modules**. No ratchet, unsupported-barrier, or canonical
  Battle-2 change; no soak trigger.
