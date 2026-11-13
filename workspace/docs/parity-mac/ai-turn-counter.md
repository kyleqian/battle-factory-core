# The opponent AI's turn count was always 0 (audit lead A5) — fixed

Mac parity lane, 2026-11-12. No replay seed shows this. Proof is the source; the reach in the Factory is small (below).

## Symptom

The AI command `get_turn_count` read 0 for the whole battle. Two CheckViability scripts use it:

- `AI_CV_SwaggerHasPsychUp` (`data/battle_ai_scripts.s:1479-1490`): Swagger from a Pokémon that also knows Psych Up, when
  the target's Attack stage is 3 or lower (that is -3 or worse): +3, and +2 more only on turn 0. The engine gave +5 on
  every turn.
- `AI_CV_Conversion` (`:1305-1313`): after turn 0 the script rolls `if_random_less_than 200`. The engine never rolled.
  No Factory set knows Conversion.

Reach: 15 sets know Swagger and Psych Up (Golduck, Mr. Mime, Jumpluff, Claydol, Cradily, Metagross, Dusclops, Hypno,
Umbreon, Snorlax, Entei, Regirock, Registeel, Latias, Meditite), and only against a target at -3 Attack or lower.
The score difference (2 points) changes the move only when another move sits at exactly +4 or +3.

## Cause

- C: `Cmd_get_turn_count` reads `gBattleResults.battleTurnCounter` (`battle_ai_script_commands.c:1111`).
  `BattleTurnPassed` adds 1 each time a turn completes with the battle still on, up to 255 (`battle_main.c:3995-3999`).
- Engine: the two handlers were there and took a `battleTurnCount` input, but the live caller
  (`src/engine/factoryRoundBattleOrchestrator.ts`) never passed one and `src/engine/factoryAiLiveDriver.ts` defaulted it
  to 0. The battle state had no turn counter at all.

## Fix

- `battleTurnCounter` in the battle rules context (`src/engine/battleScriptRulesContext.ts`), 0 at battle start.
- `src/engine/factoryBattleScriptFullTurnDecision.ts` adds 1 where the reducer does `BattleTurnPassed`'s tail (next to the
  `gRandomTurnNumber` draw).
- The live AI view reads it; `challenge.battleTurnCount` stays as an explicit override for fixtures.

## Tests

- `tests/parityMacBattleTurnCounter.test.ts`: 0 at battle start, 1 and 2 after the first two turns.
- `tests/factoryAiLiveDriver.test.ts`, "the AI's turn count is the rules context's battleTurnCounter" (unfixed: 0).

## Not done

No ROM scenario: the Mechanic Lab cannot stage a target that is already at -3 Attack, and the AI must then have a second
move scored exactly between the two values for the pick to differ.
