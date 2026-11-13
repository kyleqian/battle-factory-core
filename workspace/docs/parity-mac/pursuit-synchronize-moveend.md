# Pursuit on a switching Pokemon: the Pursuit user's Synchronize must end the move-end steps (fix 43)

Found while checking the first lead of the fifth pass's finer tally (`rule-coverage.md`).

## What was wrong for the game

When a Pokemon switches out and the opponent's Pursuit hits it on the way out, the game runs only the first part of the
"after the move" steps (abilities that react to the hit, Synchronize) and then goes on with the switch. If the hit
Pokemon's Static, Poison Point or Flame Body gives the Pursuit user a status, and the Pursuit user has Synchronize, the
Synchronize passes the status back, and the game stops the steps there. The engine went on with the rest of the steps
(Choice Band lock, items, King's Rock and Shell Bell, the last-move record). The last-move step swaps attacker and
target back, the Pursuit script swaps them again, and the switch then ran for the wrong side: **the engine stopped with
an error** ("battler 1 has no decided monToSwitchIntoId"). In a whole-battle replay that is the end of the battle.

Where a player meets it: the Pursuit user must have Synchronize. No Level 50 set has both. It takes a Skill Swap from
a Synchronize Pokemon (Alakazam 596, at the sixth and eighth challenges) onto a Pursuit user (Fearow 473 or Altaria 508,
fifth and eighth), and then a Pursuit on a switching Static, Poison Point or Flame Body Pokemon (30 % per hit). Rare.

## C source

- `BattleScript_PursuitDmgOnSwitchOut`, `data/battle_scripts_1.s:3123-3145`: `moveendfromto MOVEEND_ON_DAMAGE_ABILITIES,
  MOVEEND_CHOICE_MOVE` (steps 3 to 5; `moveendfromto` is `moveend 2, to`, `asm/macros/battle_script.inc:441-444`).
- `Cmd_moveend`, `src/battle_script_commands.c`: `MOVEEND_SYNCHRONIZE_ATTACKER` calls `BattleScript_SynchronizeActivates`
  (`AbilityBattleEffects(ABILITYEFFECT_ATK_SYNCHRONIZE, ...)`, `src/battle_util.c:2987-3002`) and increments the state to
  6. Then, still inside the loop, `if (endMode == 2 && endState == gBattleScripting.moveendState) moveendState =
  MOVEEND_COUNT;` (`:4489-4492`) runs for that step too. The loop exits for the script; when the script returns,
  `moveendfromto` runs again with the state at MOVEEND_COUNT and only moves past the command.
- Every other script with an end step (`moveendto MOVEEND_NEXT_TARGET`, `moveendfromto MOVEEND_ITEM_EFFECTS_ALL,
  MOVEEND_UPDATE_LAST_MOVES`) ends after a step that never calls a script (MIRROR_MOVE, SUBSTITUTE), so only this one is
  affected.

## Engine and fix

`src/engine/battleScriptMoveEndOpcode.ts`, `createMoveendOpcodeHandler`: a step that called a script returned before the
end check. Now the check is applied to the state the script call leaves, as in the source.

## Proof

- Test (fails without the fix): `tests/parityMacPursuitSynchronizeStopsMoveEnd.test.ts`. Electabuzz (Static) switches
  out, the opponent's Umbreon (Synchronize) uses Pursuit. Seed 5 (Static fires): without the fix the engine stops with
  the error above; with it, Umbreon and Electabuzz are paralysed, the player's Chansey comes in, the last-move records
  stay 0. Control, seed 1 (Static does not fire): the same switch, no status.
- ROM, Mechanic Lab, lab seed 801 (and 802): the opponent's Umbreon with four Pursuit, the player's Electabuzz (Static),
  Chansey and a third Pokemon with Splash; the player switches Electabuzz out and in. Frame 1596: the Pursuit on the
  switching Electabuzz, Umbreon paralysed by Static; frame 1747: Electabuzz paralysed by Synchronize; the switch goes
  on (Chansey comes in) and both last-move records stay 0 for the whole battle. The request:

      {"mode": "mechanicLab", "level": 50, "challengeNum": 0, "battleNum": 0, "trainerId": 50, "seed": 801,
       "playerSetIds": [156, 149, 180], "opponentSetIds": [184, 188, 135],
       "overrides": {"parties": {
         "player": [{"species": 125, "moves": [150, 150, 150, 150]}, {"species": 113, "moves": [150, 150, 150, 150]},
                    {"species": 242, "moves": [150, 150, 150, 150]}],
         "opponent": [{"species": 197, "moves": [228, 228, 228, 228]}, {"species": 2, "moves": [150, 150, 150, 150]},
                      {"species": 153, "moves": [150, 150, 150, 150]}]}}}

  Decisions: voluntary switches to party slot 1, 0, 1, 0, ... The Mechanic Lab drives the ROM only; the engine side is
  the test above.

## With and without the fix

| | engine | ROM |
|---|---|---|
| without fix 43 | the test's seed 5 (Static fires) stops with "Cmd_switchhandleorder: battler 1 has no decided monToSwitchIntoId"; about one seed in three of a sweep of 40 did | lab seed 801: Umbreon paralysed at decision 4, Electabuzz paralysed at decision 5, the switches go on, last moves 0 (`stages/mechanic-lab/fix43-pursuit-synchronize.request.json`); seed 802 the same at decisions 6 and 7 |
| with fix 43 | seed 5: Umbreon and Electabuzz paralysed, the switch goes on, last moves 0; the control seed 1: no status | control: seed 803, Static never fires, no status |

The Mechanic Lab has no engine side, so there is no "states matched" count: the engine numbers are the test's. A
staging with real sets needs Synchronize moved to a Pursuit user by Skill Swap; not staged.

