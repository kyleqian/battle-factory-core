# cln240 — `npm run test:gate` (finish plan Cleanup step 5, first half)

`npm run test:gate` runs a curated subset of `tests/` that finishes in under five minutes on the CAX31 host with the
default two Vitest workers. It is for workers' mid-step and pre-finish checks. `npm test` (the full suite) is unchanged;
it stays nightly / supervisor. Deleting superseded frame-pin tests is a later step (candidates below, nothing deleted here).

## Mechanism

| File | Role |
|---|---|
| `tools/test/test-gate.list` | The committed selection: one `tests/...test.ts` path per line, sorted. Reviewable in a diff. |
| `vitest.gate.config.ts` | Loads `vite.config.ts` unchanged (same pool settings, `isolate: false`, setup files) and replaces `test.include` with the list. |
| `package.json` `test:gate` | `vitest run --config vitest.gate.config.ts --no-watch --pool=forks --testTimeout=20000` (same flags as `npm test`). |
| `tools/test/generateTestGate.ts` | Regenerates the list. `node --experimental-strip-types tools/test/generateTestGate.ts`; `--check` fails if the list is stale; `--budget-ms N` overrides the budget. Also writes `tools/test/test-gate.reasons.tsv` (file, why selected, reference ms). |
| `tools/test/gate-durations.tsv` | Per-file `path, test count, ms` for the 1,740 files that passed in the last full suite (`sv-20261103/gates-final/suite.log`, 1,787 files, 2 workers, 2,935 s wall). Copied from the log with the ANSI codes removed; the log itself is untouched. |
| `tests/testGateSelection.test.ts` | Pins: list sorted / unique / files exist, contains all of `test:smoke`, `test:gate` is wired through the gate config and `npm test` has no `--config` or file filter, and the list equals the generator output. |

Regeneration is deterministic (sorted walk, ties broken by path; no clock, no randomness): same durations file plus the
same `tests/` and `src/` trees gives the same list. `tests/testGateSelection.test.ts` fails when the list is stale, so
adding or removing a source import that changes the selection forces a regenerate and a reviewed diff.

## Selection rule

1. Everything in `test:smoke` (8 files) and the gate self-check test.
2. Named families, up to the 3 cheapest files each (cap 25 s per file): headless build hash (`engineBuildHash`), audio
   headless boundary, `libTypesParity`, the frontier ratchet, the gate6 coverage manifest, lib API (imports `src/lib.ts`),
   audio emitters (`src/audio/*` sink / emit / plumbing), live animation adapters (imports `liveMoveAnimation.ts`),
   round / draft / swap controllers.
3. Area coverage: for every `src/` directory, every top-level `src/*.ts` module and every module of 1,500+ lines, if no
   selected file imports it, add the cheapest passing file that does (cap 15 s per file). "Imports" means a direct
   `import` / `import()` of the module from the test or from a non-test helper under `tests/`.
4. Breadth fill: greedily add the file with the most not-yet-imported `src/` modules per millisecond until the summed
   reference test time reaches the budget (160 s). Per-file cap 15 s.

Never selected: the two files that failed in the reference run (`sc106StatsChangeCommand`, `sgl138SeGateLive`; both are
Scene ON frame pins, see candidates) and any file absent from the durations TSV (new since the reference run), except
the gate self-check.

Result at this commit: 364 files, 2,928 tests, 463 of 630 `src/*.ts` modules imported directly by a selected file.
Every `src/` directory (`animation`, `animation/assets`, `assets`, `assets/gen`, `audio`, `data`, `data/gen`, `engine`)
and every top-level module except `main.ts` / `vite-env.d.ts` is covered; of the large modules only
`src/engine/battleSceneCanonical.ts` has no direct importer in any test (it is reached through `battleScene.ts`, which is
covered). `src/main.ts` is the browser shell and has no Vitest importer.

## Measured wall time (this host, `source /etc/pokebench-runner.env`, 2 workers, nothing else running)

Final list, `npm run test:gate`, exit 0 both times:

| Run | `time` real | Vitest "Duration" | Files / tests |
|---|---|---|---|
| 1 | 3m38.0s (218 s) | 216.2 s (collect 272 s, tests 137 s) | 364 / 2,928 |
| 2 | 3m37.0s (217 s) | 215.0 s (collect 271 s, tests 136 s) | 364 / 2,928 |

Earlier iterations while tuning the budget (same host): 391 files at 230 s budget = 4m12s; 379 files at 190 s = 3m57s.
Collect time (module import) dominates, so wall time falls slowly with the budget; the 160 s budget leaves about 80 s of
headroom under the 300 s cap for a noisier host. If a later run exceeds 270 s, lower `DEFAULT_BUDGET_MS` in the
generator and regenerate. Typecheck (`npm run typecheck`) was run once on this host: exit 0, 4m14s.

## What is NOT covered, and when to run more

The gate samples; it is not the full suite (1,787 files, about 2,935 s here, 14,458 tests). About 1,420 test files are
outside it, mostly the per-move animation reducers / adapters, the per-step receipt tests and the long soak / route-pin
tests (the 40 slowest files are about 40% of all test time). A green gate does not show that a change is safe outside the
modules it imports.

Workers must still run, in addition to `test:gate`:

- every test file that imports a module they changed (`git grep -l "<module basename>" tests`), or whose name matches the
  step they touched, and the pins that name the behaviour they changed;
