# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R36 — [supervised session, 2026-08-14] **M35 Battle Script Magic Coat setup leaf**

- **State:** `rust-main` = current master `b47d45a7` plus verified Magic Coat
  worker `4af4026c`. The complete pure
  `battleScriptTrysetmagiccoatOpcode.ts` decision/state/control projection is
  native and wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported the source-ordered target=attacker and PP Pressure-exemption
  writes, then the exact `gCurrentTurnActionNumber == gBattlersCount - 1`
  branch. Acting last preserves the prior bounce bit and returns typed
  `FailJump`; every other full-u8 action value arms `bounceMove` and
  `Advance`s. Canonical TypeScript execution supplies **1,302 cases** across
  singles/doubles topology, all four attackers, the complete u8 action
  domain, all selector-role combinations, all eight prior battler bits, u32
  topology-flag edges, missing attacker, aliases, and repetition; corpus
  sha256 `df02734139e4e83d3272769c3a85d99a576395342ee3c9617f626f6a4f439794`.
- **Next:** port the conflict-free pure `Cmd_trysetsnatch` setup leaf using
  the Magic Coat topology/action recipe, without widening to the module's two
  role-swap commands or an ABI surface. M7c opponent generation still waits
  on the canonical TS live-generation port; keep active TS modules excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp and
  concrete Snatch-adjacent Magic Coat script site, exact write/branch order,
  role preservation, and machine-owned failure pointer; regenerated twice
  byte-identically (generated file **1,900,104 bytes**, sha256
  `f3b023f6075b38722c49e77808a87af0628fc0f39b153932a30a07aadbb71584`),
  and reran focused **8/8**, fmt, strict Clippy, and wasm32 release. Worker
  gates passed cargo **874/874**, full npm **1,018 files / 9,802 passed / 223
  skipped**, and build **670 modules**. Fresh-worktree artifact is **496,779
  bytes**, sha256
  `a89a85d9715a50cf7cc8dee2fce74a0c374439ad8d1dd3d91ea9b1066885f34e`;
  the persistent-tree full gates remain for wind-down. Scope stayed entirely
  inside `core-rs/**`; no unsupported barrier or Rust deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact, ~4 min.

## R35 — [supervised session, 2026-08-14] **M34 Battle Script Destiny Bond hit-marker leaf + wind-down**

- **State:** `rust-main` = current master `9b368bd8` plus the verified Destiny
  Bond worker through `4f611578`. The complete pure
  `battleScriptTrysetdestinybondtohappenOpcode.ts` state/control projection and
  its shared helper are native and wasm32-compilable. No ABI or adapter surface
  was widened; the session ended committed and green.
- **Did:** ported attacker-then-target role resolution and the exact three-part
  marker predicate. Only `HITMARKER_DESTINYBOND` (bit 6) is ORed into the full
  u32 hit marker when the target has `STATUS2_DESTINY_BOND` (bit 25), attacker
  and target are on opposite sides, and `HITMARKER_GRUDGE` (bit 24) is clear.
  All other state is preserved and every valid path `Advance`s. Canonical
  TypeScript execution supplies **48 cases** across all role pairs, both sides,
  packed-u32 edges, predicate branches, ordered missing-role errors, siblings,
  aliases, and repetition. It pins both concrete source opcode sites (OHKO and
  Pursuit); corpus sha256
  `537b2986185b3c2cf07e96ec3087d249e9713338e8acb79d79278f13dc106bcb`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source constants,
  both registered call sites, full-width preservation, predicate precedence,
  and exact canonical errors; regenerated twice byte-identically (generated
  file **82,469 bytes**, sha256
  `87ea3904816dece1df91ca15607b08232c421354dcde6a66e6a1608501824473`),
  and reran focused **7/7**, cargo **866/866**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,018 passed files / 44 grind files skipped; 9,802
  passed / 223 skipped tests**, and build **670 modules**. Final soak gates
  passed vanilla **20/20** and full-policy **60/60**, with **0 crashes** and
  **0 hangs**. Artifact is **509,620 bytes**, sha256
  `412773e10d2a88b646f80dfafa62c998f2462d21b28f430173789ec298c81ae1`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker needed the ignored WASM artifact rebuilt, ~2 min.

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
