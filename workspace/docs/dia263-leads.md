# dia263: verdicts for ISSUES #204-#206 (diagnosis; no `src/` change)

Evidence (ignored): `.integration/evidence/dia263/` (`11-{on,off}.*`, `13-on.*`, `step13.json`, `ram11.json`, `declared.txt`, `build.txt`).
Recipe: `tools/audio/romDriveSeed.sh SEED on|off .integration/evidence/dia263`.

## #205 (seed 11): verdict (a), DRIVER mapping bug only; fixed in `tools/` (e93bec400)

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
