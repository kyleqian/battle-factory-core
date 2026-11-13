# Perish Song (and a delayed Future Sight) go on after the faint that decides the battle

Found by the wide compare on the old lists (ROM seeds 342 and 457, census player): the state after the last blow.

## Symptom

Seed 342, last turn. Both active Pokemon have a perish count of 0. The opponent's last Pokemon is first in turn order.

- ROM: the opponent's Pokemon is taken (the battle is won), then the player's Pokemon is taken too. Player party HP at
  the end: 0 / 0 / 186.
- Engine: stopped after the first faint. The player's Pokemon kept 140 HP.

Seed 457 is the mirror: the player's last Pokemon is taken (lost), then the opponent's Pokemon, which the engine left
at 162 HP.

Both battles still named the same winner, so the old compare (HP, RNG, last moves up to the engine's last state) saw
nothing.

## What it changes for the game

When the Pokemon taken second is its side's **last** one, the game ends in a draw, and a draw is a loss for the player:
the Factory challenge ends. The engine gave the player a win and the streak went on. The same holds for a delayed
Future Sight hit that lands after the deciding faint.

## C source

`BattleTurnPassed` (`battle_main.c:3956-3995`):

    if (gBattleOutcome == 0) { DoFieldEndTurnEffects ...; DoBattlerEndTurnEffects ...; }   // 3961-3967
    if (HandleFaintedMonActions()) return;                                                  // 3968
    gBattleStruct->faintedActionsState = 0;
    if (HandleWishPerishSongOnTurnEnd()) return;                                            // 3971: no gBattleOutcome test
    ...
    if (gBattleOutcome != 0) { gCurrentActionFuncId = B_ACTION_FINISHED; gBattleMainFunc = RunTurnActionsFunctions; return; }   // 3988-3992

Each Future Sight hit and each Perish Song step is a script; the function returns and is entered again from the top.
The field and battler effects are behind the outcome test, `HandleWishPerishSongOnTurnEnd` (`battle_util.c:1785`) is
not: its two sweeps (Future Sight by battler number, Perish Song by turn order) run to the end.

`Cmd_checkteamslost` (`battle_script_commands.c:3534`) ORs the flags (`:3564`, `:3577`), so a second deciding faint
turns `B_OUTCOME_WON` (1) or `B_OUTCOME_LOST` (2) into `B_OUTCOME_DREW` (3), and jumps past the replacement prompt when
the outcome is already set. `sEndTurnFuncsTable[B_OUTCOME_DREW]` is `HandleEndTurn_BattleLost` (`battle_main.c:559`).
The battle-won / battle-lost script runs once, after `BattleTurnPassed` is through.

## Engine

`src/engine/battleEndTurnOrchestration.ts`, `runFutureAttacksAfterFaints` and `runPerishSongAfterFutureAttacks`: when
the faint handling after a KO reported the battle decided, both loops returned at once. The faint handling
(`battleScriptFaintedActionsOrchestration.ts`) also ran the battle-won / battle-lost script inside itself, before the
sweep.

## Fix

- The two sweeps go on after a deciding faint; the result stays `terminal`.
- `runBattleScriptFaintedActionsOrchestration` takes `deferPostBattleOutcomeScript`. The end-turn path sets it, and
  `finishWishPerishSong` runs the battle-won / battle-lost script once, on the final outcome. The action-phase callers
  are unchanged.

## Proof

- ROM seeds 342 and 457 on the fixed engine: every turn state, every wide state and the winner match, and the state
  after the last blow now agrees (both Pokemon at 0 HP; before: `finalNotes` 140 vs 0 and 162 vs 0).
- `tests/battleEndTurnOrchestration.test.ts`, "HandleWishPerishSongOnTurnEnd state 1": four cases (two last Pokemon:
  outcome 3; the same with the player's first; a winner with a healthy bench loses the Pokemon, stays the winner and is
  asked for no replacement; the other Pokemon's count still goes down). All four fail without the fix. The old test of
  this situation asserted the wrong end state (`[100, 0]`) and is replaced.
- **The draw on the ROM: battle 20596 with the `ai-v1` player** (`REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh 20596
  ai-v1`). Both sides are on their last Pokemon (Feraligatr, Absol), both with a perish count of 0. The opponent's Absol
  is taken first. ROM: Feraligatr is taken next and `gBattleOutcome` is 3 (draw). Engine before the fix: outcome 1
  (player won), found by the new winner check of the replay with every turn state matching (13 of 13). Engine with the
  fix: outcome 3, and the state after the last blow agrees.
