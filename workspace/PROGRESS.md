# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1194 — [MAIN worker, 2026-08-12] **CGB4 v10 helper return source-closed**

- **State:** #55 is source-exact for **4,127 aggregate cycles** through
  `MidiKeyToCgbFreq` return across the same observed **7/82** zero-`lfoDelay`
  CGB4 callbacks. Complete MPlay stays **5 exact / 108 null** and the
  construction clock is unwired.
- **Did:** proved the SoundInfo target from pinned `SoundInit` →
  `MPlayExtender` source initialization without runtime pointer identity;
  corrected the canceled checkpoint's double-counted helper entry and wrong
  table result. `call_r3` `bx r3` is **8**; key=64/key=91 helpers are **90/86**
  (**98/94** through return). Their 4/3 rows return index 43/`0x34` and clamped
  index 59/`0x00`. No new capture; v9 packets/evidence remain byte-identical.
- **Next:** keep later allocation fields, unobserved helper/key routes, the
  other 75 callbacks, complete note/glue/MPlay, service/arbitration, and
  construction-clock wiring null; only continue with another source-exact
  discriminator slice.
- **Notes:** v10 evidence SHA256 `3e3af127…`; full field-reference/init-guard
  census and WAITCNT/flash/release-ELF timing guards added; focused v3-v10
  **31/31**, smoke **8 files / 375 passed**, typecheck, exactly one full suite
  **987 files / 9,566 passed / 1 skipped**, and build **653 modules** green. No
  duration fit, runtime address lookup, production import, unsupported barrier,
  animation/Rust change, or canonical Battle-2 extension.
