# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R33 — [supervised session, 2026-08-14] **M32 Battle Script Pay Day payout leaf**

- **State:** `rust-main` = current master `9b368bd8` plus the verified Pay Day
  worker through `8aa5e68f`. The complete pure
  `battleScriptGivepaydaymoneyOpcode.ts` state/control projection is native
  and wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported the source-ordered suppression predicate for `BATTLE_TYPE_LINK`,
  `BATTLE_TYPE_RECORDED_LINK`, and zero Pay Day money. Suppression preserves
  the full narrow state and `Advance`s; payout computes exact u16×u8 unsigned
  bonus money, caps player money at **999,999**, overwrites the nullable full
  u32 prepared-money buffer, and returns typed `PayoutCall`. Absolute label
  and pushed return address remain machine-owned. Canonical TypeScript
  execution supplies **149 finite cases**, a separate exhaustive **65,536**
  value u16 Pay Day sweep, and an exhaustive **256** value u8 multiplier
  sweep; corpus sha256
  `546867571e961b089407fb8caf2970b3f4288cc89d53acb8710b1237e7bede88`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source AddMoney,
  branch precedence, arithmetic bounds, compact packed sweep results, and
  complete buffer preservation/overwrite; regenerated twice byte-identically
  (generated file **1,707,596 bytes**, sha256
  `78f3ac15fe6a9e50e704ce4b3b1c0ef72a24d68b434190b8cb7f6c22d3011c8e`),
  and reran focused **6/6**, cargo **853/853**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Artifact is
  **509,249 bytes**, sha256
  `60d3a569b3fbb76a4769aad1bd7c4dd1668d6dcbd0c332fe9afe2163b8b43645`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker initially lacked the ignored WASM artifact and
  repeated its full baseline after building it, ~3 min.

## R32 — [supervised session, 2026-08-14] **M31 Battle Script Psych Up stat-stage copy leaf**

- **State:** `rust-main` = current master `9b368bd8` plus the verified Psych Up
  worker through merge `60da5305`. The complete pure
  `battleScriptCopyFoeStatsOpcode.ts` state/control projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported exact attacker-then-target role resolution and the source
  loop copying all eight signed-s8 `statStages` cells from target to attacker.
  Neutral rows and all four attacker=target aliases succeed; sibling rows and
  both roles are preserved; every valid path returns typed `Advance`. The
  dead encoded failure pointer remains in the omitted machine layer.
  Canonical TypeScript execution supplies **2,075 cases**: one non-alias pair
  exhaustively covers all 256 signed-s8 values at every stage position, while
  an orthogonal matrix covers all 16 role pairs plus ordered missing roles,
  mixed boundaries, siblings, aliases, neutral rows, and repetition; corpus
  sha256
  `e1f1cb9ea7e97c5536fd9b0ebecfa2512e5ec12da6356a24e550762feaf570f9`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one accepted commit. Supervisor rejected and
  discarded an earlier uncommitted 32,813-case Cartesian corpus because its
  42.8 MB generated file exceeded the entire existing Rust source tree, then
  required orthogonal coverage capped below 5 MB. The accepted generator was
  rerun twice byte-identically; generated file **2,688,749 bytes**, sha256
  `a688c00f155d0427eeb5f4fe06641d06a34936be32121b3e40220f4c3be1622d`.
  Supervisor reran focused **5/5**, cargo **847/847**, fmt, strict Clippy,
  wasm32 release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Artifact is
  **509,700 bytes**, sha256
  `c285e0a94dab2602aefc91f789d2e077d9b32071500608efbfbe85fc1bd0814d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the first worker's overlarge evidence design was caught before
  compilation and replaced; Cargo still needed the documented PATH, ~10 min
  total.

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
