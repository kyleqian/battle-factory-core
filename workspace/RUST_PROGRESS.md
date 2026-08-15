# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R46 — [supervised session, 2026-08-15] **M45 Battle Script Substitute state-construction leaf**

- **State:** `rust-main` = current master `e106866a` plus R43-R45 and verified
  `Cmd_setsubstitute` worker `1d0fb8bc`. The complete pure
  `battleScriptSetsubstituteOpcode.ts` registration/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened. The
  session remains active and committed.
- **Did:** ported attacker-first resolution and exact quarter-HP floor/minimum;
  the failure-only damage-zero/chooser write set; and the success-only attacker
  `STATUS2_SUBSTITUTE` OR + wrapped-mask clear, substitute-HP write, damage and
  chooser overwrite, and ignore-substitute hit-marker OR. HP debit remains
  correctly outside this leaf. Canonical TypeScript execution supplies
  **1,397 complete cases** plus **131,072** boundary applications covering
  every maxHP u16 on both sides of its threshold, normalized to **16,383**
  intervals; the complete **500** selector matrix, **125** missing-attacker
  probes, full-width packed edges, preservation, repetitions, and permissive
  registration are pinned. Corpus sha256
  `8e1e63f440ff847cc2e888805041e378383b726a74ae0f054d1a8df6108b0fd8`.
- **Next:** recheck active work and select another conflict-free pure Battle
  Script leaf. M7c opponent generation still waits on canonical TS live
  generation; main walk-up and animation moving targets remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  dispatch/opcode/macro/script, source masks/messages, later HP-debit ownership,
  validation order and write sets; regenerated twice byte-identically
  (canonical corpus **13,503,050 bytes**; raw threshold evidence **22,048,947
  bytes**, sha256
  `abcd70b385df94da84e99bb005d4a6b03819847adabd3d7bd205a4c263dd2ae8`;
  generated file **26,250,057 bytes**, sha256
  `ca7e45ff14b838f7655e23ddfa080cd041ad57a98c975d68e49ac1f8fd97448b`;
  generator **60,417 bytes**, sha256
  `1dd196eae78453e5d8f9f6a344cd7d6b8b7afd8a5b53a185ed35b237ac652882`),
  and reran focused **6/6**, cargo **958/958**, fmt, strict Clippy, and wasm32
  release. Artifact is **510,306 bytes**, sha256
  `d5d91c5aca162087d2fc1d30989a976411fa785813e503627770bf81d4dd48b1`.
  Latest-master smoke is **375/375** and build is green at **676 modules**.
  Scope stayed inside `core-rs/**`; no unsupported barrier or deferral was
  added. PAPERCUT: fresh worker lacked the ignored WASM artifact and rebuilt it
  before browser parity, ~2 min.

## R45 — [supervised session, 2026-08-14] **M44 Battle Script four-weather setter family**

- **State:** `rust-main` = current master `3c913c8a` plus R43-R44 and verified
  weather worker `d9d0c4ac`. The complete pure
  `battleScriptSetWeatherOpcode.ts` four-opcode registration/state/control
  family is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session remains active and committed.
- **Did:** ported Rain/Sun/Sandstorm/Hail's exact active masks, temporary bits,
  success choosers, same-weather failure OR/chooser/preservation path, and
  success-only full weather-word replacement plus five-turn duration. The
  native factory retains canonical Rain→Sun→Sandstorm→Hail validation order
  and JavaScript dynamic-id collision behavior without inventing dispatcher/id
  predicates. Canonical TypeScript execution supplies **1,788 cases** across
  all **1,024** low-weather-bit cells, **648** timer/chooser edges, **64**
  result-flag edges, high-u32 bits, cross-weather replacement, alternating and
  repeated paths, plus **17** registration cases; corpus sha256
  `7b590b8f3b669c00f943087d24f9618d118ef9d87f75bc202baa0f8f08ab5e03`.
- **Next:** recheck active work and select another conflict-free pure Battle
  Script leaf. M7c opponent generation still waits on canonical TS live
  generation; main and animation moving targets remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited all four decomp
  bodies, dispatch entries, macros, scripts, weather/message constants,
  registration order/collisions, state preservation and sequences;
  regenerated twice byte-identically (canonical corpus **2,086,704 bytes**;
  generated file **3,073,560 bytes**, sha256
  `d7a227d605e64845ff0d6a08b859186f2b6ba27461706d57fab0417cfabd09d1`;
  generator **45,125 bytes**, sha256
  `613cde8f52961fbceee7617c8c3cc40353e117a4c558f3d7b6db0b38ff21b772`),
  and reran focused **5/5**, cargo **948/948**, fmt, strict Clippy, and wasm32
  release. Artifact is **497,795 bytes**, sha256
  `21b35dbdac8b48bcd331a4d119ce77ba8cc7ef5ec927edb1a27315736517cd39`.
  The worker summary's stale **1,173** count was corrected to the generated
  test's actual **1,788** during review. Latest-master smoke is **375/375** and
  build is green at **676 modules**. Scope stayed inside `core-rs/**`; no
  unsupported barrier, deferral, or papercut was added.

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
