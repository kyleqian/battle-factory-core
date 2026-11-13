# The player's Curse lost 2 PP against Pressure — fixed

Mac parity lane, 2026-11-12. Evidence is not in git; every number re-derives from the seed with `tools/audio/romDriveSeed.sh SEED off DIR`.

## Symptom

When the player's non-Ghost Pokémon used Curse against a Pokémon with Pressure, the engine took 2 PP. The real game takes 1.
The opponent's Curse does cost 2 in the real game (see below), and the engine already did that.

Seed 3375 (Scene OFF): the player's Muk uses Curse five times into Dusclops (Pressure). ROM: Curse PP 10, 9, 8, 7, 6, 5.
Engine: 10, 8, 6, 4, 2, 0. Muk ran out of moves and used Struggle while the ROM's Muk still had Curse.

## Cause

- C: `Cmd_ppreduce` adds 1 for Pressure when `gBattlerAttacker != gBattlerTarget && gBattleMons[gBattlerTarget].ability ==
  ABILITY_PRESSURE` (`battle_script_commands.c:1223-1225`). Curse's table target is `MOVE_TARGET_SELECTED`, but the PLAYER's
  move menu special-cases it: `HandleInputChooseMove` (`battle_controller_player.c:486-501`) treats Curse as
  `MOVE_TARGET_USER` when neither of the user's types is Ghost, and sends the user as the target. So at `ppreduce` the
  target is the user and Pressure does not apply. (The script sets `gBattlerTarget = gBattlerAttacker` itself, but only
  after `ppreduce`.)
  The OPPONENT's controller has no such case: `OpponentHandleChooseMove` reads the table only
  (`battle_controller_opponent.c:1581`), its Curse keeps the player's Pokémon as target, and Pressure applies.
- Engine: `src/engine/factoryBattleScriptFullTurnDecision.ts` `legalMoveDecisions` gave every Curse the foe as target
  (`sourceMoveTarget`, the table shape).

## Fix

`moveMenuTarget`: for battler 0 (the player's controller) a Curse from a user with no Ghost type targets the user. The
opponent's decisions and the execution-time retargets (Encore, forced Struggle: `GetMoveTarget`, no special case) are
unchanged.

## Test

`tests/parityMacCursePlayerTarget.test.ts`: against a Pressure foe the player's Curse decision targets battler 0 and costs
1 PP (unfixed: target 1, 2 PP); the opponent's Curse targets the player's Pokémon and costs 2 PP. Curse's effect is the
same in both.

## ROM replay

Seed 3375 matches 49 / 49 (was 39 / 47). See `STATUS.md`.
