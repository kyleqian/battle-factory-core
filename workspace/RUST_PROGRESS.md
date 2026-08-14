# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R30 — [supervised session, 2026-08-14] **M29 Battle Script Bide setup state leaf**

- **State:** `rust-main` = current master `732e6339` plus the verified Bide
  setup worker through `68601406`. The complete pure
  `battleScriptSetbideOpcode.ts` state/control projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker resolution and the source-ordered
  setup writes: OR attacker `status2` with `STATUS2_MULTIPLETURNS` and
  `STATUS2_BIDE_TURN(2)`, overwrite its locked move with `currentMove`, zero
  its signed Bide-damage accumulator, and `Advance`. Siblings, all selector
  roles, current move, and all saved Bide targets are preserved. Canonical
  TypeScript execution supplies **273 cases** across packed-u32 status/Bide
  counters, current/locked u16 edges, signed-i32 damage edges, all battlers and
  saved targets, selector roles, overwrite boundaries, and repetition; corpus
  sha256
  `ce9554d3269b3760cffc0605b69472636027f500f843303d0f05740c03f83234`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source writes,
  canonical domains, and non-write of `gBideTarget`; regenerated twice
  byte-identically (generated sha256
  `5954c9f2c8f6850c409f287ecc2bab3b0e49bad163a22c26dc7871198e83d511`),
  and reran focused **5/5**, cargo **837/837**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,765
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,839 bytes**, sha256
  `968ddd966352ff5095b52a22a3a6aa8032f89ba9e8352c8f72fbf0586f2a2b5b`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the worker rerouted absent login-PATH Cargo and repeated one full
  npm run after its terminal bridge lost the summary, ~3 min total.

## R29 — [supervised session, 2026-08-14] **M28 Battle Script Fake Out first-turn decision leaf**

- **State:** `rust-main` = current master `732e6339` plus the verified Fake Out
  first-turn worker through merge `376d6de8`. The complete pure
  `battleScriptJumpifnotfirstturnOpcode.ts` decision projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker resolution and the source truth test
  over canonical `isFirstTurn` values: `0` returns typed `FailJump`, while `1`
  and `2` return `Advance`. Both branches preserve the entire narrow state;
  absolute failure PCs remain in the omitted machine layer. Canonical
  TypeScript execution supplies **20 cases** across the full four-attacker by
  three-value matrix, sibling preservation, missing role, and repeated paths;
  corpus sha256
  `c48ced85f5c875b299bbdde39fbfe55471ffa51077eacc3a4f6bce9a971b3d02`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source lifecycle
  `2 -> 1 -> 0`, canonical `0..2` validation, and handler execution;
  regenerated twice byte-identically (generated sha256
  `71efb5e8a1be9757a4387ce088ea34a425b4f6e713c0e3788c95088c8f5d9128`),
  and reran focused **6/6**, cargo **832/832**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,765
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,708 bytes**, sha256
  `9c5fcb5166201d63d422440d613e2d5de22364586f5b62dcf09142e95136be6d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact, so its initial
  full npm baseline failed before the required build supplied it, ~2 min.

## R28 — [supervised session, 2026-08-14] **M27 Battle Script Grudge decision/state leaf**

- **State:** `rust-main` = current master `b0356695` plus the verified Grudge
  worker through merge `0a10f766`. The complete pure
  `battleScriptTrysetgrudgeOpcode.ts` decision/state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker resolution and the source Grudge-bit
  predicate. An already-Grudged attacker preserves the complete narrow state
  and returns typed `FailJump`; a clear attacker receives only
  `STATUS3_GRUDGE` and returns `Advance`. Absolute failure PCs remain owned by
  the omitted machine layer. Canonical TypeScript execution supplies **45
  cases** across every attacker, both branches, 32 packed-u32 edge cells,
  missing role, sibling preservation, and success/failure repetition; corpus
  sha256
  `b38e387bb68c4390978018c580352dc7d4a05fcac7929354d011e8a5e944d675`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source, handler,
  and packed-u32 validation, regenerated twice byte-identically (generated
  sha256
  `24d687cb4ce11b9c4ae93dd791f7f8cb955d3840bd46c65b17c60d16391211ad`),
  and reran focused **6/6**, cargo **826/826**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,765
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,824 bytes**, sha256
  `d29782927e09b85befb6877709c07126003f9b126bdcf5f5dfe2119cf20576da`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier, Rust
  deferral, or worker papercut was added. Supervisor initially invoked Cargo
  one directory too high, corrected immediately with no repository impact.
