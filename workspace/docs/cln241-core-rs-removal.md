# cln241 — core-rs removed from master (finish plan Cleanup 4, second half)

The Rust port (`core-rs/`) and everything that only served it are gone from master. The TypeScript engine in `src/` was
always the only implementation the game ran: `src/` has no import of the wasm adapter, and the production bundle is
unchanged (see Verification).

## Restore

The whole tree is preserved on the local branch `core-rs-archive` (`26ce8d051`, 194 commits, tree
`f35070e69` == `master:workspace/core-rs` before this step). To get it back:

```sh
git checkout core-rs-archive          # browse / build it on its own
git revert <removal commit>           # or: put it back on master, adapters and tests included
```

Building it needs the Rust toolchain plus the wasm32 target (`core-rs/build-wasm.sh` wrote
`artifacts/wasm/factory_wasm.wasm`). The `RUST_*` lane ledgers it links are in `docs/archive/`.

## What was removed

| Item | Detail |
|---|---|
| `core-rs/` | 535 tracked files, 3,764,143 lines (Rust crates, generated vector files, `Cargo.*`, `build-wasm.sh`, README) |
| `core-rs/adapter/*.ts` | The TS side of the wasm boundary: `loadFactoryWasm.ts` and the 14 engine adapters (`rngEngine`, `damageEngine`, `turnEngine`, `factoryEngine`, `factoryAi*Engine`, `factoryDraftSelectionEngine`, `factorySwapEngine`, `factoryTrainerScheduleEngine`, `keyRepeatEngine`, `monDataIvs`, `smoke.mts`). Nothing in `src/` or `tools/` imported them; only the parity tests below did. |
| 18 `tests/*Parity.test.ts` | See the fate table. |
| `tools/run-subagent.sh` | Worktree setup no longer seeds `artifacts/wasm/factory_wasm.wasm` from the main tree. |
| `tools/autonomy/verify-runner.sh` | The `cargo test` / `build-wasm.sh` / `adapter/smoke.mts` baseline step is gone; `typecheck` and `test:smoke` remain. The `rustc` / `rustfmt` / `clippy` host checks and `bootstrap-ubuntu.sh`'s Rust install were left alone: host provisioning, harmless when unused, and a decision for the supervisor (see Follow-ups). |
| `.gitignore` | `/core-rs/target/` removed. `/artifacts/` stays (`tools/probe` still writes JSON there); only its comment changed. |
| `tools/test/` | `gate-durations.tsv` lost the 18 deleted files' rows; `test-gate.list` and `test-gate.reasons.tsv` regenerated (`generateTestGate.ts`, then `--check` exit 0): 364 -> 362 files. |
| Docs | `AGENTS.md`, `LOCAL_SETUP.md` and the top-level `README.md` describe core-rs with one pointer to `core-rs-archive`. `package.json` and the vitest/vite configs never referenced core-rs; no change. |

Untouched on purpose: historical docs (`docs/archive/`, the per-step notes, `PAPERCUTS.md`, `PROGRESS.md`, `ISSUES.md`,
`ROADMAP.md`) and `tools/integration/fixtures/**` receipts, which record past runs and legitimately mention core-rs / wasm.

## Parity tests: each file's fate

All 18 compared the TS engine against the wasm build on identical inputs (the TS result was the expected value), so once
the wasm is gone the comparison half has nothing to compare. Each file's TS-only half was checked first. Where it mirrors an
existing TS test, the mirror is named; where it held a literal pin with no TS-only twin, the pin was kept in
`tests/tsEngineRetainedPins.test.ts` (new, 11 tests, committed before the removal as `fc90e5012`).

