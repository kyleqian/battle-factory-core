# Rust lane progress archive

Older entries moved out of `RUST_PROGRESS.md` (newest first). Git keeps the
full history regardless.

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

## R27 — [supervised session, 2026-08-14] **M26 Battle Script Revenge damage-receipt multiplier leaf**

- **State:** `rust-main` = current master `aff0e782` plus the verified Revenge
  worker through merge `672d1c0e` and current union merge `4edb9494`. The
  complete pure `battleScriptDoubleDamageIfDamagedOpcode.ts` decision/state
  projection is native and wasm32-compilable. No ABI or adapter surface was
  widened.
- **Did:** ported exact attacker-then-target role resolution and the source
  predicate over the attacker's physical/special damage receipts: a nonzero
  receipt owned by the target overwrites `dmgMultiplier` with 2; otherwise the
  multiplier is preserved. All successful paths `Advance`; receipts and roles
  are immutable. Canonical TypeScript execution supplies **383 cases** across
  all owner pairs, receipt-state combinations, multiplier edges, both ordered
  missing-role errors, sibling preservation, repetition, and signed-i32 damage
  edges; corpus sha256
  `c50345ebb61ac605ed28f85ddebae7fa82aa2e42657f95c5a6a5f3e763896fdd`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the source and
  canonical-handler projection, regenerated twice byte-identically (generated
  sha256
  `e2b2ae84ea9c6ca40e23c23cb45ed38a57ce5822a5123f9c447763327cbd2e46`),
  and reran focused **5/5**, cargo **820/820**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,765
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,713 bytes**, sha256
  `17fb3dc429e2b058dd9f513f89692cf33e3440471df41b5a0b44bf5e8dc37dc9`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier, Rust
  deferral, or session papercut was added.

## R26 — [supervised session, 2026-08-14] **M25 Battle Script Haze stat-stage normalization leaf**

- **State:** `rust-main` = current master `f12a66e6` plus the verified Haze
  worker through merge `85e5cf27`. The complete pure
  `battleScriptNormalisebuffsOpcode.ts` state projection is native and
  wasm32-compilable. No ABI or adapter surface was widened.
- **Did:** ported the unconditional four-battler by eight-stage signed-s8
  reset to source `DEFAULT_STAT_STAGE = 6` with `Advance`. Canonical
  TypeScript execution supplies **35 cases**: a 32-cell position matrix plus
  mixed signed edges, all-neutral idempotence, and repeated application;
  corpus sha256
  `294dac1f672c6888bbc0d7bfe2adebc4c8b0928e22abfaf9860efd08a85cd602`.
  Statuses, roles, disable fields, absolute PCs, opcode registration, generic
  BattleState reduction, RNG, scheduling, and presentation remain excluded.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation waits on the canonical TS live-generation port; keep
  the construction clock and modules under active TS work excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited source and
  canonical-handler execution, regenerated twice byte-identically (generated
  sha256
  `4ee5ef51e3a4d9dce1b63f16f85cf2ee7ca9cad2569eb08cc650e80af8a5d570`),
  and reran focused **5/5**, cargo **815/815**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **8 files /
  375/375**, full npm **1,014 passed files / 44 grind files skipped; 9,764
  passed / 223 skipped tests**, and build **669 modules**. Artifact is
  **509,722 bytes**, sha256
  `4309014e9499263753c284ad1f48444dc950f7dc8f4a103b87889f54b698fc47`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier or Rust
  deferral was added.
  PAPERCUT: the fresh worker lacked the ignored WASM artifact, requiring one
  explicit artifact build before its initial npm gate, ~1 min.

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

## R20 — [supervised session, 2026-08-14] **M19 Battle Script Yawn decision/state leaf**

- **State:** `rust-main` = current master `438d06ba` plus verified R15-R20
  through `4d0fa001`. The complete pure `battleScriptSetyawnOpcode.ts`
  decision/state projection is native and wasm32-compilable; no ABI or
  adapter surface was widened.
- **Did:** ported exact missing-target ordering, the source-ordered
  `STATUS3_YAWN || STATUS1_ANY` failure decision with unchanged state, and the
  success advance that ORs a fresh two-turn counter into only the target.
  Absolute program counters stay outside the narrow `Advance | FailJump`
  result. Canonical TypeScript execution supplies **96 cases** across all
  targets, all four Yawn counters, every primary-status member, OR
  combinations, u32 edges, and repeated success/failure; corpus sha256
  `bfaba855da35331383adfd4281e1194e16eb8bb66e3a800e81b733bfd511de79`.
- **Next:** select at most one final conflict-free pure Battle Script leaf,
  then begin mandatory wind-down validation and soaks. M7c opponent generation
  remains deferred while Issue #55 is open.
- **Notes:** Terra/max worker, one commit. Supervisor audited exact status
  masks, target-only mutation, and the narrow control result; regenerated
  twice byte-identically (generated sha256
  `77bfb1165b49ff39f76a3497f6089924bc5eb30d266fea63b941959fd7ffdf10`),
  and reran focused **5/5**, cargo **785/785**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke **375/375**.
  Worker same-commit full npm was **1,047 files / 9,864 passed / 1 skip**;
  build was **664 modules**. Artifact is **509,478 bytes**, sha256
  `6196301dc2313b1ab768563da1c66e96a53250dabcbb595570940ab5358254ca`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: cargo was absent from the worker login PATH; explicit toolchain
  setup cost ~1 min.

## R19 — [supervised session, 2026-08-14] **M18 Battle Script Minimize state leaf**

- **State:** `rust-main` = current master `438d06ba` plus verified R15-R19
  through `a921e290`. The complete pure
  `battleScriptSetminimizeOpcode.ts` state projection is native and
  wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported the exact `HITMARKER_OBEYS` gate ordering: a clear gate is a
  complete no-op before attacker resolution, while a set gate requires the
  attacker and ORs `STATUS3_MINIMIZED` into only that battler. Exact role
  error, hit marker, unrelated bits, siblings, and idempotence are retained.
  Canonical TypeScript execution supplies **51 cases** across all attackers,
  both gates, clear/set state, two applications, and u32 status/hit-marker
  edges; corpus sha256
  `d3760ba077c31a99adb30d27642450f8de055ca72a00abed711bf91f0e334a49`.
- **Next:** select the next conflict-free pure Battle Script leaf only if a
  full worker verification still leaves the required wind-down margin. M7c
  opponent generation remains deferred while Issue #55 is open.
- **Notes:** Sol/high worker, one commit. Supervisor audited the no-op-before-
  role-resolution branch against the pinned source, regenerated twice
  byte-identically (generated sha256
  `ef4143b2254024205f3f33c775f7934847310420b86371c9aea9e06efe78a5ce`),
  and reran focused **5/5**, cargo **780/780**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke **375/375**.
  Worker same-commit full npm was **1,047 files / 9,864 passed / 1 skip**;
  build was **664 modules**. Artifact is **509,818 bytes**, sha256
  `d72d7fa77bea0d961ffc0279233c0d616ee30e4852cabd295544706555e8b3d5`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: cargo was absent from the worker login PATH; explicit toolchain
  setup cost ~1 min.

## R18 — [supervised session, 2026-08-14] **M17 Battle Script Destiny Bond state leaf**

- **State:** `rust-main` = current master `438d06ba` plus verified R15-R18
  through `d048dc24`. The complete pure
  `battleScriptSetdestinybondOpcode.ts` state projection is native and
  wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported the exact four-battler attacker-only transformation: require
  the optional attacker role, OR `STATUS2_DESTINY_BOND` into only that
  battler's `status2`, preserve all unrelated bits, siblings, and role state,
  and retain the exact missing-attacker error. Canonical TypeScript execution
  supplies **25 cases** covering every attacker, clear/set and idempotent
  inputs, full-u32 edges, and the missing role; corpus sha256
  `b024fb02d948ecbf7e5417738eaf53704d811466b6f069ef915e6aa263e73315`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation remains deferred while Issue #55 is open; keep opcode
  registration, generic BattleState reduction, presentation, and callback
  expansion out.
- **Notes:** Luna/max worker, one commit. Supervisor audited target-only OR
  semantics and exact error text; regenerated twice byte-identically
  (generated sha256
  `28ec30a71e35ffce6d85e2ed5e90af4990c8bfdc80e2549f6c9360105164cdba`);
  and reran focused **4/4**, cargo **775/775**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke **375/375**.
  Worker same-commit full npm was **1,047 files / 9,864 passed / 1 skip**;
  build was **664 modules**. Artifact is **509,812 bytes**, sha256
  `444bb310b590eaccb09184f86b2f41cd3a26884a81a0485a1a43e8875872d7ad`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: the worker ran a redundant baseline full suite before materializing
  the gitignored WASM artifact, costing ~18 min before the required final run.

## R17 — [supervised session, 2026-08-14] **M16 Battle Script always-hit state leaf**

- **State:** `rust-main` = current master `438d06ba` plus verified R15-R17
  through `22b46762`. The complete pure
  `battleScriptSetalwayshitflagOpcode.ts` state projection is native and
  wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported the exact four-battler attacker/target transformation: clear
  both packed `STATUS3_ALWAYS_HITS` bits, set turn 2, overwrite the target's
  `battlerWithSureHit` owner with the attacker, preserve all unrelated bits
  and non-target state, and retain attacker-first missing-role error
  precedence. Canonical TypeScript execution supplies **71 cases** across all
  16 role pairs, all four incoming counters, u32 edges, prior owners, and the
  three missing-role combinations; corpus sha256
  `9a69a8a8336fd55fcbec4ad7866585239d47fe0af32f43638636fe321c9ee106`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation remains deferred while Issue #55 is open; keep opcode
  registration, generic BattleState reduction, presentation, and callback
  expansion out.
- **Notes:** Terra/max worker, one commit. Supervisor audited role ordering,
  target-only mutation, and packed-field replacement; regenerated twice
  byte-identically (generated sha256
  `0fbc089c4cf87c2c32bfa7931344edd57d06778d763c9d3ebb6bf2a6c1356159`);
  and reran focused **4/4**, cargo **771/771**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, smoke **375/375**, full
  npm **1,047 files / 9,864 passed / 1 skip**, and build **664 modules**.
  Artifact is **509,811 bytes**, sha256
  `c2ea109ccadc9f2849d508de3134fe996a905d7e38e080ef812755602bfe5a52`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: the worker lost its full-npm command handle and falsely reported
  completion; supervisor reran the full suite correctly, costing ~15 min.

## R16 — [supervised session, 2026-08-14] **M15 Battle Script negative-damage arithmetic**

- **State:** `rust-main` = current master `438d06ba` plus verified R15 and R16
  `f28a20e6`. The complete pure `battleScriptNegativedamageOpcode.ts`
  arithmetic surface is native and wasm32-compilable; no ABI or adapter
  surface was widened.
- **Did:** ported signed-`i32` `-Math.floor(hpDealt / 2)` plus the exact
  zero-result-to-`-1` guard. The Rust implementation explicitly corrects
  truncation for negative odd inputs, preserving the complete typed-reachable
  TypeScript domain. Canonical TypeScript execution supplies **24 cases**;
  corpus sha256
  `fc4526fac0345c329ede2f2ce2072f207a7096c75e1461da89bc8451a318fe46`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation remains deferred while Issue #55 is open; keep opcode
  registration, the generic BattleState reducer, presentation, and callback
  stack expansion out.
