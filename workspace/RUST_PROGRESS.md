# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R48 — [supervised session, 2026-08-15] **M47 Battle Script Pain Split leaf + final wind-down**

- **State:** `rust-main` = current master `d23e6e3a` plus verified Pain Split
  worker `4aa27ce8` and metadata-ratchet repair `d69b464d`. The complete pure
  `battleScriptPainSplitOpcode.ts` registration/state/control projection is
  native and wasm32-compilable; no ABI or adapter surface was widened. The
  session ends committed and green.
- **Did:** ported exact singleton registration and instruction-shape checks,
  instruction-before-attacker-before-target error order, target-Substitute
  no-write failure with late label resolution, and the successful u16 HP
  average. Success writes only `painSplitHp = targetHP - average`,
  `battleMoveDamage = attackerHP - average`, and target
  `specialStatus.shellBellDmg = 0xffff`. Canonical TypeScript execution
  supplies **922 cases**: the complete **625** optional-selector matrix,
  **196** endpoint/parity/sign arithmetic pairs, packed Substitute edges,
  ordered errors, full signed scratch/status siblings, repetitions, and
  **13** exact registration cases. Corpus sha256
  `636cff5a1ac7934a7e9aea36eabe93d69092a54648665dfc5791d91f03dc8f3a`.
- **Next:** at the next session, merge current master, recheck active work, and
  select another conflict-free pure Battle Script leaf. M7c opponent
  generation still waits on canonical TS live generation; main walk-up and
  animation moving targets remain excluded.
- **Notes:** Terra/max implementation worker plus one Sol/high audit-repair
  commit. Supervisor found and closed the initially missing independent corpus
  metadata ratchet, audited decomp/dispatch/macro/single script site, widths,
  shape and role ordering, substitute write set, signed averaging, sibling
  preservation, and repetitions; regenerated twice byte-identically
  (canonical corpus **5,351,849 bytes**; generated file **12,583,953 bytes**,
  sha256
  `beaff9112bc43ec7f0821bc0c3eee40c4b72dea9391d1c9755ebbdc61771f1fb`;
  generator **50,220 bytes**, sha256
  `585a963bbb61adc0cce3c0879ecda9c64af15b176b7cfc1ae73cdb1480468aef`).
  Final cargo is **973/973**, fmt and strict Clippy pass, and wasm32 release is
  **497,717 bytes**, sha256
  `e9f227f2162fddfc8592cff07629856837ce5661f4f6efe5e3dc90c400a20c37`.
  Final npm is green at **1,029 files / 9,870 passed / 223 skipped**; build is
  green at **677 modules**. Wind-down soaks are vanilla **20/20 OK** and full
  policy **60/60 OK**, both with zero crashes and zero hangs. Scope stayed
  inside `core-rs/**`; no unsupported barrier or Rust deferral was added.

## R47 — [supervised session, 2026-08-15] **M46 Battle Script half-health heal setup leaf**

- **State:** `rust-main` = current master `2d2c2c81` plus R43-R46 and verified
  `Cmd_tryhealhalfhealth` worker `341caa2b`. The complete pure
  `battleScriptTryhealhalfhealthOpcode.ts` registration/state/control
  projection is native and wasm32-compilable; no ABI or adapter surface was
  widened. The session remains active and committed.
- **Did:** ported operand-before-role selection, `BS_ATTACKER` target rebinding
  versus `BS_TARGET` preservation, exact `-max(1, floor(maxHP / 2))` damage,
  the exact `hp == maxHP` failure branch, and failure-only late label
  resolution. Canonical TypeScript execution supplies **1,810 complete cases**
  plus **196,606** applications spanning every maxHP u16 at full, lower, and
  corrupt-higher HP where representable, normalized to **32,769** intervals;
  both concrete call sites, the two complete **500** selector matrices,
  ordered errors, signed prior damage, preservation, repetitions, and
  permissive first-match registration are pinned. Corpus sha256
  `7df2575257c50006c5afc225062d834fe6f0ad6399e71bb92dd0c69564ce2fc5`.
- **Next:** recheck active work and select another conflict-free pure Battle
  Script leaf. M7c opponent generation still waits on canonical TS live
  generation; main walk-up and animation moving targets remain excluded.
- **Notes:** Terra/max worker, one commit. Supervisor audited the decomp,
  dispatch/opcode/macro and both script sites, source widths, validation order,
  target rebinding, exact equality branch, immutable siblings and repetitions;
  regenerated twice byte-identically (canonical corpus **12,548,796 bytes**;
  raw exhaustive evidence **4,881,873 bytes**, sha256
  `abcd6a03d79e5807726f678894121524f2efebfbb25a74e12bd5af4cb5824ff8`;
  generated file **14,585,217 bytes**, sha256
  `c8adefff849e6862ad7784510a4c71556c9adee293b7c0511fe277ef15d4e32e`;
  generator **67,530 bytes**, sha256
  `f3c27decf00ae9aecd598e8ef79e800bfbde216354514ff1aad61b6eb77b96cf`),
  and reran focused **7/7**, cargo **969/969**, fmt, strict Clippy, and wasm32
  release. Artifact is **510,202 bytes**, sha256
  `b9c87f425837a9e0744f69acee78dabd0ff37029faf803d41582a7621d302718`.
  Latest-master smoke is **375/375** and build is green at **676 modules**.
  Scope stayed inside `core-rs/**`; no unsupported barrier, deferral, or
  papercut was added.

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
