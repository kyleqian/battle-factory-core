# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1198 — [MAIN worker, 2026-08-12] **CGB4 v12 post-`ply_note` dispatcher source-closed**

- **State:** #55 is source-exact for **4,589 aggregate cycles** through the
  next `MusicPlayerTrack.cmdPtr` load across the same observed **7/82** CGB4
  callbacks: **4,435** unchanged complete-`ply_note` cycles plus **154**
  post-callback glue cycles. Complete MPlay stays **5 exact / 108 null** and
  the construction clock is unwired.
- **Did:** proved the real return owner from source/ELF/ROM: MPlayMain's
  dedicated note `BL` at `0x082dfb3e` preserves LR through `call_r3`, so
  `ply_note` resumes at caller branch `0x082dfb42`, not the generic jump-table
  tail. Frozen-v11-only v12 joins solely by `sourceStateDigest`; each row takes
  the fixed return branch, source-proven `wait==0` loop, and IWRAM `cmdPtr`
  load for **22 cycles**. It stops before `ldrb r1, [r2]` because v11 retains
  neither the current command byte nor `cmdPtr` target storage class.
- **Next:** retain that exact command-byte/storage discriminator, the other 75
  note callbacks, later command/track-loop work, complete MPlay totals,
  service/arbitration, and clock wiring null unless a new bounded receipt
  proves them source-generally.
- **Notes:** v12 evidence/doc SHA256 `d8e94417…` / `821b488f…`; red-first
  route/mutation/count guards and focused v3-v12 **41/41**, smoke **8 files /
  375 passed**, typecheck, exactly one full suite **989 files / 9,576 passed /
  1 skipped**, and build **653 modules** are green. No duration fit, runtime
  pointer/address identity, production import, unsupported barrier, animation/
  Rust change, or canonical Battle-2 branch.

## 1197 — [supervisor, 2026-08-12] **CGB4 v11 verified; Rust M5d completed and folded**

- **State:** #55 now has exact complete-`ply_note` totals for the observed
  **7/82** zero-`lfoDelay` CGB4 callbacks, with a **4,435-cycle** aggregate
  contiguous boundary through final `bx r0`. Rust `CheckViability` is
  **122/122** table effects native; its WASM boundary remains the next Rust
  milestone.
- **Did:** independently audited v11's fixed **44-cycle** caller tail and
  verified both IWRAM POP classes against a temporary Scene-OFF instruction
  probe before removing the hooks. Folded Rust M5d-5 through merge `6253143b`:
  all remaining **28** effects plus 97 TS-generated vector rows; the native
  barrier is dry. Animation-main remains contained.
- **Next:** source-close one separately bounded post-`ply_note` dispatcher/
  MPlay continuation slice without widening the seven-row evidence to the
  other 75 callbacks. Keep service/arbitration and construction-clock wiring
  null. Fold Rust M5e if rust-main advances.
- **Notes:** union full **988 files / 9,570 passed / 1 skipped**, build **653
  modules**. Rust is **662/662**, fmt/clippy clean; rebuilt WASM is **138,436
  bytes** (`9d53f91e…`) and forced parity is **757/757**. No engine-changing
  fold, soak trigger, unsupported barrier, or canonical Battle-2 extension.

## 1196 — [MAIN worker, 2026-08-12] **CGB4 v11 `ply_note` return source-closed**

- **State:** #55 is source-exact for **4,435 aggregate cycles** through the
  final `ply_note` `bx r0` return across the same observed **7/82** zero-
  `lfoDelay` CGB4 callbacks; those seven individual complete-note costs are
  now exact. The other 75 note callbacks, complete-MPlay aggregate,
  post-callback glue, and construction clock remain null.
- **Did:** added a frozen-v10-only v11 receipt joined solely by
  `sourceStateDigest`. It source/ELF/ROM-guards the `0x082dff04` branch,
  `_081DDCDC` frequency/status/track-flags writes, and complete epilogue:
  `pop {r0-r7}` eight-word IWRAM multiple read, four high-register restores,
  final IWRAM `pop {r0}`, and `bx r0`. Static `MPlayOpen`/`MPlayExtender` and
  stack provenance prove the new r4/r5/stack accesses IWRAM; fixed cost is
  **44 each / 308 aggregate**. No oracle capture.
- **Next:** retain post-callback MPlay dispatcher/glue, the other 75 note
  callbacks, unobserved helper/key/nonzero-LFO routes, complete-MPlay
  aggregate, service/arbitration, and construction-clock wiring null. A future
  worker may select one new bounded source-exact discriminator, but must not
  extend this receipt past `ply_note` return without a separate brief.
- **Notes:** red-first v11 route/mutation/count guards are green; focused
  v3-v11 **35/35**, smoke **8 files / 375 passed**, typecheck, post-change full
  **988 files / 9,570 passed / 1 skipped**, and build **653 modules** are green.
  Frozen v10 SHA256 `3e3af127…`; v11 uses **no** duration fit, runtime
  identity/address lookup, production import, unsupported barrier, animation/
  Rust change, or canonical Battle-2 branch.
