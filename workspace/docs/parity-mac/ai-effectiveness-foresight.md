# The AI's "does this move affect the target" check ignored Foresight — fixed (check-bad-move pass)

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 959 off DIR`.

## Symptom

Seed 959: the opponent's Hitmonlee (Mega Kick, Brick Break, Foresight, Rock Tomb) used Foresight on the player's Sableye
(Dark / Ghost). Next turn the ROM's AI keeps Mega Kick, Brick Break and Rock Tomb at 100 and picks among the three
(it played Brick Break and knocked Sableye out). The engine scored Mega Kick and Brick Break -10 ("no effect on a Ghost") and
played Rock Tomb.

## Cause

- C: `if_type_effectiveness AI_EFFECTIVENESS_x0` (`AI_CBM_CheckIfNegatesType`, `data/battle_ai_scripts.s:57-65`) runs `TypeCalc`
  (`battle_script_commands.c:1536-1591`). At the `TYPE_FORESIGHT` sentinel row the table walk breaks when the defender has
  `STATUS2_FORESIGHT` (`:1560-1566`), so the two rows behind it (Normal -> Ghost x0, Fighting -> Ghost x0) are never applied.
- Engine: `src/engine/factoryAiCheckBadMove.ts` `computeAiEffectiveness` walked the whole table for every target.

## Fix

`computeAiEffectiveness` takes the target's Foresight state and breaks at the sentinel; its eight call sites pass
`target.isForesighted` (the live AI view already fills it).

## Test

`tests/aiv270AiEffectiveness.test.ts` "AI effectiveness honors Foresight on the target": Brick Break / Mega Kick into Dark / Ghost
are -10 without Foresight and 0 with it (the second case fails unfixed).

## ROM replay

Seed 959 matches to battle end. See `STATUS.md`.

## Open next to this (source-read, no ROM seed yet)

The same `TypeCalc` feeds the other two AI passes, and their ports do not take Foresight either:
`src/engine/factoryAiTryToFaint.ts` (`estimateDamage`, `isQuadrupleEffective`: `Cmd_if_can_faint`,
`Cmd_get_how_powerful_move_is`, the x4 test) and the `if_type_effectiveness` checks in
`src/engine/factoryAiCheckViability.ts`. Reach: a full-AI opponent (challenge 4 and up) with a Normal / Fighting move against a
Foresighted Ghost.
