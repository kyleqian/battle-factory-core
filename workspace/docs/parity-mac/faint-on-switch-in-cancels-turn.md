# A Pokemon that faints from Spikes as it is switched in ends the turn; the engine let the other side still act — fixed

Found by the Metronome sweep (fourth pass), in a battle that has nothing to do with Metronome at that point: staged
battle `stages/spikes-faint-cancels-turn.json` (real sets, lab seed 52165, the random player).

## Symptom

The player switches a weakened Pokemon into Spikes. It faints as it comes in, and the player sends the next one. ROM:
the turn is over; the opponent's Plusle does not use the move it had chosen (its PP stays 18). Engine: Plusle used its
move after the replacement came in (PP 17).

## What it changes for the game

In the engine the other side got a free action against the replacement on such a turn. In that battle the move was
Helping Hand, which does nothing, so only the PP showed it; with an attack the replacement would have been hit. The
same holds the other way round: when the opponent's switched-in Pokemon faints from Spikes, the player's chosen move
must not run. Spikes sets are Qwilfish 211, Forretress 383 and Skarmory 482.

## C source

- A switched-in Pokemon that faints from Spikes: `BattleScript_SpikesOnAttackerFainted` /
  `...OnTargetFainted` -> `BattleScript_HandleFaintedMon` -> `BattleScript_FaintedMonSendOutNew`, which ends with
  `cancelallactions` (`battle_scripts_1.s:2895`).
- `Cmd_cancelallactions` (`battle_script_commands.c:5850-5858`): every slot of `gActionsByTurnOrder` becomes
  `B_ACTION_CANCEL_PARTNER`; `HandleAction_ActionFinished` runs nothing for such a slot.

## Engine and fix

The engine's `cancelallactions` did nothing ("no reader"). The turn reducer skipped the second action only when its
own faint sweep, between the two actions, had run the replacement. Here the replacement runs inside the first action's
own script, so the reducer did not know. `src/engine/battleScriptSwitchinOpcode.ts` now writes the array, and the
reducer already skips a second action whose slot is `B_ACTION_CANCEL_PARTNER` (the check added for Roar,
`factoryBattleScriptFullTurnDecision.ts`). A forced Struggle dropped this way keeps its no-valid-moves flag (fix 35).

## Proof

- ROM, `stages/spikes-faint-cancels-turn.json`: before the fix the wide compare differed at decision 69
  (`battlers.1.pp.3`: engine 17, ROM 18) and the turn timeline at state 73 of 80. After it 80 of 80 and every wide
  state match.
- Test (fails without the fix): `tests/parityMacFaintOnSwitchInCancelsTurn.test.ts` (two turns through the reducer:
  Spikes, then a 10-HP Pokemon is switched in; the trainer's Tackle does not run).