- the executable-frontier ratchets and any census / differential gate their step names in its acceptance;
- the full `npm test` when the step's own finish requirement says so. The supervisor runs the full suite on the exact
  folded code before a production change is accepted; the daily / nightly run also runs the full suite.

Do not widen the gate by hand-editing the list; change the generator (or the durations file) and regenerate.

## Candidate list: frame-pin tests the census may supersede (nothing deleted; a later step decides)

Basis. The Scene ON and Scene OFF censuses (`tools/integration/lsd194Census.sh` over seeds 0..999, both scenes, with
`rst197CensusDelta.py` comparing every battle's digest, command list and per-command frame fields against the previous
tree) already catch a changed frame count on any production command class, and they run on real random battles instead
of hand-picked seeds. Evidence on record: ROADMAP "Current execution priority" (Scene ON census 0..999 has 0
static-field commands; kernel digests identical in every census since Oct 14), `docs/cax31-session-handoff.md` (census
`sv-20261102/vis243a-evidence/census-final/{on,off}-dac9cd2fe`, gates-final census 2026-11-03/04), and the per-step
`*CensusDelta` reports. This list is by file headers and durations only: nobody has yet compared each file's assertions to
the census's coverage, so a human must confirm before deleting each one. A pin is only a deletion candidate if the census
delta would move when the pinned frame moves; a pin on a ROM receipt that no census route reaches stays.

Likely superseded (a test whose assertions are "production frames on seeds N equal committed numbers"):

| File (tests, reference ms) | What it pins | Superseding evidence |
|---|---|---|
| `sc106StatsChangeCommand` (11; 4 failed in the reference run, 41 s) | Scene ON `stats-change` command, 76 / 90 frames per path on named seeds, "base frames pinned on bddc3d69c" | Census command histogram by (type, changed fields) in `rst197CensusDelta.py`; failed in the reference run only because go246's intro hold moved its pins; re-pinned by the supervisor in `04c8ea71e` and green since |
| `sgl138SeGateLive` (6; 4 failed, 12 s) | SE-gate rows 44 / 62 on census seeds 0, 19, 808, 9, both scenes | Same census routes by construction ("proof through production on census routes"); its reference-run failure was the same go246 re-pin (`04c8ea71e`), green since |
| `sa125StatusAnimationCommand` (11, 42 s, 27 seed mentions) | Scene ON `status-animation` command frames per animation on named seeds | Census command-type / frame-field delta |
| `wth236WeatherContinues` (5, 8 s, 14 seed mentions) | Weather continues general-animation command and its frames | Census command-type delta (weather side is among the "drawn" items in ROADMAP) |
| `lsd194PrintFloorAndDrain` (12, 0.7 s, 16 seed mentions) | Leech Seed drain row layout and print floor, both scenes | `rst197CensusDelta.py` exists for this exact change (two trees both carrying the drain, no inserted commands) |
| `off148SceneOffPauses` (10, 10 s, 16 seed mentions) | Scene OFF no-hit pauses on production routes vs ROM rows | Scene OFF census command frames. Keep any case whose ROM row is not reached by a census seed |
| `trn178ActionTransition` (6, 1 s) | Scene OFF action-transition pause P = d + 6 + u | Scene OFF census frame deltas; the rule itself is documented in `docs/trn176-action-transition.md` |
| `ont193SceneOnTails` (7, 0.8 s) | Scene ON script tails of no-hit bodies, Focus Punch wait | Scene ON census command frames |
| `chg161ChargeTurnPrint` (3, 0.5 s), `enc160Receipts` (11, 1 s), `inv142StatusAnimationInvisible` (5, 0.3 s), `sst200SecondStatRows` (27, 1 s) | Row counts between prints against ROM receipts | Census print / command deltas. Cheap, so low priority |

Pins around approximate classes: `apx215SubstituteDollApproximate` (4, 4.5 s), `apx217TransformApproximate` (5, 12 s),
`apx219SpriteOrderAllocatorApproximate` (4, 9.8 s), `apx221PresentationGateApproximate` (11, 41 s),
`apx222LastStaticClassesApproximate` (11, 25 s). They pin which census-reachable bodies are drawn as "approximate" and
with what duration. The census approximate counters (reported separately from exact / faithful) supersede the counts, but
the claim-class assertions (what is approximate vs exact) are not frame pins; split before deleting.

Not candidates, even though slow: `liveDiveAttackAdapter` (233 s) and `liveDiveSetupAdapter` (103 s), the
`*ActualCore` animation tests and `summaryAllFactorySpecies` (145 s) are exact reducer / data proofs against ROM rows, not
frame pins on a route; they are candidates for speeding up (shared fixtures), not deletion. The soak pins
(`randomRoundSoak*`, `contain209*`, `contain213*`) pin the soak driver, not frames.

Time at stake in the table above: roughly 150 s of the 4,866 s summed test time, so deleting these alone does not reach
the "full suite under 15 minutes" target. The slow exact-proof files above are where that time is.


Supervisor note (2026-11-05): `sc106StatsChangeCommand` / `sgl138SeGateLive` are green on master (re-pinned in `04c8ea71e` after the
reference run); they stay out of the gate only because the durations file records them as failed. Supervisor rerun of the gate on
`1b43ab577`: 364 / 364 files, 2,928 tests, 217 s wall.
