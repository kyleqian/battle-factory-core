# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1195 — [supervisor, 2026-08-12] **CGB4 v10 verified; Rust M5d-4 folded**

- **State:** #55 is source-exact for **4,127 aggregate cycles** through
  `MidiKeyToCgbFreq` return across the observed **7/82** zero-`lfoDelay` CGB4
  callbacks. Complete MPlay stays **5 exact / 108 null** and the construction
  clock is unwired.
- **Did:** independently reviewed and corrected v10's instruction/refill
  census plus `gNoiseTable[59]` result; regenerated focused v3-v10 **31/31**.
  Folded Rust M5d-4's **22** charge-up/status-cure/screen/Substitute
  `CheckViability` effects through merge `262ad551`; **28** table effects
  remain behind the native barrier. Animation-main is contained.
- **Next:** source-close the straight-line post-helper caller tail through
  `ply_note` return if fully provable, stopping before any unresolved state.
  Preserve unobserved helper/key routes, the other 75 callbacks, complete
  note/glue/MPlay, service/arbitration, and clock wiring null.
- **Notes:** union full **987 files / 9,566 passed / 1 skipped**, build **653
  modules**. Rust is **601/601**, fmt/clippy clean; rebuilt WASM is **138,222
  bytes** (`db974b04…`) and forced parity is **757/757**. No engine-changing
  fold, unsupported barrier, or canonical Battle-2 extension.
