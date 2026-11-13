# Shell Bell healed its holder off a Future Sight hit (audit lead B4) — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 475 off DIR`.

## Symptom

Seed 475: the opponent's Whiscash (Shell Bell) used Future Sight; two turns later it lands on the player's Hariyama for 45.

| | Whiscash HP after the delayed hit |
|---|---|
| ROM | 74 (unchanged) |
| engine before the fix | 74 -> 79 (45 / 8 healed) |

## Cause

- C: the end-of-turn Future Sight handler sets `gSpecialStatuses[gBattlerTarget].shellBellDmg = IGNORE_SHELL_BELL`
  (`battle_util.c:1816`) before `BattleScript_MonTookFutureAttack`. `Cmd_datahpupdate` writes `shellBellDmg` only when the cell
  is 0 (`battle_script_commands.c:1932-1933`), so the marker stays, and the Shell Bell case that
  `BattleScript_FutureAttackEnd`'s `moveendfromto MOVEEND_ITEM_EFFECTS_ALL, MOVEEND_UPDATE_LAST_MOVES` reaches rejects it
  (`battle_util.c:3789-3790`).
- Engine: `src/engine/battleEndTurnOrchestration.ts` (the delayed-hit setup in the Future Sight sweep) did not write the
  marker, so the hit's `datahpupdate` recorded the damage and the attacker's Shell Bell healed.

## Fix

The sweep writes `shellBellDmg = 0xFFFF` on the target before the script runs. Doom Desire takes the same path.

## Test

`tests/battleScriptFutureAttack.test.ts` "the attacker's Shell Bell does not heal off the delayed hit ...": target 140 -> 101,
holder stays at 100 (fails unfixed: 104).

## ROM replay

See `STATUS.md`.
