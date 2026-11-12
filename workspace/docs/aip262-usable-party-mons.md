# aip262: the live AI view fills `usablePartyMons` per side (ISSUES #203)

Authorized source-proven gameplay correction (main/ts lane, `docs/factory-finish-scope.md`): intentional, C-cited, shared by both scene modes.
Diagnosis: `docs/aud243d-rom-driver.md` section 4B (census seed 2 ON: engine Baton Pass scored 90 vs ROM 100, tie pool 3 vs 4).

## 1. Audit and C lines

`Cmd_count_usable_party_mons` (`battle_ai_script_commands.c:1292-1334`): for AI_USER the AI-side party, for AI_TARGET the target-side party; count slots other than the on-field
index with `hp != 0`, `species != SPECIES_NONE` and not an egg. One shared helper `countUsablePartyMons(party, activePartyIndex)` (`factoryAiLiveDriver.ts`) fills both views
in `createFactoryAiViewFromLiveRules` (AI = battler 1 / opponent party, target = battler 0 / player party). Nothing else reads the helper's inputs differently.

| C site | engine consumer | status |
|---|---|---|
| `battle_ai_scripts.s` `AI_CBM_BatonPass` (user count 0 -> -10) | `runCbmBatonPass` | **fixed** (was always 0) |
| `AI_CBM_Explosion` (user 0 -> -10, target 0 -> -1) | Explosion branch | **fixed** |
| `AI_CBM_Memento` (user 0 -> -10) | Memento branch | **fixed** |
| `AI_CBM_Roar` (target 0 -> -10, else `get_ability AI_TARGET` Suction Cups read) | Roar branch | **fixed** (also reaches the ability-read RNG draw) |
| `AI_PreferBatonPass` | not ported | unchanged |

## 2. Tests

`tests/aip262UsablePartyMons.test.ts` (6 tests): the counting rule (active slot, fainted, empty, egg), the live view fill per side, Baton Pass, Memento, Explosion (0 / -10 / -1), Roar.
All fail on the unfixed tree. `tests/factoryAiLiveDriver.test.ts` view pin now carries `usablePartyMons: 0` (party-less fixture).

## 3. ROM proof (`tools/audio/romDriveSeed.sh`, evidence `.integration/evidence/aip262/chain/`)

Seed 2 ON (the aud243d lead): **23/23 matched**, engineError null, divergence null (was 0/31 at turn 1).

Aligned set rerun, all matched fully (matched / engine states, frames): 552 on 7/7 (4417); 8 on 9/9 (6750); 224 on 9/9 (7901) and off 9/9 (5487); 6 on 16/16 (11876);
177 on 8/8 (5175); 1 on 13/13 (10301) and off 13/13 (7513); 4 on 12/12 (8318) and off 12/12 (5972); 3 on 17/17 (14285) and off 17/17 (9491); 5 on 20/20 (12348) and off 20/20 (8778); 7 on 18/18 (17808).

Fresh seeds 9..20 (ON / OFF unless noted; 2 is above):

| seed | ON | OFF | note |
|---|---|---|---|
| 9 | 15/15 | 15/15 | |
| 10 | 18/18 | 18/18 | |
| 11 | 7/20 frame-cap | 7/20 frame-cap | lead B (Roar party order) |
| 12 | 18/18 | 18/18 | |
| 13 | 7/15 | 7/15 | lead C (Fire Punch 46 vs 45) |
| 14 | 16/16 | 16/16 | |
| 15 | 24/24 | 24/24 | |
| 16 | 12/12 | 12/12 | |
| 17 | 0/19 | 0/19 | lead A (gender never filled) |
| 18 | 26/26 | 26/26 | |
| 19 | 54/54 | 54/54 | |
| 20 | 7/17 | 7/17 | lead D (confusion self-hit) |

8 of 12 fresh seeds match fully in both scenes; the four divergences are not usablePartyMons (section 7).

## 4. Census delta 0..999, both scenes

Baseline arms `.integration/validation/sv-20261109/abl261/census/{on,off}-6dce29c5d`; fixed arms `.integration/evidence/aip262/census/{on,off}-e2e0b17b5`.
`tools/integration/aip262Instrument.py` patches an extracted UNFIXED tree (observation only, still returns the old result) so each Roar / Baton Pass / Explosion / Memento
scoring is logged with both counts; `tools/integration/aip262Classify.py` compares the arms (`classify/report.txt`).

