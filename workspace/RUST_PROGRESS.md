# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R25 — [supervised session, 2026-08-14] **M24 Battle Script Follow Me forced-target state leaf**

- **State:** `rust-main` = current master `33e440dc` plus the verified Follow
  Me worker through merge `e15bfadc`. The complete pure
  `battleScriptSetforcedtargetOpcode.ts` state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker ordering, attacker-record side
  routing, and the unconditional acting-side overwrite of
  `followmeTimer = 1` and `followmeTarget = attacker` with `Advance`. Every
  other acting-side timer/id/amount field and the opposite side are preserved.
  Canonical TypeScript execution supplies **57 cases** across all four
  attackers and canonical sides, prior timer u8 edges, every prior target,
  sibling u8 boundaries, same-side partner replacement, missing role, and
  repetition; corpus sha256
  `b64cdf4492cb810c7d89098e301efd9b21fad5f4798a36bc237c62a336cf3f91`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `414089df9a79f97748642f3f5a550a1935b6f7807dce49dc0c60fb081b93943f`),
  and reran focused **5/5**, cargo **810/810**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,764
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **507,850 bytes**, sha256
  `fa3857122b32c2f43dfd411b875ab6bd6fc89ef02ab5862ac60da837612cbf90`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact and repeated its
  full npm gate while diagnosing the initial missing-artifact run, ~3 min.

## R24 — [supervised session, 2026-08-14] **M23 Battle Script Focus Energy decision/state leaf**

- **State:** `rust-main` = current master `85fca820` plus the verified Focus
  Energy worker through merge `cfbf6863`. The complete pure
  `battleScriptSetfocusenergyOpcode.ts` decision/state projection is native
  and wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker ordering, the clear-state attacker-
  only `STATUS2_FOCUS_ENERGY` OR and success chooser, and the already-focused
  failure that preserves battlers, ORs `MOVE_RESULT_FAILED`, and selects the
  failure message. Both branches `Advance`; prior chooser values are always
  overwritten. Canonical TypeScript execution supplies **69 cases** spanning
  four attackers, packed status/result u32 edges, chooser u8 probes, sibling
  preservation, missing role, success-then-failure repetition, and repeated
  failure; corpus sha256
  `7b3faf718150f8fc6a791ce01c4df7f6c72ea80390417f75de316f381e9184c7`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `247b9a01c9e95db78ff2df4677716259a588688362a37e44c6f44b3adfed5d76`),
  and reran focused **5/5**, cargo **805/805**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,764
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,811 bytes**, sha256
  `ca9675f1640799ac52fb563a160d919aedbe3aeecaffde96930dc657f6a0217d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: cargo was absent from the worker login PATH; the documented
  explicit toolchain setup cost ~1 min.

## R23 — [supervised session, 2026-08-14] **M22 Battle Script Defense Curl state leaf**

- **State:** `rust-main` = current master `58a818fd` plus the verified Defense
  Curl worker through merge `6f1b4f88`. The complete pure
  `battleScriptSetDefenseCurlBitOpcode.ts` state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-attacker ordering and the unconditional,
  idempotent attacker-only `STATUS2_DEFENSE_CURL` OR with `Advance`. Stat
  changes, absolute program counters, opcode registration, generic
  BattleState reduction, RNG, scheduling, and presentation remain outside the
  narrow result. Canonical TypeScript execution supplies **27 cases** across
  all four attackers, clear/set inputs, u32 edges, sibling preservation,
  missing attacker, and repeated application; corpus sha256
  `39dd1fb0a8d96809508adfd1282eef87c6fc202f49920bb009d80ce61b839825`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `904047b8ffa00588b42c813709536dd7e5b397e59291f7c994a6c3847e1fdb93`),
  and reran focused **5/5**, cargo **800/800**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,013 passed files / 44 grind files skipped; 9,757
  passed / 223 skipped tests**, and build **668 modules**. The main fold's
  CGB4 opt-in gate reduced the supervisor full suite to **84.53 s**. Artifact
  is **510,065 bytes**, sha256
  `62a2a1a4baa70500da6f5465fb75beb54acd8901a9a8ff3ce1cc45f1ec4ecd34`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: before the CGB4 gate reached this worktree, the worker's repeated
  full npm verification took ~20m45s under shared-machine contention.
