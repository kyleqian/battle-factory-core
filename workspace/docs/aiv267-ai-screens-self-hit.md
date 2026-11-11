# aiv267: AI damage sims see the target's screens; the confusion self-hit sees the battler's hold item (ISSUES #204 item 1, #207)

Authorized source-proven gameplay corrections (main/ts lane, `docs/factory-finish-scope.md`): intentional, C-cited, shared by both scene modes. Battle Scene OFF is the oracle.
Leads: `docs/aiv266-ai-view-fields.md` section 6 (AI damage sims), `docs/abl261-ability-damage.md` section 7 and `docs/aip262-usable-party-mons.md` (seed 20 self-hit 35 vs 18).

## 1. The two fixes

**Fix A: AI damage sims pass the target side's Reflect / Light Screen.** C `AI_CalcDmg` (`battle_script_commands.c:1306-1309`) calls
`CalculateBaseDamage(&gBattleMons[attacker], &gBattleMons[defender], move, gSideStatuses[GET_BATTLER_SIDE(defender)], ...)`, so a screen on the defender's side halves the non-crit estimate
(`pokemon.c:3106`, the `sideStatus` argument). Callers: `get_how_powerful_move_is`, `if_can_faint`, `if_cant_faint` and the AI-switch scorer; the only one the engine models with a real calc is the
TryToFaint sim (`factoryAiTryToFaint.ts` `estimateDamage`; the engine switch fallback is a `baseDamage: 0` stub, `factoryAiLastCalcMovePower` is presentation-only, both unchanged).
- `FactoryAiTryToFaintTarget` gains `targetSideReflectUp` / `targetSideLightScreenUp`, passed as `sideStatusReflect` / `sideStatusLightScreen` into `calculateBaseDamage`.
- `factoryAiDecisionPolicy.ts` carries a new `targetSideLightScreenUp` in the scored target view (`targetSideReflectUp` existed since aiv266).
- `createFactoryAiViewFromLiveRules` fills it from `rulesContext.sideStatuses[0]` (the player side, the AI's target side), same site as `targetSideReflectUp`.
- The compile-time `Required<T>` samples in `tests/factoryAiScoredWiringParity.test.ts` now force the field to be populated and carried.

**Fix B: the confusion self-hit sees the live battler's hold item.** `battle_util.c:2157-2175` calls `CalculateBaseDamage(&gBattleMons[b], &gBattleMons[b], MOVE_POUND, 0, 40, 0, b, b)`: the same live
record is attacker and defender, so `holdEffect` / `holdEffectParam` (and the species, for Thick Club / Light Ball / Metal Powder / Soul Dew / DeepSeaTooth) apply in BOTH roles.
`battleScriptActionAdmission.ts` (the `ABILITY_GUTS` confusion branch) now passes `species`, `holdEffect` (via `resolveBattleScriptBattlerHoldEffect`) and `holdEffectParam` (via
`resolveBattleScriptBattlerHoldEffectParam`) to both roles, plus `isFrontierBattle` from `battleTypeFlags & BATTLE_TYPE_FRONTIER` (Soul Dew is disabled in the Frontier; `BATTLE_TYPE_FRONTIER` is now exported).
A staged `confusionDamage` override keeps carrying no item (existing staged pins unchanged). `battle_util.c:4023` is disobedience, not used in the Factory.

## 2. Tests (`tests/aiv267AiScreensSelfHit.test.ts`, 13 tests, 9 fail unfixed)

| fix | test | fails unfixed |
|---|---|---|
| A | Reflect halves a physical estimate (can-faint boundary 19 -> 10) | yes |
| A | Light Screen halves a special estimate (43 -> 22) | yes |
| A | wrong screen does nothing (Light Screen leaves physical 19, Reflect leaves special 43) | no (guard) |
| A | `get_how_powerful_move_is` ranks the moveset with the screened estimates | yes |
| A | live view: `targetSideLightScreenUp` / `targetSideReflectUp` come from the player side (`sideStatuses[0]`) only | yes |
| A | end to end: Reflect on the player side stops Tackle being scored as a faint (target hp 12) | yes |
| B | no item: 19 (control, Pound 40 at 100/100 L50) | no (control) |
| B | Choice Band 28 | yes |
| B | Silk Scarf (Normal power, param 10) 21 | yes |
| B | Thick Club on Marowak 37 (inert on Pikachu, 19) | yes |
| B | Metal Powder on Ditto, defender role of the same mon: 10 | yes |
| B | Light Ball (special only) stays 19; Soul Dew suppressed in a Frontier battle stays 19 | no (guard) |
| B | staged `confusionDamage` override stays 19 | no (guard) |

`tests/factoryAiScoredWiringParity.test.ts` samples carry the new field (compile-time guard).

## 3. ROM proof (`tools/audio/romDriveSeed.sh`, evidence `.integration/evidence/aiv267/rom/`)

Matched / engine states, divergence null and engineError null in every full-match row.

| seed | scene | result |
|---|---|---|
| 20 | ON / OFF | **15/15** / **15/15** (was a divergence at the first confusion self-hit, ROM 35 vs engine 18) |
| 22 | ON | 8/20, unchanged (ROM Explosion +1 / engine Earthquake -10) |
| 30 | ON | 6/11, unchanged (RNG differs after the same Giga Drain pick) |
| 39 | ON | 9/11, unchanged (ROM Brick Break vs engine Earthquake) |

Seeds 22 / 30 / 39 are the unclassified residuals of ISSUES #204 and are not explained by these fixes (out of scope). Regression set ON, all still match fully with divergence null:
1 13/13, 3 17/17, 4 12/12, 5 20/20, 6 16/16, 8 9/9, 11 18/18, 13 15/15, 17 16/16, 26 16/16, 28 19/19, 31 34/34, 224 9/9, 552 7/7.

## 4. Census delta 0..999, both scenes

Baseline arms `.integration/evidence/aiv266/census/{on,off}-40447d9de`; fixed arms `.integration/evidence/aiv267/census/{on,off}-5682cd341`
(`LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4 tools/integration/lsd194Census.sh`). `tools/integration/aiv267Instrument.py` patches an extracted UNFIXED tree (observation only, still decides with the old code):
at every scored AI decision it also builds the FIXED view and scores it with the FIXED chooser on the same RNG (an event per decision whose target side has a screen up or whose scores / pick / RNG
differ); at every confusion self-hit it recomputes the damage with the live battler's hold item and logs when it differs. `tools/integration/aiv267Classify.py` compares the arms (`classify/report.txt`).

| | ON | OFF |
|---|---|---|
| instrumented unfixed digests == baseline | 1000 / 1000 | 1000 / 1000 |
| changed seeds | **8** | **8** |
| changed seeds explained by fix B (differing self-hit) | 8 | 8 |
| changed seeds explained by fix A only | 0 | 0 |
| changed, unexplained | **0** | **0** |
| seeds with a target-side screen decision (fix A) | 46 (226 decisions: 79 Reflect, 147 Light Screen) | same |
| fix A decisions whose scores / pick / RNG differ | 1 (seed 377, Light Screen, slot 0 score only: same pick, battle unchanged) | same |
| self-hits that differ (fix B) | 13 in 8 seeds: Silk Scarf-class `NORMAL_POWER` 8, `THICK_CLUB` 3, `CHOICE_BAND` 2 | same |
| commands, all seeds (baseline -> fixed) | 321,176 -> 320,998 | 314,449 -> 314,283 |
| errors (baseline / fixed) | 1 / 1 | 1 / 1 |

ON and OFF changed sets are identical: 245, 379, 682, 743, 816, 829, 911, 946. Command lists change in the same 6 (245, 682, 743, 816, 829, 911); 379 and 946 change only their event digest
(Pound damage 30 -> 32 and 12 -> 13 with an unchanged command shape). Per-seed self-hit: 245 30 -> 33, 379 30 -> 32, 682 30 -> 33 x3, 743 47 -> 70 x2 (Choice Band), 816 30 -> 33,
829 30 -> 32, 911 21 -> 41 x3 (Thick Club), 946 12 -> 13. `tools/integration/rst197CensusDelta.py` agrees (992 / 1000 identical battles per scene, 8 digest changes).
Fix A is exercised in the census (46 seeds see a target-side screen on a scored decision) but its score-only difference rarely flips a pick: the only outcome-differing decision (377) leaves the battle unchanged.
Seed 20 (the ROM lead) is not a census seed: the census player policy never reaches that path.

## 5. Re-pins

- `tests/factoryRoundBattleOrchestrator.test.ts` (census-anchored RNG-call pins; fix B only: with `battleScriptActionAdmission.ts` reverted all 56 tests pass): the post-ShouldSwitch round census
  seeds 4 1525 -> 1590, 26 1669 -> 1483, 29 1506 -> 1478; seed 17's seven-win round `facilityRngCalls` 1738 -> 1824; the challenge-2 chain (challenge-1 terminal cursor 1188296587 -> 1931463501,
  segment call ends 329 / 573 -> 279 / 459 and their cursors, rental set ids, `trainerId` 113 -> 87 with opponents [245, 212, 248], terminal cursor 1344913182 -> 2671237774). Shape (two contiguous
  segments, rank-1 rentals, seven wins) unchanged; every assertion kept, only the values move.
