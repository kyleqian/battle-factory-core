# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R51 — [supervised session, 2026-08-20] **M50 Battle Script Focus Punch no-damage gate + final wind-down**

- **State:** `rust-main` = current master `0dd3f36c` plus verified
  `Cmd_jumpifnodamage` worker `09a1bcc1`. The complete pure
  `battleScriptJumpifnodamageOpcode.ts` registration/state/control projection
  is native and wasm32-compilable; no ABI or adapter surface was widened. The
  session ends committed and green.
- **Did:** ported exact singleton registration and complete Focus Punch shape,
  attacker-first role resolution, ProtectStruct-only physical/special receipt
  reads, nonzero-receipt advance without label lookup, and zero-receipt late
  jump resolution. The command preserves every projected field and ignores the
  same-named SpecialStatus copies. Canonical TypeScript execution supplies
  **131 handler cases** and **16 registration cases**, including every four-
  attacker × 25 signed-i32 receipt-edge combination, shadow-receipt controls,
  ordered errors, malformed shapes, preservation, and repetitions. Corpus
  sha256 `d0972bdc7764a77f4ab75ac3c3e52c91ca845e14a52315a0f2ab5e1defa1e046`.
- **Next:** merge current master at the next Rust session, recheck active work,
  and select another conflict-free pure Battle Script leaf. M7c opponent
  generation still waits on canonical TypeScript live generation; main and
  animation moving targets remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp
  dispatch/body, source fields, macro, singleton Focus Punch site, registration
  and role/label ordering, no-write boundary, shadow fields, and repetitions;
  regenerated twice byte-identically (canonical corpus **343,093 bytes**;
  generated file **885,070 bytes**, sha256
  `cdf36b8c2fb11bdec08c9ba4d7dabd2a8e2af4bb061bc2e5657380ff999d5a78`;
  generator **48,437 bytes**, sha256
  `70848ab99e69b13bad3715fbe62d2581cf2fa01874848548a90ed878185dc9f1`).
  Focused **10/10**, cargo **1,001/1,001**, fmt, strict Clippy, and wasm32
  release pass. Artifact is **492,691 bytes**, sha256
  `61f39cfe556864e1b44483297ed20a5192b7aef4b21391dc9cf87ec99e981574`.
  Final npm is green at **1,068 files / 10,126 passed / 223 skipped**; build is
  green at **691 modules**. Final soaks are vanilla **20/20 OK** and full
  policy **60/60 OK**, both with zero crashes and zero hangs. Scope stayed
  inside `core-rs/**`; no unsupported barrier, Rust deferral, or papercut was
  added. `animation-main` has one unfolded commit (`7f2ccb84`); its supervisor
  still owns that fold.

## R50 — [supervised session, 2026-08-15] **M49 Battle Script weather-scaled recovery leaf + final wind-down**

- **State:** `rust-main` = current master `ab862ad1`, including verified
  `Cmd_recoverbasedonsunlight` worker `34be47ca`. The complete pure
  `battleScriptRecoverBasedOnSunlightOpcode.ts` registration/state/control
  projection is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session ends committed and green.
- **Did:** ported exact first-match registration, attacker/target role
  resolution and target rebinding, full-HP failure with late label resolution,
  and success damage for neutral or suppressed weather, sun, and other
  weather. Recovery is respectively `-max(1, maxHP / 2)`,
  `-max(1, 20 * maxHP / 30)`, or `-max(1, maxHP / 4)`. Canonical TypeScript
  execution supplies **808 handler cases** and **5 registration cases** plus
  **786,424 applications** covering every maxHP u16 at full, lower, and
  corrupt-higher HP across all four weather regimes, normalized to **125,607
  intervals**. Corpus sha256
  `7c3adaca45202f2f310eabccb3023344ca4acbed2bbaeaeb268bff4f600fdfe4`.
- **Next:** merge current master at the next Rust session, recheck active work,
  and select another conflict-free pure Battle Script leaf. M7c opponent
  generation still waits on canonical TypeScript live generation; main and
  animation moving targets remain excluded.
