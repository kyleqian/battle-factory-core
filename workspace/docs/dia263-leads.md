# dia263: verdicts for ISSUES #204-#206 (diagnosis; no `src/` change)

Evidence (ignored): `.integration/evidence/dia263/` (`11-{on,off}.*`, `13-on.*`, `step13.json`, `ram11.json`, `declared.txt`, `build.txt`).
Recipe: `tools/audio/romDriveSeed.sh SEED on|off .integration/evidence/dia263`.

## #205 (seed 11): verdict (a), DRIVER mapping bug only; fixed in `tools/` (da57e0f93)

- ROM: `Cmd_forcerandomswitch` -> `SwitchPartyOrder` (`battle_main.c:4086`) permutes only `gBattleStruct->battlerPartyOrders` / `gBattlePartyCurrentOrder` (3 bytes, 2 nibbles each, high nibble = even menu slot); `UpdatePartyToFieldOrder` / `UpdatePartyToBattleOrder` (`party_menu.c:5854-5855`, `:6051-6089`) reorder `gPlayerParty` only while the menu is open. Gameplay stays in party-id space, which is what the engine's `partyIndex` is.
- Driver bug: it moved the party-menu cursor to `slot == partyIndex`; after Roar menu slot != party id, so it picked the wrong (fainted) slot and stalled to the 80000-frame cap.
- Fix: `menu_slot_for_party_id(order, party_index)` in `tools/audio/romDecisionDriver.py` (finds the nibble holding the party id), `observe()` in `tools/audio/soundEventProbe.py` now reports `partyOrder` (`gBattlePartyCurrentOrder`, 3 bytes). Tests in `tools/test_rom_decision_driver.py` (order `[0x10,0x23,0x45]` -> slots `[1,0,2,3,4,5]`, identity order, missing order, DOWN-to-slot-1 then A, `lastObs["partyOrder"]`): 21 pass.
- Re-drive seed 11 ON/OFF: reaches battle end, 10/20 matched both scenes. Next divergence (turn 8): ROM Jolteon uses Attract (213), engine Thunder Wave (86) = #204 (gender), not new. No engine gameplay bug.

## #206 (seed 13, Fire Punch ROM 46 vs engine 45): type-multiplier ORDER

Single-stepped the ROM through `Cmd_damagecalc` -> `Cmd_typecalc` -> `Cmd_adjustnormaldamage`; every input equal until `Cmd_typecalc`.

| stage | ROM | engine |
|---|---|---|
| damage after `Cmd_damagecalc` (crit, dmgMultiplier) | 47 | 47 |
| type step 1 | Grass x2 -> 94 | Rock x0.5 -> 23 |
| type step 2 | Rock x0.5 -> 47 | Grass x2 -> 46 |
| random factor (`ApplyRandomDmgMultiplier`, 98%) | 46 | 45 |

Random factor 98 verified by the LCG (rng 3233736231 -> 613564686, 9362 % 16 -> 98): identical on both sides.

