# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R2 — [supervised session, 2026-08-11] **M1→M3d landed: ABI, adapter, rental generation AND mon construction differential-green**

- **State:** **M1, M2, and the FULL M3 vertical slice (rental generation
  + mon construction, M3a–M3d) are DONE and folded into rust-main.**
  master merged in at session start; six worker folds, every one
  gate-verified by the supervisor before merging. Wind-down union gates,
  supervisor-run on rust-main: cargo **62/62** + fmt/clippy clean, wasm
  artifact 62,344 B, parity specs **440/440** (77 party-member + 290
  rental + 73 rng) in BOTH default and POKEBENCH_ENGINE=wasm modes, full
  npm test **950 files / 9,123 passed / 1 pre-existing skip**
  (tests/animation/hypnosisEvidence), soak **vanilla 20/20 OK** and
  **full 60/60 OK**. No file under src/ or tools/ was modified all
  session; tests/ gained exactly the three lane-created parity files.
  **M3c (mon-construction data groundwork) is also folded:** codegen
  extended additively (FRONTIER_MONS moves+ev_flags, MOVE_PP 355,
  held-item hold effects, SPECIES 376 rows with base
  stats/gender/abilities/exp@50, NATURE_MODIFIERS) plus stats/gender/
  shiny/EV helper ports — 52 native tests, idempotent, supervisor
  re-verified row samples (LUDICOLO species row + entries[400]
  moves/ev-mask) against the JSON independently. SPECIES is deliberately
  scoped to the 376 frontier-referenced species (25 SPECIES_OLD_UNOWN_*
  rows lack exp entries; check verified: 0 referenced species missing).
  - **M3d:** `create_factory_corpus_party_member`/`_party` ported
    (ability-slot taken from the instance per the TS spec — NOT
    `ability_slot_for_personality`, which is the generation-time
    derivation); `fw_create_factory_party_member` 91-byte documented
    boundary; decoder + `tests/factoryPartyMemberParity.test.ts` — full
    882-set sweep, 72-config variation block, error parity, party
    triple.
  - **M3a:** `core-rs/tools/gen-data.mjs` codegen → checked-in
    `gen_tables.rs` (882 frontier mons, 63 held items, 411
    species-second-ability, 25 natures, round policy), deterministic +
    idempotent (supervisor re-sampled rows 0/400/777/881 against the
    JSON independently); helper ports in `rental_data.rs` with
    TS-pinned tests. Worker added `core-rs/rustfmt.toml`
    (struct_lit_width=80) to keep generated rows one-line.
  - **M3b:** `rental_generation.rs` — faithful port incl. the
    curr_species stateful-retry quirk; `fw_generate_initial_rentals`
    LE-buffer boundary (layout doc'd in factory-wasm);
    `core-rs/adapter/factoryEngine.ts` decoder;
    `tests/factoryRentalParity.test.ts` with the FULL 288-config matrix
    (16 seeds × 3 winStreaks × 3 rentsCounts × 2 construction cursors)
    deep-equal on complete results including the draw ledger, plus
    challenge-8 error parity and the seed-0 fixture anchor. **Port
    finding:** TS deliberately throws on challengeNum 7 + better-range
    fixed IV (the documented retail-OOB non-portability boundary,
    factoryRentalGeneration.ts:184); the port mirrors the error and the
    matrix compares errors symmetrically.
  - **M1 (fold fe40ab19):** fw_ ABI v1 surface (fw_abi_version/
    fw_rng_advance/fw_rng_output/fw_alloc/fw_free), `core-rs/build-wasm.sh`
    → `artifacts/wasm/factory_wasm.wasm` (gitignored), hand-written typed
    Node loader `core-rs/adapter/loadFactoryWasm.ts`, smoke
    `core-rs/adapter/smoke.mts` pinning the wasm rng stream to the
    TS-generated values. One in-territory deviation: narrowly-scoped
    `#[allow(clippy::should_implement_trait)]` on `GbaRng::next` (mirrors
    the TS name deliberately).
  - **M2:** engine adapter `core-rs/adapter/rngEngine.ts` (TS default,
    `POKEBENCH_ENGINE=wasm` opt-in) + `tests/rngEngineParity.test.ts` —
    spec conformance parameterized over both engines, 64-seed ×
    1024-step differential sweep, ABI pin. Artifact-absent worktrees skip
    the wasm half (verified 4 passed/69 skipped); opt-in without the
    artifact hard-fails naming build-wasm.sh. No existing TS file
    modified; tsconfig untouched (adapter enters the tsc program via the
    test's import).
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
- **Next:** M4 expansion, port by family with the harness deciding
  done-ness. The natural candidates (opponent selection in
  `factoryRoundBattleOrchestrator.ts`, anything near
  `factoryConstructionClock.ts`) are ALL #55-adjacent modules the TS
  lane has open — per the sequencing rule they stay unported until TS
  closes and wires the clock. Conflict-free M4 openers to scout next
  session: `factoryDraftStateAdapter`/draft-screen state, swap-flow
  policy (`factory-round-policy.json` roundFlow), or the battle-kernel
  leaf families (type chart, damage stages) after checking ISSUES.md
  afresh. Keep following the M2/M3 pattern: codegen-data step, then
  port+boundary+parity step. **Resolved by user decision 2026-08-11
  (recorded by the planning session): open M4 with the battle-kernel
  leaf family — see the M4 bullet in RUST_SUPERVISOR.md and
  `docs/rust-m4-battle-kernel-scout.md`.**
- **Notes:** clippy/fmt gates are ON as of M1. Session ops findings:
  (1) the shared OFF oracle at :8014 was killed mid-session by a
  process-group sweep (its log ended mid-line at "listening"); restart
  recipe that survives: spawn `run-oracle.sh --profile battle-scene-off`
  via `python3 subprocess.Popen(..., start_new_session=True)` — plain
  nohup+disown from a tool shell did NOT survive. Rust-lane workers
  never query the oracle; it is only a run-subagent launch precondition.
  (2) A failed launch leaves a dead worker worktree + branch — remove
  exactly that timestamped pair before relaunching. (3) TS quirk
  discovered by the M3b port, worth knowing when reading parity output:
  challengeNum 7 + better-range fixed IV deliberately throws in TS
  (documented retail-OOB boundary, factoryRentalGeneration.ts:184); the
  parity matrix compares errors symmetrically there.

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
