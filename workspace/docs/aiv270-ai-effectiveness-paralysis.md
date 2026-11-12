# aiv270: AI type-effectiveness probe quirk (#204 A) and full GetWhoStrikesFirst speed (#204 B)

Source-proven AI gameplay corrections under `docs/factory-finish-scope.md`. Leads: `docs/dia269-leads.md` sections A / B.
The worker (ts lane, 200 min cap) landed the code, tests, census and gates; it was killed while writing this doc, which the
supervisor wrote from its commits and evidence (`.integration/evidence/aiv270/`, supervisor re-checks in
`.integration/validation/sv-20261111/aiv270/`).

## 1. Fixes

- **A** (`746d19464`, seed 22): `factoryAiCheckBadMove.ts` `runCheckBadMovePreamble` (`AI_CBM_CheckIfNegatesType`,
  `data/battle_ai_scripts.s:57-65`) and `runCbmHighRiskForDamage` test `if_type_effectiveness AI_EFFECTIVENESS_x0` /
  the Wonder Guard `AI_EFFECTIVENESS_x2` gate with `computeAiEffectiveness` (table-order modulation, 0 lifted to 1 by a later
  non-zero row), not the true multiplier. C: `Cmd_if_type_effectiveness` (`battle_ai_script_commands.c:1515-1557`) never copies
  TypeCalc's MOVE_RESULT_DOESNT_AFFECT_FOE in the non-BUGFIX build (the "dual non-immunity" glitch), so Ground vs Rock / Flying
  is not x0 to the AI and the two `get_ability` draws are consumed. `typeMultiplierTenths` is now documented as real-damage only.
  STAB is not modelled in `computeAiEffectiveness`; checked by the supervisor: TypeCalc's x1.5 STAB maps 120 / 240 / 30 / 15 back
  to x2 / x4 / x0.5 / x0.25, so every value the scripts test (x0, x0.25, x0.5, x2, x4) is the same with or without STAB.
- **B** (`01ad01f2a`, seed 30): `Cmd_if_target_faster` / `Cmd_if_user_faster` -> `GetWhoStrikesFirst(user, target, TRUE)`
  (`battle_main.c` ~4604-4692) read the TRUE battle state of both battlers. One helper `aiTurnOrder` / `toTurnOrderBattler`
  in `factoryAiCheckViability.ts` replaces every hand-built `TurnOrderBattler` literal; `factoryAiLiveDriver.ts` fills the new
  view fields from the same `turnOrderBattlerInputs` / `turnOrderWeather` the real turn order uses
  (`battleEndTurnOrchestration.ts`), so they cannot drift: paralysis (speed / 4) on both sides, Macho Brace, Quick Claw with
  `gRandomTurnNumber`, Swift Swim / Chlorophyll under WEATHER_HAS_EFFECT, Speed stage. Priority is ignored (ignoreChosenMoves).

## 2. Tests

`tests/aiv270AiEffectiveness.test.ts` (5) and `tests/aiv270AiTurnOrder.test.ts` (15), failing on the unfixed code per the worker;
`tests/factoryAiLiveDriver.test.ts` and `tests/factoryAiScoredWiringParity.test.ts` extended for the new fields.

## 3. ROM drives (`tools/audio/romDriveSeed.sh`, `.integration/evidence/aiv270/rom/`)

| seed | result |
|---|---|
| 22 ON / OFF | 10 / 10 each, divergence null (was 8 / 21) |
| 30 ON / OFF | 11 / 11 each, divergence null (was 6 / 12); supervisor re-drive 30 ON 11 / 11 |
| regression OFF 1 3 4 5 6 8 11 13 17 20 26 28 31 224 552 | all full match |
| 39 / 42 / 53 / 57 ON | 9 / 9 / 4 / 6 matched rows, still diverging (causes C, #210, #209, open) |

## 4. Census 0..999 (`.integration/evidence/aiv270/census/{on,off}-01ad01f2a` vs `aiv267/census/{on,off}-5682cd341`)

`tools/integration/aiv270Instrument.py` observes the unfixed tree (its digest equals the baseline on 1000 / 1000 seeds per
scene); `aiv270Classify.py` writes `classify/report.txt`. Per scene: **77 changed seeds, 0 unexplained** (B 56, A 19, A+B 2);
A: 69 outcome-differing decisions in 23 seeds; B: 227 decisions in 78 seeds (causes: target paralyzed 100, attacker paralyzed 52,
Quick Claw ~60, Swift Swim 8, ...). ON / OFF command-list changed sets identical. 22 seeds see an outcome-differing decision but
the battle is unchanged. One seed errors in both arms (pre-existing, unchanged).

## 5. Re-pins (`f396c0f8d`)

- `tests/fix122AuditDefects.test.ts`: move 115 glyph-40 case, census battle 33 -> 176 (unchanged seed, start = glyph - 1).
- `tests/sub157SceneOffSubstitute.test.ts`: player-attacker Substitute x2, seed 74 -> 373 (unchanged seed, same attacker / count).
- `tools/report/ability-item-parity-census.ts` line pins and `docs/gate6-coverage-manifest.*` regenerated.
No coverage loss.

## 6. Gates

Full suite on `f396c0f8d` (src == final): **1,758 files passed + 44 skipped, 14,499 tests, 0 failed**
(`.integration/evidence/aiv270/gates/test.log`). Build / build:lib and vanilla 0:20 soaks: supervisor run, see PROGRESS.
