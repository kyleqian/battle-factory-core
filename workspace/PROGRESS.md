# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1204 — [supervisor, 2026-08-12] **CGB4 v17 track-loop decision verified**

- **State:** #55 has a source-exact **5,394-cycle** aggregate prefix through
  `subs r6, 0x1; ble _081DD9A4` for the frozen **7/82** CGB4 callbacks.
  Complete MPlay remains **5 exact / 108 null**; the construction clock is
  unwired.
- **Did:** two fresh address-free OFF packet sets capture live pre-decrement
  `r6`: **3×4 / 2×3**; decrement leaves **2×4 / 1×3**, so all **7** `ble`
  routes continue (no refill). Source/ELF/ROM close only the pair for **4
  cycles each / 28 aggregate**; v16 evidence/doc regenerate byte-for-byte.
- **Next:** stop before `movs r0, MusicPlayerTrack_size` on continuation and
  `ldr r0, [r7, o_MusicPlayerInfo_clock]` on exit. Keep later loop body,
  other 75 callbacks, complete MPlay, service/arbitration, and construction
  clock wiring null.
- **Notes:** worker red-first; supervisor independently regenerated v17 and
  reran focused v16/v17 **7/7** plus smoke **8 files / 375 passed**. Worker
  typecheck and build **653 modules** are green. Its one full-suite process
  lost the final transport summary; session-start baseline was **993 files /
  9,591 passed / 1 skipped**. No lane fold, production, unsupported barrier,
  recording import, animation/Rust, canonical Battle-2, or absolute-tick change.

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
  v15-v16 **7/7**, smoke **8 files / 375 passed**, typecheck, exactly one full
  suite **993 files / 9,591 passed / 1 skipped**, and build **653 modules** are
  green. No production, unsupported barrier, animation/Rust, canonical
  Battle-2, or absolute-tick change.

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
