# cln277: full-suite wall (plan Cleanup 5, "target < 15 min")

Result: **target not met, and not reachable by safe test-side levers on this box.** One test-side change landed (a memo, about 29 s of test time). The measured levers are below, with the one remaining large lever (the per-frame render in the shared battle producer), which needs a supervisor decision because it trades render-crash coverage for time.

## Method

- Box: 8 vCPU, 15.5 GB, shared with other workers (the load average was 10-15 during both runs; `integration-*` worktree vitest runs were live). Wall time is therefore noisy; CPU time (`/usr/bin/time` user+sys) is the comparable metric for single-file measurements.
- Full suite: `POKEBENCH_VITEST_MAX_WORKERS=5 npm test` (vitest 2.1.9, pool=forks, `isolate:false`), run back-to-back-ish with the JSON reporter (`/tmp/cln277/run.sh`, load sampled every 15 s).
- No `src/` change. Only `tests/liveSpriteOrderHost.test.ts` changed.

## Before / after

| | before (HEAD d0aba05af) | after (HEAD a19c0252f) |
|---|---|---|
| wall | 1,395 s (23.3 min) | 1,554 s (25.9 min) |
| mean load1 during the run | 11.7 (range 10-13) | 14.5 (range 12-15) |
| test files (`tests/**/*.test.ts`) | 1,821 | 1,821 |
| tests | 14,898 (14,653 pass, 3 fail) | 14,898 (14,653 pass, 3 fail) |
| red | `tests/randomRoundSoak.test.ts` x3 | same |

The after run was slower in wall only because the box was busier (load 14.5 vs 11.7 and another suite in the integration worktree running); it is not a regression, but it is also not evidence of a speedup. The fair signal is the file measurement below: `liveSpriteOrderHost.test.ts` test time 87.8 s (before run) -> 58.5 s (after run); alone, 42.1 s tests / 61.4 s wall / 67.6 s CPU. Test count unchanged (22).

The full-suite saving of this change is roughly 30-45 s of CPU, i.e. 6-9 s of wall at 5 workers, which is below the noise of the run.

`npm run test:gate` (gate config, 362 files): green, 2,843 tests, 131 s (133.8 s wall incl. start), load about 10.

## Pre-existing red (not caused by this step)

`tests/randomRoundSoak.test.ts` fails 3 tests even when run alone, identically before and after: ISSUES #89 seed 32; `maxCarriedWinStreak`/`maxBattleDepth` after a later loss; ISSUES #99 swap offer. It reproduced on HEAD before any change. The likely cause is the lbr-b attendant/door-walk merge shifting seed trajectories; the fix is a seed re-scan and re-pin (as cln242 did for obr251). This step is mis-scoped to fix it (engine/trajectory pins), so `npm test` is red on that file only, and the supervisor should schedule the re-pin.

## What was measured (levers from the brief)

Model: wall is about (tests + collect + transform CPU) / 5 workers, CPU-bound and well packed. The tail is not the limit, so reordering and splitting do not help.

1. **Collect phase.** Not actionable. Light files cost about 0.1 s each; the heavy part is the 5 per-worker first loads of the engine graph plus a few heavy files. `vi.resetModules()` / `vi.mock` under `isolate:false` wipes the worker's whole module cache and costs about 4-5 s of re-import for each later file in that worker: about 1% of the suite in total. Files that do this (`tests/contain213CommandsThrow.test.ts` and the other contain*/mock files) could be sequenced last for about 45 s CPU; vitest 2.1.9 has no per-file ordering control that does that without a custom sequencer, so not done.
2. **Splitting long files.** CPU-neutral (measured), so no wall gain at 5 workers when the pool is already saturated. Not done.
3. **Shared memoized setup.** The duplicate producer (`generatedCommandAnimationReplay`) calls across files total only about 57 s CPU. The one clear duplicate, the 20-seed `scanRoute` sweep run by two tests in `tests/liveSpriteOrderHost.test.ts`, is now memoized (file-local `scanRoute` wrapper keyed by `[seed, slots]`; assertions untouched, routes are read-only). `tests/spriteOrderAbsInvRoutes.test.ts` has about 7.5 s of duplicate producer time; not changed (I did not verify which calls are identical, and the gain is below noise).
4. **Test-side caching.** Total gain for all identified memoization is about 50 s CPU (about 10 s wall). Other duplicates, not fixed: `randomRoundSoakScene`/`Parallel` re-run serial CLI runs (about 12 s each).
5. **Runtime flags.** GC semi-space: about 2%. JIT flags: none. V8 flags can only be applied via `poolOptions.forks.execArgv` in a config (NODE_OPTIONS rejects them; the CLI form hung), and the effect was too small to change a shared config.

## Where the time is (the leads)

- **The producer's discarded render.** In `tools/integration/generatedCommandAnimationReplay.ts` each presenting move-animation frame calls `renderBattleResolutionLiveView(new Uint8Array(240 * 160 * 4), view)` and discards the pixels (only `ages` and `adapterActive` are recorded). That render is about 78% of the producer's 854 s CPU over 81 files: about 670 s CPU, about 2.2 min of wall at 5 workers. Making it opt-in per caller would take the suite to about 23 -> 21 min on this box; still not under 15. It weakens render-crash coverage in callers that do not render elsewhere, so it is a supervisor decision (not made here).
- **Child processes.** 503 test files spawn node children (`execFileSync(process.execPath, ["--experimental-strip-types", ...])`), about 1.6 s each, about 2,350 s of test time in the loaded run (about 8 min of wall at 5 workers).
- `tests/audioHeadlessBoundary.test.ts` does 2 full-graph vite builds; `tests/summaryAllFactorySpecies.test.ts` two heavy loops (882 sets, 376 species).

## Conclusion

The suite is about 6,000-8,000 s of CPU in tests, collect and transform. Reaching 15 min at 5 workers needs about 4,500 s of CPU. Test-side levers measured here sum to about 100 s; the largest single remaining one (the discarded render) is about 670 s and is a coverage tradeoff. The rest needs engine speedups (src, out of scope) or more workers than the 5 this box allows under shared load. On an unloaded box the suite is expected to be faster than here (cln242 measured 248 s solo at 677 files; the file count is now 1,821 so the 15-minute figure is better judged solo).

## Acceptance

- typecheck: 0
- `test:gate`: green, 131 s, 362 files, 2,843 tests
- `npm run build`: 0; `npm run build:lib`: 0
- ENGINE_BUILD: `eb-317927f84c1b839e` in `dist` at this HEAD; unchanged by this work, since the diff against d0aba05af touches only `tests/liveSpriteOrderHost.test.ts` (nothing in the headless graph). The `eb-52789eb6d9c84998` in cln244 is an older reference (src has moved since, e.g. aud245).
- Full suite twice: before 1,395 s, after 1,554 s (load-dominated, see above); 1,821 files / 14,898 tests both times; test count did not drop; no test deleted or weakened (no twins named because none were removed).
- No differential compare was run: no src change.
