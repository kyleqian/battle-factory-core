# aiv271: AI damage simulations take the real CalculateBaseDamage terms (#204 cause C)

Source-proven AI gameplay correction under `docs/factory-finish-scope.md`. Lead: ISSUES #204 cause C (seed 39) and the seed 57 lead.
Evidence (not in git): `.integration/evidence/aiv271/` (`rom/`, `census/`, `classify/`, `gates/`).

## 1. The defect

C's AI damage simulations (`AI_CalcDmg`, `battle_ai_script_commands.c`) call `CalculateBaseDamage(&gBattleMons[attacker], &gBattleMons[defender], ...)`
(`pokemon.c:3101-3235`) on the TRUE battle records of both battlers, then `TypeCalc`, `* simulatedRNG[slot] / 100`, floored at 1. They feed
`get_how_powerful_move_is` (`:1174-1236`, the moveset damage ranking) and `Cmd_if_can_faint` / `Cmd_if_cant_faint` (`:1743-1790`).
`CalculateBaseDamage` reads, for BOTH battlers: species (Thick Club Cubone / Marowak, Light Ball Pikachu, Deep Sea Tooth / Scale Clamperl,
Metal Powder Ditto, Soul Dew Latias / Latios outside BATTLE_TYPE_FRONTIER; `pokemon.c:3185-3200`), hold effect and hold-effect param (Choice Band, the type-boost items),
status1 (burn halving, Guts / Marvel Scale), the attacker's pinch HP (`hp <= maxHP / 3`), weather, Mud / Water Sport. The defender's hold effect is read from
`gBattleMons[defender].item` too (`pokemon.c:3147-3155`: the Enigma Berry override, else `GetItemHoldEffect(defender->item)`; Metal Powder / Deep Sea Scale / Soul Dew
read it at `:3189-3197`), not the AI's battle-history view of the item.

The engine's `estimateDamage` / `factoryAiLastCalcMovePower` (`factoryAiTryToFaint.ts`) took flat stat fields from the AI view and
none of species / hold effect / param / status / pinch / weather / sports, so the sim damage, the ranking and the can-faint
verdicts (and with them the RNG draws and the picked move) drifted from the ROM whenever any of those terms was live.

## 2. The fix (shared builder, so it cannot drift)

- `damageCalc.ts`: `DamageCalcTerms` (attacker and defender `DamageBattler`, weather, weatherHasEffect, activeBattlerAbilities, isFrontierBattle,
  flashFireBoosted, mudSportActive, waterSportActive) and `damageCalcInputForMove(terms, move, powerOverride, targetSideStatus, isCriticalHit)`
  (Mud / Water Sport power halving, side-screen bits, Frontier flag, move effect).
- `battleScriptHitChainOpcode.ts`: the exported `battleScriptDamageTerms(rulesContext, attacker, target)` builds the terms from the live rules context;
  `calculateBattleScriptBaseDamageWithPowerForCurrentMove` (the real hit chain) now builds its input through `damageCalcInputForMove(battleScriptDamageTerms(...), ...)`.
- `factoryAiLiveDriver.ts` fills the AI target view's new `damageTerms` from `battleScriptDamageTerms(rulesContext, 1, 0)`
  (AI battler 1 attacking battler 0), the SAME function the real hit chain uses; `factoryAiTryToFaint.ts` `aiDamageCalcInput` consumes it in
  `estimateDamage` (now exported) and `factoryAiLastCalcMovePower`; a view without `damageTerms` keeps the legacy flat-field path (unit-test fixtures only).
- Defender hold effect: `battleScriptDamageTerms` resolves the defender's `holdEffect` / `holdEffectParam` from the real record's item exactly as the
  attacker's (Enigma Berry override folded in), which is C's `CalculateBaseDamage` behaviour (`pokemon.c:3147-3155` reads `defender->item`). Only the attacker's param / hp
  are read by the damage math, as documented on `DamageBattler`.

