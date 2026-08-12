# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1210 — [MAIN worker, 2026-08-12] **CGB4 v21 clock-exit r4 decision source-closed**

- **State:** #55 has a source-exact **5,674-cycle** aggregate prefix through
  the five fixed `_081DD9A4` clock-exit instructions for only the three frozen
  EXIST-clear CGB4 rows. Complete MPlay remains **5 exact / 108 null** and
  the construction clock remains unwired.
- **Did:** two fresh OFF packet sets are byte-identical and join only frozen
  `sourceStateDigest`: r4 is nonzero for all three clear rows. Source/ELF/ROM
  close `ldr/add/str/cmp/bne` at **16 × 3 = 48** cycles; four EXIST-set rows
  remain null before `_081DD886`, and successor/status/tempo/body stay null.
- **Next:** preserve the four EXIST-set rows and all selected-successor,
  status-write, tempo/body, later-MPlay, service/arbitration, and
  construction-clock fields as null unless separately proved.
- **Notes:** red-first v21 import proof failed as intended, then focused
  v20/v21 **10/10**, twice-regenerated artifact diff, typecheck, smoke
  **375/375**, one post-change full suite **1,002 files / 9,633 passed /
  1 skipped**, and build **653 modules** are green. No `src/**`, ratchet,
  unsupported-barrier, presentation/animation/Rust, or canonical Battle-2
  change.

## 1209 — [supervisor, 2026-08-12] **CGB4 v20 and persistent-lane union verified**

- **State:** #55 retains the source-exact **5,626-cycle** aggregate prefix
  through the second clear-track decrement for **3/7** frozen CGB4 rows.
  `animation-main`'s dense Confuse Ray evidence and `rust-main`'s Factory AI
  mask-zero decision policy are folded; both lane tips are contained.
- **Did:** audited v20's frozen joins, r6 preservation, selected-row nulls,
  and fixed Thumb timing (**10 × 3 = 30**). Folded animation through
  `991dbd5f` and Rust through `992d6bed`, rebuilt WASM, and verified the
  complete post-fold union.
- **Next:** capture one address-free decision needed to source-close a
  bounded successor: preferably the accumulated-channel r4 zero/nonzero
  branch at the clear-row `_081DD9A4` exit. Keep the four EXIST-set rows,
  clock value/wiring, later MPlay work, other 75 callbacks, and service/
  arbitration null unless independently proved.
- **Notes:** v20 focused **10/10**, smoke **375/375**, typecheck, and its
  pre-fold full suite **1,000 files / 9,625 passed / 1 skipped** were green.
  Post-fold Rust **670/670**; WASM **253,791 bytes** (`034833c1…`), forced
  parity **766/766**; union npm **1,001 files / 9,628 passed / 1 skipped** and
  build **653 modules**. No `src/**`, ratchet, unsupported-barrier, or
  canonical Battle-2 change; no soak trigger.

## 1208 — [MAIN worker, 2026-08-12] **CGB4 v20 clear-successor second decrement source-closed**

- **State:** #55 has a source-exact **5,626-cycle** aggregate prefix through
  `_081DD998: subs r6, 0x1; ble _081DD9A4` for only the three frozen
  EXIST-clear CGB4 rows. Complete MPlay remains **5 exact / 108 null** and
  the construction clock is unwired.
- **Did:** v20 preserves/regenerates frozen v19 evidence/report/packets
  byte-for-byte and joins only `sourceStateDigest`; it reads no oracle data.
  Frozen clear fields prove `r6 2→1`; exact v18/v19 routes do not write r6,
  so the source-closed second decrement yields zero and takes the branch:
  **10 × 3 = 30** cycles. The four EXIST-set rows retain null v20 cost before
  `_081DD886`; every clear row stops before `_081DD9A4`'s first instruction.
- **Next:** retain the exit body/clock, identity/index/count, later loop work,
  v17's unobserved exit, other callbacks, complete MPlay, service/arbitration,
  and clock wiring as null; any next #55 slice must be separately source- or
  capture-proven.
- **Notes:** v20 evidence/doc `ba5fa1b0…` / `741d8ab6…`; explicit v17/v18/v19
  branch-halfword cross-check is pinned. Red-first under-price **8** failed;
  focused v19/v20 **10/10**, smoke **375/375**, typecheck, one final
  `npm test`, and the production build are green. No production, ratchet,
  presentation/animation/Rust, or canonical Battle-2 change.
