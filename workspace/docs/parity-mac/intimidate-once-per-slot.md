# Intimidate / Trace fire once per field slot until an action finishes — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 1083 off DIR`.

## Symptom

Seed 1083: the opponent's Masquerain (Intimidate) comes in as a replacement at the end of a turn and lowers Quilava's Attack
(stage 6 -> 5). The next turn's first action knocks Masquerain out and Mawile (Intimidate) replaces it.

| | Quilava's Attack stage after Mawile enters |
|---|---|
| ROM | 5 (Mawile's Intimidate does not activate) |
| engine before the fix | 4 |

Fury Swipes then did 2 per hit on the ROM and 1 per hit in the engine.

## Cause

- C, `AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN)` (`battle_util.c:2559-2581`): Intimidate is queued only
  `if (!gSpecialStatuses[battler].intimidatedMon)`, and that flag is then set; Trace does the same with `.traced`. The
  flag belongs to the battler SLOT, not to the Pokémon. Only `SpecialStatusesClear` resets it: at
  `HandleAction_ActionFinished` (`battle_util.c:663`) and at battle start (`battle_main.c:3041`, `:3902`).
  A replacement sent in during the end-of-turn pass raises the flag; if the first action of the next turn knocks it out, its
  own replacement enters inside that same action (before `HandleAction_ActionFinished`), finds the flag still raised and
  queues nothing.
- Engine: `src/engine/battleScriptSwitchinOpcode.ts` queued the `gStatuses3` bit for every Intimidate / Trace switch-in;
  the per-slot flag was not represented (`src/engine/battleActionFinished.ts` listed it as unrepresented).

## Fix

`BattleScriptSpecialStatus` carries optional `intimidatedMon` / `traced`. The switch-in opcode tests and raises them;
`handleBattleActionFinished` already rebuilds the whole special-status record, which drops them (the source's
`SpecialStatusesClear`). Battle start does not go through this opcode and leaves the flags down, as `battle_main.c:3902` does.

## Test

`tests/battleScriptSwitchinOpcode.test.ts` "... is queued once per battler slot until an action finishes" (Intimidate and
Trace): first entry queues and raises the flag, a second entry with the flag raised queues nothing, the action-finished
step lowers it (both fail unfixed).

## ROM replay

Seed 1083 matches to battle end. See `STATUS.md`.