- First differing term: the per-type multiplier **order**. C: `Cmd_typecalc` (`battle_script_commands.c:1355-1415`) walks `gTypeEffectiveness` in TABLE order, calling `ModulateDmgByType` (`:1321`), which truncates after each step (`damage = damage * mod / 10`); each table row that matches the move type and either defender type is applied in table order (also `TypeCalc` `:1536-1591`, `AI_TypeCalc` `:1594`, `Cmd_typecalc2` `:4500`).
- Engine: `typecalcOpcodeHandler` (`src/engine/battleScriptHitChainOpcode.ts` ~1655-1740, defender-order loop ~1690) and `applyTypeEffectiveness` (`src/engine/damageCalc.ts:556`) apply the multipliers in defender (type1, type2) order. `computeAiEffectiveness` (`factoryAiCheckBadMove.ts` ~2768) already iterates in table order, so the AI view is right and only the damage path is wrong.
- Matters only for dual-type defenders with one NVE and one SE (or 0x) matchup where truncation differs; single-type / both-same-direction cases are order-independent.
- Fix plan (engine, one change): in both places iterate `src/data/gen/type-effectiveness.json` (ROM row order, already in ROM order) and for each row matching `(moveType, defType1)` or `(moveType, defType2)` apply `damage = floor(damage * mult / 10)`, skipping the second-type row when `type1 == type2` (C `:1380-1395`). Same helper should serve `factoryAiTryToFaint.ts:134` and `factoryAiCheckViability.ts:2878` damage sims (they reuse `applyTypeEffectiveness`).
- Test idea: `applyTypeEffectiveness(47, FIRE, [ROCK, GRASS])` must be 47 (not 46), and a `typecalc` opcode test for the same pair; then re-drive seed 13 ON/OFF (expect past 7/15). Add the reverse-order defender `[GRASS, ROCK]` -> 47 as well (order of the defender's types must not matter).

## #204: the 16 unfilled AI-view fields

`createFactoryAiViewFromLiveRules` (`src/engine/factoryAiLiveDriver.ts:300`) never sets these optional `FactoryAiScoredBattlerView` / `FactoryAiScoredTargetView` fields (`factoryAiDecisionPolicy.ts:487-665`); each defaults to false / 0 / undefined. Script gating (`battle_factory.c:889-911`, `GetAiScriptsInBattleFactory`): challenge < 2 -> no AI; 2..3 -> flag 1 only (CHECK_BAD_MOVE); >= 4 or the Brain -> flags 1|2|4. "Mons" = Factory-pool mons (`battle-frontier-mons.json`, 882 entries) with that move.

| rank | field | AI script command (`battle_ai_script_commands.c`) | script reading it (`data/battle_ai_scripts.s`) | flag reaching it | mons with the move |
|---|---|---|---|---|---|
| 1 | `gender` | `Cmd_get_gender` :2088 | `AI_CBM_Attract` :456-471 (user + target) | 1 (CBM), all AI challenges | 54 (Attract) |
| 2 | `anyMoveDisabled` | `Cmd_if_any_move_disabled_or_encored` :1973 | `AI_CBM_Disable` :419; `AI_CV_Encore` :1688 | 1 (CBM) / 4 (CV) | 9 Disable, 7 Encore |
| 3 | `anyMoveEncored` | same :1973 | `AI_CBM_Encore` :423 | 1 | 7 |
| 4 | `isParalyzed` | `Cmd_if_status` :773 | `AI_CV_Facade` :2281-2283; `AI_CV_SmellingSalt` :2314 | 4 (CV) | 21 Facade, 2 Smelling Salt |
| 5 | `isPoisoned`, `isBurned` | `Cmd_if_not_status` :791 | `AI_CV_Facade` :2281-2283 | 4 | 21 |
| 6 | `holdEffect` | `Cmd_get_hold_effect` :2044 | `AI_CV_Thief` :1849; `AI_CV_Trick` :2323-2337 | 4 | 5 Trick, 1 Covet |
| 7 | `speciesAbilities` | `Cmd_get_ability` :1350 (two-ability guess) | `AI_CV_ChangeSelfAbility` :2359-2361 | 4 | 8 (Skill Swap 7, Role Play 1) |
| 8 | `stockpileCount` | `Cmd_get_stockpile_count` :2116 | `AI_CBM_Stockpile` :512, `AI_CBM_SpitUpAndSwallow` :518, `AI_CV_SpitUp` :2254 | 1 / 4 | 2 Stockpile, 1 Spit Up, 2 Swallow |
| 9 | `targetPartyStatusEqualsAny` | `Cmd_if_status_in_party` :1568 | `AI_CV_HealBell` :1843 | 4 | 3 Heal Bell |
| 10 | `targetSideReflectUp` | `Cmd_if_side_affecting` :881 | `AI_CV_BrickBreak` :2458 | 4 | 51 Brick Break |
| 11 | `usedHeldItemId` | `Cmd_get_used_held_item` :2137 | `AI_CBM_Recycle` :555-556, `AI_CV_Recycle` :2427 | 1 / 4 | 1 |
| 12 | `imprisonedOthers` | `Cmd_if_status3` :845 | `AI_CBM_Imprison` :560 | 1 | 1 |
| 13 | `mudSportUp` | `Cmd_if_status3` :845 | `AI_CBM_MudSport` :568 | 1 | 1 |
| 14 | `mistUp` | `Cmd_if_side_affecting` :881 | `AI_CBM_Mist` :379 | 1 | 0 (unreachable) |
| 15 | `waterSportUp` | `Cmd_if_status3` :845 | `AI_CBM_WaterSport` :587 | 1 | 0 (unreachable) |

(`isPoisoned`/`isBurned` share a row, so 15 rows = 16 fields.) Ranking: flag-1 reach and pool frequency first (gender is hit in any challenge >= 2 by 54 mons and is the live seed-11/17 divergence), then flag-4-only fields by pool frequency, then fields whose move is in 0-1 pool mons.

Notes: (1) CBM's `get_ability AI_TARGET` heuristic does NOT depend on `speciesAbilities` (`factoryAiCheckBadMove.ts:715-760` reads the species table itself); only the Viability `ChangeSelfAbility` handler (`factoryAiCheckViability.ts:8446`) reads the field, defaulting to `[NONE, NONE]`, which skips the `Random() & 1` guess draw the ROM makes. (2) Factory mons always hold an item, so the `holdEffect` default of 0 is wrong whenever Thief/Trick scoring is reached, not just a rare edge. (3) The source `AI_CV_Facade` reads target status 1 (`@BUG` kept), so `isPoisoned`/`isBurned`/`isParalyzed` are target-only.
Fix plan: fill each from `rulesContext` where the data exists (status1 masks; `status3` IMPRISONED_OTHERS / MUDSPORT / WATERSPORT; `sideStatuses` MIST / REFLECT; `disableStructs` disabled / encored move; `gBattleStruct->usedHeldItems`; stockpile counter; species gender via `GetGenderFromSpeciesAndPersonality`; held item effect; `SPECIES_BY_ID` abilities; target party status scan). Order by rank; gender first (a live divergence). One test per field comparing the live view against hand-computed `rulesContext`, plus a re-drive of seeds 11 and 17.

## New lead (seed 28): Reflect / Light Screen never reduce live damage

- Seed 28 (15/17, ON and OFF): engine Sludge Bomb (turn 12) does 65 and KOs a 57-HP target; ROM does 34. The defender used Reflect at turn 10 (`sideStatuses [0,1]`).
- ROM single-step: `CalculateBaseDamage` is called with `sideStatus` carrying `SIDE_STATUS_REFLECT`, halves the damage (`pokemon.c:3267`, Light Screen `:3318`, both only when `gCritMultiplier == 1`; x2/3 in doubles with two alive), base 24 -> STAB 36 -> 94% = 34.
- Engine: `damagecalcOpcodeHandler` (`src/engine/battleScriptHitChainOpcode.ts` ~1600-1630) -> `calculateBattleScriptBaseDamageWithPowerForCurrentMove` (:1509) never passes `sideStatusReflect` / `sideStatusLightScreen`. Its doc comment says they are "not modeled anywhere in this engine yet". `src/engine/damageCalc.ts:130,425,~445` already supports them; only `battleScriptTrysetfutureattackOpcode.ts:120` passes them. The AI view does read `rulesContext.sideStatuses`, so AI and damage disagree.
- Fix plan: pass `(rulesContext.sideStatuses[defenderSide] & SIDE_STATUS_REFLECT) !== 0` / `LIGHTSCREEN` into the base-damage input in the damagecalc path (and AI damage sims if they bypass it). Test idea: physical hit on a Reflect-up defender is halved, a crit is not, Light Screen for special; then re-drive seed 28 (expect past 15/17).

## Seeds 21..40 (scene ON and OFF; matched / engine states)

ON and OFF gave identical results on every seed. Seed 13 (7/15) was driven ON only; seed 11 (10/20) both scenes, after the #205 driver fix.

| seed | ON | OFF | classification |
|---|---|---|---|
| 21 | 10/10 | 10/10 | full match |
| 23 | 27/27 | 27/27 | full match |
| 24 | 10/10 | 10/10 | full match |
| 25 | 26/26 | 26/26 | full match |
| 29 | 13/13 | 13/13 | full match |
| 34 | 15/15 | 15/15 | full match |
| 35 | 8/8 | 8/8 | full match |
| 36 | 17/17 | 17/17 | full match |
| 37 | 10/10 | 10/10 | full match |
| 38 | 16/16 | 16/16 | full match |
| 40 | 20/20 | 20/20 | full match |
| 33 | n/a | n/a | not drivable: Frontier Brain `trainerId` 1022, lab `validate_request` allows 0..299 (lab limit, not a divergence) |
| 26 | 8/16 | 8/16 | known #204 (gender): ROM scores [100,100,100,90] vs engine [100,90,100,90]; Attract 100 vs 90 |
| 28 | 15/17 | 15/17 | NEW: Reflect/Light Screen not applied (above) |
| 22 | 8/20 | 8/20 | NEW (unconfirmed cause): AI scoring. ROM scores [101,99,100,99] vs engine [100,89,100,99] (Explosion +1, Earthquake -10 on the engine); ROM Forretress picks Explosion, engine Rock Slide. Not one of the 16 fields |
| 30 | 6/11 | 6/11 | NEW (unconfirmed cause): AI scoring. Same Giga Drain pick but RNG differs after; ROM [90,92,99,100] vs engine [90,95,99,102]; Attract slot equal, so not gender |
| 31 | 1/34 | 1/34 | unclassified: mask 7, turn 2 ROM picks Ice Beam, engine Dragon Claw (AI choice or damage; not examined) |
| 32 | 22/23 | 22/23 | unclassified: mask 0 (random pick), last turn only: engine KOs the player (Petal Dance), ROM leaves it at 164 HP |
| 27 | 3/20 | 3/20 | unclassified: mask 0 random pick, ROM Rock Slide vs engine Dragon Breath; ROM driver stopped "action menu without a move decision" |
| 39 | 9/11 | 9/11 | unclassified: ROM scores [104,104,98,104] vs engine [104,99,98,99]; ROM Brick Break vs engine Earthquake (possibly `targetSideReflectUp`, #204 rank 10) |
| 11 | 10/20 | 10/20 | known #204 (gender), Attract at turn 8 |
| 13 | 7/15 | not run | #206 type-multiplier order |

ROM `aiFlags` reads after turn 1 were inconsistent with the engine mask (flags 0/3 seen where the engine uses 7), so ROM `score[]` comparisons were used instead of ROM flags.
