# core-rs — the Rust/WASM rewrite

A Rust port of the deterministic engine core, compiled to WASM for the
browser. The TypeScript engine in `../src/` is the working, test-pinned
implementation and stays canonical until the user archives it; this
workspace exists to replace it *without ever being wrong where TS is
right*.

## Layout

```
core-rs/
├── Cargo.toml               cargo workspace
└── crates/
    ├── factory-core/        pure engine logic — no I/O, no deps
    └── factory-wasm/        thin WASM boundary over factory-core
```

## Building (cargo is not on the login PATH on this machine)

```sh
export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH"
cargo test                                                    # native tests
cargo build -p factory-wasm --target wasm32-unknown-unknown --release
# → target/wasm32-unknown-unknown/release/factory_wasm.wasm
```

`rustup run stable cargo` also works in interactive shells but fails to
propagate PATH in some non-interactive/sandboxed shells — prefer the
explicit PATH form in scripts.

## Boundary (ABI v1)

`factory-wasm` exposes a hand-rolled C ABI, zero dependencies (decision
recorded in `../RUST_PROGRESS.md` R2). Every export is prefixed `fw_`,
scalars cross as `u32`, and structured data (future milestones) crosses
as caller-allocated length-prefixed little-endian byte buffers via
`fw_alloc`/`fw_free`.

Current exports:

- `fw_abi_version() -> u32` — the ABI version this build implements (1).
- `fw_rng_advance(rng_value: u32) -> u32` — one Gen-3 LCG step.
- `fw_rng_output(rng_value: u32) -> u32` — `Random()`'s u16 output for an
  already-advanced `rng_value` (upper 16 bits).
- `fw_alloc(len: u32) -> ptr` / `fw_free(ptr, len: u32)` — caller-allocated
  buffers in linear memory; see the doc comments in
  `crates/factory-wasm/src/lib.rs` for the exact safety contract.

Build the artifact with `./build-wasm.sh` (from `core-rs/`, or any cwd —
it resolves its own directory). It writes
`<workspace-root>/artifacts/wasm/factory_wasm.wasm` (gitignored) and
prints the byte size and sha256.

Smoke-test the boundary end to end (ABI version, RNG passthrough against
the TS-pinned stream, alloc/free roundtrip) via the hand-written Node ESM
loader in `adapter/`:

```sh
node --experimental-strip-types adapter/smoke.mts   # from core-rs/
# or: node --experimental-strip-types core-rs/adapter/smoke.mts   # from the workspace root
```

## Differential harness

`adapter/rngEngine.ts` wraps both the TS spec engine (`../src/engine/rng.ts`
+ `../src/engine/opponentGen.ts`) and the factory-wasm boundary behind one
`RngEngine` interface, so `../tests/rngEngineParity.test.ts` can run
identical logic against each and assert they agree — not just that either
one individually looks right.

Engine selection is the `POKEBENCH_ENGINE` env var (read by
`defaultEngineId()`):

- unset or `ts` — the TS engine only. This is the default; the parity
  file's TS-side assertions always run and never require the wasm
  artifact.
- `wasm` — opts into the factory-wasm engine. **If the artifact is
  missing, this is a hard failure** (an error naming `build-wasm.sh`), not
  a skip — asking for wasm and silently not getting it would hide a real
  gap.
- Any other value throws.

Independent of that opt-in, the parity file also probes whether the wasm
artifact exists at all (same path resolution `loadFactoryWasm.ts` uses).
If it's simply absent (e.g. an untouched worktree that hasn't run
`build-wasm.sh`) and `POKEBENCH_ENGINE` wasn't set to `wasm`, the
wasm-dependent suites are skipped via `describe.skipIf` and the file stays
green — only the TS half runs.

```sh
./core-rs/build-wasm.sh

# TS engine only (default) — wasm half runs iff the artifact already exists,
# skips (green) otherwise:
NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/rngEngineParity.test.ts --no-watch --pool=forks

# Opt into wasm explicitly — fails loudly if the artifact is missing:
POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/rngEngineParity.test.ts --no-watch --pool=forks
```

## Data tables

`crates/factory-core/src/gen_tables.rs` is **generated, never hand-edited**.
`tools/gen-data.mjs` (plain Node, no deps) reads the workspace's
`src/data/gen/*.json` extraction tables — frontier rental sets, held items,
species/ability ids, natures, and the Level-50 rental-selection policy — and
emits the minimal Rust tables the initial-rental port needs, formatted via
`rustfmt` (see `rustfmt.toml`'s `struct_lit_width` bump) so reruns are
byte-identical. Regenerate and commit the diff whenever those JSON sources
change:

```sh
node core-rs/tools/gen-data.mjs
```

`crates/factory-core/src/rental_data.rs` holds the pure helpers ported from
`src/engine/factoryRentalGeneration.ts` / `src/engine/opponentGen.ts` that
consume those tables; its `#[cfg(test)]` pins cite the TS fixture or JSON
row each expected value came from.

## Ground rules

- **The vitest suite is the spec gate.** A module counts as ported when
  the existing TS-side fixtures/tests pass against the WASM build through
  the (future) engine adapter — not when it "looks right."
- **Expected values come from the TS engine or its pinned fixtures**,
  generated and cited in the test (see `factory-core/src/rng.rs`), never
  hand-computed.
- **Zero runtime dependencies** in factory-core; any addition needs a
  written justification in `../RUST_PROGRESS.md`.
- **Thin boundary**: logic never lives in factory-wasm.
- See `../RUST_SUPERVISOR.md` for lane scope, milestones, and the
  do-not-touch list while TypeScript lanes are still in flight.