- **Notes:** Luna/max worker, one commit. Supervisor audited the signed-domain
  floor correction, regenerated twice byte-identically (generated sha256
  `8538ed4437b6aa272771fd03b27d993722293df053dcde8e74c58b5f62d83a20`),
  and reran focused **3/3**, cargo **767/767**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke **375/375**.
  Worker same-commit full npm was **1,047 files / 9,864 passed / 1 skip**;
  build was **664 modules**. Artifact is **507,846 bytes**, sha256
  `66c35cdc1b2f2b1222322dcd08a2926bea800212ebd54721e19dd165e33e651d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: the first full npm attempt lacked the gitignored WASM artifact;
  after `build-wasm.sh`, the required rerun took ~20 min.

## R15 — [supervised session, 2026-08-13] **M14 Battle Script battler-position resolver**

- **State:** `rust-main` = current master `438d06ba` plus verified R15
  `14003781`. The complete pure `battleScriptBattlerPositions.ts` resolver is
  native and wasm32-compilable; no ABI or adapter surface was widened.
- **Did:** ported the typed `2 | 4` battler-count domain, both canonical left
  positions, the raw `BS_ATTACKER -> opponent-left` byte collision, exact
  string matching, unknown-expression nulls, and the retained count gate.
  Canonical TypeScript execution supplies **20 cases** across all four result
  branches and six categories; corpus sha256
  `2539d9c708156a52587e8413abde4b379fa3839923b251212104307ab45d45eb`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c
  opponent generation remains deferred while Issue #55 is open; keep the
  generic BattleState reducer, presentation, and callback-stack expansion out.
- **Notes:** Terra/max worker, one commit. Supervisor audited the complete
  string/count mapping, regenerated twice byte-identically (generated sha256
  `2108f517abbca8ec800ab4d0641ac202c9d8256eacb9e7c00210b3882c5c766c`),
  and reran focused **3/3**, cargo **764/764**, fmt, strict Clippy, wasm32
  release, forced-WASM union **19 files / 807/807**, and smoke. Worker
  same-commit full npm was **1,047 files / 9,864 passed / 1 skip**; build was
  **664 modules**. Artifact is **507,847 bytes**, sha256
  `4e540a351abe19b3d4205a128d174c9bf357e85959aa58411cff834c725216a8`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.
  PAPERCUT: recursive CGB4 evidence made the worker full suite take ~29 min.

## R14 — [supervised session, 2026-08-13] **M13 Battle Script gender resolver**

- **State:** `rust-main` = current master `b8b7986a` plus this ledger-only
  wind-down, including verified M13 merge `a51fef82`, target-portability
  repair `1108053b`, and the final v44 master union. The complete
  pure `battleScriptGender.ts` lookup surface is native and wasm32-compilable;
  no ABI or adapter surface was widened.
- **Did:** added an isolated generated **411-pair** species/gender-ratio table
  and binary-search resolver over the source-shaped `u16` species / `u32`
  personality domains, preserving the exact missing-species message. Canonical
  TypeScript execution supplies **2,306 cases** covering every extracted
  species, both u32 edges, low-byte threshold boundaries in low and high words,
  all fixed-gender branches, and three missing IDs; corpus sha256
  `bb2aaff65e2c88fa5074fbd544be1cba6be22bdbad75e91259f03af752576edc`.
- **Next:** select the next conflict-free pure Battle Script leaf. M7c opponent
  generation remains deferred while Issue #55 is open; keep native core logic
  target-portable even before an ABI boundary is added.
- **Notes:** Terra/max implementation plus Sol/high corrective isolation and a
  supervisor target-portability repair. Audit rejected coupling the ratio into
  `SwitchPolicySpeciesRow`; final `gen_tables.rs` is byte-identical to M12, and
  the standalone generated table sha256 is
  `c802372450ae0e5904c8393e27ce59d9055f29f37356f18951a01279f3b3e9ba`.
  Regenerated twice cleanly; generated vectors sha256
  `b002662ce399a3c90b3e163b63e77d4e8aed92234d6fe50a290f8ff172e7d418`.
  Supervisor reran focused **2/2**, cargo **761/761**, fmt, strict Clippy,
  wasm32 release, forced-WASM union **19 files / 807/807**, smoke **375/375**,
  full npm **1,047 files / 9,864 passed / 1 skip**, and build **664 modules**.
  Wind-down soaks are vanilla **20/20 OK** and full **60/60 OK** with zero
  crashes or hangs.
  Target-portable artifact is **509,805 bytes**, sha256
  `d415fea6f766bdeebfc7d678b72609adfebe5ea720de43e38f50746714b0552d`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.

## R13 — [supervised session, 2026-08-13] **M12 Battle Script AI reveal leaf**

- **State:** `rust-main` = current master `0a45638e` plus verified M12 through
  merge head `8fb5aeb6`. The complete pure `battleScriptAiReveal.ts` surface is
  native; no ABI or adapter surface was widened.
- **Did:** ported immutable AI knowledge overlays for revealed abilities and
  held-item effects using two four-battler arrays and a bounded battler enum.
  Canonical TypeScript execution supplies **20 cases / 33 operations** across
  all four slots, changed and unchanged values, u8 edges, chains, non-mutation,
  and sibling preservation; corpus sha256
  `8d7732702b8d372a71d60683471429a6285966deb6ee95e87302c44abe7e3652`.
- **Next:** select one final conflict-free, native-only Battle Script leaf if
  the session clock retains a safe full-verification margin. M7c opponent
  generation remains deferred while Issue #55 is open.
- **Notes:** Terra/max worker, one commit. Supervisor audited bounded indexing
  and copy semantics, regenerated twice byte-identically, and reran focused
  vectors **3/3**, cargo **759/759**, fmt, strict Clippy, release WASM, smoke
  **375/375**, full npm **1,045 files / 9,852 passed / 1 skip**, and build
  **664 modules**. Artifact is **509,804 bytes**, sha256
  `d3fc75987621a85bf3b9f5a5110138351cb6863226e50c12d20ea28ee2f8e573`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.

## R12 — [supervised session, 2026-08-13] **M11 key-repeat core + WASM boundary**

- **State:** `rust-main` = current master `17164d1d` plus verified M11 through
  merge head `3d0e1bc1`. The complete pure `keyRepeat.ts` surface is native and
  forced-WASM reachable with no TypeScript fallback.
- **Did:** ported the canonical ten-button mask, bounded shared counter,
  `INITIAL_KEY_REPEAT_STATE`, `readKeys`, and `hasButton`; added one checked
  additive ABI-v1 packet, adapter, and both-mode parity. Canonical TS execution
  supplies **1,580 read cases + 20 membership cases** across all 1,024 masks,
  every reachable counter, and full singleton repeat timelines; corpus sha256
  `f67e38c085fdbb74fc600b9ef7622197295e1919020148bcc3356ce00ebf7482`.
- **Next:** select the next conflict-free pure leaf. M7c opponent generation
  remains deferred while Issue #55 is still open; presentation and generic
  BattleState reducer ownership remain outside the completed M11 surface.
- **Notes:** Terra/max worker plus one supervisor regeneration-hygiene repair.
  Supervisor audited semantics and packet validation, regenerated twice to a
  clean byte-identical tree, and reran cargo **756/756**, fmt, strict Clippy,
  focused parity **3/3** both modes, forced union **19 files / 807/807**, smoke
  **375/375**, full npm **1,044 files / 9,849 passed / 1 skip**, and build **664
  modules** on the current-master union. Artifact is **509,825 bytes**, sha256
  `d7344e1cb390ef88600227bb164e1732d39f4bab8cb39dee10d79709b0c430e4`.
  Scope stayed `core-rs/**` plus only `tests/keyRepeatParity.test.ts`.

## R11 — [supervised session, 2026-08-13] **M10c draft-selection WASM boundary**

- **State:** `rust-main` = current master `d7250c24` plus verified M10c
  `ae564d1e` (merge head `d608104f`). The complete 12-helper pure draft
  selection surface is native and forced-WASM reachable with no TS fallback.
- **Did:** added one checked additive ABI-v1 operation packet preserving UTF-8
  species/messages, six full rental sources, u32 boundaries, and optional
  `otId` absence versus present zero. Status 1 owns exact routing errors;
  status 2 owns **56 structural malformed classes** after complete validation.
  Both-mode parity covers **180 cases / 23 categories** and all 12 operations.
- **Next:** select the next conflict-free pure leaf; M7c opponent generation
  still waits on #55, and draft state construction/presentation remain outside
  the completed M10 selection family.
- **Notes:** Sol/high worker, one commit. Supervisor audited all packet suffixes,
  validation order, result tags, optional-field preservation, and no-fallback
  routing; reran cargo **750/750**, fmt, strict clippy, focused parity **4/4**
  both modes, forced union **18 files / 804/804**, release WASM, and post-fold
  smoke **375/375**. Worker exact-commit full npm was **1,041 files / 9,833
  passed / 1 skip**; build was **664 modules**. Artifact is **507,934 bytes**,
  sha256 `f1882396b33623622cd5e90aff7531c335a7b8d71574a647064cccb487ebf471`.

## R10 — [supervised session, 2026-08-13] **M10b draft projections**

- **State:** `rust-main` = current master `cc8e1d3f` plus verified M10b
  `11410fba` (merge head `e4ab5621`). The complete presentation-free draft
  selection helper surface is native; no ABI or adapter was widened.
- **Did:** ported `chosenMonSpecies` with rank-order emission, later-duplicate
  overwrite, sparse-rank skipping, and above-three non-emission; ported
  `selectedRentalParty` as a generic full-record projection with exact first
  invalid/duplicate error ordering and missing-rank error. The coherent corpus
  now has **180 cases / 23 categories**, with all **13 projection branches**;
  sha256 `9264b667c3e7118c5a5d607bf73bd18d554b99d9708d82a0b40f1df34bb3c208`.
- **Next:** M10c — expose the complete draft-selection helper surface through
  one checked additive ABI-v1 packet, adapter, and both-mode parity suite.
  Preserve optional `otId`, UTF-8 species/messages, exact semantic errors, and
  forced-WASM no-fallback routing. Keep presentation/state construction out.
- **Notes:** Sol/high worker, one commit. Supervisor audited Map/projection and
  first-error semantics, regenerated twice, and reran cargo **750/750**,
  focused vectors **6/6**, fmt, strict clippy, release WASM, and post-fold
  smoke **375/375**. Artifact is **493,998 bytes**, sha256
  `206c997958d5c54d5b0ebd0f400d23ee0dfd77008068bf9d26432cdd83b39c55`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.

## R9 — [supervised session, 2026-08-13] **M10a draft-selection helper leaf**

- **State:** `rust-main` = current master `af0688fb` plus verified M9 and
  native-only M10a through `308a87c7`. Ten presentation-free draft-selection
  helpers are native; no ABI or adapter surface was widened.
- **Did:** ported select/deselect numbering and immutable-copy behavior,
  first-pick renumbering (including `findIndex === -1`), selection messages,
  confirmation, exact species stall exceptions, both cursor wraps, and all
  three redraw settle schedulers. The canonically executed TypeScript corpus
  has **102 cases / 12 categories** and regenerates byte-identically at sha256
  `e78b50ca6b407637cafbdb1d71f98eadcb80e93203ea7384735a6848c67af5fb`.
- **Next:** M10b — port the two remaining presentation-free draft selection
  projections (`chosenMonSpecies` and `selectedRentalParty`) as a native-only
  bounded step. Keep draft state construction, presentation expansion,
  rendering, animation, reveal, and controller logic out of scope. M7c still
  waits on #55.
- **Notes:** Terra/max worker, one commit. Supervisor audited all ten source
  branches, regenerated twice, and reran cargo **747/747**, focused vectors
  **4/4**, fmt, strict clippy, release WASM, and post-fold smoke **375/375**.
  Worker same-commit full npm and build passed. Artifact is **491,775 bytes**,
  sha256 `4b5e14d2f789464abf1e60f7c746062abb0c4115238de0666db4d1dc690ff344`.
  Scope stayed entirely inside `core-rs/**`; no unsupported barrier was added.

## R8 — [supervised session, 2026-08-13] **M9d Factory swap WASM boundary**

- **State:** `rust-main` = current master `af0688fb` plus verified M9c–M9d
  through `d5c7cb8d` (merge head `cca0ac1e`). The complete pure Factory swap
  surface is native and reachable through forced WASM with no TypeScript
  fallback. `RUST_DEFERRED.md` has no open entries.
- **Did:** added one versioned additive ABI-v1 operation packet for all eight
  swap entry points, preserving full state, UTF-8 strings, u32 boundaries,
  optional selections, typed decisions, and the two exact semantic errors.
  The decoder rejects bad version/operation/enum/presence/domain/UTF-8/length,
  truncated, appended, missing-suffix, and forbidden-suffix packets before
  semantic execution. Both-mode parity covers the complete **176-case** M9c
  corpus, all **17 phases x 6 inputs**, and **17 malformed classes**.
- **Next:** select the next conflict-free pure family. M7c opponent generation
  remains blocked until the main lane closes #55; generic BattleState reducer
  replay remains outside the completed M8 planning seam.
- **Notes:** Luna/max worker, two commits. Supervisor audited the packet and
  adapter line-by-line and reran cargo **740 tests**, fmt, strict clippy,
  release WASM, swap parity **3/3** in both modes, forced-WASM union **17 files
  / 800/800**, and smoke **375/375**. Worker same-commit full npm was **1,037
  files / 9,812 passed / 1 skip** plus build **661 modules**. Artifact is
  **491,761 bytes**, sha256
  `980bcf83cec1c2f5eb1b84160247dba2d7e5943b22bacc8fa9efc68d875b1f11`.
  Scope was `core-rs/**` plus the single M2-allowed parity file
  `tests/factorySwapParity.test.ts`; no canonical TypeScript or other lane
  ledger was edited.

## R7 — [supervised session, 2026-08-13] **M9c Factory swap input reducer**

- **State:** `rust-main` = current master `6edeb188` plus verified M9c
  `29470d38`. The complete pure `factorySwap.ts` state, mutation, cursor,
  decision, and six-input reducer surface is now native. `RUST_DEFERRED.md`
  has no open entries.
- **Did:** ported every `handleFactorySwapInput` readiness gate, picker/action
  wrap, cursor-copy staging flag, player-option route, duplicate-species
  route, accept/quit prompt branch, and transition-phase no-op. The
  canonical-TypeScript-executed corpus has **176 full-state cases / 22
  categories**, including the complete **17 phases x 6 inputs** matrix;
  sha256 `6798e1b084014722be065fc45f6d0b817754d05330d95cd7269ac099f0d90759`.
- **Next:** M9d — expose the complete Factory swap pure surface through one
  additive ABI-v1 operation packet, a new `core-rs/adapter` module, and one
  new both-mode parity suite. Forced WASM must call the export directly with
  no TypeScript fallback. M7c opponent generation still waits on #55.
- **Notes:** Terra/max worker, one commit. Supervisor audited the reducer
  branch-by-branch, regenerated the corpus twice byte-identically, and reran
  cargo **737 tests**, focused vectors **5/5**, fmt, strict clippy, release
  WASM, and smoke **375/375**. Worker same-commit full npm was **1,035 files /
  9,804 passed / 1 skip** plus build **661 modules**. Artifact is **471,931
  bytes**, sha256
  `aa740344412b2daa2c904bf1e67f181fe7cf28e43f16a2caed057936405d5fe4`.
  Scope stayed entirely inside `core-rs/**`; no adapter, canonical TypeScript,
  TS test/config, or other lane ledger changed.

## R6 — [supervised session, 2026-08-13] **M8d–M8j live planning + M9a–M9b Factory swap leaves**

- **State:** `rust-main` = master `fafcf933` plus verified M8d–M9b through
  `50a2466e`. The complete pure `createFactoryAiViewFromLiveRules` projection
  and source-shaped mask-0/1/7 move chooser are native and WASM differential-
  green end-to-end; the live driver's private RNG replay/checkpoint leaf is
  native, and a single native projection drives every existing chooser.
  `RUST_DEFERRED.md` has no open entries.
- **Did:** ported the source-shaped view with exact optional-property presence,
  JS-number/bit-mask behavior, status and side conditions, M8a history slot-0
  projection, M8c weather/stages, challenge defaults, and attacker-before-
  target ability error ordering. The twice-byte-identical TS-executed corpus
  has **17 cases** across 9 categories; sha256
  `8020bcd29c0e9dc6fd48da3ff008ebbdf3dd3e8d4375fd7da246448a4e2d6186`.
- **M8e DONE:** additive ABI-v1 variable-width packets preserve all Number,
  UTF-8, history, and optional-property states. Status 0 carries the complete
  view, status 1 the exact typed ability error, and status 2 checked malformed
  input. The adapter routes forced WASM directly with no TS fallback; parity
  covers complete views, optional combinations, numeric/history edges, error
  order, and five malformed packets.
- **M8f DONE:** ported private `replayAiDraws` semantics with lossless u32 RNG
  state, JS-safe call counters, before/after checkpoint validation, draw
  ordering/ordinals, random-value failure, and exact divergence/overflow
  errors. The twice-byte-identical, canonically executed corpus has **17
  cases** across **10 categories**; sha256
  `e8e8e9778e82e252f80a454207b1f8f75728fba535655898d1514e53fa7d7c7b`.
- **M8g DONE:** added the sole source-view-to-policy bridge and proved complete
  canonical chooser receipts for masks 0/1/7 across history, weather, status,
  type/ability, stages, optional fields, and turn-RNG ownership. Variable move
  history retains observable entries beyond four while four-slot positional
  gates use canonical `?? 0` behavior. The twice-identical corpus has **12
  cases / 9 categories**; sha256
  `0aa8b03965284418c563df3418a3906b7f7d27f1a68a52bfe7ce62722e80eea1`.
- **M8h DONE:** additive ABI-v1 packets reuse the exact M8e live prefix and add
  u32 RNG state, authoritative request records, and turn-RNG ownership. Rust
  constructs the live view, selects the mask, and returns the existing complete
  chooser receipts. Status 2 owns every structurally malformed packet before
  semantic evaluation; valid packets preserve canonical live-view -> request ->
  mask ordering. Forced WASM calls the export directly with no TS fallback.
  Parity covers **12 cases / 9 categories**, exact errors, eight-entry history,
  u32 RNG edges, and malformed prefix/suffix combinations.
- **M8i DONE:** added the native-only pure planning prefix of
  `submitLiveFactoryAiDecision`, composing history sync, live view, switch
  policy, selected-switch bypass, move filtering, and the live chooser without
  the generic BattleState reducer. Scored moves retain battle-turn-boundary
  ownership of the stored random number. The twice-identical canonical-driver
  corpus has **12 cases / 10 categories**; sha256
  `dd298a0fbf083b0e6d01749ca9b36af34b0467c80269833e705d375493fd54b3`.
- **M8j DONE:** one additive ABI-v1 planner packet encodes canonical
  BattleState/rules fields once; Rust atomically derives the history/live and
  switch projections, so contradictory battler copies are impossible. The
  output frames complete history, view, switch policy, action gate, submission,
  RNG, and chooser trace. Forced WASM has no TS fallback. Structural status 2
  is pinned for truncation, append, egg/boundary/request/legal tags, including
  packets whose live view would otherwise fail semantically.
- **M9a DONE:** ported the native-only pure Factory swap mutation leaf:
  duplicate-species exclusion, accepted copy/commit, friendship reset, rental
  `enemy + 3` indexing, typed missing-selection errors, and the round-decision
  timing seam. The twice-byte-identical canonical-TS corpus has **17 cases / 6
  categories**; sha256
  `5fdaa2feb71d1fa6e8617bcb4661d66cf719eb246e4475d3eb6597d5ce441846`.
- **M9b DONE:** ported Factory swap initialization, presentation
  acknowledgement, and the old-state-derived VBlank cursor/option copy
  pipeline. Deep-clone ownership and each pending/lag/no-op path are pinned.
  The extended twice-byte-identical canonical-TS corpus has **28 cases / 12
  categories**; sha256
  `d0a218bc3336e0f2f3e329d46c391ddda90a3ef10746ef576aefdacd7b7b6bfb`.
- **Next:** select the next unblocked pure family; generic reducer replay stays
  outside M8 because the canonical BattleState reducer is not yet native. M7c
  opponent generation still waits on #55.
- **Notes:** Terra/max worker, 3 commits. Supervisor audited the complete TS/Rust
  property mapping, regenerated the corpus twice, and reran cargo **716 tests**,
  fmt, clippy, WASM, and smoke **375/375**. The rebuilt artifact is 391,563
  bytes, sha256 `6b587cb1e3887a0ccc7ad3a4d2c40181044a100b61e2b0b1ffe8aac6ff8aeb99`.
  M8e used Luna/max; supervisor audited the wire and no-fallback routing and
  reran cargo **716 tests**, fmt, clippy, both-mode focused **5/5**, forced
  union **14 files / 790/790**, and smoke **375/375**. Final artifact is
  412,104 bytes, sha256
  `d5abf0a57f8b3a587ad9ff5ef8faa0891cbecf3acaf17f57e089544fea57e725`;
  worker same-commit full npm was **1,020 files / 9,723 passed / 1 skip** plus
  build. M8f used Terra/max; supervisor audited its extracted-private-helper
  generator and all checkpoint/error paths, regenerated twice byte-identical,
  and reran cargo **720 tests**, release WASM, and smoke **375/375**. Final
  artifact is 412,118 bytes, sha256
  `a25b1b216c1493811b135c481c1d3b6623bacf2b0dfdd8e5f5fa57ba2cdce3d4`.
  M8g used Luna/max; a Sol/high correction ratcheted a supervisor-found
  over-four positional-history panic before fold. Supervisor audited every
  history scan and the live/policy property bridge, regenerated twice, and
  reran cargo **722 tests**, fmt, clippy, WASM, and smoke **375/375**. Artifact:
  417,761 bytes, sha256
  `68e9768c138fdf6c6d60debe966be7f95e901dd83b3138271b9446f7cc0e1f2e`.
  Both worker same-commit full npm runs were **1,020 files / 9,723 passed / 1
  skip** plus build. Scope stayed within `core-rs/**` plus the one
  M8e-authorized parity file; no canonical TS engine or existing test/config
  changed. M8h used Sol/high plus two bounded Sol/high corrections for exact
  validation text/order and structural precedence. Supervisor audited the wire,
  projection, and no-fallback route, reran focused both-mode **4/4**, cargo
  **724 tests**, fmt, clippy, WASM, smoke **375/375**, full npm **1,021 files /
  9,727 passed / 1 skip**, and build. Artifact: 434,944 bytes, sha256
  `81df933139ea8ea7f4d4e1cfcd1d0788408ec84291cfbfcb9496d73d9c9e0107`.
  M8h scope stayed within `core-rs/**` plus its one newly authorized parity
  file; no canonical TS engine or existing test/config changed. M8i used
  Terra/max. Supervisor audited its composition/order, regenerated the corpus
  twice, and reran focused parity **2/2**, cargo **726 tests**, fmt, clippy,
  WASM, and smoke **375/375**. Worker same-commit full npm was **1,021 files /
  9,727 passed / 1 skip** plus build. Artifact: 416,805 bytes, sha256
  `e47a6a361a8c04fa2fc116edcfb2192b4c4aa10724075450eecc0468950caed1`.
  M8i stayed entirely inside `core-rs/**`; no WASM export, adapter, canonical
  TS engine, or TS test/config changed. M8j used Sol/high plus one Terra/max
  acceptance correction. Supervisor audited the single-copy packet, full
  structural-before-semantic decode, result frames, and direct forced-WASM
  path; focused both-mode is **3/3**, cargo **726 tests**, fmt, clippy, rebuilt
  WASM, smoke **375/375**, and the forced **15-file / 793/793** union are green.
  Worker same-commit full npm is **1,022 files / 9,730 passed / 1 skip** plus
  build **659 modules**. Artifact: 455,721 bytes, sha256
  `10d7fca84423652c206eb60a40fbd28d02db82215cd9c4277d95aad17f6aa32f`.
  Scope stayed within `core-rs/**` plus one newly authorized parity file; no
  canonical TS engine or existing TS test/config changed. M9a used Terra/max;
  supervisor audited the Rust/TS field mapping, generator provenance, full
  result/error comparison, and all player/enemy offsets, regenerated twice,
  and reran focused **6/6**, cargo **732 tests**, fmt, strict clippy, and WASM.
  Worker smoke and build **659 modules** were green; its full npm process
  completed but lost the aggregate status stream and is not claimed. Artifact:
  461,613 bytes, sha256
  `f94d5f7cebd4f04cb6e941a0eb1a469533fe365b58c95ac8a9b9887f66264623`.
  M9a stayed entirely inside `core-rs/**`; no WASM export, adapter, canonical
  TS engine, or TS test/config changed. M9b used Sol/high; supervisor audited
  old-state cursor ordering and clone/default semantics, regenerated twice,
  and reran focused **7/7**, cargo **733 tests**, fmt, strict clippy, and WASM.
  Worker full npm was **1,022 files / 9,730 passed / 1 skip** plus build **659
  modules**. Artifact: 474,121 bytes, sha256
  `a2720645060b58cbcb563f770615685f0f6eefe25bd101bc36af5e42d115e16a`.
  M9b stayed entirely inside `core-rs/**`; no WASM export, adapter, canonical
  TS engine, or TS test/config changed.

## R5 — [supervised session, 2026-08-12] **M5–M7 COMPLETE; M8 live-driver leaves advancing**

- **State:** rust-main = master `ebd00cda`, which contains the verified M8a–M8c
  folds. Battle history is native and WASM differential-green end-to-end;
  live-view weather and stat-stage projections are native.
  Factory trainer selection and the seven-trainer schedule are now
  native and WASM differential-green end-to-end.
  The complete Factory AI mask 0/1/7 decision family and the singles switch-in
  selector/full switch policy are native and WASM differential-green. Factory
  trainer selection/scheduling is now native and corpus-differential-green.
  `RUST_DEFERRED.md` has no open entries.
- **M6a DONE:** ported pure RNG-free `GetMostSuitableMonToSwitchInto`, including
  both source passes, strict ties, defender dedup, mono-attacker double apply,
  Levitate/Foresight, active-type STAB, u8 wrap, special move behavior, and the
  PARTY_SIZE sentinel. Its byte-idempotent TS-executed corpus is **215 cases**,
  sha256 `331bd58adb890bac3460adf06665c2746a511c00c699ce8cc64bcf89c627bc1e`.
- **M6b DONE:** ported pure `factoryAiSwitchPolicy.ts`, reusing M6a and
  preserving the complete result, RNG, draw, branch, and error surface. The
  byte-idempotent TS-executed corpus has **416 cases** and ratchets all **3**
  choices, **10** draw kinds, **17** branch kinds, and **5** outcomes; sha256
  `2d1aa4dafe0fb3d22c410d28d55b071acc1b2b8d505112fd826a6127fe02edf4`.
  Source-derived species types and both ability slots cover dense IDs 1..411;
  table sha256 `7ae8feed6dcedad22fd5dc9d8f4f4f2746951019b68a3a65b231b7481fe3ec94`.
  Supervisor caught and corrected a generator-only FACTORY-bit error before
  fold; policy outputs were unaffected and the repaired corpus separately pins
  Factory, double-battle, battler-count, and non-trainer prechecks.
- **Verification:** supervisor reviewed the native policy and canonical TS,
  spot-checked seven generated species rows, regenerated both switch corpora
  byte-for-byte, and reran cargo **690 test harness cases**, fmt, clippy, WASM,
  smoke **375/375**, and the forced nine-file WASM union **772/772**. Release
  artifact is 287,620 bytes, sha256
  `b6acb929ccf9026ee33a0e471997cb60cbb25b3cda37b3ac68c10b565aeb34c7`.
  Post-fold full npm is **1,007 files / 9,659 passed / 1 skip**; build is green
  at **655 modules**.
- **M6c DONE:** additive ABI-v1 exports cross the selector's fixed 114-byte
  input and the policy's fixed 401-byte input with typed length/policy errors.
  The adapter calls WASM directly and reconstructs the full choice, selection,
  RNG, **10-kind** draw/reason, and **17-kind / 5-outcome** branch surface.
  Both-mode parity covers **100 selector cases + 160 policy inputs**, all 3
  choices, three policy errors, and six malformed lengths. Supervisor audited
  wire widths/order and no-fallback routing, then reran cargo **693 harness
  cases**, fmt, clippy, artifact build, smoke **375/375**, targeted **3/3**, and
  forced-WASM union **11 files / 779/779**. Artifact: 324,348 bytes, sha256
  `3f8094c9c20f4d77dc5a9b168cbb62c53dd230af2496aa37eaef2e4213a9cbf1`.
  Post-fold full npm: **1,010 files / 9,673 passed / 1 skip**; build **657
  modules**.
- **M7a DONE:** ported complete pure `factoryTrainerSchedule.ts`: generated
  normal/hard ranges and history policy, one-draw-per-attempt retries, the hard
  final battle, post-challenge clamp, battle-6 history omission, injected RNG
  port validation, complete ledgers, and validation ordering. The twice-byte-
  identical TS corpus has **69 cases** (56 selections + 13 schedule operations,
  including errors) across 12 categories; data sha256 `ce55325080c072381cb0139105845a3dc7b91869489265954de2b0b03d400ce8`,
  corpus sha256 `de321b7cd478549a104bdc7fb1acc9aacbdcade8b24a556b4432e53337b520e6`.
  Supervisor reran cargo **699 harness cases**, fmt, clippy, WASM, smoke
  **375/375**, forced union **779/779**, full npm **1,011 files / 9,682 passed /
  1 skip**, and build **657 modules**. Artifact: 336,570 bytes, sha256
  `e040c86b15f82b9b4a10ad50d9ba5d031e28af61fb2413df9c1a5f959f0c9d1b`.
- **M7b DONE:** additive ABI-v1 exports accept JS-number-preserving `f64`
  inputs (selection `28+8N` bytes; schedule 16 bytes), return typed errors and
  the complete result/35-byte ledger records, and keep scripted RNG native-
  only. The new adapter routes forced WASM directly with no TS fallback.
  Both-mode parity covers **425 selections + 64 schedules per adapter**, **25**
  production error inputs, and **9** malformed lengths; real GBA seed 31 pins
  duplicate rejections at battles 1 and 5. Supervisor audited width/validation
  order and arbitrary history-number preservation, then reran cargo **699
  harness cases**, fmt, clippy, WASM, smoke **375/375**, forced union **12 files
  / 782/782**, full npm **1,014 files / 9,695 passed / 1 skip**, and build
  **657 modules**. Artifact: 348,371 bytes, sha256
  `a8a5a9f2fefce59d495a9786767a9257a91ee24513f6e32afed8b8145ca00bb4`.
- **M8a DONE:** ported the independent pure battle-history leaf from
  `factoryAiLiveDriver.ts`: create, record ability/item, target last-move
  SameValueZero dedup/cap, party-change move+ability invalidation with item
  retention, and observed ability/item overlays. The source-derived dense
  ability-name table covers IDs 0..77; unknown IDs preserve the canonical
  error. The twice-byte-identical TS corpus has **15 cases** across create,
  record, target move, party change, observation, unknown-ability, and
  arbitrary-history categories; table sha256
  `19d8dc6a9e7a40600454be12d59167d228d3434d2ce8713116c4ab2f7c6dbac5`,
  corpus sha256
  `abc612fc71cb4f469f99e3138e0f8dd495372a0831eeb216c97080e5578e00a4`.
  Supervisor audited the live-driver ordering and JS-number edge semantics,
  regenerated both artifacts twice, and reran cargo **708 harness cases**,
  fmt, clippy, WASM, smoke **375/375**, forced union **12 files / 782/782**,
  full npm **1,014 files / 9,696 passed / 1 skip**, and build **657 modules**.
  Artifact: 348,965 bytes, sha256
  `f593924927773e3f223334bbc2d3316e6f52fab57178b9e8a2ba81e86e5cbdfa`.
- **M8b DONE:** additive ABI-v1 operation packets now expose history create,
  record ability/item, and sync. Variable-width histories preserve arbitrary
  JS Numbers as `f64`, UTF-8 abilities, canonical errors, and fully checked
  malformed-input status without traps. The new adapter routes forced WASM
  directly with no TS fallback; its sole new both-mode suite covers the full
  history lifecycle, NaN/−0/Infinity, Unicode, unknown abilities, and six bad
  packets. Supervisor audited the layout/decoder and reran cargo **708 harness
  cases**, fmt, clippy, WASM, smoke **375/375**, forced union **13 files /
  785/785**, full npm **1,016 files / 9,706 passed / 1 skip**, build **657
  modules**, vanilla soak **20/20**, and full soak **60/60**. Artifact: 395,869
  bytes, sha256
  `1d566618694f3ced4718c39a0a4170927fa73d43d63c1963e44e465c2f59782f`.
- **M8c DONE:** ported only `currentWeather` and `statStages` from the live
  view constructor. Weather preserves Sun→Rain→Sandstorm→Hail precedence and
  ECMAScript `ToInt32` for arbitrary Number inputs; stages project slots 1..7
  in canonical order with unvalidated numeric cells intact. The twice-byte-
  identical TS-executed corpus has **25 cases** (10 raw weather, 2 precedence,
  10 coercion, 3 stage); sha256
  `1a3fce2c30b3a17c16d086b85803a5da948bf46c40efea7f9e543cea357be77c`.
  Supervisor audited the helpers/generator and reran cargo **712 harness
  cases**, fmt, clippy, WASM, full npm **1,018 files / 9,714 passed / 1 skip**,
  build **659 modules**, vanilla soak **20/20**, and full soak **60/60** on the
  final master-v28 union. Artifact remains 395,869 bytes, sha256
  `1d566618694f3ced4718c39a0a4170927fa73d43d63c1963e44e465c2f59782f`.
- **Next:** M8d — port `createFactoryAiViewFromLiveRules` natively with
  TS-executed vectors, reusing M8a/M8c; keep its WASM boundary separate. M7c
  opponent generation still waits on #55.
- **Notes:** M6b used Sol/high plus one narrow Terra/max correction; M6c used
  Sol/high; M7a, M8a, and M8c used Terra/max, and M7b/M8b used Sol/high. Scope stayed within
  `core-rs/**` plus authorized new parity tests; no canonical TS engine or
  main-lane ledger file changed. M7c opponent generation is intentionally
  waiting: its personality construction cursors are fed by unresolved #55,
  and the Rust charter forbids porting that dependency before the TS clock
  closes.

---

## R4 — [supervised session, 2026-08-11 night through 2026-08-12] **M5f-2 folded: the pure DecisionPolicy is native**

- **State:** rust-main = master `27804f67` + verified Rust folds through
  M5f-2b `d92cf1dd`/`acecf978`. The full pure DecisionPolicy (mask 0/1/7),
  mask selector, CheckBadMove, TryToFaint, and CheckViability are native;
  all boundary-bearing surfaces through CheckViability cross the WASM
  differential harness. Main-tree artifact is 253,842 bytes, sha256
  `86b488d6…`; Rust **680/680** and post-fold smoke **375/375**. Only the
  final DecisionPolicy WASM boundary/adapter parity step remains in M5.
  No open rust deferrals.
  Start-of-session merged baseline was full npm **993 files / 9,591 passed /
  1 pre-existing skip** + build; the M5e worker's same-commit full npm gate
  was **994 files / 9,600 passed / 1 skip** + build. No open rust deferrals.
- **Did:** supervisor verification on the worker branch before fold:
  scope clean (5 files, all core-rs/), cargo **204/204** + fmt +
  clippy(--all-targets) + wasm build rerun independently, BOTH generators
  rerun byte-identical, 2 vector rows re-derived from the TS module by an
  independent script (inputs reconstructed from pokeemerald headers, not
  the generator): Ninjask stale-weather collision (−8, 0 draws) and
  Lanturn Magnitude 3-draw chain — every rng before/after, randomValue,
  and guessed ability exact. `CBM_HANDLED_EFFECTS_M5B1` = exactly the 32
  batch effects. Post-fold on rust-main: cargo 204/204, artifact rebuilt,
  smoke 375/375. Worker: sonnet, 23.6 min of a 90-min cap, 2 commits.
- **M5b-2 DONE (fold `cc1b07e1`):** all 33 RNG-gated status/stat-DOWN
  effects native (OHKO/Sleep/Roar/Paralyze/Confuse-Swagger-Flatter/
  Toxic-Poison/WillOWisp/LeechSeed/FakeOut, the 14-effect stat-DOWN
  shared-tail family, KnockOff+Trick, Attract full gender matrix,
  Explosion, DreamEater, SpitUp+Swallow) + `computeAiEffectiveness`
  ported once (x0→1 clamp preserved; its table-entry iteration naturally
  avoids dual-same-type double-count, unlike `typeMultiplierTenths`'s
  per-slot loop — asymmetry preserved and tested). Native tests 58→133;
  111 scored + 8 direct-handler TS-generated vector rows
  (gen-cbm-m5b2-vectors.mjs, byte-idempotent). Unported = 44, pinned.
  MAX_CHECK_BAD_MOVE_DRAWS re-verified UNCHANGED at 3 (AttackDown/AccDown
  add 2 handler draws but their movers are all power 0 → negates-type
  never co-occurs; KnockOff hits 3 via negates-type+soundproof+own).
  Worker quirk finding: FIVE M5b-2 effects have zero real Gen-3 moves
  (SPECIAL_ATTACK_DOWN(+_2), SPECIAL_DEFENSE_DOWN, ACCURACY_DOWN_2,
  EVASION_DOWN_2) — one more than the scout's vestigial list; siblings
  exercise their shared arms. Supervisor rerun: scope clean, cargo
  **282/282** + fmt/clippy(--all-targets) + wasm build, all THREE
  generators byte-idempotent, 2 rows re-derived independently (Growl vs
  Marowak 3-draw both-sites chain; Attract vs known-Oblivious −10/0-draw)
  — exact. Post-fold: artifact rebuilt, smoke 375/375. Worker: sonnet,
  30.0 min, 2 commits.
- **M5b-3 DONE (fold `b139100e`) — CheckBadMove is 109/109 native.** All
  44 zero-RNG stat-UP/screens/singles effects;
  `unported_cbm_table_effects()` = `[]`; completeness probe flipped to
  the all-ported arm; `NotYetPorted` barrier stays (honesty analog of
  TS's own dead barrier). Native tests 135→281; 107 scored + 9 direct
  AccUp vector rows (gen-cbm-m5b3-vectors.mjs, byte-idempotent). Both
  same-function pairs (Curse↔BulkUp, PsychUp↔Haze) proven identical
  through the full dispatcher. Port findings worth keeping: (1) dual-stat
  stat-UP composition is ADDITIVE (BulkUp both-maxed = −18, not −10) —
  TS doc phrasing "sequential, no interaction" is easy to misread;
  (2) Snore (power 40) is the ONE M5b-3 move where isMovePowerOther is
  false → negates-type + soundproof both draw (directed vector added);
  (3) hp_percent maxHp=0 guard saturates to i32::MAX — verified faithful:
  both TS uses compare `< threshold`, and Infinity/NaN/i32::MAX all fail
  `<` identically (unreachable input regardless). Supervisor rerun: scope
  clean, cargo **330/330** + fmt/clippy(--all-targets) + wasm build, all
  FOUR generators byte-idempotent, 2 rows re-derived independently
  (Snore ambiguous 2-draw preamble chain; BulkUp both-maxed −18) —
  exact. Post-fold: artifact rebuilt, smoke 375/375. Worker: sonnet,
  21.4 min, 1 commit. Worker PAPERCUT worth adopting as lane practice:
  always verify move ids against moves.json before hand-typing them in
  directed cases — several first-pass guesses were wrong.
- **M5c DONE (fold `570239fc`) — the Factory AI surface is behind the
  differential harness.** 2 additive fw_ exports (ABI v1 unchanged):
  `fw_select_factory_ai_mask` (scalar args in; 28 B ok / 10 B error out,
  all 4 FactoryAiMaskError sites cross as codes) and
  `fw_run_check_bad_move_preamble` (132 B input — rng, move_id,
  RoarTarget 29 + Attacker 29 fields, ~50 optionals presence-preserving
  via per-field flag byte; 105 B scored / 9 B not-yet-ported /
  variable-length error out; unknown-move throw crosses as
  message-matched error, no trap). Layout decision recorded: mirrored
  sequential byte-cursor reader/writer on both sides instead of
  hand-transcribed offset literals (~60 fields = transcription risk);
  offset table still documented in the doc comment. New
  `core-rs/adapter/factoryAiEngine.ts` + `tests/factoryAiMaskParity.test.ts`
  (17) + `tests/factoryAiCheckBadMoveParity.test.ts` (80, incl. 327-case
  seeded sweep across all 109 effects). Supervisor rerun: scope = core-rs
  + exactly the 2 authorized test files, cargo **335/335** + fmt/clippy +
  wasm build, new suites **97/97 in BOTH modes**, existing union 660/660
  in wasm mode, adapter wiring skimmed (wasm path genuinely routes
  through loadFactoryWasm encode/decode — no TS fallback faking parity).
  Worker ran full npm test green (977 files / 9,527 + 1 skip) + build in
  its tree; supervisor full suite on rust-main runs post-fold (doubles
  as the wind-down suite). Worker: sonnet, 33.1 min, 3 commits.
  **Scout correction from the sweep:** 10 (not 5) CBM_TABLE_EFFECTS
  members have zero real Gen-3 moves — the batching doc's §4 list plus
  EVASION_UP_2, EVASION_DOWN_2, SPECIAL_DEFENSE_DOWN, SPECIAL_DEFENSE_UP,
  SPEED_UP (base variants; their _2 siblings do carry moves). Verified
  against moves.json.
- **M5d batching scout folded (`abc54dfd`):**
  `docs/rust-m5d-checkviability-batching.md` — CheckViability (9516
  lines, 122 table effects, TS-side 598/598 complete) partitioned into
  **M5d-0 (preamble+shared infra) then M5d-1..5** (13/29/30/22/28
  effects, sum script-verified) with exact dispatch/handler/test ranges.
  Key scout verdicts, supervisor spot-verified: CV does NOT reuse CBM's
  draw plumbing (zero nextGetAbilityDraw hits — re-implements the
  cascade inline; a TS duplication to preserve, not fix); Flatter
  (M5d-5) calling Confuse (M5d-3) is the ONE cross-batch dependency
  (Swagger rides with Confuse in-batch); CBM's Curse→BulkUp /
  PsychUp→Haze reuse pairs do NOT transfer (independent CV bodies);
  ~half the 90 dispatched handlers have NO ground-truth-doc backing
  (both the module header and factory-ai-checkviability-ground-truth.md
  are stale ~22-handler snapshots) — future workers go straight to
  data/battle_ai_scripts.s. 89/122 EFFECT_* consts already exist in
  factory_ai_check_bad_move.rs. Worker: sonnet, 21.4 min, 1 commit,
  docs-only.
- **Wind-down gates (this tree, supervisor-run, post-M5c):** cargo
  **335/335** + fmt/clippy clean + wasm build, artifact rebuilt, parity
  union (rng+damage+turn+rental+partyMember+aiMask+aiCbm) **757/757 in
  wasm mode** (default mode covered inside the full suite), full npm
  test **977 files / 9,527 passed / 1 pre-existing skip**, npm build
  green, soak **vanilla 20/20 OK** + **full 60/60 OK**. No orphan
  worker worktrees or branches; RUST_DEFERRED.md has no open entries.
- **M5d-0 DONE (fold `19de08f6`):** `factory_ai_check_viability.rs` —
  unified `FactoryAiCheckViabilityBattler` (42 fields, recounted =
  scout), `CheckViabilityDraw` 62 variants over a shared flat
  101-leaf `CvDrawKind` enum (worker recount: **136** distinct TS leaf
  kind strings vs scout's "~85" — documented in-module; several TS
  members union multiple numbered kinds), `next_draw`, CV-specific
  stale-funcResult maps + 3 helpers (ability side reuses CBM's pub fn),
  33 new EFFECT consts appended to CBM's block (spot-verified against
  battle_move_effects.h), CV_TABLE_EFFECTS[122] + probe machinery +
  dispatcher shell with NotYetPorted trailing barrier and zero-score/
  funcResultCarry fallthrough. MAX_CHECK_VIABILITY_DRAWS = 8
  (deliberately conservative; proven single-pass worst case in
  EvasionUp is 7 — M5d-2 re-verifies). **Worker scoping judgment,
  supervisor-verified correct:** Result stays 2 variants
  (Scored/NotYetPorted) — TS's own "unsupported-branch" has exactly ONE
  emission site (the trailing barrier, :7205, dead at 122/122), so
  NotYetPorted IS that variant; the scout's "2 + a 3rd" phrasing was
  confused. 14 native tests + 41 shell vector rows
  (gen-cv-shell-vectors.mjs, byte-idempotent). Supervisor rerun: scope
  clean, cargo **350/350** + fmt/clippy + wasm, generator
  byte-idempotent, funcResultCarry pass-through re-derived from TS
  independently (fallback present→carried, absent→absent; table-effect
  sanity proves shell vectors can't cover them). Post-fold: artifact
  rebuilt, smoke 375/375. Worker: sonnet, 21.6 min, 1 commit.
- **M5d-1 DONE (fold `dfc75027`):** 13 effects (Sleep, SpeedDown+_2,
  SpeedDownFromChance→SpeedDown delegation ported as a call, Toxic+
  LeechSeed, Protect, Pursuit, HighCrit+BlazeKick+PoisonTail, AlwaysHit,
  VitalThrow — the last three are the module's CV-only handlers).
  unported = 109, pinned. 47 native tests (roll seeds FOUND via a
  find_seed search, not hand-picked) + 111 TS-generated vector rows with
  per-draw site/rng/funcResultAfter assertions (gen-cv-m5d1-vectors.mjs,
  byte-idempotent). Worker quirk findings: HighCrit's fallthrough burns
  1-or-2 draws depending on the first roll; AlwaysHit's ScoreUp1 does
  NOT short-circuit (falls into the second roll); Protect's
  EFFECT_ID_IN_WEATHER_RANGE map needed 2 file-local consts (EFFECT_HIT=0,
  EFFECT_POISON_HIT=2) the M5d-0 const inventory missed. Supervisor
  rerun: scope clean, cargo **384/384** + fmt/clippy + wasm, generator
  byte-idempotent, 2 rows re-derived independently (Protect roll-1 +1
  with funcResultAfter=0; Karate Chop vs Ghost immune 2-draw
  fallthrough) — exact. Post-fold: artifact rebuilt, smoke 375/375.
  Worker: sonnet, 29.0 min, 1 commit.
- **M5d-2 DONE (fold `7a035650`):** 29 effects, all three shared-tail
  clusters (run_cv_stat_down, run_cv_attack_style_stat_up,
  run_cv_side_screen_type_gate). unported = 80, pinned. 56 native
  tests + 208 vector rows (gen-cv-m5d2-vectors.mjs, byte-idempotent).
  **EvasionUp worst case proven 7, not 8** (site 1 needs hp≥90, site 8
  needs hp∈[40,70] — disjoint, exhaustively checked 0-100;
  MAX_CHECK_VIABILITY_DRAWS stays 8 per brief). Design note, verified
  behaviorally identical by supervisor re-derivation: TS's one-line
  pass-through wrappers (runCvDefenseDown etc.) collapsed into
  selector-driven shared-tail dispatch. 6 of 29 effects vestigial
  (SPEED_UP, SPECIAL_DEFENSE_UP, SPECIAL_DEFENSE_DOWN base variants +
  EVASION_UP_2/ACCURACY_DOWN_2/EVASION_DOWN_2), live-verified.
  Supervisor rerun: scope clean, cargo **441/441** + fmt/clippy + wasm,
  generator byte-idempotent, 2 rows re-derived independently (Tickle
  through the DefenseDown shared tail −2; Double Team toxic-pair 2-draw
  chain) — exact. Post-fold: artifact rebuilt, smoke 375/375. Worker:
  sonnet, 31.8 min, 2 commits.
- **M5d-3 DONE (fold `1f74ba5c`):** 30 effects (weather trio with
  SunnyDay/Hail sharing weather_setter_cv_score and RainDance's own
  diverging body kept separate; heal family; OHKO as an inline arm;
  SelfKO for Explosion+Memento; SemiInvulnerable 129-line handler;
  Confuse kept pub(crate) for M5d-5's Flatter; Swagger delegates to
  run_cv_confuse; Counter). unported = 50, pinned. ~130 native tests +
  181 vector rows (gen-cv-m5d3-vectors.mjs, byte-idempotent), incl. the
  weather stale-funcResult collision cases exercising M5d-0's maps
  end-to-end. **Port finding, supervisor-confirmed independently:**
  AI_CV_SemiInvulnerable5's tryEncourage tail returns its own fresh
  draws array, silently DROPPING the speed-tie draw's receipt while
  keeping its rng advance (TS :2180-2198; calls 2, draw_count 1,
  surviving ordinal 2) — caught by the differential vectors mid-port,
  replicated bug-for-bug. Supervisor rerun: scope clean, cargo
  **528/528** + fmt/clippy + wasm, generator byte-idempotent, 2 rows
  re-derived independently (Fly tie-draw dropped-receipt; SunnyDay
  stale-fallback carry) — exact. Post-fold: artifact rebuilt, smoke
  375/375. Worker: sonnet, 38.6 min, 1 commit.
- **M5d-4 DONE (fold `5d3f2f1c`):** 22 effects (BrickBreak, shared
  ChargeUpMove ×4, Overheat, Facade, Curse and PsychUp with their OWN
  independent bodies — the CBM reuse shortcuts verifiably don't
  transfer, MirrorCoat 91-line 7-roll handler, DragonDance, BatonPass,
  KnockOff, FocusPunch, Revenge, Superpower, MagicCoat, Foresight,
  Endeavor, Encore, HealBell, Substitute 107-line handler). unported =
  28 (M5d-5's set), pinned; barrier probe moved to EFFECT_TRICK. 74
  native tests + 153 vector rows (gen-cv-m5d4-vectors.mjs,
  byte-idempotent; all 153 matched first-run). Worker findings: Encore's
  EncouragedMovesToEncore = 61 raw effect ids (most have no EFFECT_*
  const here — inline literals with name comments, header-sourced);
  MagicCoat roll site 3 is dead code in the compiled ROM, ported
  faithfully; protect_last_move_effect_func_result is genuinely shared
  by Protect/Encore/Substitute in TS. Supervisor rerun: scope clean,
  cargo **601/601** + fmt/clippy + wasm, generator byte-idempotent, 2
  rows re-derived independently (MirrorCoat low-hp 4-roll chain +3;
  Curse neutral-stage 3-roll +2) — exact. Post-fold: artifact rebuilt,
  smoke 375/375. Worker: sonnet, 29.4 min, 2 commits.
- **M5d-5 DONE (fold `848988d8`) — CheckViability is 122/122 native;
  the M5d program is COMPLETE.** All 28 remaining effects (Trick,
  Snatch 94-line closer, MirrorMove, Haze, the MudSport/WaterSport
  same-function pair proven identical through both arms,
  Flatter→run_cv_confuse cross-batch delegation proven through the
  dispatcher, ChangeSelfAbility's inline ability cascade ported
  bug-for-bug — NOT CBM's plumbing, both vestigial handlers pub(crate)
  + direct-call tested). `unported_cv_table_effects()` = [];
  completeness probe flipped to the all-ported arm; ZERO
  #[allow(dead_code)] attributes remain on Draw variants/kinds; 4
  stale intermediate-state barrier pins updated (the M5b-3 precedent).
  320 native tests + 88 dispatcher + 9 vestigial direct-call vector
  rows (gen-cv-m5d5-vectors.mjs, byte-idempotent). **Port finding,
  supervisor-confirmed live:** run_cv_haze never increments `ordinal`
  between its two draw sites — both draws carry the SAME ordinal label
  while rng advances twice; bug-for-bug. Supervisor rerun: scope clean,
  cargo **662/662** + fmt/clippy + wasm, generator byte-idempotent, 2
  rows re-derived independently (Haze both-blocks repeated-ordinal;
  SkillSwap known-Static 1-draw) — exact. Worker: sonnet, 33.9 min,
  3 commits.
- **M5e DONE (folds `cd97dc59`/`739c4df0`) — CheckViability boundary,
  adapter, and parity.** Additive ABI-v1 `fw_run_check_viability` uses a
  236-byte fixed input prefix plus UTF-8 `reasonPrefix`: two complete
  108-byte, 42-field battlers preserve every optional's presence. The
  variable output preserves final RNG, optional `funcResultAfter`, score,
  and every typed draw receipt. `factoryAiEngine.ts` now has a genuine WASM
  path; `factoryAiCheckViabilityParity.test.ts` has 9 tests, a 122-effect
  census, and 672 runnable seeded cases across 112 source-addressable
  effects. Directed cases pin max-seven draws, stale carry/collisions,
  Haze's repeated ordinal, SemiInvulnerable's dropped receipt with retained
  RNG advance, UTF-8 reasons, and both caller errors. Supervisor reran scope
  audit, cargo **662/662** + fmt/clippy + wasm, new suite **9/9 BOTH modes**,
  prior WASM union **757/757**, post-fold smoke **375/375**. Worker:
  gpt-5.6-terra/max, ~45 min, 2 commits.
- **M5f-1 DONE (folds `eb8df0c4`/`5fdfca2c`) — TryToFaint native.**
  Complete 275-line leaf port in `factory_ai_try_to_faint.rs`; it reuses
  the shared damage/type/RNG modules and exposes DecisionPolicy-ready
  battler/target/input/result structs. Six directed native tests + 93
  TS-executed scored vectors (64 seeded) + 2 exact-error vectors; generator
  rerun byte-identical. Source quirks pinned: per-slot simulated RNG reuse,
  the sole optional x4 draw and >=80 fallthrough +2, Explosion +0, Quick
  Attack +6, strict sibling comparison, power-other behavior, unknown
  sibling zero vs unknown considered panic, and Levitate/Ground loop skip.
  Supervisor re-derived Pound's 19-HP KO and the x4 calls 4→5/ordinal-17
  receipt from TS, then reran cargo **670/670** + fmt/clippy + wasm. Post-fold
  artifact 253,573 bytes (`74b778ce…`), smoke **375/375**. Worker:
  gpt-5.6-terra/max, ~26 min, 2 commits; scope six `core-rs/**` files only.
- **M5f-2a DONE (fold `2d15da47`) — mask-zero DecisionPolicy native.**
  Added the pure typed setup, mask-zero chooser, and shared best-score/tie
  seam. It preserves all four unconditional setup draws, the unconditional
  fifth tie draw even for one legal move, 100/0 scores, legal target identity,
  mask receipt, and exact typed-reachable errors. The checked-in TS-executed
  corpus has **113 success + 22 error** cases across every nonempty legal-slot
  subset, targets, seeds/cursors, mask rejection, request/legality guards, and
  one documented typed-only empty-list guard. Supervisor scope audit was
  exactly five `core-rs/**` files; generator reran byte-identically
  (`290b78f6…`); cargo **674/674** + fmt/clippy/wasm passed. After merging
  current master, artifact = 253,791 bytes (`034833c1…`) and smoke =
  **375/375**. Worker: gpt-5.6-terra/max, ~18 min, 1 commit.
- **M5f-2b DONE (folds `d92cf1dd`/`acecf978`) — scored masks 1/7 native.**
  Added the pure typed scored chooser, reusing the landed setup/tie seam and
  all three leaf scorers. It preserves logic-ID-major whole-slot passes,
  optional decision-owned turn-start draw, authoritative legal targets,
  every delta and final score, and the shared stale `funcResult` channel from
  the last writing TryToFaint slot across the complete CheckViability pass.
  Four direct tests + a TS-executed corpus of **45 success + 13 error** cases:
  all 15 nonempty legal subsets under both masks, winners/ties, multiple
  seeds/cursors, CBM/TTF/CV choice influence, x4, draw-heavy and turn-owner
  paths, stale preserve/overwrite, mask/request/legal and unknown-move errors.
  Full retained result/trace receipts are field-hashed on both sides.
  Supervisor audited exactly five `core-rs/**` files, reran generator
  byte-identical (`b3b483de…`), cargo **680/680** + fmt/clippy/wasm, and
  independently checked the mask-7 `[104,104,104,89]` directed score vector.
  Worker full npm = **999 files / 9,620 passed / 1 skip** + build; post-fold
  current-master artifact = 253,842 bytes (`86b488d6…`), smoke **375/375**.
  Worker: gpt-5.6-sol/high, ~29 min, 2 commits.
- **Prior wind-down gates (this tree, supervisor-run):** cargo
  **662/662** + fmt/clippy clean, artifact rebuilt (final hash
  9d53f91e…), parity union (7 suites) **757/757 in wasm mode**, smoke
  375/375. Full npm test **977 files / 9,527 passed / 1 pre-existing
  skip**, npm build, soak **vanilla 20/20** + **full 60/60** were all
  recorded post-M5c this session; every fold after M5c was
  core-rs/-only (plus one rust-lane docs commit), so the TS side is
  bit-identical to those runs. No orphan worker worktrees or branches;
  RUST_DEFERRED.md has no open entries.
- **Next:** M5f-3 — add the final DecisionPolicy WASM boundary, adapter, and
  both-mode family parity for mask 0/1/7. Re-check TS conflicts before brief,
  then run the full wind-down gates and soaks if M5 closes.
- **Notes:** worker moved one M5b-0 test's "still-unported power≤1"
  example pin from Psywave (now handled) to Mean Look — the exact
  staleness pattern the TS doc comment warns about for its own
  generic-barrier pins; M5b-2/3 workers will do the same dance.

---

## R3 — [supervised session, 2026-08-11 eve] **M4 COMPLETE + M5 opened: battle-kernel family end-to-end; AI family scouted and groundwork folded**

- **State:** rust-main = master (merged at orient, fast-forward) + the
  verified M4a fold `30a6da2a`. **M4a DONE:** all 13 exported
  functions/consts of `src/engine/damageCalc.ts` ported in source order to
  `core-rs/crates/factory-core/src/damage_calc.rs` (i32 arithmetic
  matching the C s32 widths, truncation order preserved, the pokemon.c:3371
  unconditional `+2` included), with 9 hand-written native tests (both
  RAM-pinned regressions carried over: Rock Slide 32→48→42, corrected
  Fury Cutter base=4) + 1129 TS-generated vector rows
  (`core-rs/tools/gen-damage-vectors.mjs` → checked-in
  `damage_vectors_gen.rs`, byte-idempotent, regeneration command in
  header). Supervisor verification: scope clean (5 files, all core-rs/),
  cargo **82/82** + fmt/clippy clean + wasm build OK rerun independently,
  generator rerun byte-identical, 2 vector rows re-derived from the TS
  module by hand (directed huge_power + sweep_0), type chart re-checked
  against src/data/gen/type-effectiveness.json (111 rows − 1
  TYPE_FORESIGHT sentinel = 110 embedded). TS-side baseline on this tree:
  full npm test **957 files / 9,153 passed / 1 pre-existing skip**, build
  green.
- **Did:** session opened per docs/rust-m4-battle-kernel-scout.md (user
  decision: battle-kernel leaf family first). Fresh conflict check at
  orient: zero ISSUES.md hits for damageCalc/turnOrder/turnRng; main lane
  is in #55 m4a-audio territory (unrelated namespace), animation lane in
  reducer coverage. M4a worker (sonnet-5, 90-min cap) finished in ~50 min.
- **M4b DONE (fold `45fa9e94`):** 12 new `fw_` exports (ABI v1 unchanged;
  fixed-width documented LE buffers: DamageCalcInput 117 B = 2×48 B
  battlers + 21 B top-level, AccuracyCalcInput 26 B, type-effectiveness
  8 B output); TYPE_EFFECTIVENESS_TABLE promoted out of the vector file
  into `gen_tables.rs` (codegen-owned by gen-data.mjs, sourced from
  type-effectiveness.json) so no 110-row table crosses the ABI; new
  `core-rs/adapter/damageEngine.ts` (TS default / POKEBENCH_ENGINE=wasm
  opt-in, strings→ids TS-side); `tests/damageCalcParity.test.ts` 14
  batched blocks (18×18 type grid, stage grids, ~230 base-damage cases,
  crit/STAB/endeavor/multiplier/accuracy sweeps). Boundary scoping
  decision, documented both sides: `activeBattlerAbilities` (doubles-only
  Plus/Minus field scan) is NOT encodable at this boundary — adapter
  throws if set; the singles default pairing IS the full field, and M4a's
  native hand tests cover the scan. Supervisor rerun: cargo **91/91** +
  fmt/clippy, artifact 68,963 B, damageCalcParity **14/14 in BOTH modes**,
  existing parity files 440/440 in wasm mode, smoke 375/375, both codegen
  scripts byte-idempotent. Worker also ran full npm test green twice
  (958 files / 9,167 passed / 1 skip); supervisor's one full-suite run
  happens at wind-down per the standing cadence.
- **M4c DONE (fold `63d38e65`):** `turn_order.rs` (effective_speed,
  get_who_strikes_first, sort_battlers_by_turn_order; reuses damage_calc's
  STAT_STAGE_RATIOS; ids verified: SWIFT_SWIM=33, CHLOROPHYLL=34,
  MACHO_BRACE=24, QUICK_CLAW=26) + `turn_rng.rs` (7-step/12-call ledger
  over GbaRng, u8-discriminant step enum); gen-turn-vectors.mjs → 204
  checked-in rows + 27 hand-directed native tests; 4 new fw_ exports
  (incl. a self-describing variable-length sort buffer);
  `core-rs/adapter/turnEngine.ts`; `tests/turnOrderParity.test.ts` 206
  tests. Supervisor rerun: cargo **126/126** + fmt/clippy, generator
  byte-idempotent, turnOrderParity 206/206 default mode, full parity
  union **660/660 in wasm mode**, smoke 375/375; Quick Claw
  threshold-boundary pair + speed-tie parity re-derived from the TS
  module by hand.
- **M5 scout folded (`91fcc87e`):** `docs/rust-m5-scout.md` — next family
  is the **Factory AI move-scoring leaves** (maskSelection → CheckBadMove
  → boundary → CheckViability in effect-group batches → TryToFaint +
  DecisionPolicy). factorySwap (state fused with #55-adjacent ball-anim
  presentation), round-policy consumers (= opponent selection, the R2
  exclusion), and draft-screen (no separable state core) all REJECTED
  with receipts. Supervisor re-verified: zero ISSUES/PROGRESS hits for
  factoryAi*, maskSelection imports only the policy JSON.
- **M5a DONE (fold `be53c146`):** `factory_ai_mask.rs`
  (select_factory_ai_mask + receipt, branch id as #[repr(u8)]
  discriminant; policy JSON codegen-validated into gen_tables so the
  no-branch-matched failPolicy is provably unreachable → documented
  .expect(); the 4 RangeError sites ported as FactoryAiMaskError with
  the documented quirk that Rust's u8/u32 inputs exclude TS's
  negative/NaN triggers — upper-bound violations remain) + 529
  TS-generated success vectors + 8 error-site vectors + **MOVES 355-row
  codegen table** (effect ids parsed from battle_move_effects.h, target/
  flag bits from battle.h:46-53 / pokemon.h:208-213). Supervisor rerun:
  cargo **145/145** + fmt/clippy, both generators byte-idempotent,
  FOCUS_PUNCH row cross-checked JSON↔table↔header (effect 170,
  priority −3), tent+brain mask case re-derived from TS by hand.
- **Wind-down gates (this tree, supervisor-run):** cargo **145/145**,
  fmt/clippy clean, artifact rebuilt 80,342 B, parity union
  (rng+damage+turn+rental+partyMember) **660/660 in BOTH engine modes**,
  smoke 375/375, full npm test **959 files / 9,373 passed / 1
  pre-existing skip**, npm build green, soak **vanilla 20/20 OK** +
  **full 60/60 OK**. No orphan worker worktrees or branches;
  RUST_DEFERRED.md has no open entries.
- **M5b batching scout folded (`f7a89ca7`):**
  `docs/rust-m5b-checkbadmove-batching.md` — the CheckBadMove port is now
  a mechanical four-step program: **M5b-0** (preamble + shared infra:
  nextGetAbilityDraw/checkAbilityAiTarget/typeMultiplierTenths +
  completeness-probe machinery + NotYetPorted trailing barrier), then
  **M5b-1** (HighRisk cluster + weather + zero-RNG singles, 32 effects),
  **M5b-2** (RNG-gated status/stat-DOWN, 33 effects, largest), **M5b-3**
  (stat-UP/screens/singles, 44 effects, cheapest) — each with exact
  dispatch/handler/test line ranges, shared-handler clusters kept whole,
  and the module's quirks enumerated (never-caching ability draws,
  abilityDummyVariable collapse, stale-funcResult weather bug,
  computeAiEffectiveness x0→1 clamp, vestigial dispatches needing
  direct-handler tests, CURSE→BulkUp / PSYCH_UP→Haze same-function
  pairs). Supervisor spot-verified handler/clamp line ranges and the
  109 = 32+33+44 partition.
- **M5b-0 DONE (fold `6f4935c8`):**
  `factory_ai_check_bad_move.rs` — 113 EFFECT_* consts verified
  line-by-line against battle_move_effects.h + 13 ABILITY_* consts
  (representation decision: abilities cross numerically, same id space
  as gen_tables::SpeciesRow.abilities); data heads (weather collision
  table, IGNORED_POWERFUL_MOVE_EFFECTS, trapper/negating/soundproof
  sets, ids verified against the JSONs); full Target/Attacker/RoarTarget
  structs (28/29/1 fields — the batching doc's 22/27 counts were stale);
  never-caching next_get_ability_draw + check_ability_ai_target
  (dummy-variable collapse) + type_multiplier_tenths; completeness-probe
  machinery (CBM_TABLE_EFFECTS[109], empty handled union,
  unported_cbm_table_effects, first_move_id_with_effect,
  Result::NotYetPorted trailing barrier); run_check_bad_move_preamble
  (immunity −10, FISSURE/HORN_DRILL short-circuit, 5 ability-negation
  branches, Soundproof, soundproofGuess stale-funcResult exposure). 29
  native tests + 48 TS-generated scored-case vectors
  (gen-cbm-preamble-vectors.mjs, byte-idempotent). **Worker scoping
  correction, verified live:** TS is 109/109 so its preamble never emits
  barrier results — NotYetPorted coverage is native-hand-test-only;
  TS-differential vectors use preamble-exit and non-table-effect flows.
  Supervisor rerun: cargo **175/175** total, fmt/clippy(--all-targets)
  clean, wasm build green, generator byte-identical, EFFECT consts
  spot-checked against the header, type-immunity case re-derived from TS
  by hand (scored −10, rng untouched, 0 draws — exact match).
- **Next:** M5b-1 (HighRisk cluster + weather + zero-RNG singles, 32
  effects), then M5b-2/M5b-3 (independent), per
  docs/rust-m5b-checkbadmove-batching.md — each batch adds its
  CBM_HANDLED_EFFECTS const + handler-direct tests + TS-differential
  vectors (now derivable per batch since handlers exist TS-side), and
  shrinks the pinned unported set. Then M5c boundary+adapter+parity.
  Re-verify scout conflict checks at orient per the standing M4+ rule.
- **Notes (ops):** the two parity suites HARD-FAIL under plain `npm test`
  in a tree whose gitignored `artifacts/wasm/factory_wasm.wasm` is
  present but STALE (absent → skip; stale → 204 failures, seen live this
  session when the R2-era 62,344 B artifact met the M4 suites). Recipe:
  `./core-rs/build-wasm.sh` before any full suite in a supervisor tree —
  exactly what launcher hardening `cfd80cb7` does for main-supervisor
  folds. Artifact hash is reproducible per source state but shifts with
  any factory-core change (M5a moved it despite no fw_ change).
- **Notes:** worker-reported TS quirks worth keeping: (1) Plus/Minus only
  boosts spAttack, never attack (damageCalc.ts:371-376) — dead weight on
  physical moves; (2) CritChanceInput.attackerSpecies declared but never
  read (:492 vs :499-511) — isChansey/isFarfetchd pre-resolve it; not
  ported; (3) Wonder Guard has no row in type-effectiveness.json (out of
  scope per the TS header); (4) the JSON's TYPE_FORESIGHT/TYPE_FORESIGHT
  sentinel row is excluded from the Rust embed (can never match real ids).
  Random sweeps include physically-unreachable flag combos (isBurned
  without hasStatus1) — deliberate: both engines get identical inputs and
  TS treats them as independent booleans.

---

## R2 — [supervised session, 2026-08-11] **M1→M3d landed: ABI, adapter, rental generation AND mon construction differential-green**

- **State:** **M1, M2, and the FULL M3 vertical slice (rental generation
  + mon construction, M3a–M3d) are DONE and folded into rust-main.**
  master merged in at session start; six worker folds, every one
  gate-verified by the supervisor before merging. Wind-down union gates,
  supervisor-run on rust-main: cargo **62/62** + fmt/clippy clean, wasm
  artifact 62,344 B, parity specs **440/440** (77 party-member + 290
  rental + 73 rng) in BOTH default and POKEBENCH_ENGINE=wasm modes, full
  npm test **950 files / 9,123 passed / 1 pre-existing skip**
  (tests/animation/hypnosisEvidence), soak **vanilla 20/20 OK** and
  **full 60/60 OK**. No file under src/ or tools/ was modified all
  session; tests/ gained exactly the three lane-created parity files.
  **M3c (mon-construction data groundwork) is also folded:** codegen
  extended additively (FRONTIER_MONS moves+ev_flags, MOVE_PP 355,
  held-item hold effects, SPECIES 376 rows with base
  stats/gender/abilities/exp@50, NATURE_MODIFIERS) plus stats/gender/
  shiny/EV helper ports — 52 native tests, idempotent, supervisor
  re-verified row samples (LUDICOLO species row + entries[400]
  moves/ev-mask) against the JSON independently. SPECIES is deliberately
  scoped to the 376 frontier-referenced species (25 SPECIES_OLD_UNOWN_*
  rows lack exp entries; check verified: 0 referenced species missing).
  - **M3d:** `create_factory_corpus_party_member`/`_party` ported
    (ability-slot taken from the instance per the TS spec — NOT
    `ability_slot_for_personality`, which is the generation-time
    derivation); `fw_create_factory_party_member` 91-byte documented
    boundary; decoder + `tests/factoryPartyMemberParity.test.ts` — full
    882-set sweep, 72-config variation block, error parity, party
    triple.
  - **M3a:** `core-rs/tools/gen-data.mjs` codegen → checked-in
    `gen_tables.rs` (882 frontier mons, 63 held items, 411
    species-second-ability, 25 natures, round policy), deterministic +
    idempotent (supervisor re-sampled rows 0/400/777/881 against the
    JSON independently); helper ports in `rental_data.rs` with
    TS-pinned tests. Worker added `core-rs/rustfmt.toml`
    (struct_lit_width=80) to keep generated rows one-line.
  - **M3b:** `rental_generation.rs` — faithful port incl. the
    curr_species stateful-retry quirk; `fw_generate_initial_rentals`
    LE-buffer boundary (layout doc'd in factory-wasm);
    `core-rs/adapter/factoryEngine.ts` decoder;
    `tests/factoryRentalParity.test.ts` with the FULL 288-config matrix
    (16 seeds × 3 winStreaks × 3 rentsCounts × 2 construction cursors)
    deep-equal on complete results including the draw ledger, plus
    challenge-8 error parity and the seed-0 fixture anchor. **Port
    finding:** TS deliberately throws on challengeNum 7 + better-range
    fixed IV (the documented retail-OOB non-portability boundary,
    factoryRentalGeneration.ts:184); the port mirrors the error and the
    matrix compares errors symmetrically.
  - **M1 (fold fe40ab19):** fw_ ABI v1 surface (fw_abi_version/
    fw_rng_advance/fw_rng_output/fw_alloc/fw_free), `core-rs/build-wasm.sh`
    → `artifacts/wasm/factory_wasm.wasm` (gitignored), hand-written typed
    Node loader `core-rs/adapter/loadFactoryWasm.ts`, smoke
    `core-rs/adapter/smoke.mts` pinning the wasm rng stream to the
    TS-generated values. One in-territory deviation: narrowly-scoped
    `#[allow(clippy::should_implement_trait)]` on `GbaRng::next` (mirrors
    the TS name deliberately).
  - **M2:** engine adapter `core-rs/adapter/rngEngine.ts` (TS default,
    `POKEBENCH_ENGINE=wasm` opt-in) + `tests/rngEngineParity.test.ts` —
    spec conformance parameterized over both engines, 64-seed ×
    1024-step differential sweep, ABI pin. Artifact-absent worktrees skip
    the wasm half (verified 4 passed/69 skipped); opt-in without the
    artifact hard-fails naming build-wasm.sh. No existing TS file
    modified; tsconfig untouched (adapter enters the tsc program via the
    test's import).
- **Did:** **M1 decision — hand-rolled C ABI; wasm-bindgen declined on
  merits, not necessity.** Receipt: network IS available in this session
  (crates.io CDN probe 2026-08-11: HTTP 200, 184,119 bytes for the
  wasm-bindgen 0.2.92 crate download), so the choice was free. Rationale:
  (a) preserves factory-core/factory-wasm's zero-dependency, fully-offline
  build — a property future sandboxed sessions rely on; (b) avoids the
  wasm-bindgen-cli install and its crate↔CLI version-locking; (c) the data
  crossing the boundary is fixed-width GBA-shaped structs (mons, seeds,
  ids), naturally expressed as documented little-endian byte layouts, not
  rich dynamic types; (d) the JS glue is a small hand-written loader we
  own. **Revisit trigger:** if the boundary ever genuinely needs dynamic
  types (strings/maps/callbacks), reopen the decision with wasm-bindgen as
  the candidate — record here first.
  **ABI conventions v1:** all exports prefixed `fw_`; `fw_abi_version()
  -> u32` (starts at 1, bumps on any breaking layout change); scalars
  cross as u32; structured data crosses as caller-allocated
  length-prefixed LE byte buffers via `fw_alloc(len) -> ptr` /
  `fw_free(ptr, len)`; every layout is documented in factory-wasm doc
  comments and mirrored by the TS-side decoder next to the adapter.
- **Next:** M4 expansion, port by family with the harness deciding
  done-ness. The natural candidates (opponent selection in
  `factoryRoundBattleOrchestrator.ts`, anything near
  `factoryConstructionClock.ts`) are ALL #55-adjacent modules the TS
  lane has open — per the sequencing rule they stay unported until TS
  closes and wires the clock. Conflict-free M4 openers to scout next
  session: `factoryDraftStateAdapter`/draft-screen state, swap-flow
  policy (`factory-round-policy.json` roundFlow), or the battle-kernel
  leaf families (type chart, damage stages) after checking ISSUES.md
  afresh. Keep following the M2/M3 pattern: codegen-data step, then
  port+boundary+parity step. **Resolved by user decision 2026-08-11
  (recorded by the planning session): open M4 with the battle-kernel
  leaf family — see the M4 bullet in RUST_SUPERVISOR.md and
  `docs/rust-m4-battle-kernel-scout.md`.**
- **Notes:** clippy/fmt gates are ON as of M1. Session ops findings:
  (1) the shared OFF oracle at :8014 was killed mid-session by a
  process-group sweep (its log ended mid-line at "listening"); restart
  recipe that survives: spawn `run-oracle.sh --profile battle-scene-off`
  via `python3 subprocess.Popen(..., start_new_session=True)` — plain
  nohup+disown from a tool shell did NOT survive. Rust-lane workers
  never query the oracle; it is only a run-subagent launch precondition.
  (2) A failed launch leaves a dead worker worktree + branch — remove
  exactly that timestamped pair before relaunching. (3) TS quirk
  discovered by the M3b port, worth knowing when reading parity output:
  challengeNum 7 + better-range fixed IV deliberately throws in TS
  (documented retail-OOB boundary, factoryRentalGeneration.ts:184); the
  parity matrix compares errors symmetrically there.

## R1 — [solo session, 2026-08-11] **Lane born: scaffold + rng port proven**

- **State:** `core-rs/` exists and is green: cargo workspace,
  `factory-core` (Gen-3 LCG ported from `src/engine/rng.ts`, 4/4 tests),
  `factory-wasm` C-ABI stub, wasm32 release build produced a 448-byte
  artifact. Zero dependencies; builds and tests fully offline. No TS
  file was modified. No supervisor runs have started in this lane yet.
- **Did:** user decisions recorded: repo restructured to
  `pokeemerald-factory-core` (workspace/ layout, warm-bison history
  promoted); Rust chosen for the rewrite; TS stays canonical until the
  user archives it; animation lane continues in TS by explicit decision
  (discovery transfers, see RUST_SUPERVISOR.md). Expected rng values
  were generated from the TS implementation
  (`node --experimental-strip-types` over `src/engine/rng.ts`), not
  hand-computed.
- **Did (addendum):** lane fully wired into the launchers —
  `./run-supervisor.sh -l rust` (persistent `.worktrees/rust-main`
  worktree, branch `rust-main`, OFF oracle only, gate file
  `RUST_DEFERRED.md`) and `./tools/run-subagent.sh --lane rust` (fresh
  `worker/rust-*` worktrees, OFF profile). Verified via `--print-config`
  for rust/animation/bogus on both launchers; the main supervisor's
  prompt now folds `rust-main` at orients alongside `animation-main`.
- **Next:** M1 (boundary decision: wasm-bindgen vs hand-rolled ABI +
  Vite-consumable artifact path), then M2 (vitest engine adapter, rng
  spec running against both engines). See the milestone ladder in
  RUST_SUPERVISOR.md.
- **Notes:** cargo is NOT on the login PATH — use
  `export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH"`;
  `rustup run stable cargo` fails in sandboxed non-interactive shells
  ("could not execute process `rustc -vV`"). wasm32-unknown-unknown
  target is already installed.
