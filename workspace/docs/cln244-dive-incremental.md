# cln244 -- Dive reducer is incremental (finish plan Cleanup 5 remainder)

Pixel-neutral performance change in `src/animation/dive.ts`. cln242's profile showed the Dive reducer re-simulating from tick 0 for every
rendered row: `diveAtAge(age)` computed `hardwareOrderAtAge`, which replayed `diveAtAgeRaw` + `sortGbaSpriteOrder` for every source age
`first..age` (O(age^2) per window; about 6.5 of every 7.7 s of a 93-row render loop).

## Change

`hardwareOrderAtAge` now reads a per-input *track*: `{ order, results[] }` where `results[k]` is the live hardware order at source age
`firstAllocationAge + k`. A query extends the track only as far as the age asked for (one raw frame + one sort per new age); an earlier or
repeated age is a lookup, so non-monotonic and repeated queries are fine. The key is `JSON.stringify([body, attackerSide, geometry,
profile])`: the order at age N is a pure fold over raw frames of ages `first..N`, and those depend on exactly those four plain-data
inputs (derived from the code: `diveAtAgeRaw` reads nothing else, no RNG, no module state), so equal-valued fresh objects share a track and
any changed field gets its own. The map is an LRU bounded at 32 tracks. The sprite-order-seed validation runs when a track is created and
throws on every call for an invalid seed (nothing is cached on throw). Each call returns a fresh copy of the array, as before.
`diveAtAgeRaw` is untouched.

Tests: `tests/cln244DiveIncremental.test.ts` compares `diveAtAge` (whole state, `toEqual`) against a verbatim copy of the old code
(`tests/helpers/cln244DiveReference.ts`, HEAD `460cd3548`) for 40 random configs (both bodies and sides, optional anchor split, slot-reuse
pools) over every age from -3 to last+8 in random order plus repeats (more than 3,000 comparisons), keying by fresh clones, fresh-array
copies, invalid-seed throws, and more than 32 distinct configs (eviction).

## Before / after (same host, `POKEBENCH_VITEST_MAX_WORKERS=5`, the eight Dive-related files run together; sum of test time per file)

| File | Before | After |
|---|---|---|
| `tests/animation/liveDiveAttackAdapter.test.ts` | 196.0 s | **15.9 s** |
| `tests/animation/liveDiveSetupAdapter.test.ts` | 99.8 s | **9.1 s** |
| `tests/animation/diveFramebufferCheckpoint.test.ts` | 12.0 s | 11.0 s |
| `tests/substituteDollDefenderLive.test.ts` | 72.5 s | 72.1 s (not a Dive file; see below) |
| `diveProductionBoundary` / `diveReducerCheckpoint` / `diveEvidenceCheckpoint` / `diveSourceCheckpoint` | 1.1 / 0.9 / 1.1 / 1.2 s | 0.7 / 0.6 / 1.0 / 1.1 s |

95 / 95 passed before and after. (There is no `liveDiveAnimation*` file in this tree.)

## Full suite

`POKEBENCH_VITEST_MAX_WORKERS=5 npm test`, unsharded: **1,023 s (17.1 min)**, 1,749 files passed, 44 skipped; 14,405 tests passed, 241 skipped,
0 failed (vitest: `transform 47 s, collect 493 s, tests 4,564 s`; cln242's summed test time was 4,731 s). So the finish-plan target of
< 15 min is still not met: this change removes about 270 s of CPU from the two Dive files (about 54 s of wall at 5 workers).
Slowest files now: `summaryAllFactorySpecies` 133.6 s, `substituteDollDefenderLive` 80.2 s, `randomRoundSoak` 73.2 s,
`shockWaveActualCore` 70.9 s, `liveSpriteOrderHost` 64.0 s, `factoryRoundBattleOrchestrator` 63.8 s, `sag130StatusSeGate` 60.0 s.

## Neutrality evidence

- `npm run typecheck`, `npm run build`, `npm run build:lib`: 0. `test:gate`: 362 files, 2,835 tests, 97.7 s.
- ENGINE_BUILD `eb-52789eb6d9c84998` before and after (dive.ts is not in the headless rollup graph; nothing moved).
- `compare:differential` (`--base 460cd3548`): `flw252-party-fade-on` 340/340, `frf250a-run-no-on` 181/181, `obr251-opponent-faint-on` 306/306
  byte-identical (827 captures). **No committed compare trace mentions Dive** (`tools/compare/traces*` has none, and `appTrace.ts` has no
  Dive stage), so the Dive pixel proof is the existing ROM-vector tests (`liveDiveAttackAdapter` 15 windows x 93 rows RGB888 sha256 vs the
  ROM, `liveDiveSetupAdapter` 9 windows x 2, `diveFramebufferCheckpoint`), all green, plus the reference test above.
- Census (`LSD194_SHARDS=0 LSD194_SPLIT=4`, HEAD arms, delta against the aud243a `858ea0343` baseline r0): Scene ON 100/100 battles identical
  (30,997 commands), Scene OFF 100/100 (30,340 commands), bad 0.

## Not done: the optional second reducer

`substituteDollDefenderLive` (80 s) was profiled (`--cpu-prof`, 89 s): self time is spread across `renderBattleResolutionLiveView` 7.1 s,
`applySpriteOrderWindow` 6.9 s, GC 6.1 s, `renderSceneOnMovePresentation` 4.2 s, `onSpriteOrderCreate` 3.4 s, `destroyLiveSprite` 3.2 s,
`knownEntryStateThrough` 2.7 s, `allocateAt` 2.5 s, `iceBeam.sourceOrderAt` 2.1 s. That is the live sprite-order provider / allocator, not
one re-simulate-from-0 reducer; it is shared engine code and not a mechanical fix, so it was left. `sortGbaSpriteOrder` itself is 1.25 s there.