- `tools/report/ability-item-parity-census.ts` pinned line numbers: `battleScriptActionAdmission.ts` `ABILITY_GUTS` site -> :2984, `factoryAiTryToFaint.ts` `ABILITY_LEVITATE` -> :141 / :169; the census doc is unchanged after regeneration.
- `docs/gate6-coverage-manifest.{json,md}` regenerated (the new test references `SIDE_STATUS_REFLECT` / `SIDE_STATUS_LIGHTSCREEN`).
- No coverage gap: the changed census seeds (245, 379, 682, 743, 816, 829, 911, 946) carried no other pinned class.

## 6. Gates

ENGINE_BUILD `eb-6e0938c0ec978db5` -> `eb-9d34d28f1b19ef3d` (read from dist; tell the website). `npm run typecheck`, `npm run build`, `npm run build:lib` 0.
Full suite as 8 sequential `npm test -- --shard=i/8` runs on the final src (one shard-4 failure set and one shard-3 gate6-manifest failure were re-pinned / regenerated, then re-run green; the tests that read
ISSUES.md / PROGRESS.md / docs were re-run after the final doc edits, 13 files / 614 tests): 1523 + 1548 + 1741 + 2577 + 2298 + 1674 + 1506 + 1612 = **14,479 passed, 0 failed** (1,756 files).
`npm run soak -- --policy vanilla --seeds 0:20 --parallel 4`: scene OFF **20 / 20**, scene ON **20 / 20** (run as 0:10 and 10:20), all `budget`.

