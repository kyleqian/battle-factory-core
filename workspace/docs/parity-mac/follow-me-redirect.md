# The foe's Follow Me did not redirect the player's self-aimed Curse (fix 42)

Found while checking the second lead of the fifth pass's finer tally (Follow Me and a Ghost Curse aimed at its own
user, `rule-coverage.md`).

## What was wrong for the game

When the player uses Curse with a Pokemon that is not a Ghost type, the game aims the move at that Pokemon itself. If
the opponent used Follow Me earlier in the turn, the game aims the Curse at the Follow Me user instead. Curse still
raises the user's stats as before, but Pressure now counts: if the Follow Me user has Pressure, the Curse costs two PP.
The engine kept the Curse aimed at its user and took one PP.

Where a player meets it: the Follow Me user must have Pressure. No Level 50 set has both; Pressure can reach a Follow Me
user (Clefable 389 or 485) only through a Metronome-called Role Play or Skill Swap. Very rare. Every other move a
singles battle can use is aimed at the opponent already, so the redirect changes nothing else.

## C source

- The player's controller banks a non-Ghost Curse with the user as target: `HandleInputChooseMove`,
  `src/battle_controller_player.c:486-501` (the engine has this, `moveMenuTarget`).
- `HandleAction_UseMove`, `src/battle_util.c:148-156`, the "choose target" block, runs at the start of every move:

      side = BATTLE_OPPOSITE(GetBattlerSide(gBattlerAttacker));
      if (gSideTimers[side].followmeTimer != 0
          && gBattleMoves[gCurrentMove].target == MOVE_TARGET_SELECTED
          && GetBattlerSide(gBattlerAttacker) != GetBattlerSide(gSideTimers[side].followmeTarget)
          && gBattleMons[gSideTimers[side].followmeTarget].hp != 0)
      {
          gBattlerTarget = gSideTimers[side].followmeTarget;
      }

  Curse's table target is `MOVE_TARGET_SELECTED` (`src/data/battle_moves.h:2265-2276`).
- `Cmd_ppreduce`, `src/battle_script_commands.c:1212-1227`: one more PP when `gBattlerAttacker != gBattlerTarget` and the
  target has Pressure. `BattleScript_EffectCurse` (`data/battle_scripts_1.s:1482-1491`) runs `ppreduce` before its
  `copybyte gBattlerTarget, gBattlerAttacker`, so the redirected target is the one Pressure is read from.

## Engine and fix

`src/engine/factoryBattleScriptFullTurnDecision.ts`: `runMoveAction` took the banked target (or the Encore / forced
Struggle re-target) and had no "choose target" block. New `followMeActionTarget` applies it after those arms, as the
source does.

## The lead it came from

The lead was: the engine's `getmovetarget` (`VARIOUS_GET_MOVE_TARGET`, `battleScriptSwitchinOpcode.ts`) always draws the
random target, while the game's `GetMoveTarget` first takes the Follow Me user without a draw (`battle_util.c:3840-3846`, the `MOVE_TARGET_SELECTED` arm).
That case cannot happen in a singles battle: the only script that uses `getmovetarget` is `BattleScript_GhostCurse`
(`data/battle_scripts_1.s:1511-1513`), and it runs it only when the Curse is aimed at its own user. With the foe's
Follow Me up, the block above has already aimed the Curse at the Follow Me user at the start of the move, so the
script skips `getmovetarget`. A Curse called by Metronome, Sleep Talk, Assist or Mirror Move gets its target from
`GetMoveTarget`, never its user.

## Proof

- Test (fails without the fix): `tests/parityMacFollowMeRedirectsSelfCurse.test.ts`. The player's Snorlax uses Curse; the
  foe's Dusclops (Pressure) uses Follow Me: Curse PP 10 -> 8. Control, Dusclops uses Splash: 10 -> 9.
- ROM, Mechanic Lab (`mode: mechanicLab`, lab seed 801; the player's Snorlax with Curse and Splash, the opponent's
  Dusclops with four Follow Me, or four Splash for the control). With Follow Me: Dusclops moves first (Follow Me has
  priority +3), Snorlax's Curse PP goes 10 -> 8, and 8 -> 6 the next turn. Control: Snorlax moves first, Curse PP
  10 -> 9 -> 8. The request:

      {"mode": "mechanicLab", "level": 50, "challengeNum": 0, "battleNum": 0, "trainerId": 50, "seed": 801,
       "playerSetIds": [156, 149, 180], "opponentSetIds": [184, 188, 135],
       "overrides": {"parties": {
         "player": [{"species": 143, "moves": [174, 150, 150, 150]}, {"species": 113, "moves": [150, 150, 150, 150]},
                    {"species": 242, "moves": [150, 150, 150, 150]}],
         "opponent": [{"species": 362, "moves": [266, 266, 266, 266]}, {"species": 2, "moves": [150, 150, 150, 150]},
                      {"species": 153, "moves": [150, 150, 150, 150]}]}}}

  Decisions: Curse, Curse, Splash. The Mechanic Lab drives the ROM only; the engine side is the test above with the
  same numbers.
