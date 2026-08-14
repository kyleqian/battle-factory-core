# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
