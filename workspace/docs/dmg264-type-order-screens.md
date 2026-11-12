# dmg264: type effectiveness in ROM row order (ISSUES #206) and Reflect / Light Screen in the live damage calc (ISSUES #208)

Authorized source-proven gameplay correction (side lane, `docs/factory-finish-scope.md`); shared by both scene modes. Diagnosis: `docs/dia263-leads.md`.

## 1. Source and sites

| C | what | engine | status |
|---|---|---|---|
| `Cmd_typecalc` `battle_script_commands.c:1355-1415` + `ModulateDmgByType` `:1321` | walk `gTypeEffectiveness` in ROW order; a row applies when its attacker type is the move type and its defender type is type1, or type2 if type1 != type2; truncate (`dmg*mult/10`, floor to 1) per row; TYPE_FORESIGHT row: `break` if the defender has Foresight, else skip | `typecalcOpcodeHandler` (`battleScriptHitChainOpcode.ts`) | **fixed** |
| `TypeCalc` `:1536-1591` (AI switch-in candidate damage, `battle_ai_switch_items.c:723`) | same loop, damage | `typeCalcCandidateDamage` (`battleAiSwitchInto.ts`) | **fixed** |
| `Cmd_typecalc2` `:4500-4593` | same walk, only ORs flags (break on a x0 row) | `typecalc2OpcodeHandler` | **fixed** (walk order; flags are order-independent in practice, kept faithful) |
| damage sims of the AI (`calculateBaseDamage -> applyStab -> applyTypeEffectiveness`) | same loop on real damage | `applyTypeEffectiveness` (`damageCalc.ts`), used by `factoryAiTryToFaint.ts:134`, `factoryAiCheckViability.ts:2878`, the soak driver and the probes | **fixed** |
| `AI_TypeCalc` `:1594`, `ModulateByTypeEffectiveness` (`battle_ai_switch_items.c:605`), `Cmd_if_type_effectiveness` | same loop but starting at 10 / 40 / 60 and only multiples of 10 are reachable (x2, x0.5, x0), so the order cannot change the result | `computeAiEffectiveness`, `typeMultiplierTenths`, `factoryAiSwitchPolicy.typeMultiplier`, `battleAiSwitchInto.modulateByTypeEffectiveness` / `moveIsSuperEffectiveAgainst` | unchanged (order-independent) |
| `CheckWonderGuardAndLevitate` `:1426` | flags only, set membership | `checkWonderGuardAndLevitate` | unchanged (order-independent) |

One shared helper, `matchingTypeEffectivenessRows(moveType, [t1, t2], table, hasForesight)` in `damageCalc.ts`, returns the matching rows in table order (`type-effectiveness.json` is already in ROM order,
including the TYPE_FORESIGHT sentinel). `applyTypeEffectiveness` gained an optional `hasForesight`. Fire Punch 47 on Rock/Grass: ROM Grass x2 then Rock x0.5 = 47 (then 98% = 46); the old
defender order gave 23 -> 46 (then 45).

#208: `Cmd_damagecalc` (`:1288`), `Cmd_stockpiletobasedamage` (`:6879`), `AI_CalcDmg` (`:1309`) and Future Sight (`:8941`) all pass `gSideStatuses[GET_BATTLER_SIDE(target)]` into `CalculateBaseDamage`; Reflect
(`pokemon.c:3267`) / Light Screen (`:3318`) halve physical / special damage only when `gCritMultiplier == 1` (singles: `damage /= 2`). `calculateBattleScriptBaseDamageWithPowerForCurrentMove` (shared by damagecalc and
stockpiletobasedamage) now passes the defender side's `SIDE_STATUS_REFLECT` / `LIGHTSCREEN`; Future Sight already did. Confusion self-hit passes `sideStatus = 0` (`battle_util.c:2173`, `:4023`), so it correctly gets no
screens. NOT changed: the AI damage sims (`factoryAiTryToFaint.ts` `calculateBaseDamage`, C `AI_CalcDmg` does pass the side status) need the target side's Reflect / Light Screen in the AI view, which is `targetSideReflectUp` (#204 rank 10) and the
unfilled user-side `reflectUp` fields; left to #204. The doubles 2/3 branch stays unmodeled (singles-only engine).

## 2. Tests: `tests/dmg264TypeOrderScreens.test.ts` (11 tests, 6 fail on the unfixed tree)

`applyTypeEffectiveness(47, FIRE, [ROCK, GRASS])` and `[GRASS, ROCK]` both 47 (multiplier 10); matched rows in ROM order; 4x (Grass+Bug -> 188) and 0.25x (Water+Rock -> 11) both orders; mono-type once, Foresight ends the walk before the Ghost
immunity rows; the live `typecalc` opcode on Fire Punch vs Rock/Grass both orders = 47 with no NVE/SE flag; Foresight vs Ghost/Steel keeps the Steel row; typecalc2 does not touch damage; Reflect halves a physical (Normal) hit and not a special one,
Light Screen the reverse, neither on a crit, only the defender side's flags count.