| | ON | OFF |
|---|---|---|
| instrumented unfixed digests == baseline | 1000 / 1000 | 1000 / 1000 |
| changed seeds | 97 | 97 |
| seeds with a flagged scoring | 160 | 160 |
| changed but not flagged (unexplained) | **0** | **0** |
| flagged but unchanged | 63 | 63 |
| commands (baseline -> fixed) | 319,230 -> 321,553 | 313,071 -> 314,733 |

ON and OFF changed sets are identical. Flagged events: Roar 335, Baton Pass 270, Explosion 212, Memento 16. The first flagged site per changed seed is in the report.
Errors: two `frame budget` seeds in the baseline, one in the fixed arm, both scenes.

## 5. Re-pins (all caused by the AI now scoring on real party counts)

- `tests/animation/livePrep9MoveAdapters.test.ts` DREAM_EATER route seed 84; `tools/integration/fixtures/r2-gates/routes.json` seed 317 route; `tests/animation/liveRandom2R1MoveAdapters.test.ts` thrash bodies 4;
  `tests/fix122AuditDefects.test.ts` 182 -> battle 12; `tests/olnd113SceneOffPauses.test.ts` move 28 seed 9 with `tools/integration/fixtures/off108/table/classes.json` Sand-Attack `exampleSeed` 9:
  each is a census-seed pin, re-staged to the first seed that still satisfies the same class (equivalent coverage).
- `tests/factoryBrainRoundShape.test.ts` `SILVER_SEED = 4`; `tests/factoryRoundChaining.test.ts` (b) carry0 seed 1: generated-round seeds re-scanned to the lowest satisfying seed.
- `tests/issue128AbilityHistoryReceipt.test.ts` `CONTROL_DRAWS = 9`: the Roar / Suction Cups ability read consumes RNG on the control trajectory.
- **Coverage loss:** `tests/apx222LastStaticClassesApproximate.test.ts` lost the Peck 64 opponent row (no unchanged census seed carries it any more; comment in the file). Nothing else lost.

## 6. Gates

ENGINE_BUILD `eb-43a8872b3b6234fe` -> `eb-16ee24851bfb26a3` (tell the website). `npm run typecheck`, `npm run build`, `npm run build:lib` 0.
`npm run soak -- --policy vanilla --seeds 0:20 --parallel 4` (scene OFF): 20/20 OK. **Scene-ON soak (`--scene on`) NOT completed:** one run hit the 590 s timeout with no result and the 170-minute cap left no time to rerun it (abl261 ran it in ~10 min; rerun it split into 0:10 / 10:20).
Full suite on the final tree (HEAD after the docs commit; src unchanged since `7fb0eab25`, only docs after the re-pins) in 6 vitest shards (`--shard=i/6`, same flags as `npm test`, sharded because `npm test` exceeds 10 min), all green: 2175 + 2162 + 3058 + 2722 + 2322 + 1994 = **14,433 passed**, 0 failed (197 skipped).

## 7. Report-only findings (not fixed; ISSUES #204-#207)

- **A (seed 17, turn 1):** `AI_CBM_Attract` (`battle_ai_scripts.s:456-470`, `Cmd_get_gender` `battle_ai_script_commands.c:2088`): the live view never fills `gender`, so Attract is always -10 (ROM 100 vs engine 90). 16 declared view fields are unfilled.
- **B (seed 11):** the AI now really uses Roar; ROM `Cmd_forcerandomswitch` -> `SwitchPartyOrder` (`battle_script_commands.c:7364`) permutes party slots, the engine keeps original indexes, so the driver's "switch partyIndex 0" picks a fainted ROM slot and stalls to the 80000-frame cap.
- **C (seed 13, ON and OFF):** Fire Punch Alakazam -> Torterra ROM 46 vs engine 45; AI picks, RNG and totals match; not AI, cause unclassified.
- **D (seed 20, ON and OFF):** AI confusion self-hit ROM 35 vs engine 18: the known hold-item gap of abl261 section 7 (`battle_util.c:2157-2175`).
