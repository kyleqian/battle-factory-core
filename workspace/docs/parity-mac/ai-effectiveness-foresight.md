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

## The other two AI passes (fourth pass, fix 32)

The same `TypeCalc` feeds the other two passes, and their ports did not take Foresight:

- `AI_TryToFaint`: `Cmd_if_can_faint` and `Cmd_get_how_powerful_move_is` run `AI_CalcDmg` and then `TypeCalc`
  (`battle_ai_script_commands.c`), and the x4 probe runs `TypeCalc` on a fixed 40. Engine:
  `src/engine/factoryAiTryToFaint.ts` `estimateDamage` and `isQuadrupleEffective` now pass the target's Foresight state
  to the shared table walk (`applyTypeEffectiveness`, which already had the Foresight break for real hits).
- `AI_CheckViability`: every `if_type_effectiveness` probe. Engine: `classifyHighCritEffectiveness` in
  `src/engine/factoryAiCheckViability.ts` takes the target's Foresight state; its nine handlers (Absorb, Dream Eater,
  Recharge, High Crit, Charge-Up, Overheat, Focus Punch, Superpower, Eruption) get it from the decision policy.

What was wrong for the game: against a Ghost that the opponent had hit with Foresight or Odor Sleuth, the full AI
still saw its Normal and Fighting moves as doing 1 damage ("cannot knock out", "not my strongest move"), and its
Cross Chop took one random roll too many, which moved every later random number of the battle.

Reach, from the pool data and the AI scripts:

- The full AI is Noland, or an ordinary trainer from challenge 4 on. The only sets with a Foresight move are 178
  (Machoke), 283 (Machoke: Cross Chop, Rock Slide, Foresight, Scary Face) and 338 (Hitmonlee: Mega Kick, Brick Break,
  Foresight, Rock Tomb). None is in an ordinary trainer's range from challenge 4 on; 283 and 338 are in **silver
  Noland's** range (267..371).
- The shipped (non-`BUGFIX`) `AI_CV_Foresight` reads the **user's** types, so Machoke and Hitmonlee score Foresight -2
  (`data/battle_ai_scripts.s`, `AI_CV_Foresight`). Noland uses it only when everything else scores below 98: against a
  Ghost that is after his Rock move has run out of PP (Cross Chop / Mega Kick / Brick Break sit at 90, "no effect").

So the case is: silver Noland, one of those two sets, a Ghost rental (268 Sableye, 284 Haunter, 342 Banette) that
outlasts ten Rock Slides or Rock Tombs. Real, and rare.

Tests: `tests/parityMacAiForesightTryToFaintViability.test.ts` (three cases, all fail without the fix);
`tests/factoryAiScoredWiringParity.test.ts` carries the new field in its exhaustive samples.

ROM proof: none yet. A staged Noland battle exists (`docs/parity-mac/stages/foresight-noland.json`, lab seed 30031:
Noland's party has Machoke 283) and matches the ROM, but the AI never chose Foresight in it, for the reason above. See
`STATUS.md` for the state of the staged battle.
