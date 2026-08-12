# RUST_SUPERVISOR.md — Rust rewrite lane

Lane guide for supervisor sessions working on the Rust/WASM port in
`core-rs/`. Read `AGENTS.md` first (it applies in full), then this file.
The general supervisor playbook in `SUPERVISOR.md` applies except where
this file narrows it.

**Launch:** `./run-supervisor.sh -l rust` from the workspace root (all the
usual supervisor/sub-agent flags apply). The launcher puts the session in
the persistent `.worktrees/rust-main` worktree on the single-writer
`rust-main` branch and ensures the Battle Scene OFF oracle. Workers are
dispatched with `./tools/run-subagent.sh --lane rust`. The deferral gate
file is `RUST_DEFERRED.md`.

## Charter

Port the deterministic engine core to Rust, compiled to WASM, with the
existing vitest suite as the spec gate. The end state the user has chosen:
Rust becomes the core; the TypeScript engine is eventually archived into
its own folder (user does this, not this lane). Until that day, TS is
canonical and this lane must never make the TS side worse.

## Hard rules — other lanes are in flight

1. **Do not edit** `src/`, `tests/`, `tools/` (TS engine, suite, tooling)
   except for the engine-adapter work in M2 below, and then only in files
   this lane creates (adapter modules, config). The #55 ts lane and the
   animation lane own their territories and will keep folding to master.
2. `npm test` (full suite), `npm run build`, and the wind-down soak gates
   in `SUPERVISOR.md` must stay green after every fold this lane makes —
   the lane runs them itself before merging; "I only touched core-rs/"
   is not an exemption once the adapter exists.
3. TS-side frozen fixtures and hash-pinned packets are read-only. If a
   Rust port disagrees with a pinned fixture, the Rust code is wrong until
   proven otherwise with a receipt.
4. Evidence discipline carries over: no fitted constants; expected values
   are generated from the TS engine or its fixtures and the generation
   command is cited in the test; magic numbers cite reference/pokeemerald
   or the TS module that carries the citation.
5. All work happens on the `rust-main` branch (the launcher enforces the
   worktree); the main supervisor folds it at orients, the same convention
   the animation lane uses with `animation-main`. Never write master.

## Milestone ladder

- **M0 — scaffold (DONE, 2026-08-11, solo session):** cargo workspace,
  `factory-core` with the Gen-3 LCG ported from `src/engine/rng.ts`
  (4 tests pinned to TS-generated values), `factory-wasm` C-ABI stub,
  wasm32 release build proven (448-byte artifact, zero dependencies,
  builds offline).
- **M1 — boundary decision:** choose wasm-bindgen (needs a crates.io
  fetch; network required once) or a hand-rolled ABI; wire a build step
  that drops the artifact + JS glue where Vite can import it (suggested:
  `artifacts/wasm/`, gitignored). Record the decision and its receipts in
  RUST_PROGRESS.md before widening the surface.
- **M2 — differential harness:** an engine adapter so vitest can run
  spec tests against either engine (TS default, WASM opt-in via env
  flag). Start by running the rng spec against both. This harness is the
  lane's most important deliverable — everything after is grinding.
- **M3 — first vertical slice:** rental generation
  (`generateInitialFactoryRentals` and its mon-construction path),
  reproducing the existing pinned fixtures through the adapter.
- **M4+ — expansion:** port by family with the harness deciding done-ness.
  Sequencing rule: do NOT port the #55 construction clock or anything it
  wires into until the TS side closes cost composition and wires it first
  — no porting moving targets. Same for any module a TS lane has open
  work on (check ISSUES.md and PROGRESS.md at orient).
  **M4 opener (user decision 2026-08-11): the battle-kernel leaf family**
  — `src/engine/damageCalc.ts` + `turnOrder.ts` + `turnRng.ts`
  (`stats.ts`/`monGender.ts` are already ported, M3c). Module inventory,
  fresh conflict check, census pointers, and a suggested step split are
  in `docs/rust-m4-battle-kernel-scout.md`; re-verify the conflict check
  at orient. **DONE 2026-08-11 eve (R3): all three modules ported
  end-to-end** — native + vectors, fw_ boundary, adapters, both-mode
  parity suites (`tests/damageCalcParity.test.ts`,
  `tests/turnOrderParity.test.ts`). Next family: see
  `docs/rust-m5-scout.md` once folded, and re-verify its conflict check
  at orient.
  **M5 status (R3-R4, 2026-08-11/12):** M5a (maskSelection + MOVES
  table), M5b (CheckBadMove 109/109 native, 4 steps per
  `docs/rust-m5b-checkbadmove-batching.md`), and M5c (fw_ boundary +
  `core-rs/adapter/factoryAiEngine.ts` + both-mode parity suites
  `tests/factoryAiMaskParity.test.ts`/`factoryAiCheckBadMoveParity.test.ts`)
  are DONE. **M5d is DONE (R4, 2026-08-12): CheckViability 122/122
  native** in 6 steps per `docs/rust-m5d-checkviability-batching.md`.
  Remaining in the family: M5e — the CV boundary+adapter+parity step
  (M5c pattern; touches tests/, full npm gates apply), then TryToFaint
  + DecisionPolicy (M5f per the scout). See RUST_PROGRESS.md's top
  entry.

## Verification gates (every session)

```sh
export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH"
cargo test                # native — must be green
cargo build -p factory-wasm --target wasm32-unknown-unknown --release
cargo fmt --check && cargo clippy -- -D warnings   # once M1 lands
```

Plus the TS-side gates in Hard rule 2 for any session that touches the
adapter or folds to master. Ledger: `RUST_PROGRESS.md`, same
State/Did/Next/Notes format and archive convention as `PROGRESS.md`.