Audit of other AI damage-sim callers: `get_how_powerful_move_is`, `if_can_faint`, `if_cant_faint`, rule R (`factoryAiLastCalcMovePower`) all go through
the one builder. The AI switch-into scorer (`battle_ai_switch_items.c:778`, `battleAiSwitchInto.ts`) calls `CalculateBaseDamage` with a stubbed `baseDamage: 0`
in the engine; this is a gap that is NOT fixed here (out of the brief's shape), see section 6.

## 3. Tests

`tests/aiv271AiDamageTerms.test.ts` (16 tests, 13 failing on the unfixed code): `estimateDamage` equals the real damage calc (same random factor) for Choice Band, a type-boost item,
Thick Club, Light Ball, Deep Sea Tooth / Scale, Metal Powder (defender), burn, pinch, plus view-wiring checks. `tests/factoryAiLiveDriver.test.ts` and
`tests/factoryAiScoredWiringParity.test.ts` extended for the new `damageTerms` field.

## 4. ROM drives (`tools/audio/romDriveSeed.sh`, `.integration/evidence/aiv271/rom/`)

- Seed 39 matches to battle end in both scenes (ON 11 / 12 engine rows, OFF 11 / 12, divergence none; the last row is the end-of-battle row after the final ROM sample).
- OFF regression set `1 3 4 5 6 8 11 13 17 20 22 26 28 30 31 224 552` all match fully (divergence none).
- Seed 57 ON now matches (11 / 12, divergence none); it was the lead from the aiv270 review (engine ranked Brick Break, ROM Megahorn).
- Unchanged and out of scope: 42 ON (9 / 17), 50 ON (18 / 26), 53 ON (4 / 10), 60 ON (36 / 83) still diverge (#209 / #210 / unconfirmed, not this cause).

## 5. Census 0..999, both scenes (`LSD194_CENSUS_JOBS=3 LSD194_SPLIT=4 tools/integration/lsd194Census.sh`)

Baseline `.integration/evidence/aiv270/census/{on,off}-01ad01f2a`, fixed arms `{on,off}-3bfb1a391`. Classified by an instrumented UNFIXED tree
(`tools/integration/aiv271Instrument.py`, `aiv271Classify.py`; `classify/report.txt`): the tree decides with the old code and at every scored AI decision
also scores the same request / RNG with the fixed chooser over the fixed view; an event is any difference in scores / pick / RNG / draws, tagged by the term group
whose neutralisation reverts it (species, hold, status, pinch, weather, sports, frontier). The instrumented tree's digests equal the baseline on 1000 / 1000 seeds per scene.

| | ON | OFF |
|---|---|---|
| changed seeds | 35 | 35 |
| unexplained | 0 | 0 |
| scored decisions observed | 13065 | 13104 |
| outcome-differing C decisions (pick-changing) | 115 (71) in 53 seeds | 115 (71) in 53 seeds |
| observer errors / legacy-path self-check failures | 0 | 0 |

ON and OFF changed sets are identical (35 seeds, same command-list changes). 18 seeds have a C event whose changed pick the battle's later play absorbed (digest unchanged).
Decision causes: weather 31, pinch 29, species + hold (Thick Club, Quick Claw species, Choice Band) 24, status 19, hold 10, combined 2.
Changed seeds: 16 34 39 88 93 181 191 204 209 248 334 356 382 383 409 418 435 454 521 529 555 596 658 671 693 698 725 747 761 765 849 872 876 904 934.
Census seed 57 is not in the changed set (no C event: 6 observed decisions); the ROM-drive seed 57 match above is the lead's own battle.

## 6. Proposed ISSUES #204 remainder

> **#204 cause C RESOLVED (aiv271)**: the AI damage sims (`get_how_powerful_move_is`, `if_can_faint` / `if_cant_faint`, rule R) take the attacker and defender terms from the real hit chain's
> `battleScriptDamageTerms`, so species / hold effect / param / status / pinch / weather / sports cannot drift. Seed 39 ON / OFF and seed 57 ON match to the end.
> Remaining under #204: seed 42 (ON) unconfirmed, 50 -> #210, 53 unconfirmed, 60 -> #209. Known unaudited gap: the AI switch-into scorer (`battle_ai_switch_items.c:778`) still
> uses a `baseDamage: 0` stub in `battleAiSwitchInto.ts`.

## 7. Re-pins

- `tests/factoryBrainRoundShape.test.ts` `GOLD_SEED` 8 -> 24: the "move-slot-0 policy wins six ordinary battles" seed lost before the sixth win once the AI sims became correct
  (seeds 1..23 also lose; 24 is the lowest in 1..40 that wins six). Only the curated seed changed; every assertion is structural. No coverage lost.
- `tools/report/ability-item-parity-census.ts` `EXPECTED_RECOVERED_STRING_SITES`: line numbers of the nine quoted-site pins in `damageCalc.ts` (+56) and `factoryAiTryToFaint.ts` (+25); the generated doc is unchanged.

## 8. Gates (final tree)

`npm run typecheck` 0; `POKEBENCH_VITEST_MAX_WORKERS=2 npm run test:gate` 361 files green after the pin fix; every test importing the changed modules (61 files, 1316 tests) green;
the 136 census-anchored / orchestrator-importing files outside the gate green (plus `factoryBrainRoundShape` after the re-pin); `npm run build` 0.
