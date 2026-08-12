# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1193 — [supervisor, 2026-08-12] **CGB4 v9 verified; Rust M5d-3 folded**

- **State:** #55 is source-exact for **3,453 aggregate cycles** through fixed
  `call_r3` entry across the observed **7/82** zero-`lfoDelay` CGB4 callbacks.
  Complete MPlay stays **5 exact / 108 null** and the construction clock is
  unwired.
- **Did:** independently regenerated/audited v9's twice-fresh `pan_sweep=0`
  route (**34 each / 238 aggregate**) and its strict dynamic-helper boundary.
  Folded Rust M5d-3's **30** weather/heal/damage/status/Counter
  `CheckViability` effects through merge `84789fbb`; **50** table effects
  remain behind the native barrier. Animation-main is contained.
- **Next:** source-close one coherent dynamic `call_r3`/
  `MidiKeyToCgbFreq` helper slice, stopping before its first unresolved
  discriminator. Preserve helper result/later fields, unobserved routes, the
  other 75 callbacks, complete note/glue/MPlay, service/arbitration, and clock
  wiring null.
- **Notes:** union full **986 files / 9,562 passed / 1 skipped**, build **653
  modules**. Rust is **528/528**, fmt/clippy clean; rebuilt WASM is **138,223
  bytes** (`e6096b79…`) and forced parity is **757/757**. No engine-changing
  fold, unsupported barrier, or canonical Battle-2 extension.
