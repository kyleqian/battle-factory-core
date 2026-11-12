# The AI scored only the moves it could select; the game scores every move that still has PP — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 95 off DIR` (also seed 529).

## Symptom

Seed 95, turn 3: the opponent's Absol holds a Choice Band and is locked into Aerial Ace. Both sides play the same moves,
but the engine's hits are 63 / 30 and the ROM's 66 / 31: the damage rolls are shifted because the engine's AI phase spent 7
random draws and the ROM's 11 (the box's `docs/dia275-triage.md` group C measured the same counts).

ROM single-step of that AI phase (`Random()` callers, with `gAIScriptPtr`):

| draw | caller | script position | slot |
|---|---|---|---|
| 2-5 | `BattleAI_SetupAIData` | (simulatedRNG) | 0-3; scores already `[0, 0, 100, 0]`: slots 0, 1, 3 are masked by the Choice lock |
| 6, 7 | `Cmd_get_ability` | `AI_CBM_CheckIfNegatesType`, `AI_CheckBadMove_CheckSoundproof` | 0 (Double-Edge, masked) |
| 8, 9 | `Cmd_get_ability` | same | 2 (Aerial Ace, the only selectable move) |
| 10, 11 | `Cmd_get_ability` | same | 3 (Iron Tail, masked) |
| 12 | `ChooseMoveOrAction_Singles` | tie draw | |

(Slot 1, Shadow Ball into a Normal type, exits on `if_type_effectiveness AI_EFFECTIVENESS_x0` before any draw.)
The engine drew 4 + 2 (slot 2 only) + 1.

## Cause

- C: `BattleAI_SetupAIData` (`battle_ai_script_commands.c:326-341`) gives a move masked by `CheckMoveLimitations` a starting
  score of 0, nothing more. `BattleAI_DoAIProcessing` (`:582-589`) blanks `moveConsidered` only when the slot's PP is 0;
  every other slot is run through every scoring script. So a slot that is unusable because of a Choice Band lock, Disable,
  Taunt, Torment or Imprison still spends its script draws (and its `funcResult` writes carry to later slots).
- Engine: `src/engine/factoryAiDecisionPolicy.ts` `chooseFactoryAiScoredDecision` ran the three passes (check bad move,
  try to faint, check viability) only for slots in the request's legal list. Its comment said an illegal slot's
  `moveConsidered` is 0; that is true for 0 PP only.

## Fix

- The AI view's attacker carries `movePp` (filled by `src/engine/factoryAiLiveDriver.ts` from the live battler).
- A slot is scripted when its move is not `MOVE_NONE` and its PP is not 0. Selection is unchanged: only legal slots enter
  the best-score pool (a masked slot starts at 0 and cannot reach a usable slot's score).
- Hand-built views without `movePp` keep the old behaviour, so older staged fixtures are unaffected.

## Tests

`tests/factoryAiLiveDriver.test.ts` "scripts every slot that still has PP ...": a request with one selectable slot draws
exactly what the all-selectable request draws (fails unfixed: fewer draws), and a 0-PP slot is not scripted.
`tests/factoryAiScoredWiringParity.test.ts` and the banked-view case in `tests/factoryAiLiveDriver.test.ts` carry the new field.

## ROM replay

Seeds 95 and 529 match to battle end. See `STATUS.md`.

## Not covered

C's final pool (`ChooseMoveOrAction_Singles`) compares every non-empty slot's score, masked ones included, and each `score`
command clamps at 0. A masked slot could only be picked if every usable slot's score fell to the masked slot's own
(0 to about +5). Not observed; the engine keeps masked slots out of the pool.
