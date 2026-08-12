# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1203 — [MAIN worker, 2026-08-12] **CGB4 v16 fixed exit moves source-closed**

- **State:** #55 has a source-exact **5,366-cycle** aggregate prefix through
  the two fixed `_081DD994` register moves for the frozen **7/82** CGB4
  callbacks. Complete MPlay remains **5 exact / 108 null**; the construction
  clock is unwired.
- **Did:** preserved v15 byte-for-byte and joined only its seven
  `sourceStateDigest` rows. Source/ELF/ROM close `mov r3, sl; mov r4, fp` for
  **4 cycles each / 28 aggregate**, with no oracle capture or state inference.
- **Next:** stop before `subs r6, 0x1`; retain `r6`/track count, loop
  continuation/exit, other 75 callbacks, complete MPlay, service/arbitration,
  and construction-clock wiring null.
- **Notes:** evidence/doc `f9d539ac…` / `3fbb25e2…`; red-first then focused
  v15-v16 **7/7** green. No production, unsupported barrier, animation/Rust,
  canonical Battle-2, or absolute-tick change. Remaining gates are recorded
  after final verification.

## 1202 — [supervisor, 2026-08-12] **CGB4 v12-v15 verified; lane tips contained**

- **State:** #55 has a source-exact **5,338-cycle** aggregate prefix through
  the post-note zero-`mod` decision for the observed **7/82** CGB4 callbacks.
  Complete MPlay remains **5 exact / 108 null** and the construction clock is
  unwired.
- **Did:** independently regenerated v12-v15 and audited their timing classes.
  Corrected v15's handoff: zero `mod` takes `_081DD994`, skips `lfoDelayC`,
  and stops before `mov r3, sl`. Watched rust-main through its supervisor's
  05:31 wind-down; rust-main and animation-main both remain contained, so no
  fold or WASM/soak gate was triggered.
- **Next:** source-close only a separately evidenced track-loop-exit slice
  beginning at `_081DD994`; retain the other 75 callbacks, complete MPlay,
  service/arbitration, and construction-clock wiring null.
- **Notes:** final union **992 files / 9,588 passed / 1 skipped**, build **653
  modules**; focused v15 **4/4**, diff check and tree clean. No production
  engine/presentation change, unsupported barrier, or canonical Battle-2
  extension.

## 1201 — [MAIN worker, 2026-08-12] **CGB4 v15 mod decision source-closed**

- **State:** #55 is source-exact for **5,338 aggregate cycles** through the
  immediate post-note `mod` decision across the frozen **7/82** CGB4
  callbacks: v14 **5,254** plus v15 **84** cycles. Complete MPlay remains
  **5 exact / 108 null** and the construction clock is unwired.
- **Did:** two fresh address-free packet sets capture only `mod` on the same
  `sourceStateDigest` join: all seven are **0** (0 anchor / 3 LILIANA / 4
  legal-varied). Source/ELF/ROM close the IWRAM read, compare, and taken exit
  for **12 cycles each**; stripping v15 reproduces frozen v14 packet bytes.
- **Next:** the zero-`mod` branch skips `lfoDelayC`; stop at `_081DD994`
  before `mov r3, sl`. Retain later track-loop work, other 75 callbacks,
  complete MPlay, service/arbitration, and construction-clock wiring null.
- **Notes:** packet hashes `0700a3f3…` / `4375e86d…` / `6c903177…`; evidence/
  doc `28ec38e9…` / `62038919…`; focused v1-v15 **61/61**, smoke **8 files /
  375 passed**, typecheck, exactly one full suite **992 files / 9,588 passed /
  1 skipped**, and build **653 modules** are green. No runtime pointer/address
  identity, production import, unsupported barrier,
  animation/Rust change, or canonical Battle-2 branch.
