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
- `fw_select_factory_trainer(input_ptr, input_len) -> ptr` and
  `fw_generate_factory_trainer_schedule(input_ptr, input_len) -> ptr` — the
  default-Gen-3-RNG single selection and seven-trainer schedule. Selection
  uses a 28-byte prefix plus one `f64` per history member; schedule uses a
  fixed 16-byte input. IEEE-754 input slots preserve the complete JS Number
  validation domain and history values, while typed errors, every accepted
  and rejected draw, range metadata, final RNG, counts, and final-history
  omission cross in length-prefixed outputs. Exact layouts and error codes
  are documented beside the Rust exports; `adapter/factoryTrainerScheduleEngine.ts`
  calls them directly in WASM mode with no TypeScript fallback.
- `fw_apply_factory_ai_battle_history_operation(input_ptr, input_len) -> ptr`
  — the pure create/record-ability/record-item/sync history leaf. Its
  variable-width operation packet and result use IEEE-754 `f64` for every JS
  Number, preserving NaN/SameValueZero and unvalidated historical payloads;
  history move rows and UTF-8 ability names are length-prefixed. Canonical
  unknown-ability errors and malformed wire packets have distinct statuses.
  The complete byte layout is documented beside the Rust export and mirrored
  by `adapter/factoryAiBattleHistoryEngine.ts`; forced WASM mode invokes that
  export directly.
- `fw_apply_factory_swap_operation(input_ptr, input_len) -> ptr` — the
  complete pure Factory-swap state, mutation, cursor, decision, and six-input
  reducer surface. Its additive ABI-v1 packet starts with
  `version:u8=1,operation:u8`: create is followed by three player mons, three
  enemy mons, and six rentals; every other operation carries the full
  source-shaped state and only its exact operation suffix. Mon strings are
  UTF-8 `u32` byte-length-prefixed values, and optional party selections,
  quit phase, and script result retain explicit presence tags, including the
  duplicate check's absent enemy index (canonical default-to-cursor case).
  Status 0 returns a complete state, bool, or typed null/accept/decline
  decision; status 1 carries one of the two exact native semantic errors;
  status 2 is reserved for checked structural failures. The decoder validates
  version, operation/phase/status/input tags, cursor domains, lengths, UTF-8,
  suffix shape, and full consumption before semantic execution. The complete
  field-level layout is documented beside the export and mirrored by
  `adapter/factorySwapEngine.ts`, which calls it directly in forced WASM mode
  with no TypeScript fallback.
- `fw_apply_factory_draft_selection_operation(input_ptr, input_len) -> ptr` —
  all 12 presentation-free rental-draft helpers behind one checked additive
  ABI-v1 operation packet. It preserves six projection inputs, exact
  pick-routing errors, UTF-8 species/redraw messages, and optional `otId`
  presence (including present zero). Its full layout is below and beside the
  Rust export; `adapter/factoryDraftSelectionEngine.ts` directly invokes it in
  forced WASM mode with no TypeScript fallback.
- `fw_apply_key_repeat_operation(input_ptr, input_len) -> ptr` — the complete
  pure `keyRepeat.ts` surface (`INITIAL_KEY_REPEAT_STATE`, `readKeys`, and
  `hasButton`) behind one checked additive ABI-v1 packet. Ten canonical GBA
  buttons cross as validated low-ten-bit `u16` masks; the shared repeat
  counter is constrained to its reachable `1..=40` state domain. Its full
  layout is below and beside the Rust export; `adapter/keyRepeatEngine.ts`
  invokes it directly in forced WASM mode with no TypeScript fallback.

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

## Factory draft-selection WASM boundary (M10c)

`fw_apply_factory_draft_selection_operation(input_ptr,input_len)` accepts an
exact-width variable little-endian packet beginning `version:u8=1,operation:u8`.
Operation tags 0 through 11 are, in order, `selectMonMessage`, `applySelect`,
`applyDeselect`, `isMonsConfirmed`, `chosenMonSpecies`,
`selectedRentalParty`, `cursorMoveStallsBalls`, `moveCursor`,
`moveMenuCursor`, `advanceCursorRedraw`, `advanceMenuHighlightRedraw`, and
`advanceRentConfirmRedraw`. Their exact suffixes are:

```text
0,3: selecting_mons_state:u8
1,2: selected_ids:u8[6],selecting_mons_state:u8,slot_index:u8
4:   selected_ids:u8[6],species:string[6]
5:   selected_ids:u8[6],rentals:rental[6]
6:   entering_species:string
7,8: cursor:u8,direction:u8 (0=forward,1=backward)
9:   presence:u8,[from_cursor:u8,elapsed:u8,fast:u8]
10:  presence:u8,[from_menu:u8,elapsed:u8]
11:  presence:u8,[from_message:string,from_selected:u8,elapsed:u8]

string = byte_len:u32,utf8[byte_len]
rental = set_id:u32,personality:u32,fixed_iv:u32,ability_slot:u8,
         ot_id_presence:u8,[ot_id:u32]
```

All booleans and presence tags are exactly 0/1; direction, controller ranks,
states, slots/cursors, redraw elapsed values, UTF-8, lengths, operation suffix,
and final consumption are checked before any helper executes. Projection rank
cells retain the full `u8` domain so `selectedRentalParty` invalid/duplicate/
missing-rank failures remain semantic rather than structural.

Results begin `total_len:u32,status:u8`. Status 0 adds `value_kind:u8`:
0=string, 1=selection change (`selected_ids:u8[6],state:u8`), 2=bool,
3=species (`count:u8,string[count]`), 4=three full rental records, 5=cursor,
6=optional cursor redraw, 7=optional menu redraw, and 8=optional rent-confirm
redraw. Status 1 carries `message:string` for the exact native routing error;
status 2 carries the single stable malformed-packet message. The returned
buffer is freed with its exact `(ptr,total_len)` pair.

## Key-repeat WASM boundary (M11)

`fw_apply_key_repeat_operation(input_ptr,input_len)` accepts a checked
little-endian additive ABI-v1 packet beginning `version:u8=1,operation:u8`.
The three operations are:

```text
0 readKeys:  buttons:u16, previous_held_keys_raw:u16, previous_counter:u8
1 hasButton: keys:u16, button:u8
2 initial:   no suffix
```

Mask bits follow `src/input.ts`'s canonical `GBA_BUTTONS` order: bit 0=A,
1=B, 2=SELECT, 3=START, 4=RIGHT, 5=LEFT, 6=UP, 7=DOWN, 8=R, 9=L. Thus only
`0x0000..0x03ff` are valid masks; any high `u16` bit is a structural error.
`previous_counter` is intentionally not a loose JavaScript number: only the
reachable native controller range `1..=40` is accepted (initial is 40; a
firing value of 1 stores continue delay 5 instead of zero). `button` is the
same canonical index 0..=9. Version, operation, masks, counter, button,
truncation, append/suffix shape, and final consumption all validate before a
pure helper runs.

Results begin `total_len:u32,status:u8`. Status 0 adds `value_kind:u8`:

```text
0 readKeys: new_keys:u16, new_and_repeated_keys:u16,
            next_held_keys_raw:u16, next_counter:u8
1 hasButton: value:u8 (exactly 0 or 1)
2 initial:  held_keys_raw:u16, counter:u8
```

Status 2 carries `message_len:u32,message:utf8` and is the sole stable
malformed-packet response; this pure surface has no semantic-error status.
The caller frees the result using the returned `(ptr,total_len)` pair.

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

## Factory trainer schedule (M7a/M7b)

`crates/factory-core/src/factory_trainer_schedule.rs` is the native port
of `src/engine/factoryTrainerSchedule.ts`: its injected RNG port retains every
candidate attempt, its ledger is complete, and the final battle deliberately
leaves trainer history unchanged. M7b exposes only its production default-GBA
wrappers through the ABI; the injected scripted port stays native test
infrastructure.

The trainer normal/hard ranges, final-battle index, post-challenge clamp, and
history policy are generated into `gen_tables.rs` from
`src/data/gen/factory-round-policy.json`; do not hand-copy these constants.
The full TS-executed differential corpus is generated separately and compares
every serialized result/error text plus a category census:

```sh
node core-rs/tools/gen-data.mjs
node --experimental-strip-types core-rs/tools/gen-factory-trainer-schedule-vectors.mjs
shasum -a 256 core-rs/crates/factory-core/src/gen_tables.rs \
  core-rs/crates/factory-core/src/factory_trainer_schedule_vectors_gen.rs
```

At M7a landing, the generated data digest is
`ce55325080c072381cb0139105845a3dc7b91869489265954de2b0b03d400ce8`; the
69-case vector corpus digest is
`de321b7cd478549a104bdc7fb1acc9aacbdcade8b24a556b4432e53337b520e6`.
The corpus ratchets 16 normal-range endpoints, 16 hard-range endpoints, nine
streak boundaries, three retry cases, two history cases, 12 complete schedules,
and 11 error vectors spanning six error classes.

`tests/factoryTrainerScheduleParity.test.ts` deep-compares complete selection
and schedule objects in both adapter modes over focused range/clamp/history
cases plus deterministic sweeps. Seed 31 is a real GBA retry receipt (two
rejections); the test also ratchets both range kinds, both accepted/rejected
ledger outcomes, every production-reachable input error, and malformed binary
lengths.

## Factory AI battle history (M8a/M8b)

`crates/factory-core/src/factory_ai_battle_history.rs` is the intentionally
standalone pure port of the history leaf in `src/engine/factoryAiLiveDriver.ts`:
creation, explicit ability/item records, party-change clearing, target move
recording, and observed-fact overlays. Its `FactoryAiBattleHistoryLiveInput`
contains only four party indexes, the target last move, four observed ability
ids, and four observed item effects. It does not build a live AI view, submit a
decision or own the construction clock. M8b exposes only these four history
operations through the additive ABI-v1 packet documented above; live-view
construction remains separate.

Ability-id resolution comes from the full generated 78-row
`ABILITY_NAME_BY_ID` table in `gen_tables.rs`, sourced from canonical
`src/data/gen/ability-item-hooks.json`; do not hand-copy ability symbols. The
TS-executed corpus covers creation, explicit record writes over all four slots,
move NONE/new/duplicate/cap behavior, party changes, retained item history,
overlay ordering, exact unknown-ability errors, and unvalidated historical
number/string payloads. Its category census is 15 cases: create=1, record=1,
target-move=5, party-change=2, observations=2, unknown-ability=3, and
arbitrary-history=1.

Regenerate both relevant checked-in artifacts, then hash them:

```sh
node core-rs/tools/gen-data.mjs
node --experimental-strip-types core-rs/tools/gen-factory-ai-battle-history-vectors.mjs
shasum -a 256 core-rs/crates/factory-core/src/gen_tables.rs \
  core-rs/crates/factory-core/src/factory_ai_battle_history_vectors_gen.rs
```

At M8a landing, the generated data digest is
`19d8dc6a9e7a40600454be12d59167d228d3434d2ce8713116c4ab2f7c6dbac5` and the
15-case corpus digest is
`abc612fc71cb4f469f99e3138e0f8dd495372a0831eeb216c97080e5578e00a4`. Both
generators validate their source/case shapes and are rerun twice for byte
identity before committing.

## Factory AI live-view projections (M8c)

M8c's `currentWeather(weather)` and `statStages(battler)` leaves in
`crates/factory-core/src/factory_ai_live_view.rs` remain independently tested
and are reused by M8d below. Weather keeps the canonical Sun → Rain →
Sandstorm → Hail precedence and JavaScript bitwise `ToInt32` semantics over
the helper's `number` input; no weather is `None`. The raw weather masks cite
`reference/pokeemerald/include/constants/battle.h:232-243`; returned values
are the `AI_WEATHER_*` encoding cited in
`src/engine/factoryAiCheckBadMove.ts:138-152`. Stat stages project exactly
slots 1 through 7 as `{ atk, def, speed, spAtk, spDef, acc, evasion }`.

The 25-case TypeScript-executed corpus includes every raw weather family,
overlap precedence, non-finite/fractional/wrapped-number bitwise inputs, and
distinct/signed-extreme stage rows for both attacker and target. Regenerate
twice for byte identity:

```sh
node --experimental-strip-types core-rs/tools/gen-factory-ai-live-view-vectors.mjs
shasum -a 256 core-rs/crates/factory-core/src/factory_ai_live_view_vectors_gen.rs
node --experimental-strip-types core-rs/tools/gen-factory-ai-live-view-vectors.mjs
shasum -a 256 core-rs/crates/factory-core/src/factory_ai_live_view_vectors_gen.rs
```

## Factory AI live-view constructor (M8d)

`create_factory_ai_view_from_live_rules` is the complete source-shaped native
port of `createFactoryAiViewFromLiveRules` (`factoryAiLiveDriver.ts:277-411`).
It reuses M8a history and M8c weather/stage leaves, preserves raw Number
values, ability-name errors, nullable history fields, and optional-property
presence; it has no WASM export or adapter yet. The TS-executed corpus has
**17 cases**: baseline=1, attacker-fields=1, target-fields=2,
history-projection=2, stat-stages=1, numeric-coercion=1, weather=5,
challenge=2, ability-error=2. Its generated Rust digest is
`8020bcd29c0e9dc6fd48da3ff008ebbdf3dd3e8d4375fd7da246448a4e2d6186`.

```sh
node --experimental-strip-types core-rs/tools/gen-factory-ai-live-view-constructor-vectors.mjs
shasum -a 256 core-rs/crates/factory-core/src/factory_ai_live_view_constructor_vectors_gen.rs
node --experimental-strip-types core-rs/tools/gen-factory-ai-live-view-constructor-vectors.mjs
shasum -a 256 core-rs/crates/factory-core/src/factory_ai_live_view_constructor_vectors_gen.rs
```

## Factory AI live-view WASM boundary (M8e)

`fw_create_factory_ai_view_from_live_rules(input_ptr, input_len)` and
`adapter/factoryAiLiveViewEngine.ts` expose the M8d constructor without
executing a decision or changing history. The input is a caller-allocated,
variable-width little-endian packet; `input_len` is its exact width (there is
no second input prefix). `string` means `byte_len:u32` followed by UTF-8, and
every JavaScript `number` is an IEEE-754 `f64`, including NaN, signed zero,
infinities, and arbitrary history values. The exact input order is:

```text
for battler in rules.battlers[4]:
  types:string[2], attack:f64, defense:f64, sp_attack:f64,
  sp_defense:f64, speed:f64, level:f64, stat_stages:f64[8],
  is_first_turn:f64, hp:f64, max_hp:f64, ability:f64,
  status1:f64, status2:f64, status3:f64, protect_uses:f64,
  taunt_timer:f64, species:f64, moves:f64[4]
rules.weather:f64, side_statuses:f64[2], last_moves:f64[4]
history.used_moves[4]: move_count:u32, moves:f64[move_count]
history.known_abilities[4]: present:u8 (0/1), [if 1] string
history.known_item_effects:f64[4], history.party_indexes:f64[4]
challenge.factory_win_streak:f64, trainer_opponent_id:f64,
challenge.battle_turn_count:present:u8 (0/1), [if 1] f64
```

The returned `fw_alloc` buffer is `total_len:u32,status:u8`; the caller frees
the exact `(ptr,total_len)` pair. Status `0` is the complete view in this
order: `schema:string, mode:string, active.ai_battler:f64,
active.target_battler:f64, factory.level_mode:f64, factory.battle_mode:f64,
factory_win_streak:f64, trainer_opponent_id:f64, moves:f64[4], attacker,
target`. Status `1` is `message_len:u32,message:utf8` for the typed unknown
ability error and preserves the canonical message exactly. Status `2` uses the
same message layout for checked malformed packets. The attacker and target
field order is:

```text
attacker:
  types:string[2], attack:f64, defense:f64, sp_attack:f64,
  sp_defense:f64, speed:f64, level:f64, stat_stages:f64[7]
    (atk,def,speed,sp_atk,sp_def,acc,evasion),
  is_first_turn:f64, hp:f64, max_hp:f64, ability:string,
  battle_turn_count:f64, light_screen_up:u8, reflect_up:u8,
  current_weather:present:u8, [if 1] weather:u8, is_rooted:u8,
  each optional bool in source order as present:u8,[if 1] value:u8:
    attacker_future_attack_up, is_infatuated, safeguard_up, is_asleep,
    has_curable_status, has_substitute, has_focus_energy, is_leech_seeded,
    has_yawn,
  protect_uses:present:u8, [if 1] f64
target:
  species:f64, types:string[2], attack:f64, defense:f64, sp_attack:f64,
  sp_defense:f64, speed:f64, level:f64, stat_stages:f64[7]
    (atk,def,speed,sp_atk,sp_def,acc,evasion),
  is_first_turn:f64, hp:f64, max_hp:f64, last_used_move_id:f64,
  optional has_any_status, is_asleep as presence/value bools,
  is_toxic_poisoned:u8, is_leech_seeded:u8, is_cursed:u8,
  optional is_confused, is_taunted, is_infatuated, is_escape_prevented,
    is_tormented, is_nightmared, is_foresighted, has_yawn, has_perish_song,
  ability:string, known_ability:present:u8,[if 1] string,
  known_item_effect:f64, known_move_ids:present:u8,
    [if 1] move_count:u32,moves:f64[move_count],
  optional safeguard_up, spikes_up, target_future_attack_up as
    presence/value bools.
```

All optional booleans use the stated presence/value encoding; the three
unconditional bool groups use one `u8` value byte. The Rust export comment in
`crates/factory-wasm/src/lib.rs` repeats this layout beside the symbol. No
malformed packet is allowed to panic or trap.

The adapter selects canonical TS when `POKEBENCH_ENGINE` is unset/`ts`, and
calls this export directly when it is `wasm`. `tests/factoryAiLiveViewParity.test.ts`
deep-compares complete views, error ordering, numeric edge cases, arbitrary
UTF-8 history, optional-property presence, and malformed boundary packets in
both modes.

## Factory AI live-driver RNG replay (M8f)

`crates/factory-core/src/factory_ai_live_replay.rs` is the isolated pure
observable semantics of private `replayAiDraws` in
`src/engine/factoryAiLiveDriver.ts`. It takes an initial
`FactoryAiLiveReplayBattleRngState` plus ordered
`FactoryAiLiveReplayDraw` receipts (`ordinal`, `reason`, `before`, `after`,
`random_value`) and returns only the final RNG checkpoint or an exact source
error. It does not construct `BattleState`, run a reducer, submit a decision,
choose a switch/move, parse/serialize an input, or cross a WASM boundary.

The raw `value` remains a u32, as validated by the canonical battle boundary.
`calls` is a u64 so every source-reachable JavaScript safe integer survives
without truncation; the older policy-only `BattleRngState` is still accepted
losslessly through `From`. An LCG replay compares each recorded `before`,
advances through `advance_rng_value`, derives Random()'s upper-u16 output,
then compares `random_value` and `after`. Receipt array order is authoritative:
the ordinal is diagnostic-only, including duplicate/non-monotonic ordinals.
The two helper messages are preserved exactly:
`Factory AI RNG diverged before live draw {index}/{ordinal}` and
`Factory AI RNG diverged after live draw {index}/{ordinal}`. The standalone
leaf also preserves the live boundary's exact
`Battle RNG call counter overflow` before an impossible safe-integer draw.

The deterministic checked-in TypeScript-executed corpus has **17 cases**:
empty=1, single-draw=1, mixed-reasons=1, multi-draw-chain=1,
nonzero-calls=2 (including a call counter past u32), u32-wrap=1,
before-checkpoint=4, random-value=1, after-checkpoint=2,
ordering-ordinal=2, and call-counter-overflow=1. The generator makes a
fresh `mktemp -d` scratch copy of the canonical driver, exposes only the
private declaration in that copy, and invokes the original helper; it never
edits `src/`. Its generated Rust digest is
`e8e8e9778e82e252f80a454207b1f8f75728fba535655898d1514e53fa7d7c7b`.

Regenerate twice for byte identity:

```sh
node --experimental-strip-types core-rs/tools/gen-factory-ai-live-replay-vectors.mjs
shasum -a 256 core-rs/crates/factory-core/src/factory_ai_live_replay_vectors_gen.rs
node --experimental-strip-types core-rs/tools/gen-factory-ai-live-replay-vectors.mjs
shasum -a 256 core-rs/crates/factory-core/src/factory_ai_live_replay_vectors_gen.rs
```

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