## 3. ROM proof (`tools/audio/romDriveSeed.sh`, evidence ignored `.integration/evidence/dmg264/`)

All rows: engineError null, frozen timeline == drive, divergence null.

| seed | scene | before | now |
|---|---|---|---|
| **13** | on / off | 7/15 (on) | **15/15 / 15/15** (outcome 2, frames 12737 / 8759) |
| **28** | on / off | 15/17 | **19/19 / 19/19** (frames 13387 / 9715) |
| 1, 3, 4, 5, 224 | on / off | full | 13/13, 17/17, 12/12, 20/20, 9/9 both scenes |
| 6, 8, 552, 177, 7, 2 | on | full | 16/16, 9/9, 7/7, 8/8, 18/18, 23/23 |

Seeds 13 and 28 now run to the battle end with no next divergence.

## 4. Census delta 0..999 (both scenes)

Baseline arms `sv-20261109/aip262/census/{on,off}-e2e0b17b5` (src identical to this base); fixed arms `.integration/evidence/dmg264/census/{on,off}-9dddc1aa2`. Attribution:
`tools/integration/dmg264Instrument.py` patches an extracted UNFIXED tree (`HEAD~1` of the fix, observation only: still returns the old result) and logs every calc where row order or the defender side's screens would change it
(sites: base damage with / without screens; typecalc / typecalc2 against a copy of the same handler with the fixed loop; `applyTypeEffectiveness`; AI switch-in candidate damage); `tools/integration/dmg264Classify.py`
compares (report `classify/report.txt`; runner `dmg264InstrumentedCensus.sh`).

| | ON | OFF |
|---|---|---|
| instrumented unfixed digests == baseline | 1000 / 1000 | 1000 / 1000 |
| changed seeds | 190 | 181 |
| seeds with a flagged calc | 298 | 298 |
| changed but not flagged (unexplained) | **0** | **0** |
| flagged but unchanged | 108 | 117 |
| flagged events | screens 217, typecalc 223, applyTypeEffectiveness 676, AI switch candidate 138 | same |
| first flagged site per changed seed | typecalc 68, screens 94, applyTypeEffectiveness 16, AI switch 12 | 61, 94, 15, 11 |
| commands, all seeds | 321,553 -> 324,219 | 314,733 -> 317,403 |

ON vs OFF: the 181 OFF-changed seeds are all ON-changed. The 9 extra ON-only seeds (61, 182, 189, 190, 434, 477, 756, 821, 899) have byte-identical command lists in both arms and differ only in the ON `eventsDigest`
(presentation events; all 9 are flagged). Errors: the same one budget error seed per arm (434-class) in baseline and fixed. Flagged-but-unchanged seeds are calcs whose changed value did not alter a decision / HP outcome
(AI sims, KO-irrelevant 1-HP differences).

## 5. Test fallout and gates (dmg264b)

Test re-pins / re-stages on the fixed tree (no engine change; no assertion weakened):

| file | what | why |
|---|---|---|
| `gate6CoverageManifest` / `abilityItemParityCensus` (source-line repin + manifest regen) | 7384bd9a2 | the fix moved the pinned source lines of `damageCalc.ts` / `battleScriptHitChainOpcode.ts` |
| `wth236WeatherContinues` Rain / Sun census seeds | 7a2e4f900 (0 / 29 -> 20 / 35) | the originals are changed census seeds |
| `olnd113SceneOffPauses` two-turn charge (Razor Wind) | example census seed 201 -> **353** (`EXAMPLE_SEED_OVERRIDE`; off108's fixture is untouched) | seed 201 is changed by the fix and no longer reaches the charge. The assertion is a per-class source-timing claim (ROM scenario `off108-razor-wind-ply-primeape-snorlax`: N's command at G + 1 + 42, P = 42, no live animation), not seed history. A scan of seeds 0..499 (Scene OFF) finds the charge on 250, 265, 353, 375; seed 353 has three uses and all three start N on exactly 42 and keep the pause-command checks, so the claim is kept as is |
| `sag130StatusSeGate` CONFUSION\|player carrier | 437 -> **856** (abl261 precedent) | 437 is changed by the fix and no longer matches seg127's exposure projection. 856 is the next projected carrier; the per-open-receipt animation / side / path / gate equality and all 12 required gated classes still hold (245 anchored, 16 gated, 143 gate frames). No coverage gap |

Gates (worktree `worker/side-20261110-213051`, evidence ignored `.integration/evidence/dmg264b/`):

- `npm run typecheck`: 0.
- Full suite as 8 sequential `npm test -- --shard=i/8` runs (4 workers, one vitest at a time): all exit 0, **1,754 files / 14,443 tests passed**, 0 failed (44 files / 242 tests skipped).
- `npm run build`: 0. `npm run build:lib`: 0.
- `npm run soak -- --policy vanilla --seeds 0:20`: **OK 20, CRASH 0, HANG 0**. Same with `--scene on`: **OK 20, CRASH 0, HANG 0**.
