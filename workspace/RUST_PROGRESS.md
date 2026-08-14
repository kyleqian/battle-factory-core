# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
