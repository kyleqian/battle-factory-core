# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1225 — [supervisor, 2026-08-12] **CGB4 v28, Swallow, and Rust M8b union green**

- **State:** #55 is source-exact through the three selected-row **5,848-cycle**
  CGB4 prefix, stopping before the next track-flags load. Swallow's complete
  Scene-ON presentation and Rust's Factory-AI battle-history/live-view ABI are
  folded; both persistent lane tips are contained.
- **Did:** recovered and audited v28 after its worker hit the cap, proving the
  fixed 80-byte IWRAM track stride, signed-positive taken `bgt`, exact six ROM
  bytes, **12×3 = 36** cycles, fail-closed strip-back, and byte-stable
  regeneration. Folded animation through `3197fca5` and Rust through
  `796f546d`; rebuilt WASM and forced every boundary suite.
- **Next:** capture only the address-free next-track flags at `_081DD9C8`
  needed to classify the second loop iteration for the same three frozen v28
  rows. Keep actual pointer/count/index/identity/channel, wider body,
  service/arbitration, and construction-clock wiring null.
- **Notes:** Rust **712/712 tests**; rebuilt WASM **395,869 bytes**
  (`1d566618…`), forced parity **12 files / 781 passed**; final union npm
  **1,018 files / 9,714 passed / 1 skipped** and build **659 modules**. The
  pre-rebuild parity failure correctly exposed the stale artifact. No main
  ratchet, unsupported-barrier, or canonical Battle-2 change.

## 1224 — [supervisor, 2026-08-12] **v27 and Rust M8a union green**

- **State:** #55 is exact through the three selected-row **5,812-cycle** CGB4
  prefix. Rust's native Factory-AI battle-history leaf is folded; both
  persistent lane tips are contained.
- **Did:** audited v27's twice-fresh exact-key packets, `r2=10` result, exact
  ROM bytes, branch-halfword timing, fail-closed exit route, and byte-stable
  regeneration. Folded Rust through `e500d74f`, reran native Rust, rebuilt
  WASM, forced all existing boundary suites, and verified the full union.
- **Next:** source-close only the observed non-exit continuation `movs r0,
  MusicPlayerTrack_size; adds r5,r0; bgt _081DD9C8` for the same three frozen
  v27 rows. Stop before `_081DD9C8`; retain actual count/identity/pointer/
  channel, next flags/body, and construction-clock wiring null.
- **Notes:** Rust **708/708 harness tests**; rebuilt WASM **348,965 bytes**
  (`f5939249…`), forced parity **11 files / 778 passed**; union npm **1,015
  files / 9,703 passed / 1 skipped** and build **657 modules**. No main
  ratchet, unsupported-barrier, or canonical Battle-2 change.

## 1223 — [MAIN worker, 2026-08-12] **CGB4 v27 first-track decrement/exit decision**

- **State:** #55 is source-exact through the three selected-row **5,812-cycle** CGB4 prefix, stopping before either `_081DDA6C`'s first instruction or the non-exit continuation's `movs r0, MusicPlayerTrack_size`. Construction-clock wiring remains null.
- **Did:** two fresh serial OFF packet sets are byte-identical and retain only address-free `r2BeforeDecrement`; all three observed values are **10**, independently deriving `subs r2,1; ble` not-taken at **4×3 = 12** cycles. Pinned source/ELF/ROM bytes `01 3a 02 dd`; the schema-consistent unobserved exit route is fail-closed at 10 cycles including its refill. v26 evidence/report and inherited v25 packets are frozen byte-for-byte.
- **Next:** leave actual track count/identity/pointer/channel, both successor bodies, later loop work, broader MPlay/controller/presentation, service/arbitration, and construction clock null; any successor work needs a separately bounded receipt.
- **Notes:** focused v25/v26/v27 **20/20**, smoke **375/375**, typecheck, npm **1,015 files / 9,703 passed / 1 skipped**, and build **657 modules** green. No `src/**`, ratchet, unsupported-barrier, canonical Battle-2, animation, or Rust change.
