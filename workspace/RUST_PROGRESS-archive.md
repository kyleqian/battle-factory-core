# Rust lane progress archive

Older entries moved out of `RUST_PROGRESS.md` (newest first). Git keeps the
full history regardless.

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
