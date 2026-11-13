# The AI's "switch to something that resists" search: the game skips one more bench slot than the engine did — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 152 off DIR`.

## Symptom

Seed 152: the player's Aron (the player's party slot 1) hit the opponent's Porygon with Metal Claw. Next turn the engine's AI
switched Porygon out for Croconaw (one random draw, `Random() % 3 == 0`). The ROM kept Porygon in and spent no draw in its
switch check.

ROM single-step: `FindMonWithFlagsAndSuperEffective(MOVE_RESULT_NOT_VERY_EFFECTIVE, 3)` returned 0 with no `Random()` call
(`gLastLandedMoves[1]` = Metal Claw, `gLastHitBy[1]` = 0).

## Cause

- C, `FindMonWithFlagsAndSuperEffective` (`battle_ai_switch_items.c:378-424`): each bench slot `i` is skipped when it equals
  `gBattlerPartyIndexes[battlerIn1]`, `gBattlerPartyIndexes[battlerIn2]`, `monToSwitchIntoId[battlerIn1]` or
  `monToSwitchIntoId[battlerIn2]` (`:389-396`). Both variables start as the AI's own battler. But inside the loop, at the
  first bench Pokémon whose typing resists the last landed move, the code does `battlerIn1 = gLastHitBy[gActiveBattler]`
  (`:407`) and keeps looping. From then on the first and third tests read the OPPOSING battler: a later bench slot whose
  number equals the player's active party slot is skipped.
  Here: slot 0 Mawile resists Metal Claw (so `battlerIn1` becomes the player's battler) and has no super effective move; slot
  1 Croconaw is skipped because the player's Aron is the player's slot 1; slot 2 is Porygon itself.
- Engine: `src/engine/factoryAiSwitchPolicy.ts` `findDefensiveCandidate` used only the AI's own exclusions for every slot,
  so it examined Croconaw, found Water Pulse super effective into Rock, drew, and switched.

## Fix

`findDefensiveCandidate` carries `battlerIn1` through the loop exactly as C does (own battler until the first typing match,
the last-hit-by battler afterwards) and applies its party index and `monToSwitchIntoId` to the later slots. The AI's own
exclusions (`battlerIn2`) are unchanged.

## Test

`tests/factoryAiSwitchPolicy.test.ts` "resistant-switch search ...": seed 152's bench; with the player's active Pokémon in
slot 2 the AI's slot 2 is skipped (no draw, no switch; fails unfixed with one draw), with it in slot 0 the slot is examined.

## ROM replay

See `STATUS.md`.