## 7. Seeds 41..60 ON (diagnosis only, no src changes; `tools/audio/romDriveSeed.sh SEED on`, evidence `.integration/evidence/aiv267/rom41/`)

Matched / engine states; divergence null in every full-match row, engineError null everywhere. Row tuple = `[frame, gCurrentMove, hp0, hp1, rng, lastMove0, lastMove1]`; the class is read from the
first diverging row only and is NOT root-caused (new ISSUES leads, not fixes).

| seed | matched / total | first divergence class |
|---|---|---|
| 41 | 43/43 | full match |
| 42 | 9/16 | RNG differs at equal HP and equal last moves ([0,89]): engine rng 2269102690 vs ROM 2191460427 after an AI Earthquake (89) KO of the player mon; stream already shifted (candidate: a missing / extra draw earlier in the turn) |
| 43 | 27/27 | full match |
| 44 | 11/11 | full match |
| 45 | 25/25 | full match |
| 46 | 27/27 | full match |
| 47 | 42/42 | full match |
| 48 | 21/21 | full match |
| 49 | 12/12 | full match |
| 50 | 18/25 | HP differs: engine [169, 144] vs ROM [159, 25] (the ROM's opponent mon took far more damage; last moves [80, 0] vs [80, 35]): a damage / move-result class |
| 51 | 10/10 | full match |
| 52 | 11/11 | full match |
| 53 | 4/9 | outcome differs on Aerial Ace (332): engine KOs the player mon (hp [0, 85]), ROM does not (hp [35, 96]): hit / crit / damage class |
| 54 | 8/8 | full match |
| 55 | 18/18 | full match |
| 56 | 9/9 | full match |
| 57 | 6/11 | last moves differ (engine [329, 280] vs ROM [0, 157]) with player hp 63 vs 201: an earlier move-pick / active-mon difference (AI pick class) |
| 58 | 27/27 | full match |
| 59 | 33/33 | full match |
| 60 | 36/82 | decision-shape: the ROM asks for a switch the engine did not issue (drive stops "party menu without a switch decision" after 57 of 82 decisions); last moves differ ([92, 165] vs [135, 79]) at equal hp [321, 177] |

15 of 20 seeds match to battle end (41, 43..49, 51, 52, 54..56, 58, 59), 5 diverge (42, 50, 53, 57, 60). Whether any of the five involves a confusion self-hit or a screen was not checked.
