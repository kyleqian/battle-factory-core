# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R34 — [supervised session, 2026-08-14] **M33 Battle Script Role Play ability-copy leaf**

- **State:** `rust-main` = current master `9b368bd8` plus the verified Role
  Play worker through `f170adba`. The complete pure
  `battleScriptTrycopyabilityOpcode.ts` decision/state/control projection is
  native and wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported attacker-then-target role resolution with the canonical
  shared helper's exact (grammatically awkward) errors. Target abilities
  `ABILITY_NONE` (**0**) and `ABILITY_WONDER_GUARD` (**25**) preserve complete
  narrow state and return typed `FailJump`; every other u8 ability overwrites
  the active attacker's ability and `lastUsedAbility`, then `Advance`s.
  Siblings and roles are preserved and attacker=target aliases are valid.
  Canonical TypeScript execution supplies **359 cases** across a full
  256-ability non-alias sweep, all 16 attacker/target pairs × two failures and
  four success boundaries, ordered errors, siblings, aliases, and repetition;
  corpus sha256
  `afbfd05ca218aa26d69aca4c8f6f771368c6a59b1b1be4bade6ccf65fc4cb536`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source constants,
  full u8 domains, fail-jump preservation, and exact canonical error
  `Battle Script hit-chain command requires a attacker role`; regenerated
  twice byte-identically (generated file **338,858 bytes**, sha256
  `b071615aa660fc0e5c305c59d2f1a20664681776ff97319c43f8a5cd8fe026d4`),
  and reran focused **6/6**, cargo **859/859**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Artifact is
  **509,840 bytes**, sha256
  `1a734cc209ef4d756a4839515f60dc6fc9296f91559e3be5c2e181a3fbb2d27a`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact and rebuilt it
  before the final application gates, ~3 min.

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
