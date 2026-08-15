# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R44 — [supervised session, 2026-08-14] **M43 Battle Script Fury Cutter counter/power leaf**

- **State:** `rust-main` = current master `b4097e84` plus R43 and verified
  `Cmd_furycuttercalc` worker `81f7817d`. The complete pure
  `battleScriptFuryCutterOpcode.ts` registration/state/control projection is
  native and wasm32-compilable; no ABI, adapter, or animation surface was
  widened. The session remains active and committed.
- **Did:** ported attacker-first resolution; the full-u32 no-effect-mask miss
  branch that resets only the attacker counter and jumps after late label
  resolution; and the success branch's exact counter-5 fixed point, wrapping
  u8 increment, source-u16 power assignment, wrapping doublings, overwrite,
  and Advance control. Canonical TypeScript execution supplies **2,278 cases**:
  every counter u8 for all attackers (**1,024**), the full **500** selector
  matrix, **357** power/doubling cases, **104** mask edges, **68** miss resets,
  **125** ordered missing-attacker probes, unresolved-label cases, registration
  shape/cardinality, immutable siblings, and repeated paths; corpus sha256
  `5f73545665073ab151ebd3c4d55d558e80916473d6eff98a190ea7e56a341c34`.
- **Next:** fold any newer master, recheck active work, and select another
  conflict-free pure Battle Script leaf. M7c opponent generation still waits
  on canonical TS live generation; main and animation moving targets remain
  excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  dispatch table, opcode/macro and script loop, mask/counter/power widths,
  validation and label order, preservation and repetition; regenerated twice
  byte-identically (canonical corpus **6,068,742 bytes**; generated file
  **16,336,817 bytes**, sha256
  `834df15407dc13cf3a913f4ba650efe9c003910aea0da30541547c2ffe4c42ee`;
  generator **53,855 bytes**, sha256
  `36a22601be63b1bf07698c50cb88b40fa74787390048b1f418479a4fd6afa743`),
  and reran focused **6/6**, cargo **940/940**, fmt, strict Clippy, and wasm32
  release. Artifact is **497,814 bytes**, sha256
  `ddce90064ded1e9ef29ad27f1e44ba4f14331bb25ad7c54ff0579652013a0242`.
  Scope stayed inside `core-rs/**`; no unsupported barrier, deferral, or
  papercut was added.

## R43 — [supervised session, 2026-08-14] **M42 Battle Script Return/Frustration friendship-power leaf**

- **State:** `rust-main` = current master `b4097e84` plus verified
  `Cmd_friendshiptodamagecalculation` worker `9e69bb13`. The complete pure
  `battleScriptFriendshipToDamageOpcode.ts` registration/scalar/state/control
  projection is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session remains active and committed.
- **Did:** ported exact Return `(10 * friendship) / 25` and Frustration
  `(10 * (255 - friendship)) / 25` integer arithmetic, attacker-first
  resolution, friendship-before-effect validation, dynamic-power-only
  overwrite, immutable siblings, and unconditional Advance control. Canonical
  TypeScript execution supplies **1,437 cases** across both effects and every
  friendship u8 (**512**), the complete **500** selector-role matrix, prior
  u16 dynamic-power edges, malformed-number and unreachable-effect ordering,
  **125** missing-attacker probes, registration shape/cardinality, and
  repetitions; corpus sha256
  `458a2c01c29322f17bee7ad9bb3d6f478c77a722e87aed272737d328c357dbaa`.
- **Next:** recheck active work, then select another conflict-free pure Battle
  Script leaf. M7c opponent generation still waits on canonical TS live
  generation; main-owned `openpartyscreen` and presentation work stay excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  dispatch table, opcode/macro, aliased Return/Frustration site, validation
  order, arithmetic, state preservation and repetition; regenerated twice
  byte-identically (canonical corpus **878,850 bytes**; generated file
  **2,153,463 bytes**, sha256
  `030abe9b342997e0540f56d04e232fc181e34da0ef5e1faad4d1f9723149394f`;
  generator **37,249 bytes**, sha256
  `3318803cd374a4b2a791f6fed40f2ecd7c0c1395723f3bec13f983da9541300e`),
  and reran focused **6/6**, cargo **929/929**, fmt, strict Clippy, and wasm32
  release. Artifact is **508,338 bytes**, sha256
  `65e90d675fb5f0b38778124b6be2439b3256b643018b172e7120014ee18d74b1`.
  Scope stayed inside `core-rs/**`; no unsupported barrier or Rust deferral was
  added. PAPERCUT: fresh worker lacked the gitignored WASM artifact and had to
  rebuild it before adapter parity, ~2 min.

## R42 — [supervised session, 2026-08-14] **M41 Battle Script Flail/Reversal HP-power leaf + final wind-down**

- **State:** `rust-main` = current master `e9b256c2` plus verified
  `Cmd_remaininghptopower` worker `49e74474`. The complete pure
  `battleScriptRemainingHpToPowerOpcode.ts` scalar/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened. The
  session ends committed and green.
- **Did:** ported the source `GetScaledHPFraction(hp, maxHP, 48)` floor and
  living-minimum correction, all six inclusive Flail/Reversal power bands,
  attacker-first resolution, dynamic-power-only overwrite, immutable siblings,
  and unconditional Advance control. Canonical TypeScript execution supplies
  **888 cases** across every exact scaled fraction 0–48, **100** varied-maxHP
  threshold pairs, the complete **500** selector-role matrix, prior u16 dynamic
  power edges, HP zero/living-min/full boundaries, all aliases, **125** ordered
  missing-attacker probes, and repetitions; corpus sha256
  `d6c872d3676d7029e4cb8a6448b77b6ce8d2a36b799af3fc3ed9f4956bb531fa`.
- **Next:** select the next conflict-free pure Battle Script leaf after a fresh
  master orient and active-work conflict check. M7c opponent generation still
  waits on canonical TS live generation; keep moving targets excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the source helper,
  table, opcode/dispatch, macro and shared Flail/Reversal effect site, u16/u32
  arithmetic, thresholds, role ordering, state preservation and repetition;
  regenerated twice byte-identically (canonical corpus **404,901 bytes**;
  generated file **1,142,734 bytes**, sha256
  `e7d933f56944aa60db37f53153c846adf509464a53cdd4363137414fba1c050a`;
  generator **28,427 bytes**, sha256
  `a137c6485b305f3df8a79490912b6d0e58b3423701a6df8fceaa3c911689e0b4`),
  and reran focused **6/6**, cargo **920/920**, fmt, strict Clippy, and wasm32
  release. Final artifact is **509,811 bytes**, sha256
  `5ed2c97a0f28c304ea43dde9dc5b39be53210365eb86bbe33f9832b546f12c0c`.
  Full npm is green at **1,024 files / 9,833 passed / 224 skipped** and build
  is green at **675 modules**. Wind-down soaks: vanilla **20/20 OK**; full
  policy **50/60 OK, 9 CRASH, 1 HANG**, exactly the main ledger's open #89
  Baton Pass nine-seed set and #90 seed-51 presentation hang. Scope stayed
  inside `core-rs/**`; no unsupported barrier or Rust deferral was added.
  PAPERCUT: fresh worker reported Cargo's fmt subcommand unavailable despite a
  direct rustfmt installation, ~1 min.
