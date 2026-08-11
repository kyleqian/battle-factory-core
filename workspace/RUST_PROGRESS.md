# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R2 — [supervised session, 2026-08-11] **M1 decision: hand-rolled C ABI (in progress)**

- **State:** master merged into rust-main; baseline green (cargo test 4/4,
  wasm32 release build 448 B). M1 boundary decision RECORDED (below);
  implementation dispatching to a rust-lane worker.
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
- **Next:** M1 implementation (fw_ surface + `core-rs/build-wasm.sh` →
  `artifacts/wasm/` gitignored + hand-written Node loader + smoke vs
  TS-pinned rng values), then M2 (vitest adapter, rng spec differential).
- **Notes:** clippy/fmt gates turn on with this step per
  RUST_SUPERVISOR.md. TS lane's open #55 construction-clock work noted for
  M3 sequencing (no porting what it wires into until TS closes it).

---

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
