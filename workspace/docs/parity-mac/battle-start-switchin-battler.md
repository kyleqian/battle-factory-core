# Battle start: the opponent lead's ability hook ran on the player's lead — fixed

Mac parity lane, 2026-11-12. Evidence is not in git; every number re-derives from the seed with `tools/audio/romDriveSeed.sh SEED off DIR`.

## Symptom

1. A player's lead with Truant (Slaking, Slakoth) loafed on turn 1 when the opponent's lead had Cloud Nine, Forecast,
   Air Lock or a weather ability. Seed 3704 (Scene OFF): Slaking against Golduck (Cloud Nine). ROM: Slaking uses Yawn on
   turn 1. Engine: "Slaking is loafing around".
2. An opponent lead's weather ability (Drizzle, Drought, Sand Stream) did nothing at battle start. No Level 50 Factory set
   has one, so this half had no replay seed; it matters for Open Level sets (Tyranitar).

## Cause

- C: `TryDoEventsBeforeFirstTurn` (`battle_main.c:3869-3879`) calls `AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN, ...)`
  for each battler, fastest first. It does not run `Cmd_switchineffects`, so the line
  `gDisableStructs[gActiveBattler].truantCounter = 1` (`battle_script_commands.c:5260-5261`) is never reached for a lead.
- Engine: `src/engine/factoryBattleStart.ts` `runSharedOnSwitchinDispatch` reuses the `switchineffects` opcode for the
  hook abilities and names its battler through the `fainted` selector role. It picked the program's FIRST
  `switchineffects`, which is Baton Pass's `switchineffects BS_ATTACKER` (`battle_scripts_1.s:1713`). The fresh context's
  attacker role is 0 (`BattleStartClearSetData`), so every dispatch ran on the player's lead: an opponent lead's hook did
  nothing, and the opcode's Truant line set the player's lead to "loafing next".
  The existing test only had a player-side Drought lead, where battler 0 is the right answer.

## Fix

The dispatch uses `switchineffects BS_FAINTED` (`BattleScript_FaintedMonSendOutNew`, `battle_scripts_1.s:2893`), which
resolves through the role it sets. A Truant lead is not a hook ability, so the opcode's Truant line is not reached for it.

## Tests (both fail on the unfixed code)

`tests/factoryBattleStart.test.ts`:

- "runs an OPPONENT lead's ON_SWITCHIN hook on the opponent: Drought starts the sun" (unfixed: weather 0).
- "a lead Truant Pokemon is free on turn 1 ..." (Slaking vs Cloud Nine Golduck; unfixed: `truantCounter` 1).

## ROM replay

Seed 3704 matches 66 / 66 (was 0 / 46). See `STATUS.md`.
