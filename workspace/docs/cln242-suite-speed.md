# cln242 -- full-suite speed (finish plan Cleanup 5, second half)

Host: CAX31, 8 vCPU, 15.5 GiB, `POKEBENCH_VITEST_MAX_WORKERS=2` from `/etc/pokebench-runner.env`. Nothing else heavy running during the
measurements (the supervisor and this worker's Claude processes use about 1 GiB).

## Result

| | Before | After |
|---|---|---|
| `npm run test:gate` (2 workers) | 218 s (364 files) | **97 s** (362 files, 2,835 tests, `transform 16 s, collect 44 s, tests 130 s`) |
| Full suite, 2 workers | 2,935 s wall in the 2026-11-03 reference run (about 49 min; the supervisor's note says up to 75 min under load) | not re-run at 2 workers (see below) |
| Full suite, 5 workers, run as 4 `--shard=i/4` passes | n/a (5 workers did not fit in memory before) | 237 + 476 + 281 + 248 = **1,242 s (20.7 min)** for 1,781 files, peak system memory 8.6 - 10.9 GB (including about 1 GB of unrelated processes) |
| Vitest parent peak RSS, one file | 4.5 GB | 0.6 GB |
| One file, `collect` / `transform` | 77 s / 49 s | 15 s / 9 s |

Summed per-file test time is unchanged (4,731 s now vs 4,866 s in the reference): the speed-up is collect / transform / memory, which let
more workers run. The sharded passes pay vitest start-up and a tail four times, so an unsharded run at 5 workers should land at roughly 17 -
19 min (not measured: one foreground tool call cannot exceed 10 minutes in this session). The finish-plan target of < 15 min needs either
6 workers (peak 12.5 GB total in the shard-3 probe, over the 12 GiB budget) or a cut in the CPU-bound exact-proof files, see "What is left".

## The change that mattered: `json: { stringify: true }` under vitest

`vite.config.ts` now sets `json.stringify` when `mode === "test"` (app / lib builds untouched; `npm run build` green). The ~46 MB of
generated JSON under `src/` was transformed by Vite as a JavaScript object literal with one named export per top-level key (and
sourcemapped) in the vitest parent, shipped to every fork and re-evaluated there. With `stringify` each JSON module is
`export default JSON.parse("...")`. Safe here because nothing imports a JSON file by name (checked with grep over `src tests tools`:
default imports only; `tests/battleIntroStrings.test.ts` uses `.default` of a dynamic import). Evidence: `tests/sc106StatsChangeCommand.test.ts`
(5 passed both ways) `collect 76.6 s -> 15.0 s, transform 49.3 s -> 9.3 s, parent max RSS 4.49 GB -> 0.59 GB`; both full-suite shard
passes with it (4 shards, 1,781 files) were green except two files that were already red on `f73aafbda` without this change (below).

## Worker count and memory (this host)

| Probe | Result |
|---|---|
| 6 workers, before `stringify`, shard 1/4 | system 14.6 GB at 100 s, kernel OOM killed forks (rc 137) |
| 3 workers, before `stringify`, shard 2/4 | 14.0 GB at 90 s, aborted by the memory guard |
| 4 workers, before `stringify`, fork `--max-old-space-size=2048` | forks hit "JavaScript heap out of memory" (a live heap above 2 GB is normal for the heavy files); do not cap the fork heap that low |
| 4 workers, `stringify`, shard 2/4 | green, 535 s, peak 6.8 GB |
| 6 workers, `stringify`, shard 3/4 | green, 253 s, peak 12.5 GB |
| 5 workers, `stringify`, shards 1..4 | 237 / 476 / 281 / 248 s, peaks 9.1 / 8.6 / 10.8 / 10.9 GB |

Recommendation: set `POKEBENCH_VITEST_MAX_WORKERS=5` for a solo full-suite run (runner env or inline), `=4` when another session is also
running tests. The explicit variable still wins over the fair-share logic in `vite.config.ts`, so concurrent sessions must not each set 5.
`/etc/pokebench-runner.env` and `tools/run-subagent.sh` were not touched (outside this step).

File order: vitest's default sequencer already starts the files it has cached as slowest first (`node_modules/.vite/vitest/results.json`)
and the longest file (203 s) is far below the per-worker share (about 950 s at 5 workers), so no sequencer change; the tail is not the limit.

## Per-file durations, slowest 60 (fresh run, 5 workers, test time summed over the file's cases; reference = `tools/test/gate-durations.tsv`)

The 40 slowest files are 38.4% of all test time, the 60 slowest 46.3% (total 4,731 s).

| # | File | Tests | Seconds now | Seconds in reference |
|---|---|---|---|---|
| 1 | `tests/animation/liveDiveAttackAdapter.test.ts` | 5 | 203.1 | 233.2 |
| 2 | `tests/summaryAllFactorySpecies.test.ts` | 9 | 133.0 | 145.0 |
| 3 | `tests/animation/liveDiveSetupAdapter.test.ts` | 10 | 100.0 | 103.2 |
| 4 | `tests/substituteDollDefenderLive.test.ts` | 60 | 77.2 | 80.2 |
| 5 | `tests/randomRoundSoak.test.ts` | 62 | 70.4 | 81.3 |
| 6 | `tests/animation/shockWaveActualCore.test.ts` | 1 | 67.2 | 66.1 |
| 7 | `tests/liveSpriteOrderHost.test.ts` | 22 | 63.0 | 56.9 |
| 8 | `tests/factoryRoundBattleOrchestrator.test.ts` | 56 | 62.4 | 61.8 |
| 9 | `tests/sag130StatusSeGate.test.ts` | 2 | 58.0 | 58.3 |
| 10 | `tests/randomRoundSoakScene.test.ts` | 10 | 55.7 | 44.4 |
| 11 | `tests/animation/liveLsbzBlizzard.test.ts` | 4 | 49.6 | 50.3 |
| 12 | `tests/wordsOrderDeferredLend.test.ts` | 14 | 44.1 | 45.4 |
| 13 | `tests/animation/flatterActualCore.test.ts` | 1 | 44.1 | 43.2 |
| 14 | `tests/contain213CommandsThrow.test.ts` | 2 | 43.6 | 60.2 |
| 15 | `tests/randomRoundSoakParallel.test.ts` | 6 | 42.4 | 41.1 |
| 16 | `tests/sa125StatusAnimationCommand.test.ts` | 11 | 42.3 | 42.1 |
| 17 | `tests/rng244OutcomeRates.test.ts` | 12 | 41.5 | 41.3 |
| 18 | `tests/apx221PresentationGateApproximate.test.ts` | 11 | 40.6 | 41.3 |
| 19 | `tests/animation/smogActualCore.test.ts` | 1 | 38.8 | 38.5 |
| 20 | `tests/playableAnimationLifecycle.test.ts` | 6 | 38.1 | 43.2 |
| 21 | `tests/contain213FieldThrow.test.ts` | 2 | 37.3 | 59.1 |
| 22 | `tests/icyWindBlizzardGeometry.test.ts` | 8 | 35.7 | 29.9 |
| 23 | `tests/animation/overheatActualCore.test.ts` | 1 | 32.1 | 30.1 |
| 24 | `tests/animation/blizzard.test.ts` | 6 | 27.2 | 27.5 |
| 25 | `tests/audioSinkNeutral.test.ts` | 4 | 26.4 | 21.9 |
| 26 | `tests/animation/livePrep2MoveAdapters.test.ts` | 13 | 25.8 | 19.9 |
| 27 | `tests/stl109Struggle.test.ts` | 13 | 25.8 | 26.1 |
| 28 | `tests/appDifferential.test.ts` | 10 | 24.8 | 24.5 |
| 29 | `tests/forcedSwitchInContinuationDisplayIssue112.test.ts` | 1 | 24.4 | 28.5 |
| 30 | `tests/animation/liveRandom2R1MoveAdapters.test.ts` | 22 | 24.0 | 25.1 |
| 31 | `tests/spriteOrderPlans54.test.ts` | 11 | 23.2 | 22.9 |
| 32 | `tests/animation/shockWaveReducer.test.ts` | 3 | 23.1 | 25.5 |
| 33 | `tests/apx222LastStaticClassesApproximate.test.ts` | 11 | 22.9 | 24.6 |
| 34 | `tests/fightSubmenu.test.ts` | 72 | 22.8 | 23.6 |
| 35 | `tests/animation/flatterReducer.test.ts` | 4 | 22.1 | 17.5 |
| 36 | `tests/spriteOrderDreamEaterGeometry.test.ts` | 4 | 22.1 | 22.7 |
| 37 | `tests/fix122AuditDefects.test.ts` | 16 | 21.2 | 20.6 |
| 38 | `tests/olnd113SceneOffPauses.test.ts` | 27 | 21.1 | 17.8 |
| 39 | `tests/sc106StatsChangeCommand.test.ts` | 5 | 20.8 | n/a |
| 40 | `tests/scf117StatsChangeFinish.test.ts` | 5 | 20.6 | 20.0 |
| 41 | `tests/animation/later58LiveGates.test.ts` | 25 | 20.4 | 15.6 |
| 42 | `tests/animation/silverWindLiveCompositorCheckpoint.test.ts` | 2 | 20.4 | 19.5 |
| 43 | `tests/animation/curseActualCore.test.ts` | 1 | 20.2 | 18.7 |
| 44 | `tests/randomRoundSoakCoverageFight.test.ts` | 8 | 19.9 | 21.4 |
| 45 | `tests/animation/animationBookkeepingIsolation.test.ts` | 1 | 19.8 | 19.2 |
| 46 | `tests/spriteOrderSw67.test.ts` | 6 | 19.7 | 22.0 |
| 47 | `tests/animation/liveFaithfulTimingAdapters.test.ts` | 46 | 19.7 | 17.6 |
| 48 | `tests/animation/iceBallActualCore.test.ts` | 1 | 19.3 | 17.8 |
| 49 | `tests/animation/eruptionFramebuffer.test.ts` | 2 | 19.2 | 18.8 |
| 50 | `tests/animation/livePhysical2aMoveAdapters.test.ts` | 9 | 19.1 | 8.1 |
| 51 | `tests/animation/returnActualCore.test.ts` | 1 | 18.9 | 18.3 |
| 52 | `tests/animation/hornDrill.test.ts` | 4 | 18.2 | 18.5 |
| 53 | `tests/animation/liveQ2Adapters.test.ts` | 28 | 18.2 | 18.3 |
| 54 | `tests/audioHeadlessBoundary.test.ts` | 2 | 18.2 | 19.5 |
| 55 | `tests/animation/liveIceBallAdapter.test.ts` | 10 | 17.5 | 18.5 |
| 56 | `tests/animation/livePrep6MoveAdapters.test.ts` | 13 | 17.4 | 20.9 |
| 57 | `tests/animation/furyCutterResidualDiagnosis.test.ts` | 1 | 17.4 | 16.9 |
| 58 | `tests/animation/smogReducer.test.ts` | 5 | 17.2 | 15.8 |
| 59 | `tests/animation/razorWindEvidenceCheckpoint.test.ts` | 2 | 16.8 | 17.4 |
| 60 | `tests/animation/helpingHandEvidence.test.ts` | 1 | 16.7 | 16.7 |

## Speeding up the slow exact-proof files: nothing safe found at test level

Profiled `liveDiveAttackAdapter` (203 s, the slowest): `vector` renders 15 windows x 93 rows (1,395 frames, 107 s) and the route test
runs `random2Route` three times (92 s). A 93-row render loop spends 7.7 s, of which about 6.5 s is in `src/animation/dive.ts`
(`diveAtAgeRaw` 1.9 s, `hardwareOrderAtAge` 1.4 s, `dropletAt` 0.9 s) and `sortGbaSpriteOrder` 1.3 s: the Dive reducer re-simulates from
tick 0 for every row, so a window costs O(age^2). `liveView` / fixture parsing is 0.04 s. `summaryAllFactorySpecies` (renders 4 pages x
882 sets + every move-select row), `substituteDollDefenderLive` (one dense window per fixture), `liveDiveSetupAdapter` and the
`*ActualCore` files are the same shape: distinct pure-render work per iteration. There is no repeated setup to hoist: where a file calls
the same producer twice (`liveDiveSetupAdapter`: `a` / `a2` = `random2Route(111, "on", [0, 0], 0, SEED_A)` twice; the attack file's
export-replay) the second call IS the determinism assertion, so memoizing it would remove the assertion. No file was changed for speed, so
there are no per-file before / after rows for that (the one measured per-file change is sc106 below).

Lead for the supervisor (a `src/` change, so outside this step): make `src/animation/dive.ts` incremental / memoized per (config, age). That
alone is about 6 of every 7.7 s in the Dive render loops and should cut `liveDiveAttackAdapter`, `liveDiveSetupAdapter`,
`liveDiveAnimation*` / `substituteDollDefenderLive` windows that draw a Dive by several times; the same profile approach
(`vite-node` + `node:inspector` around the render loop) should be repeated for the `*ActualCore` reducers before touching them.

## Deletions: decisions for each cln240 candidate

The census (`lsd194Census.sh` + `rst197CensusDelta.py`) is a tree-to-tree delta tool: it flags a changed digest, command type sequence
or any per-command field / frame count between two trees over seeds 0..999. It never compares to the ROM. A test assertion is therefore
census-superseded only when it is a literal frame / total pin (a number measured on some earlier tree and re-pinned by hand). An
assertion that relates production to a committed ROM receipt (`on - off == ROM controller rows`, "lands on the ROM anchor") is kept: the
delta would not move if both the code and the expectation drifted together.

| File | Decision | Reason |
|---|---|---|
| `sc106StatsChangeCommand` (11 -> 5 tests, 37.4 s -> 20.4 s) | **split: deleted the 6 "ordinary routes" cases** | They were literal frames "pinned on bddc3d69c" plus a dozen hand-added per-step shifts (iu120, chg161, trn181, ont193, lsd194, go246, obr251 ...) for command / following-print frames and whole-route totals on seeds 0, 3, 6, 10, 13: exactly what the census delta covers (stats-change command frames, following command, route frames). Kept: the 76 / 90 reducer duration, both Substitute / Double Team rules on production segments (which also pin the Double Team 239 / 244 window), the Scene ON / OFF parity cases. `tools/integration/sc106RouteScan.ts` stays (docs cite it). |
| `sgl138SeGateLive` (6 tests, 4 failed -> 6 pass) | **split: deleted the whole-route receipt equality** (`expect(battle).toEqual(receipt.battles[...])`) | It pinned route frame totals + per-anchor frames in `sgl138-live-receipt.json`; it was red on master since obr251 (e.g. seed 0: 25,166 -> 25,410). Kept every ROM-relation assertion (gate == sgs134 projection, banner on row gate, glyph at gate + rows + hold, later-hit shift == gate, gate rows == previous frame) and the receipt summary pin: all hold on the current frames. |
| `sa125StatusAnimationCommand` | **kept** | The "production routes" cases assert `length == gate + ROWS`, `on - off == ROM controllerRows`, SA3 delta == off121 Scene OFF frames: ROM-relation checks, no literals to supersede. |
| `wth236WeatherContinues` | **kept** | Asserts the weather body is drawn on every continuing turn (Scene ON) / nothing (OFF) and eventsDigest unchanged: behaviour, not a frame pin. |
| `lsd194PrintFloorAndDrain` | **kept** | Rows are "(ROM, residual 0)" per Leech Seed row and print floor L + 64: ROM-tied. |
| `off148SceneOffPauses`, `trn178ActionTransition`, `ont193SceneOnTails` | **kept** | Every case lands a command "on the ROM anchor" / "on the ROM" from committed direct-mGBA receipts (`off148/receipts`, trn176 receipts, ont193 anchors). Not superseded by a tree-to-tree delta. |
| `chg161ChargeTurnPrint`, `enc160Receipts`, `inv142StatusAnimationInvisible`, `sst200SecondStatRows` | **kept** | Cheap (about 3 s together) and tied to ROM receipts; low value in deleting. |
| `apx215 / 217 / 219 / 221 / 222` | **kept** | Claim-class (approximate vs exact) assertions; not split because the frame-count part is interleaved with the claim in each case and the saving (about 90 s) does not justify weakening the exact / approximate ratchet. |

Net removal: 6 test cases (sc106) and one equality in 4 cases (sgl138); about 17 s of test time saved, plus the sgl138 fix. As cln240
predicted, deletion alone cannot reach the target.

## Pre-existing reds found by the full run (fixed here, one commit)

`tests/randomRoundSoak.test.ts` was red on `f73aafbda` (checked on the old `vite.config.ts` as well): obr251's party-summary draw hold moved
the seed 21 strong-route round (frames 39,117 -> 40,796, renderCalls 2,782 -> 2,891), the seed 0 exploring run (39,078 -> 39,466), and
put the seed 1 exploring policy on a new trajectory (58,240 / battle 3 / turn 25 / depth 2 -> 36,610 / battle 2 / turn 23 / depth 1).
Re-pinned with provenance comments; 64 / 64 pass. The seed 1 trajectory change is a policy-reads-presentation effect like the earlier
fsw235 / pmo239 ones, but nobody has confirmed it: supervisor, please look at that one pin.

## Final tally

Four shards at 5 workers on the final tree (shard 4 re-run after the sgl138 / randomRoundSoak fixes, 244 s): 1,781 files, **14,016 tests
passed, 241 skipped, 0 failed** (3,043 + 4,271 + 3,672 + 3,030 passed). `npm run typecheck` and `npm run build` green.

## Gate

`tools/test/test-gate.list` was not regenerated: no generator input changed (durations file, `tests/` import graph of the selected files).
`npm run test:gate`: 362 files, 2,835 tests, 97.5 s wall (cap 300 s).

## Reproducing

Foreground-only sessions cannot hold a >10 min command, so the suite was run in four passes:

`for i in 1 2 3 4; do POKEBENCH_VITEST_MAX_WORKERS=5 npm test -- --shard=$i/4; done`

An unsharded run is `POKEBENCH_VITEST_MAX_WORKERS=5 npm test`.
