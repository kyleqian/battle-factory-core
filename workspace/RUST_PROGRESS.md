# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## R38 — [supervised session, 2026-08-14] **M37 Battle Script Snatch role-rebinding leaf**

- **State:** `rust-main` = current master `edb54f4f` plus verified
  `Cmd_snatchsetbattlers` worker `cc70dc78`. The complete pure selector-role
  and scripting-battler projection is native and wasm32-compilable. Only the
  final attacker/target swap sibling remains in this TS module; no ABI or
  adapter surface was widened.
- **Did:** ported exact attacker-then-target resolution, original-attacker
  capture into `effectBattler`, self-target conditional rebinding, target
  replacement with the original scripting battler, and scripting-battler
  handoff to the original attacker. `fainted` is preserved and every valid
  path `Advance`s. Canonical TypeScript execution supplies **1,622 cases**,
  including the full **1,600-cell** attacker/target/scripting/effect/fainted
  matrix, ordered errors, all aliases, and repeated paths whose second call
  changes from non-self to self-targeted; corpus sha256
  `53c9f9d8642180e20c6cd2f75e0eb11a1632d52894bb070f2c6342f81bbd517e`.
- **Next:** port only the final conflict-free pure
  `Cmd_swapattackerwithtarget` sibling, preserving full-u32 hit-marker XOR
  semantics and ordered role errors. M7c opponent generation still waits on
  canonical TS live generation; active TS modules remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  opcode/macro and sole concrete call site, exact role write order, aliases,
  and branch-changing repetition; regenerated twice byte-identically
  (generated file **2,109,170 bytes**, sha256
  `5c39688746cb1b69507e192fff3b7f892c8b5799c67bcb1f5360094806579c9b`),
  and reran focused **7/7**, fmt, strict Clippy, and wasm32 release. Worker
  Rust gates passed cargo **888/888**. The worker's optional npm run lacked
  the ignored artifact; supervisor rebuilt it and proved the merged union:
  full npm **1,020 files / 9,813 passed / 223 skipped**, build **672 modules**.
  Artifact is **509,840 bytes**, sha256
  `34d424497e3966379b6b03f46d6082bb7a6d8d0e00275b1922899c13f7ffc07c`.
  Scope stayed inside `core-rs/**`; no unsupported barrier or Rust deferral
  was added.
  PAPERCUT: worker invoked Cargo formatting once outside `core-rs/`, ~1 min.
