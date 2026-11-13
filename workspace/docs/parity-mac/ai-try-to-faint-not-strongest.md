# AI "try to faint": a move that is not the strongest stops at -1; the engine went on to the 4x bonus roll — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 236 off DIR`.

## Symptom

Seed 236: the opponent's Magmar (Flamethrower, Psychic, Cross Chop, Confuse Ray) faces Aggron (Steel / Rock). The ROM plays
Confuse Ray, the engine played Cross Chop.

| | scores after the three passes | draws in the AI phase |
|---|---|---|
| ROM (single-step) | `[100, 99, 100, 100]` | no `Random()` in `AI_TryToFaint`; `AI_CV_HighCrit2` roll on slot 2; tie draw |
| engine before the fix | `[100, 99, 102, 100]` | one extra `double-super-effective` roll on slot 2 |

## Cause

- C, `AI_TryToFaint` (`data/battle_ai_scripts.s:2616-2636`): `if_equal MOVE_NOT_MOST_POWERFUL, Score_Minus1` (`:2620`) JUMPS
  to `Score_Minus1` (`:600-602`: `score -1`, `end`). The x4 test `if_type_effectiveness AI_EFFECTIVENESS_x4, ...` (`:2621`)
  and its `if_random_less_than 80` (`:2625`) are reached only by a move that is the strongest (or has no comparable power).
- Engine: `src/engine/factoryAiTryToFaint.ts` `runTryToFaint` applied the -1 and then still tested x4 and rolled, so a weaker
  x4 move spent a draw and could gain +2 (net +1). Cross Chop is x4 into Steel / Rock but not Magmar's strongest move here.

## Fix

The x4 roll runs only when the move is not `not-most-powerful`.

## Test

`tests/factoryAiTryToFaint.test.ts`: Icy Wind next to Ice Beam into Grass / Flying: -1, no draw (fails unfixed: one roll).

## ROM replay

See `STATUS.md`.
