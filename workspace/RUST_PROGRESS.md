# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## R22 — [supervised session, 2026-08-14] **M21 Battle Script Foresight state leaf**

- **State:** `rust-main` = current master `9deb3cae` plus the verified
  Foresight worker through merge `84874b0c`. The complete pure
  `battleScriptSetforesightOpcode.ts` state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact missing-target ordering and the unconditional,
  idempotent target-only `STATUS2_FORESIGHT` OR with `Advance`. Absolute
  program counters, opcode registration, generic BattleState reduction, RNG,
  scheduling, and presentation remain outside the narrow result. Canonical
  TypeScript execution supplies **27 cases** across all four targets,
  clear/set inputs, u32 edges, sibling preservation, missing target, and
  repeated application; corpus sha256
  `fbb38fbd92d927a35a2f5f57e35fb518d7eaae23cb3912ffe5580be972a355cc`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation now waits on the canonical TS live-generation port,
  not Issue #55; continue excluding the construction clock and every module
  the TS lane is actively changing.
- **Notes:** Terra/max worker, one commit. Supervisor audited the source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `10f107f4781a650027c74ff1c5203c37ef0464dc018504dd36a2552a2267bdda`),
  and reran focused **5/5**, cargo **795/795**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, and build **668 modules**. Worker same-commit full npm was
  **1,056 files / 9,934 passed / 1 skip**. Artifact is **509,825 bytes**,
  sha256
  `97ba284228ab5aaf76238bc0c0857e1b7e2b8ead0fde915bf17e2683e1142160`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the worker's full npm gate took ~671 s in the recursive CGB4
  tail; a missing ignored WASM artifact and yielded-runner duplication added
  one discarded full-suite attempt.

## R21 — [supervised session, 2026-08-14] **M20 Battle Script Taunt decision/state leaf + clean wind-down**

- **State:** `rust-main` started from master `438d06ba` and now contains the
  verified R15-R21 sequence through `669b5606`. The complete pure
  `battleScriptSettauntOpcode.ts` decision/state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened. Master advanced
  independently to `ad9152bb` during validation; its normal supervisor fold
  remains the union point.
- **Did:** ported exact missing-target ordering, the unchanged nonzero-timer
  `FailJump`, and the zero-timer target-only write of `2` with `Advance`.
  Absolute program counters and the source-dead adjacent `tauntTimer2` stay
  outside the narrow result. Canonical TypeScript execution supplies **70
  cases** across all four targets, every four-bit timer `0..15`, boundaries,
  target-only mutation, missing role, and repeated application; corpus sha256
  `8a33204cf0d64ca843cc542d079fea16ca33e2231e1a1f6da49f7aa4a6a0b426`.
- **Next:** after the main supervisor folds `669b5606`, select the next
  conflict-free pure Battle Script leaf. M7c opponent generation remains
  deferred while Issue #55 is open. Keep opcode registration, generic
  BattleState reduction, presentation, and callback expansion out.
- **Notes:** Luna/max worker, one commit. Supervisor audited source and TS
  behavior, retained the worker test handle through completion, and
  regenerated twice byte-identically (generated sha256
  `0b4783094fa1f5fc0f55dfb1d398f269c9c12070e4cb95c3cafd86d89df1d079`).
  Final folded-head gates: focused **5/5**, cargo **790/790**, fmt, strict
  Clippy, wasm32 release, forced-WASM union **19 files / 807/807**, smoke **8
  files / 375/375**, full npm **1,047 files / 9,864 passed / 1 skip**, build
  **664 modules**, vanilla soak **20/20**, and full-policy soak **60/60** with
  zero crashes and hangs. Artifact is **509,791 bytes**, sha256
  `7e23d1bfe97fa2674fb932bffb99f585c9af434ffbaba34c8e99524828b7a7fc`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added. The Rust worker branch and worktree were removed, and
  the Battle Scene OFF oracle remained healthy.
  PAPERCUT: recursive CGB4 evidence dominated both required full npm runs;
  worker and supervisor runs cost ~22 min combined.
