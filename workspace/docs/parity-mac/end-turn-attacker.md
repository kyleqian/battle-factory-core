# After an end-of-turn faint the game's "attacker" is the first present Pokemon: whose last move a Spikes faint forgets — fixed

Found by the Metronome sweep (fourth pass), at a point that has nothing to do with Metronome: staged battle
`stages/spikes-faint-at-turn-end.json` (real sets, lab seed 52079, the random player).

## Symptom

The opponent's Pokemon faints from poison at the end of a turn. Its replacement has 2 HP and faints from the player's
Spikes as it comes in. ROM: `gLastMoves` ends as `[0xFFFF, 0]`: the **player's** last move is forgotten. Engine:
`[61, 0xFFFF]`: the opponent's.

## What it changes for the game

`gLastMoves` is what Encore, Disable, Spite, Mimic and Torment read. After such a double faint at the end of a turn,
the game has forgotten the player's last move: an opponent's Encore or Disable on the next turn fails, and a tormented
player may repeat its move. The engine kept the player's last move and forgot the other side's (which a replacement
resets anyway). It needs an end-of-turn faint whose replacement dies on Spikes at once, so it is rare.

## C source

- `DoFieldEndTurnEffects` begins, on every entry, with
  `for (gBattlerAttacker = 0; gBattlerAttacker < gBattlersCount && gAbsentBattlerFlags & gBitTable[gBattlerAttacker]; gBattlerAttacker++)`
  and the same loop for `gBattlerTarget` (`battle_util.c:1186-1191`): both become the first battler that is present.
- `BattleTurnPassed` (`battle_main.c:3956-3972`) calls it each time it is entered, and it is entered again after every
  script an end-of-turn step runs. `HandleFaintedMonActions` runs a script of its own first (`BattleScript_GiveExp`),
  so the faint replacement script starts with gBattlerAttacker = the first present battler.
- A replacement that faints from Spikes: `BattleScript_SpikesOnFaintedBattlerFainted` runs `moveendall`.
  `MOVEEND_UPDATE_LAST_MOVES` writes `gLastMoves[gBattlerAttacker] = MOVE_UNAVAILABLE` when `HITMARKER_OBEYS` is not
  set (`battle_script_commands.c`, `Cmd_moveend`).

ROM trace of the staged battle (function entries with `gBattlerAttacker` / `gBattlerTarget`): `Cmd_tryfaintmon` of the
poison faint: 1 / 0; `Cmd_switchineffects` of the replacement: **0** / 1; `Cmd_moveend`: 0 / 1.

## Engine and fix

The engine's end-of-turn steps set the attacker only for a step that runs a script, so the faint sweep after them kept
the poisoned battler as attacker. `src/engine/battleEndTurnOrchestration.ts` now sets the attacker to the first present
battler before each of its four end-of-turn faint sweeps (after the field / battler steps, after a Future Sight hit,
after Perish Song). The sweep sets its own target (the fainted battler), as the source does.

## Proof

- ROM, `stages/spikes-faint-at-turn-end.json`: before the fix the turn timeline differed at the last state (109 of
  110); after it 110 of 110 and every wide state match.
- Test (fails without the fix): `tests/parityMacEndTurnAttacker.test.ts` (a poisoned Pokemon faints at the end of the
  turn, its 10-HP replacement faints on Spikes; `lastMoves[0]` is `0xFFFF`).
