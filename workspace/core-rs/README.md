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
- `fw_generate_initial_rentals(rng_value, factory_win_streak, rents_count,
  player_trainer_id, has_construction_rng, construction_rng_value) -> ptr`
  — runs `factory_core::rental_generation::generate_initial_factory_rentals`
  and returns an `fw_alloc`'d buffer: a `u32` total length, a status byte,
  then either a length-prefixed utf8 error message or the fixed-width
  challenge/rentals/ledger payload. The exact byte layout (every field's
  offset and width) is documented in the doc comment directly over the
  export in `crates/factory-wasm/src/lib.rs` — read that comment before
  touching the decoder. `core-rs/adapter/factoryEngine.ts`'s
  `decodeRentalGeneration` mirrors it field-for-field.
- `fw_create_factory_party_member(set_id, personality, fixed_iv,
  ability_slot, ot_id) -> ptr` — runs
  `factory_core::mon_construction::create_factory_corpus_party_member` and
  returns an `fw_alloc`'d buffer in the same total-length/status-byte
  convention: either a length-prefixed utf8 error message or the fixed-width
  91-byte member payload (numeric/enum fields only — names are resolved
  decoder-side). `ability_slot` must be 0 or 1 (see the export's caller
  contract). The exact byte layout is documented in the doc comment directly
  over the export in `crates/factory-wasm/src/lib.rs`;
  `core-rs/adapter/factoryEngine.ts`'s `decodeFactoryPartyMember` mirrors it
  field-for-field.
- `fw_choose_factory_ai_mask_zero_decision(input_ptr, input_len) -> ptr` and
  `fw_choose_factory_ai_scored_decision(input_ptr, input_len) -> ptr` — the
  complete native Factory DecisionPolicy choosers. Their additive ABI-v1
  layouts are documented beside the exports: a 40-byte common prefix plus
  three bytes per authoritative legal decision; scored inputs add a
  turn-start ownership record, two 135-byte presence-preserving battlers,
  and the target-only fields. Outputs retain the full mask/scoring/draw/score/
  tie/submission receipt or an exact UTF-8 error. The decoder in
  `adapter/factoryAiEngine.ts` reconstructs the canonical TypeScript receipt
  strings and routes these methods through WASM when `POKEBENCH_ENGINE=wasm`.
- `fw_get_most_suitable_mon_to_switch_into(input_ptr, input_len) -> ptr` —
  the complete plain-singles selector. Its fixed 114-byte input preserves all
  six bench records and the optional 14-byte damage fallback; its typed output
  distinguishes a concrete index (including the PARTY_SIZE sentinel) from
  `damage-fallback-needed` and bounds errors.
- `fw_evaluate_factory_ai_switch_policy(input_ptr, input_len) -> ptr` — the
  RNG-free precheck and complete trainer-singles policy. Its fixed 401-byte
  input carries all four battlers, six opponent-party records, rule globals,
  RNG before, and optional selector fallback. Its length-prefixed output keeps
  precheck state, typed policy/boundary errors, choice and selected index, RNG
  after, every draw receipt, and every branch receipt. Both switch layouts are
  additive ABI-v1 exports documented field-by-field beside their Rust exports;
  `adapter/factoryAiEngine.ts` genuinely encodes/calls/decodes them in WASM
  mode and uses canonical TypeScript only in default mode.

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

`core-rs/adapter/factoryEngine.ts` follows the same pattern one level up:
`decodeRentalGeneration` turns an `fw_generate_initial_rentals` buffer into
exactly the TS spec engine's `FactoryInitialRentalGenerationResult` shape
(species names resolved from `species_id` via `src/data/gen/species-stats.json`,
ledger entries' phase-dependent fields present-or-absent exactly as the TS
engine produces them), and `wasmFactoryEngine()` wraps it as a
`FactoryEngine`. `tests/factoryRentalParity.test.ts` runs both engines over
a 288-config matrix (16 seeds x 3 `factoryWinStreak` values x 3
`rentsCount` values x 2 `constructionRngValue` values) and asserts full
`toEqual` on the result — including the complete `drawLedger` — or, for the
configs that are genuine TS-engine error states (challenge 7 with a
better-range slot; see `GenerationError::FixedIvUndefined`'s doc comment in
`crates/factory-core/src/rental_generation.rs`), asserts both engines throw
the same message:

```sh
NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryRentalParity.test.ts --no-watch --pool=forks
POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryRentalParity.test.ts --no-watch --pool=forks
```

