# A "frozen solid" last action leaked into the next turn: the next first move skipped its charge turn (and its PP) — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 342 off DIR`.

## Symptom

Seed 342: the opponent's Shuckle is frozen and acts last ("is frozen solid!"). Next turn the player's Claydol uses Solar Beam.

| | that turn |
|---|---|
| ROM | Solar Beam charges (`STATUS2_MULTIPLETURNS` set, no damage), Shuckle stays frozen, Leftovers 24 -> 29 |
| engine before the fix | Solar Beam hits at once (24 -> 1), with no "used Solar Beam" message and no PP spent |

No sun was up on either side (`gBattleWeather` 0).

## Cause

- C: the frozen canceller sets `gHitMarker |= HITMARKER_NO_ATTACKSTRING` (`battle_util.c:2067`). `RunTurnActionsFunctions`
  clears `HITMARKER_NO_ATTACKSTRING` and `HITMARKER_UNABLE_TO_USE_MOVE` only between actions (`battle_main.c:4949-4954`);
  after the LAST action nothing clears them until `BattleTurnPassed`, which does, together with `HITMARKER_PLAYER_FAINTED`
  (`battle_main.c:3975-3977`).
- Engine: the reducer has the between-actions clear (`src/engine/factoryBattleScriptFullTurnDecision.ts`), but the
  `BattleTurnPassed` equivalent (`finishTurnValuesCleanUp`, `src/engine/battleEndTurnOrchestration.ts`) did not touch
  `hitMarker`. A marker set by the last action of a turn was still set for the first action of the next turn:
  - `Cmd_attackstring` and `Cmd_ppreduce` skip on `HITMARKER_NO_ATTACKSTRING` (`battle_script_commands.c:1196`, `:1230`):
    no attack string, no PP deducted;
  - every two-turn move's first-turn test `jumpifword CMP_COMMON_BITS, gHitMarker, HITMARKER_NO_ATTACKSTRING, ...SecondTurn`
    (`data/battle_scripts_1.s:780`, `:1066`, `:1813`, `:1909`, `:1975`: Razor Wind, Sky Attack / Skull Bash, Solar Beam,
    Fly / Dig / Dive / Bounce) takes the second-turn branch: the move fires with no charge turn.

## Fix

`finishTurnValuesCleanUp` clears the three bits (`(1 << 9) | (1 << 19) | (1 << 22)`), as `BattleTurnPassed` does.

## Test

`tests/battleEndTurnOrchestration.test.ts` "BattleTurnPassed clears HITMARKER_NO_ATTACKSTRING / UNABLE_TO_USE_MOVE /
PLAYER_FAINTED ...": the three bits are gone after the end-of-turn pass and an unrelated bit stays (fails unfixed).

## ROM replay

Seed 342 matches to battle end. See `STATUS.md`.
