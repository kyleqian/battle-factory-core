# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R41 — [supervised session, 2026-08-14] **M40 Battle Script Torment status leaf + wind-down**

- **State:** `rust-main` = current master `77cc08e1` plus verified
  `Cmd_settorment` worker `b4d693e1`. The complete pure
  `battleScriptSettormentOpcode.ts` handler/state/control projection is native
  and wasm32-compilable; no ABI or adapter surface was widened. The session
  ends committed and green.
- **Did:** ported exact opcode/dispatcher/operand shape validation before target
  resolution, full-u32 `STATUS2_TORMENT` inspection, success-only target bit
  OR, already-set no-write failure jump, and deliberately late failure-label
  resolution. Canonical TypeScript execution supplies **560 cases** across all
  four targets, the full **500** selector-role matrix, packed-u32 bit-31 edges,
  complete target/sibling state, ordered malformed/missing/unresolved errors,
  resolution skipped on success, and repeated advance-to-failure/idempotent
  paths; corpus sha256
  `2bc252582eb5971f3965826a44f7fec60e045794749f6a3645acc02f5e31b916`.
- **Next:** select the next conflict-free pure Battle Script leaf after
  re-orienting against master and active TS work. M7c opponent generation still
  waits on canonical TS live generation; keep moving targets excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  opcode/macro/call site, bit-31 constant, handler error order, expression-bound
  resolution, full-width state preservation, and repetition; regenerated twice
  byte-identically (canonical corpus **1,443,119 bytes**; generated file
  **3,977,003 bytes**, sha256
  `49e8fdd4ed4d02e89150defa8271363c696a662dd9b050c3c2418682517ffb66`;
  generator **40,663 bytes**, sha256
  `ec9d9d5213f2e1585e57b96bd46c97a631b535ffa77c7aceb01e5c05619daab4`),
  and reran focused **9/9**, cargo **914/914**, fmt, strict Clippy, and wasm32
  release. Final artifact is **496,864 bytes**, sha256
  `8b4898136c07cab628c486f485adcc52c66f120361622f99b1fd1688543da9ad`.
  After folding master's #88 fix, full npm is green at **1,024 files / 9,833
  passed / 224 skipped** and build is green at **675 modules**. Scope stayed
  inside `core-rs/**`; no unsupported barrier or Rust deferral was added.
  PAPERCUT: worker's long npm/build sessions yielded several ambiguous runner
  receipts before their terminal results, ~4 min.

## R40 — [supervised session, 2026-08-14] **M39 Battle Script Spikes setup leaf**

- **State:** `rust-main` = current master `87038ec0` plus verified
  `Cmd_trysetspikes` worker `e101e3c2`. The complete pure
  `battleScriptTrysetspikesOpcode.ts` decision/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported handler operand validation, ordered attacker resolution,
  attacker-side inversion, the exact `spikesAmount == 3` failure branch and
  late label resolution, attacker-only Pressure exemption on failure, and the
  success-only opposing-side Spikes-status OR plus wrapping source-u8 layer
  increment. Canonical TypeScript execution supplies **1,262 cases** across
  both sides, all aliases, the complete u8 layer domain, full-u32 status edges,
  every selector combination, side-timer siblings, all four prior Pressure
  bits, ordered errors, corrupt wrapping, and repeated paths; corpus sha256
  `212c83c5ac0d130511f93fba2772f855450056e761449bf3c51ff61c4631dba0`.
- **Next:** while main-owned #88 remains the only shared-suite baseline
  regression, select another conflict-free pure Battle Script leaf that does
  not overlap active TS work. M7c opponent generation still waits on
  canonical TS live generation.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  opcode/macro/call site, source constants, handler error order, exact-equality
  branch, full-width status preservation, immutable siblings, and repetitions;
  regenerated twice byte-identically (generated file **4,719,009 bytes**,
  sha256
  `5913da3b2e768e344e608d24f5288603d7f4bfa0e44951037414cb5eddb715ac`;
  generator **46,346 bytes**, sha256
  `a40c0955e1d6d8c3c3a0037f94b1f4d5b3f55d8afca912310c29b8e20b7d6b36`),
  and reran focused **9/9**, cargo **905/905**, fmt, strict Clippy, and wasm32
  release. Artifact is **509,806 bytes**, sha256
  `3f77c7a3993610e23303787e0da2a4d00ad2de3a0fc32946c6a144b8a4901ba2`;
  build is green. Full npm reproduced exactly current master's two main-owned
  #88 `randomRoundSoak.test.ts` failures with **1,021 files / 9,820 passed /
  223 skipped**. Scope stayed inside `core-rs/**`; no unsupported barrier or
  Rust deferral was added.
  PAPERCUT: long npm terminal output required log-based completion tracking,
  ~2 min.

## R39 — [supervised session, 2026-08-14] **M38 Battle Script attacker/target swap leaf**

- **State:** `rust-main` = current master `da55e159` plus verified
  `Cmd_swapattackerwithtarget` worker `3ace7c14`. The complete three-command
  pure projection of `battleScriptSnatchOpcode.ts` is now native and
  wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported ordered attacker-then-target resolution, exact role exchange,
  and full-u32 XOR of only `HITMARKER_SWAP_ATTACKER_TARGET` (bit 12), while
  preserving `effectBattler`, `fainted`, and `scriptingBattler`. Every valid
  path `Advance`s and a second application restores the complete input.
  Canonical TypeScript execution supplies **579 cases**, including the full
  **400-cell** role/effect/fainted matrix, **160** full-u32 hit-marker edges,
  all aliases, ordered errors, siblings, and involution checks; corpus sha256
  `eb72926f0c8b959deb7766603f8978b8ab219e0ae9abc191646a02ef181ff76e`.
- **Next:** after main-lane #88 restores the shared full-suite baseline, select
  the next conflict-free pure Battle Script leaf. M7c opponent generation
  still waits on canonical TS live generation; active TS modules remain
  excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  opcode/macro, all three concrete source sites, full-width marker semantics,
  ordered errors, aliases, and involution; regenerated twice byte-identically
  (generated file **906,706 bytes**, sha256
  `4c6cff4ce3f39deadd7c395be17ae8fb13efba1b9f8e1f60d5bd95cd7d2ed12f`),
  and reran focused **8/8**, cargo **896/896**, fmt, strict Clippy, and wasm32
  release. Artifact is **496,765 bytes**, sha256
  `8a361d0e8b30227781045d6efab09c2ab9d9e3d597da46ab889c60d15fd11272`;
  build is green at **673 modules**. The full npm union reached **1,021 passed
  files / 9,820 passed / 223 skipped**, with only the two pre-existing
  `randomRoundSoak.test.ts` failures that current master already records as
  main-owned #88; this Rust-only fold did not touch their code or tests. Scope
  stayed inside `core-rs/**`; no unsupported barrier or Rust deferral was added.
  PAPERCUT: fresh worker artifact provisioning plus one mistyped artifact
  filename in supervisor verification, ~3 min.
