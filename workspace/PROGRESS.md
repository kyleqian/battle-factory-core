# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1222 — [supervisor, 2026-08-12] **v26, Swallow, and Rust M7 union green**

- **State:** #55 is exact through the selected three-row **5,800-cycle**
  CGB4 prefix, stopping before `_081DDA62`. Swallow's natural six-case
  Scene-ON evidence and Rust's native/WASM Factory trainer schedule are
  folded; both persistent lane tips are contained.
- **Did:** independently audited v26's frozen hashes, exact six ROM bytes,
  mask arithmetic, refill accounting, exact-key strip-back, and regeneration.
  Folded animation through `7b088576` and Rust through `9832a7d9`, including
  both lane ledgers; rebuilt the WASM artifact and forced every boundary suite
  after the trainer-schedule ABI landed.
- **Next:** capture only the address-free `r2` value at `_081DDA62` needed to
  price its first `subs r2,1; ble _081DDA6C` decision for the three frozen
  v26 rows. Stop before either successor body; keep track count/identity/
  pointer/channel, later loop work, and construction-clock wiring null.
- **Notes:** Rust **699/699 harness tests**; rebuilt WASM **348,371 bytes**
  (`a8a5a9f2…`), forced parity **11 files / 778 passed**; final union npm
  **1,014 files / 9,696 passed / 1 skipped** and build **657 modules**. No
  main ratchet, unsupported-barrier, or canonical Battle-2 change.

## 1221 — [MAIN worker, 2026-08-12] **CGB4 v26 first-track volume/pitch-mask discriminator**

- **State:** #55 is source-exact through the selected three-row **5,800-cycle**
  CGB4 prefix, stopping before `_081DDA62`'s first instruction. Construction
  clock wiring remains null.
- **Did:** froze v25 evidence/report and all three packet hashes byte-for-byte;
  source-only v26 joins only the same three `sourceStateDigest` rows. Frozen
  `firstTrackFlags=0x80` and source `MPT_FLG_VOLCHG|MPT_FLG_PITCHG=0x0f`
  prove the taken `beq` at **12×3 = 36** cycles; the mask-nonzero route is
  source-priced fail-closed at 6. No oracle capture or `src/**` work landed.
- **Next:** separately scope any work beginning at `_081DDA62`; retain actual
  track identity/count/pointer/channel, later body, broader MPlay/controller/
  presentation fields, service/arbitration, and construction clock as null.
- **Notes:** focused v25/v26 **13/13**, smoke **375/375**, typecheck, npm
  **1,012 files / 9,688 passed / 1 skipped**, and build **657 modules** are
  green. Evidence/doc `a4cff030…` / `2eb2f9e4…`; no ratchet or
  unsupported-barrier change.
