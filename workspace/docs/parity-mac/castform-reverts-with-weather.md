# Castform kept its weather form after the weather ended (audit lead B5) — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 643 off DIR` (also seed 651).

## Symptom

Seed 643: the opponent's Castform turned Water-type under Rain Dance. After the rain ended the player's Giga Drain hit it:
ROM 166 -> 57 (109, neutral); engine 166 -> 0 (x2 into a Castform that was still Water-type).

## Cause

- C: `HandleFaintedMonActions` state 6 ends with `AbilityBattleEffects(ABILITYEFFECT_FORECAST, 0, 0, 0, 0)`
  (`battle_util.c:1962`, body `:2955-2972`): each Forecast battler runs `CastformDataTypeChange` (`:2396-2429`) and, when its
  form no longer fits the weather, `BattleScript_CastformChange`. That pass runs after every action and at
  `BattleTurnPassed`. It is the only place a Castform reverts when the weather runs out: the "rain stopped" scripts
  (`BattleScript_RainContinuesOrEnds` and its sun / hail / sandstorm siblings) do not call `trycastformdatachange`.
- Engine: `src/engine/battleScriptFaintedActionsOrchestration.ts` state 6 ran pending Intimidate, Trace and the White Herb
  pass, and stopped there. Castform only changed through the weather-setting moves' own `trycastformdatachange` and on
  switch-in, so it never changed back.

## Fix

State 6 now ends with the Forecast pass (types written at once, then `BattleScript_CastformChange`), in battler order.

## Test

`tests/battleEndTurnOrchestration.test.ts` "a Forecast Castform reverts to Normal once the weather is gone ...": Water-typed
Castform, no weather: Normal after the end-of-turn pass, no random draw; a second pass leaves it alone (fails unfixed).

## ROM replay

Seeds 643 and 651 match to battle end. See `STATUS.md`.

## Still open next to this

State 6's item pass (`ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)`, `battle_util.c:1961`) is ported for the player's White
Herb only. The audit's "cure berries after Pursuit-on-switch" lead lives there; no ROM seed shows it yet.