- **Notes:** Sol/high worker, one commit. Supervisor audited decomp dispatch,
  singleton registration, instruction/role/label ordering, full-HP equality,
  weather suppression across living battlers, arithmetic, write set, and
  repetitions; regenerated twice byte-identically (canonical corpus
  **9,065,263 bytes**; exhaustive evidence **10,557,911 bytes**, sha256
  `1b0e5b8f555a7b0ec7c60c9b2e97fa8b82a376afffd67d58ecee9e7992333599`;
  generated file **8,516,856 bytes**, sha256
  `ee8b01c1381f84684fe5dbbbb2c49a0fde14c3491d38532c8eca33acd52e0746`;
  generator **19,904 bytes**, sha256
  `128e9a6823732b5669ad163ea7d25ec1035288e593dd25d40faef288e75fb0b7`). Focused **5/5 +
  3/3**, cargo **991/991**, fmt, strict Clippy, and wasm32 release pass. The
  artifact is **492,683 bytes**, sha256
  `782c1b2aa3addb23d4db916cf9c00d461fe6533875550e2513127c948c0d7728`.
  Final latest-master npm is green at **1,040 files / 9,915 passed / 223
  skipped**; build is green at **681 modules**. Final soaks are vanilla
  **20/20 OK** and full policy **60/60 OK**, both with zero crashes and zero
  hangs. Scope stayed inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added. PAPERCUT: `cargo clippy --all-targets` exposed an older
  test-only `op_ref` lint outside this step; the required strict library
  Clippy gate remained green, ~2 min.

## R49 — [supervised session, 2026-08-15] **M48 Battle Script Low Kick weight-damage leaf**

- **State:** `rust-main` = current master `5b9a12af` plus verified
  `Cmd_weightdamagecalculation` worker `d51a4db2`. The complete pure
  `battleScriptWeightDamageOpcode.ts` registration/catalog/scalar/state/control
  projection is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session remains active and committed.
- **Did:** ported exact singleton/operand-free registration, target-first role
  resolution, source species-to-Pokédex-weight lookup, all **25** legacy null
  compatibility IDs, exact catalog errors, and strict Low Kick weight bands
  `<100/<250/<500/<1000/<2000/else` to power
  `20/40/60/80/100/120`. Success overwrites only dynamic base power and
  advances. Canonical TypeScript execution supplies **1,132 handler cases**,
  **66 scalar cases**, and **7 registration cases** across all **411** source
  catalog rows, the complete **500** target/selector matrix, threshold and
  safe-integer domains, malformed values, prior u16 power edges, ordered
  errors, repetitions, and immutability. Corpus sha256
  `5c970efa033a8fc982e81f962ed1372cf63166d1c842346445c51d2c7904fb6c`.
- **Next:** recheck active work and select one final conflict-free pure Battle
  Script leaf if the deadline reserve permits; otherwise perform the required
  final full npm/build, soak, Rust, ledger, and clean-tree wind-down.
- **Notes:** Terra/max worker, one commit. Supervisor audited decomp dispatch,
  table/body, operand-free macro, single Low Kick site, extracted Pokédex
  authority, all catalog IDs/nulls, registration and target ordering, scalar
  errors, write set and repetitions; regenerated twice byte-identically
  (catalog input **3,981 bytes**, sha256
  `8831e5a6e21a42ab71dce857243f008a4efdac72e97cdf83148763e25ad6d85f`;
  catalog Rust **11,788 bytes**, sha256
  `d0f6e93d8d4e178eb23f091b16bdc9ad43b952d263fab163a082af35ae85215b`;
  canonical corpus **490,486 bytes**; vectors **1,327,310 bytes**, sha256
  `6a4bac03fa2a104056d2a37448c686556ad6ed24922723a51c409feaccb82376`;
  generator **38,279 bytes**, sha256
  `76d97de4b94527e7a777c2339c6311c4a8242ee364becdbeec9c7adee6d4897e`).
  Focused **2/2 + 7/7**, cargo **983/983**, fmt, strict Clippy, and wasm32
  release pass. Artifact is **492,690 bytes**, sha256
  `223b5323d42125df2de7922e1b7ee4334db0cb620c8dbe6fa13b759974ac6f58`.
  Latest-master npm is green at **1,029 files / 9,871 passed / 223 skipped**;
  build is green at **677 modules**. Scope stayed inside `core-rs/**`; no
  unsupported barrier or Rust deferral was added. PAPERCUT: long-command
  completion detached from live subprocess reporting, ~4 min.
