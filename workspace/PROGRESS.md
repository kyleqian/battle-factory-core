# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1229 — [supervisor, 2026-08-13] **CGB4 v31 and lane union green**

- **State:** #55 is source-exact through the three selected-row **5,920-cycle**
  CGB4 prefix. Cosmic Power's bounded presentation checkpoint and Rust M8d/M8e
  live-view constructor boundary are folded; both persistent lane tips are
  contained.
- **Did:** independently reran v31 **8/8**, then folded animation through
  `25bca32b` and Rust through `b2423e2a`. Audited the Rust ABI, ran native
  Rust, rebuilt the WASM artifact, forced every parity suite through WASM, and
  verified the full TypeScript union.
- **Next:** source-close only the observed second-track non-exit continuation
  `movs r0, MusicPlayerTrack_size; adds r5,r0; bgt _081DD9C8` for the same
  three frozen v31 rows. Stop before `_081DD9C8`; retain actual pointer/count/
  index/identity/channel, next-track flags/body, service/arbitration, and
  construction-clock wiring null.
- **Notes:** Rust **716/716 tests**; WASM **412,104 bytes** (`d5abf0a5…`),
  forced parity **14 files / 790 passed**; union npm **1,023 files / 9,741
  passed / 1 skipped**, build **660 modules**. No main ratchet,
  unsupported-barrier, or canonical Battle-2 change.

## 1228 — [MAIN worker, 2026-08-13] **CGB4 v31 second-track decrement decision green**

- **State:** #55 is source-exact through the three selected-row **5,920-cycle**
  CGB4 prefix, stopping before the selected continuation and `_081DDA6C` exit
  successor bodies.
- **Did:** captured two fresh serial OFF packet sets retaining only
  `sourceStateDigest` + `r2BeforeDecrement`; all three r2 values are `9`.
  Frozen v30 evidence/report/packets remain byte-for-byte; source/ELF/ROM
  close `01 3a 02 dd`, deriving observed `subs; ble` **not taken** at
  **4×3 = 12** cycles.
- **Next:** separately scope only the observed second-track
  `movs r0, MusicPlayerTrack_size` continuation decision/body if needed; keep
  actual pointer/count/index/identity/channel/frame/duration/condition flags,
  subtraction-result serialization, either successor body, broader MPlay,
  service/arbitration, and construction-clock wiring null until then.
- **Notes:** focused v31 **8/8**, v30 **6/6**, smoke **375/375**, final npm
  **1,021 files / 9,732 passed / 1 skipped**, build **659 modules**. Fresh
  hashes: anchor `6a4af5ec…`, LILIANA `4b13624c…`, legal-varied `ad82e79e…`;
  no `src/**`, presentation, animation/Rust, ratchet, unsupported-barrier, or
  canonical Battle-2 change.

## 1227 — [MAIN worker, 2026-08-13] **CGB4 v30 second-track mask decision green**

- **State:** #55 is source-exact through the three selected-row **5,908-cycle**
  CGB4 prefix, stopping before the selected `_081DDA62: subs r2, 0x1` branch
  body (and before the non-selected `mov r9, r2` body).
- **Did:** captured two fresh serial OFF packet sets with only
  `sourceStateDigest` + `secondTrackFlags`; all three values are `0x80`.
  Frozen v29 evidence/report/packets remain byte-for-byte; source/ELF/ROM
  close `0f 21 01 42 45 d0`, deriving the clear-mask taken `beq` at
  **12×3 = 36** cycles. Added the address-free v30 probe/reporter/fixtures/
  generated doc and red-first Tier-1 pins.
- **Next:** separately scope only the second-track `_081DDA62` decrement/exit
  decision, with the minimum address-free scalar if fresh evidence is needed.
  Keep actual pointer/count/index/identity/channel/frame/duration, either
  successor body, broader MPlay, service/arbitration, and construction-clock
  wiring null.
- **Notes:** focused v30 **6/6**, v29 **4/4**, smoke **375/375**, final npm
  **1,020 files / 9,724 passed / 1 skipped**, build **659 modules**. Fresh
  hashes: anchor `77ce80af…`, LILIANA `b6c53e5f…`, legal-varied `53fabb3e…`;
  no `src/**`, presentation, animation/Rust, ratchet, unsupported-barrier, or
  canonical Battle-2 change.
