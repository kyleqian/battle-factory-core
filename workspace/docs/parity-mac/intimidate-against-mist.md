# Intimidate against a side under Mist lowered the Intimidate user's own Attack — fixed

Found by the Metronome sweep (fourth pass): staged battle `stages/metronome-lock-on.json` (real sets, lab seed 50039).

## Symptom

The player's side is under Mist (Chansey called it through Metronome). The opponent's Arbok enters with Intimidate.
ROM: "protected by MIST", nobody's Attack changes. Engine: the same line, then "cuts Attack", and Arbok's own Attack
went down one stage.

## What it changes for the game

An opponent's Intimidate that was blocked by the player's Mist weakened the opponent itself. In the Level 50 Factory
Mist comes only from Metronome, so this is rare. (The player's Intimidate against an opponent's Mist was right: the
loop ends before it can go wrong.)

## C source

`BattleScript_IntimidateActivatesLoop` (`battle_scripts_1.s`) calls `trygetintimidatetarget` on every pass.
`Cmd_trygetintimidatetarget` (`battle_script_commands.c:9567-9590`) starts with
`gBattleScripting.battler = gBattleStruct->intimidateBattler` (`:9571`) and skips every battler on that Pokemon's
side. The intimidator is stored when the script is started (`AbilityBattleEffects`, `battle_util.c:3011` / `:3083`).
`statbuffchange` hands a Mist-protected target to `BattleScript_MistProtected` with the scripting battler set to that
target (`ChangeStatBuffs`); the next pass of the loop puts the intimidator back.

## Engine and fix

`src/engine/battleScriptSwitchinOpcode.ts` took the scripting battler for the intimidator. After the Mist script that
is the protected Pokemon, so the next pass looked for a target on the other side and found the real intimidator.
The rules now carry `intimidateBattler` (set where the engine starts the Intimidate script: the after-action pass
and the battle start), and the command reads it and writes it back into the scripting battler, as the game does.

## Proof

- ROM, `stages/metronome-lock-on.json`: before the fix `battlers.1.statStages.1` was 5 in the engine and 6 on the ROM
  at decision 11. After it all 16 turn states and every wide state match; the rows "Mist blocks a stat drop" and
  "Mist ends" are in this battle's tally.
- Test (fails without the fix): `tests/battleScriptFaintedActionsOrchestration.test.ts` "state 6: an opponent's
  Intimidate blocked by the player's Mist lowers nobody's Attack". Re-pin: the rules key list has `intimidateBattler`.
