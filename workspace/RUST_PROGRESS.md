# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R31 — [supervised session, 2026-08-14] **M30 Battle Script Thrash-family post-lock confusion-byte leaf**

- **State:** `rust-main` = current master `b1ddefa6` plus the verified
  confuse-if-repeating-attack-ends worker through merge `be7add4c`. The
  complete pure `battleScriptConfuseifrepeatingattackendsOpcode.ts`
  state/control projection is native and wasm32-compilable. No ABI or adapter
  surface was widened.
- **Did:** ported exact missing-attacker resolution and the source
  `STATUS2_LOCK_CONFUSE` predicate. When either packed status2 lock bit is set,
  the complete narrow state is preserved; when both are clear, only
  `moveEffectByte` is overwritten with `MOVE_EFFECT_THRASH |
  MOVE_EFFECT_AFFECTS_USER` (**117**). Both successful branches `Advance`.
  Canonical TypeScript execution supplies **4,229 cases**, including the full
  256-byte effect domain for all four attackers and all four lock-bit
  combinations, packed-u32 edges, sibling preservation, missing role, and
  repetition; corpus sha256
  `a6481812ddbea8b97208ad1c0954c749fa1ce742bebe2e538d8f258198bb2966`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source constants,
  exact error ordering, canonical handler execution, and the bounded 4.0 MB
  generated corpus; regenerated twice byte-identically (generated sha256
  `fd41471d601b4d31f51f9fd49a4670f3b5ebed299eb7872d3d31f4ab586a6653`),
  and reran focused **5/5**, cargo **842/842**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Artifact is
  **509,475 bytes**, sha256
  `08436ef1c1760ad3cf409fd733aed6d1266b4f4db37c53acf5cb3103c9fb67c4`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked Cargo on login PATH and the ignored WASM
  artifact; the supervisor also corrected one stale local WASM script name,
  ~4 min total.

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