| File | Fate | TS-only coverage that remains |
|---|---|---|
| `rngEngineParity` | deleted | `rng.test.ts` (anchor chain, 50-step stream). Two pins it alone held, `advanceRngValue(0xffffffff) === 0xbe3a1206` and `randomU16(0xd2ddeec8)`, moved to `tsEngineRetainedPins` |
| `damageCalcParity` | deleted | Part A mirrors `damageCalc.test.ts` "RAM-pinned regression cases" (Rock Slide 32/48/42, Fury Cutter, Haunter chain; literals present there) |
| `turnOrderParity` | deleted | Part A mirrors `turnOrder.test.ts` (turn 1 / 9, tie-break, Quick Claw 13106/13107) and `turnRng.test.ts` (committed-dump RNG ledger) |
| `factoryAiMaskParity` | deleted | Part A mirrors `factoryAiMaskSelection.test.ts` (Tent / Brain precedence, band table, branch metadata, level and battle modes) |
| `factoryRentalParity` | deleted, 1 pin kept | seed-0 challenge-0 pin is the same as `factoryRentalGeneration.test.ts`; the challenge-8 pin (305 draws, 12 IV words, `[41538, 34362]`, spread) moved to `tsEngineRetainedPins` |
| `factoryTrainerScheduleParity` | deleted, 1 pin kept | `factoryTrainerSchedule.test.ts`; the seed-31 duplicate-retry pin (9 draws, rejects on battles 1 and 5) moved to `tsEngineRetainedPins` |
| `factoryPartyMemberParity` | deleted, 3 pins kept | `factoryCorpusParty.test.ts`; the three source error messages, the uniform six-IV spread == bare `fixedIv`, and the `ivs.attack` / `fixedIv` disagreement rule moved to `tsEngineRetainedPins` |
| `factoryAiCheckViabilityParity` | deleted, 5 pins kept | `factoryAiCheckViability.test.ts` (1,000+ lines); the stale-funcResult weather collision, the seven-draw maximum, Haze's repeated ordinal, SemiInvulnerable5's tie receipt and the unknown-move error moved to `tsEngineRetainedPins`. The 122-effect sweep compared TS to wasm only |
| `factoryAiCheckBadMoveParity` | deleted | pure ts-vs-wasm (`compare()` only, no literals); `factoryAiCheckBadMove.test.ts` covers the TS handlers. The 109-effect sweep compared TS to wasm only |
| `factoryAiDecisionPolicyParity` | deleted | pure ts-vs-wasm (also the native-export proof); `factoryAiDecisionPolicy.test.ts` |
| `factoryAiSwitchPolicyParity` | deleted | ts-vs-wasm adapter parity; `factoryAiSwitchPolicy.test.ts` |
| `factoryAiBattleHistoryParity` | deleted | ts-vs-wasm wire parity; not compared line by line; the battle-history type is exercised through the `factoryAi*` driver / decision tests |
| `factoryAiLiveViewParity`, `factoryAiLiveDecisionParity`, `factoryAiLivePlannerParity` | deleted | ts-vs-wasm ABI-v1 packet parity (encode / decode, malformed packets, forced-wasm selection); closest TS-only tests: `factoryAiLiveDriver.test.ts` and the `factoryAi*LiveReceipt` tests (not compared line by line) |
| `factoryDraftSelectionParity`, `factorySwapParity` | deleted | ts-vs-wasm corpora plus wasm "checked packet" barriers; closest TS-only tests: `factoryDraftStateAdapter.test.ts`, `factorySwap.test.ts`, `factorySwapExtraction.test.ts` (not compared line by line) |
| `keyRepeatParity` | deleted | ts-vs-wasm 1,580-case corpus plus wasm packet barrier; `keyRepeat.test.ts` |

Kept as they were (no core-rs reference): `factoryAiScoredWiringParity`, `libTypesParity`, `order45TurnTrapParity`,
`abilityItemParityCensus`.

What is lost on purpose: the differential sweeps and the wasm ABI / packet-barrier tests. They proved the Rust port matched
TS; with the port off master they have no subject. The deleted test files remain in master history before the removal commit (`git show <removal>^:workspace/tests/<name>`);
`core-rs-archive` holds only the `core-rs/` subtree, so restoring the adapters means reverting the removal commit.

## Verification (this host, 2 workers, `/etc/pokebench-runner.env`)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0, 3m59s |
| `npm run build` | exit 0, 4m42s (includes `tsc -b`) |
| `npm run build:lib` | exit 0, 1m11s |
| `generateTestGate.ts --check` | exit 0; gate 364 -> 362 files |
| `npm run test:gate` | 362 / 362 files, 2,835 tests, 3m26s |
| `npm test` (full, nohup + exit file) | exit 0; 1,733 files passed + 44 skipped = 1,777 of 1,777 in `git ls-files` (no dead fork); 13,872 tests passed, 223 skipped, 0 failed; 2,864 s |
| Bundle | `dist` 33,289,849 bytes / 8 files before and after, byte for byte. Six of seven assets have identical content hashes; only `assets/index-*.js` differs because `vite.config.ts` embeds `git rev-parse --short HEAD`. The wasm adapter was never in the bundle |

`git grep -n "core-rs\|factory_wasm"` now hits only this doc, the one-line pointers in `AGENTS.md`, `LOCAL_SETUP.md` and
`README.md`, the supervisor-owned ledgers (`PROGRESS.md`, `ROADMAP.md`, `PAPERCUTS.md`), and historical docs / receipts
under `docs/` and `tools/integration/fixtures/`.

## Follow-ups (not done here)

- `tools/autonomy/bootstrap-ubuntu.sh` still installs the Rust toolchain and the wasm32 target, and `verify-runner.sh` still
  checks `rustc` / `rustfmt` / `clippy`. Nothing needs them now; drop them when the next host is provisioned.
- `docs/cax31-session-handoff.md` still says `artifacts/wasm/factory_wasm.wasm` is needed in a verification checkout and
  that the "next half" of step 4 is open; the supervisor owns it.
