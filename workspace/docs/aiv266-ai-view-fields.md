# aiv266: the live AI view fills its 16 declared fields (ISSUES #204)

Authorized source-proven gameplay correction (main/ts lane, `docs/factory-finish-scope.md`): intentional, C-cited, shared by both scene modes.
Diagnosis and ranking: `docs/dia263-leads.md`; the first live hit was aip262 seed 17 (`gender`). Code: `createFactoryAiViewFromLiveRules`
(`src/engine/factoryAiLiveDriver.ts`), plus two tiny exports (`speciesAbilityNames` in `factoryAiCheckBadMove.ts`, `resolveBattleScriptItemHoldEffect` in
`battleScriptRulesContext.ts`). Battle Scene OFF is the oracle.

## 1. Field table (all 16 filled)

`gActiveBattler == sBattler_AI` while scoring, so AI_USER = battler 1 (the opponent), AI_TARGET = battler 0 (the player). The consumer side and compared value were
read in the engine before filling (`factoryAiDecisionPolicy.ts` ~1030-1245 passes each field to CBM / Viability unchanged).

| field | C site (`battle_ai_script_commands.c`) | engine fill (`factoryAiLiveDriver.ts`) | test (`tests/aiv266AiViewFields.test.ts`) | status |
|---|---|---|---|---|
| `gender` (both) | `Cmd_get_gender` :2088-2099, `GetGenderFromSpeciesAndPersonality` | :418, :483 (`aiGender`) | rank 1 (3 tests) | filled |
| `anyMoveDisabled` (target) | `Cmd_if_any_move_disabled_or_encored` :1973-1996, AI_TARGET | :492 | rank 2 (3) | filled |
| `anyMoveEncored` (target) | same | :493 | rank 2 | filled |
| `isParalyzed` / `isPoisoned` / `isBurned` (target) | `Cmd_if_status` / `Cmd_if_not_status` AI_TARGET (Facade's kept @BUG, Smelling Salt) | :488-490 | rank 3 (3) | filled (toxic stays `isToxicPoisoned`) |
| `holdEffect` (user) | `Cmd_get_hold_effect` AI_USER :2044-2056: `GetItemHoldEffect(gBattleMons[].item)` | :420 | rank 4 (2) | filled |
| `holdEffect` (target) | AI_TARGET: `BATTLE_HISTORY->itemEffects[target]` passed through `GetItemHoldEffect` as an item id (source quirk kept) | :486 | rank 4 | filled |
| `targetSideReflectUp` | `Cmd_if_side_affecting` AI_TARGET :881-896, the target's own side | :494-496 | rank 5 (3) | filled |
| `mistUp` | `Cmd_if_side_affecting` AI_USER (AI side), `AI_CBM_Mist` | :424 | rank 5 | filled |
| `stockpileCount` | `Cmd_get_stockpile_count` AI_USER :2116 | :421 | rank 6 (2) | filled |
| `speciesAbilities` | `Cmd_get_ability` :1350-1396 two-ability guess (`species-stats.json`) | :482 | rank 7 (1) | filled |
| `targetPartyStatusEqualsAny` | `Cmd_if_status_in_party` :1568-1598, exact `==` against `STATUS1_ANY`, live non-egg slots, whole target party | :498 (`partyHasStatusEqualToAny`) | rank 8 (2) | filled |
| `usedHeldItemId` | `Cmd_get_used_held_item` :2137-2149, low byte of `usedHeldItems[AI]` | :423 | rank 9 (3) | filled |
| `imprisonedOthers` / `mudSportUp` / `waterSportUp` | `Cmd_if_status3` AI_USER bits 13 / 16 / 17 | :425-429 | rank 9 | filled |

22 tests; all 3 gender tests and 17 others FAIL on the unfixed tree (20 of 22; the 2 passing are guards that a user's own state does not fill the target fields).
`tests/factoryAiLiveDriver.test.ts` staged view pin carries the new fields (hand-computed from species ratios / personality bytes).
Consequence worth knowing: `speciesAbilities` now reaches the Viability `ChangeSelfAbility` handler, so its `Cmd_get_ability` guess `Random() & 1` is drawn as in the ROM.

## 2. ROM proof (`tools/audio/romDriveSeed.sh`, evidence `.integration/evidence/aiv266/rom/`)

Matched / engine states, engineError null in every row. Before = dia263 / aip262 numbers.

| seed | scene | before | after | frames |
|---|---|---|---|---|
| 11 | ON / OFF | 10/20 | **18/18** / **18/18** | 14389 / 9459 |
| 17 | ON / OFF | 0/19 | **16/16** / **16/16** | 12384 / 7930 |
| 26 | ON / OFF | 8/16 | **16/16** / **16/16** | 19800 / 12711 |
| 31 | ON | 1/34 | **34/34** (bonus) | 35171 |
| 27 | ON | 3/20 | **20/20** (bonus) | 16443 |
| 32 | ON | 22/23 | **23/23** (bonus) | 17227 |
| 22 | ON | 8/20 | 8/20 (unchanged) | |
| 30 | ON | 6/11 | 6/11 (unchanged) | |
| 39 | ON | 9/11 | 9/11 (unchanged) | |

Regression set ON, all still match fully with divergence null: 1 13/13, 3 17/17, 4 12/12, 5 20/20, 6 16/16, 8 9/9, 13 15/15, 28 19/19, 224 9/9, 552 7/7.
Seeds 22, 30, 39 are not view fields (ISSUES #204 residuals).

## 3. Census delta 0..999, both scenes

Baseline arms `.integration/validation/sv-20261109/dmg264/census/{on,off}-9dddc1aa2` (src identical to `32c671d17`); fixed arms `.integration/evidence/aiv266/census/{on,off}-40447d9de`
(`LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4 tools/integration/lsd194Census.sh`). `tools/integration/aiv266Instrument.py` patches an extracted UNFIXED tree (observation only,
still decides on the old view): at every scored AI decision (mask != 0) it also builds the fixed view and runs the same scored chooser on it with the same RNG, logging the fields
whose new value differs from the old default and whether scores / pick / RNG differ. `tools/integration/aiv266Classify.py` compares the arms (`classify/report.txt`).

| | ON | OFF |
|---|---|---|
| instrumented unfixed digests == baseline | 1000 / 1000 | 1000 / 1000 |
| changed seeds | **57** | **57** |
| seeds with a field-differing decision | 712 | 712 |
| seeds with an outcome-differing decision (scores / pick / RNG) | 75 | 75 |
| changed but no outcome-differing decision (unexplained) | **0** | **0** |
| outcome-differing but unchanged battle | 18 | 18 |
| commands, all seeds (baseline -> fixed) | 324,219 -> 321,176 | 317,403 -> 314,449 |
| errors (baseline / fixed) | 1 / 1 | 1 / 1 |

ON and OFF changed sets are identical (57 seeds, command lists changed in the same 57). Fields present in outcome-differing decisions: gender (433 decisions, every decision
differs by it), holdEffect 360, usedHeldItemId 90, isParalyzed 50, anyMoveDisabled 5, anyMoveEncored 5, isPoisoned 2. Per changed seed the first outcome-differing decision's field set:
51 gender + holdEffect only, 2 + usedHeldItemId, 2 + isParalyzed, 1 + anyMoveDisabled, 1 + anyMoveEncored. Changed seeds: 17, 26, 34, 52, 61, 83, 87, 96, 106, 109, 110, 118, 119, 167,
168, 194, 203, 262, 266, 271, 275, 341, 350, 355, 394, 439, 493, 506, 510, 511, 528, 533, 563, 564, 654, 666, 684, 702, 710, 715, 720, 747, 760, 790, 795, 805, 859, 881, 903, 912,
916, 924, 956, 957, 960, 965, 997.
Gender is present in every flagged decision, so field attribution within a decision is by set, not by ablation; a decision is explained when the whole fixed view changes its outcome.

## 4. Re-pins

- `tests/land75HiddenBattler.test.ts` seed 533: `turnBoundariesCompared` 64 -> 68 (changed census seed; run on both trees: same `orderStopsOn` `no EXACT plan: body 240:opponent`, same 26 Dig / Double Team bodies known, same Fly hidden state). Every other assertion unchanged.
- `tests/sag130StatusSeGate.test.ts`: seed 965 changed, and the other projected `yawn|SLP|player` carriers (230, 381, 804) were already moved by abl261 / dmg264 (checked: 381 and 804 fail the projection). **Coverage gap:** that class drops out of the census anchors (seed removed, class removed from the required list, comment in the file); the ROM receipts of the rule stay in the second test. Regenerating seg127 `exposure.json` from the new census restores it.
- `tools/report/ability-item-parity-census.ts` pinned recovery-site lines in `factoryAiCheckBadMove.ts` shifted +7 (735 / 790 / 1339 / 2710 -> 742 / 797 / 1346 / 2717); no new site, doc unchanged.
- `docs/gate6-coverage-manifest.{json,md}` regenerated (the new test now references `SIDE_STATUS_REFLECT` / `SIDE_STATUS_MIST`).

## 5. Gates

ENGINE_BUILD `eb-16ee24851bfb26a3` -> `eb-6e0938c0ec978db5` (tell the website). `npm run typecheck`, `npm run build`, `npm run build:lib` 0.
Full suite as 8 sequential `npm test -- --shard=i/8` runs on the final tree: 1523 + 1548 + 1741 + 2577 + 2298 + 1674 + 1498 + 1607 = **14,466 passed, 0 failed** (1,755 files).
`npm run soak -- --policy vanilla --seeds 0:20 --parallel 4`: scene OFF **20 / 20**, scene ON **20 / 20** (run as 0:10 and 10:20), all `budget`.

## 6. Report-only findings (not fixed)

- **Attract, female user (ISSUES #204 (3)):** `AI_CBM_Attract_End` is `if_equal FALSE, Score_Minus10` and `MON_MALE == 0 == FALSE` (`battle_ai_scripts.s:507-508`), so a female user scores -10 against every
  target; `runCbmAttract` (`factoryAiCheckBadMove.ts` ~3558) returns 0 for a female user against a male target. No ROM seed exercises it (11 / 17 / 26 match without it); it would move census seeds. Patch kept out of the tree.
- **AI damage sims** still ignore Reflect / Light Screen (view fields are filled, `factoryAiTryToFaint.ts` does not read them).
- **Seeds 22, 30, 39 ON** still diverge (AI scoring, not view fields).
