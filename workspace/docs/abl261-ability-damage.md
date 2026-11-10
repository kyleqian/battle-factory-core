# abl261: one full ability id->name resolver for the damage / accuracy / weather inputs (ISSUES #202)

Authorized source-proven gameplay correction (main/ts lane, `docs/factory-finish-scope.md`): intentional, C-cited, shared by both scene modes.
Diagnosis: `docs/aud243d-rom-driver.md` section 4A (census seeds 6 and 8 ON, ROM 108 vs engine 72 damage, Blaze).

## 1. Audit and C lines

`ABILITY_NAME_BY_ID` (`battleScriptHitChainOpcode.ts`) mapped only 8 / 14 / 55 / 62, so every other ability id reached the pure helpers as `null`.

| C site | engine consumer | status |
|---|---|---|
| `pokemon.c:3158` Huge Power / Pure Power (attack x2) | damage calc `attacker.ability` | **fixed** (id 37 / 74 now resolve) |
| `pokemon.c:3203` Thick Fat (Fire / Ice, attack x1/2) | damage calc `defender.ability` | **fixed** (47) |
| `pokemon.c:3207-3210` Plus / Minus (`ABILITY_ON_FIELD2` = `ABILITYEFFECT_FIELD_SPORT`, `battle_util.c:3111`, no hp test) | damage calc `activeBattlerAbilities` | **fixed** (57 / 58) |
| `pokemon.c:3213` Marvel Scale (needs `status1`) | damage calc `defender.ability` | **fixed** (63) |
| `pokemon.c:3219-3226` Overgrow / Blaze / Torrent / Swarm at `hp <= maxHP/3` | damage calc `attacker.ability` | **fixed** (65-68) |
| `pokemon.c:3205,3211` Hustle, Guts | damage calc | already mapped (55 / 62), unchanged |
| `battle_script_commands.c` Cmd_accuracycheck: Compound Eyes, Sand Veil, Hustle only | accuracycheck inputs | already complete (14 / 8 / 55); now through the shared resolver, no behaviour change |
| `battle_util.h:47` `WEATHER_HAS_EFFECT` = no Cloud Nine and no Air Lock, each via `ABILITYEFFECT_CHECK_ON_FIELD` (`battle_util.c:3140-3149`, requires `hp != 0`) | endturn `weatherHasEffect`, `battleScriptDamagingWeatherOpcode.ts` `battlerCarriesCloudNine`, Castform `weatherIsNullified` | **fixed**: Air Lock (77) added and a fainted carrier no longer suppresses (hp test). Air Lock has no Factory carrier, so only the hp half is reachable (one census seed) |
| `battle_util.h:48` `WEATHER_HAS_EFFECT2` (field-sport, no hp test) in CalculateBaseDamage | `weatherHasEffectForBaseDamage` | already correct, regression-guarded |
| `battle_util.c:2157-2175` confusion self-hit calls `CalculateBaseDamage` on the live record as attacker and defender | `battleScriptActionAdmission.ts` self-hit branch | **fixed**: live ability (Huge / Pure Power, Hustle, Guts, Marvel Scale, pinch abilities) and `status1` now reach the calc; a staged `confusionDamage` override still carries Guts only |

One shared resolver: `src/engine/abilityNameById.ts` (`ABILITY_NAME_BY_ID`, `abilityNameOrNull`), built from `ability-item-hooks.json` `universes.abilities`
(78 rows, ids 0..77), the same source `factoryAiLiveDriver.ts` already used (its local copy was removed; no third table). Five consumers in
`battleScriptHitChainOpcode.ts` (accuracy x2, damage x2, `activeBattlerAbilities`) and the confusion branch use it.

## 2. Tests

`tests/abl261AbilityDamage.test.ts` (10 tests): resolver size 78; Huge / Pure Power; Thick Fat on Fire / Ice only; Marvel Scale needs `status1`; Plus + Minus;
Hustle / Guts control; the four pinch abilities at hp 50 / 1 / 51 of 150 (on and off the 1/3 threshold); Cloud Nine / Air Lock suppress the rain
modifier (guard, passes on both sides); `weatherHasEffect` with Air Lock and a fainted carrier; confusion self-hit with live abilities. 7 of 10 fail on the unfixed consumers.

## 3. ROM proof (`tools/audio/romDriveSeed.sh`, evidence `.integration/evidence/abl261/`)

All rows: engineError null, frozen timeline == drive, divergence null.

| seed | scene | matched | frames | outcome |
|---|---|---|---|---|
| **6** | on | **16/16** | 11876 | lost (was diverging) |
| **8** | on | **9/9** | 6750 | won (was diverging) |
| 224 | on / off | 9/9 / 9/9 | 7901 / 5487 | lost |
| 552 | on | 7/7 | 4417 | lost |
| 177 | on | 8/8 | 5175 | lost |
| 1 | on / off | 13/13 / 13/13 | 10301 / 7513 | won |
| 3 | on / off | 17/17 / 17/17 | 14285 / 9491 | lost |
| 4 | on / off | 12/12 / 12/12 | 8318 / 5972 | lost |
| 5 | on / off | 20/20 / 20/20 | 12348 / 8778 | lost |
| 7 | on | 18/18 | 17808 | won |

Seed 6 was run twice (16/16 both). The aligned set still matches fully.

## 4. Census delta 0..999, both scenes