`core-rs/adapter/factoryEngine.ts` extends the same `FactoryEngine` with
`createFactoryCorpusPartyMember` / `createFactoryCorpusParty`:
`decodeFactoryPartyMember` turns an `fw_create_factory_party_member` buffer
into exactly `createFactoryCorpusPartyMember`'s `FactoryCorpusPartyMemberState`
shape (`src/engine/factoryCorpusParty.ts`) — `speciesName`/`abilityName`/
`natureName`/`itemName`/`holdEffectName` resolved from the same JSONs the TS
engine reads (`species-stats.json`, `ability-item-hooks.json`,
`natures.json`, `battle-frontier-held-items.json`), `gender` from the wasm
export's 3-value byte convention. `tests/factoryPartyMemberParity.test.ts`
runs both engines over the full 882-set Frontier corpus (one `it()` sweeping
every set id, with a per-set personality searched deterministically until
its derived nature matches the set's declared nature — at most 25 steps),
a 72-config variation block (`fixedIv` x `abilitySlot` x `otId` on 6 sets
spanning both branches of the ability-slot rule), 3 error-parity cases (set
id range, nature/personality mismatch, fixed-IV range) asserting identical
thrown messages on both engines, and one `createFactoryCorpusParty` triple:

```sh
NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryPartyMemberParity.test.ts --no-watch --pool=forks
POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryPartyMemberParity.test.ts --no-watch --pool=forks
```

## Data tables

`crates/factory-core/src/gen_tables.rs` is **generated, never hand-edited**.
`tools/gen-data.mjs` (plain Node, no deps) reads the workspace's
`src/data/gen/*.json` extraction tables — frontier rental sets (species,
moves, EV spread), held items, species/ability ids and base stats, moves'
base PP, natures, Level-50 experience, and the Level-50 rental-selection
policy — and emits the minimal Rust tables the initial-rental and
mon-construction ports need, formatted via `rustfmt` (see `rustfmt.toml`'s
`struct_lit_width` bump) so reruns are byte-identical. Regenerate and commit
the diff whenever those JSON sources change:

```sh
node core-rs/tools/gen-data.mjs
```

Tables:

- `FRONTIER_MONS` (882 rows, one per `FRONTIER_MON_*` set): `species_id`,
  `item_table_id`, `nature`, `moves: [u16; 4]` (move ids), and `ev_flags`
  (a bitmask over the set's `F_EV_SPREAD_*` flags; bit0..bit5 = HP, ATTACK,
  DEFENSE, SPEED, SP_ATTACK, SP_DEFENSE — see the struct's doc comment,
  which is the authoritative bit order `derive_evs` mirrors).
- `HELD_ITEM_BY_TABLE_ID` / `HELD_ITEM_HOLD_EFFECT_BY_TABLE_ID` /
  `HELD_ITEM_HOLD_EFFECT_PARAM_BY_TABLE_ID` (63 rows each, dense over
  `itemTableId`): held item id, hold effect id, and hold effect parameter.
- `MOVE_PP` (355 rows, dense over move id): base PP.
- `SPECIES` (376 rows — one per species a `FRONTIER_MONS` set actually
  references, not all 411 `species-stats.json` rows; see the struct's doc
  comment for why — sorted by `species_id`, look up via `species_row`):
  base stats, `gender_ratio`, both `abilities`, and `exp_at_50` (resolved
  through `exp-tables.json`'s growth-rate indirection down to level 50,
  the only level this port crosses).
- `SWITCH_POLICY_SPECIES` (411 rows, the complete extracted species
  universe): numeric type pair and both ability ids used by the native
  `factory_ai_switch_policy` port's source-shaped `speciesTypes` and
  `partyAbility` lookups.
- `NATURE_MODIFIERS` (25 rows, dense over nature index): the five stat
  modifiers as `i8` in `{-1, 0, 1}`.
- `SPECIES_SECOND_ABILITY` / `NUM_NATURES` / `RENTAL_RANGES_LEVEL50` /
  `RENTAL_RANK_THRESHOLDS` / `MAXIMUM_RENTAL_RANK` / `FIXED_IVS` /
  `SPECIES_UNOWN_ID`: unchanged, see the struct/const doc comments.

`crates/factory-core/src/rental_data.rs` holds the pure helpers ported from
`src/engine/factoryRentalGeneration.ts` / `src/engine/opponentGen.ts` that
consume those tables, plus row pins for the tables above; its
`#[cfg(test)]` pins cite the TS fixture or JSON row each expected value
came from. `crates/factory-core/src/stats.rs` and `gender.rs` hold the stat
formulas and gender resolution ported from `src/engine/stats.ts` and
`src/engine/monGender.ts`. `crates/factory-core/src/mon_construction.rs`
holds `is_shiny` / `derive_evs` plus `create_factory_corpus_party_member` /
`create_factory_corpus_party` themselves — the full port of
`src/engine/factoryCorpusParty.ts`'s `createFactoryCorpusPartyMember` /
`createFactoryCorpusParty`, combining those two helpers with `gen_tables`,
`gender`, `rental_data::nature_from_personality`, and `stats`. Its
`PartyMemberError` enum covers the three real caller-reachable throws (set
id range, nature/personality mismatch, fixed-IV range); every other TS throw
in that function is impossible against the generated `gen_tables` (species/
move/item/ability lookups always resolve) and uses `.expect()` instead,
mirroring `rental_generation.rs`'s `GenerationError` doc comment.

`crates/factory-core/src/factory_ai_switch_policy.rs` is the complete pure
trainer-singles `ShouldSwitch` decision and retained trace surface, including
its RNG-free precheck and final controller-ready party index. It delegates the
Perish Song sentinel to `battle_ai_switch_into.rs`; the WASM boundary and
adapter are intentionally deferred to a separate step. Its checked-in corpus
is regenerated by `tools/gen-factory-ai-switch-policy-vectors.mjs`, which
executes canonical TypeScript and compares the entire result shape.

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
