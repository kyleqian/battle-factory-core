# Endure held against a Future Sight landing the same turn (audit lead B3) — fixed

Mac parity lane, 2026-11-12. Evidence is not in git; every number re-derives from the seed with `tools/audio/romDriveSeed.sh SEED off DIR`.

## Symptom

A Pokémon that used Endure survived a Future Sight (or Doom Desire) that landed at the end of that same turn, at 1 HP with
"endured the hit". In the real game it faints: Endure only lasts until the turn's moves are over.

Seed 2215 (Scene OFF): the player's Ninjask (30 HP) uses Endure; the opponent's Grumpig uses Confuse Ray; the Future Sight
it set two turns earlier lands.

| | Ninjask HP after the Future Sight |
|---|---|
| ROM | 30 -> 0, faints |
| engine before the fix | 30 -> 1, `STRINGID_PKMNENDUREDHIT` |

## Cause

- C: `BattleTurnPassed` starts with `TurnValuesCleanUp(TRUE)` (`battle_main.c:3960`), which clears
  `gProtectStructs[i].protected` and `.endured` for every battler (`:4864-4868`). The delayed hit comes later in the same
  function (`HandleWishPerishSongOnTurnEnd`); its script `BattleScript_MonTookFutureAttack` runs `adjustnormaldamage2`
  (`battle_scripts_1.s:3517`), whose clamp reads `gProtectStructs[gBattlerTarget].endured`
  (`battle_script_commands.c:1726-1730`). The flag is already 0.
- Engine: `src/engine/battleEndTurnOrchestration.ts` `enterTurnValuesCleanUp` did the substitute sync and the Follow Me
  clear only. Its comment said the pair had "no modeled end-turn reader" and left it to the full `ProtectStruct` reset at
  the end of the pass (`TurnValuesCleanUp(FALSE)`), after the Future Sight sweep.

## Fix

`enterTurnValuesCleanUp` clears `protected` and `endured` on every battler first, as the source does.

## Test

`tests/battleScriptFutureAttack.test.ts`, "Endure used this turn does not hold against the delayed hit": target at 30 HP
with `endured: 1`, a delayed hit worth 40. Fixed: 0 HP. Unfixed: 1 HP.

## ROM replay

Seed 2215 matches 27 / 27 (was 26 / 29). See `STATUS.md`.