Baseline arms `sv-20261108/sub260/census/{on,off}-9b4332163`; fixed arms `.integration/evidence/abl261/census/{on,off}-6dce29c5d`.
Attribution: `tools/integration/abl261Instrument.py` patches an extracted UNFIXED tree (commit `e67db450a`; observation only, still returns the old result) so that every calc
where the full map / hp-aware weather rule would differ is logged per seed (sites: base damage, confusion self-hit, three weather checks);
`tools/integration/abl261Classify.py` compares the arms (report: `classify/report.txt`).

| | ON | OFF |
|---|---|---|
| instrumented unfixed digests == baseline | 1000 / 1000 | 1000 / 1000 |
| changed seeds (fixed vs baseline) | 179 | 179 |
| seeds with a flagged calc | 183 | 183 |
| changed but not flagged (unexplained) | **0** | **0** |
| flagged but unchanged | 4 | 4 |
| commands (baseline -> fixed) | 322,752 -> 319,230 | 317,361 -> 313,071 |

ON and OFF changed sets are identical (179 seeds both). Flagged calc sites: base damage 351 events, confusion self-hit 16, endturn weather 1 (seed 815: a fainted
Cloud Nine battler no longer suppresses Rain Dish). Cause of the first flagged calc per changed seed: Torrent 32+, Blaze 29+, Thick Fat 31+, Pure Power 21, Overgrow 19+,
Swarm 14+, Huge Power 10, Marvel Scale / Plus / Minus a handful, confusion self-hit (Pure Power, Huge Power, Hustle), weather 1 (counts in `report.txt`).
The 4 flagged-but-unchanged seeds (109, 354, 361, 992; Thick Fat) reach the calc only from `Cmd_openpartyscreen`'s opponent switch-in scorer
(`battleScriptOpenPartyScreenOpcode.ts`, `GetMostSuitableMonToSwitchInto` damage fallback), where the changed damage did not change the chosen mon.
Errors: the same two `frame budget` seeds (434, 796) in both arms; seed 881 (frame budget in the baseline) now finishes.

## 5. Re-pins (every one tied to an ability now applying)

The scene-parity pin passes on the unfixed parent `e67db450a`; for it and the two orchestrator seeds, restricting `abilityNameOrNull` to the old ids 8 / 14 / 55 / 62 on the fixed tree
reproduces the old value. cf78 (battle 950) and sag130 (seeds) are tied through the census: those seeds are in the changed set and flagged by the instrumented tree.

- `tests/playableAnimationLifecycle.test.ts` `verifySceneModeParity()` 467 -> 466 (40 generated Scene ON matchups; damage calc abilities).
- `tests/factoryRoundBattleOrchestrator.test.ts` generated round census `facilityRngCalls`: seed 7 1884 -> 1857, seed 16 1294 -> 1786 (battles with pinch / Thick Fat / Huge Power mons).
- `tests/cf78CastformForm.test.ts` battle 950 (a changed census seed, ON 304 -> 480 commands): Castform bodies 19 -> 21, live Castform bodies 19 -> 20 (one Castform body keeps
  declining in the new trajectory; the apx221 "19 of 19" no longer holds, a presentation follow-up), other live bodies 9 -> 22.
- `tests/sag130StatusSeGate.test.ts`, **re-staged like sub260b**: seg127's `exposure.json` projection was derived from the old census, so the changed seeds no longer match it. Seeds
  206 / 230 / 264 / 294 / 348 / 440 / 931 are replaced by the first unchanged seed of the same class (230 -> 965, 294 -> 388, 348 -> 437, 440 -> 547). **Coverage gap:** no unchanged
  census seed carries `hit-secondary|BRN|player`, `yawn|SLP|opponent` or `hit-secondary|PSN|opponent`, so those three classes leave the census anchors (12 of the 15 classes remain; 16 gated
  anchors / 125 gate frames, was 19 / 167). The ROM receipts of the rule itself (second test) are unchanged. Follow-up: regenerate `exposure.json` from the new census.
- `tools/report/ability-item-parity-census.ts` line pins `battleScriptActionAdmission.ts:2991 -> :2982` and `battleScriptHitChainOpcode.ts:1229 -> :1224`, `docs/ability-item-parity-census.md`
  regenerated (the Air Lock row 12 -> 18 sites); `docs/gate6-coverage-manifest.{json,md}` regenerated (derived from that census doc; `battleEndTurnOrchestration.ts` anchors +1 line).

## 6. Gates

ENGINE_BUILD `eb-b885d2de87ddf075` -> `eb-43a8872b3b6234fe` (tell the website). `npm run build` (runs `tsc -b`) and `npm run build:lib` 0. `npm run soak -- --policy vanilla --seeds 0:20 --parallel 4`
20/20 OK, and the same with `--scene on` 20/20 OK. Full suite in 6 vitest shards (`--shard=i/6`, same flags as `npm test`): the only failures were the five pins above, all re-pinned and re-run green;
the other shards passed unchanged.

## 7. Report-only findings (not fixed)

- The confusion self-hit calc has no hold-item inputs (C passes the live `gBattleMons` record, so `holdEffect` also reaches `CalculateBaseDamage`, e.g. Choice Band / type boosters; `battle_util.c:2157-2175`).
- Future Sight's Plus / Minus `fieldAbilities` list applies an hp filter that C's `ABILITY_ON_FIELD2` does not have.
- Air Lock has no Factory carrier, so the Air Lock additions are inert there.
