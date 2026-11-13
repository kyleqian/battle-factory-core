# Confusion self-hit ignored the "Explosion halves Defense" rule (audit lead B6) — fixed

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 218 off DIR`.

## Symptom

Seed 218: the opponent's Forretress is confused and chooses Explosion. It hurts itself instead.

| | Forretress HP |
|---|---|
| ROM | 133 -> 102 (31) |
| engine before the fix | 133 -> 117 (16) |

The turn before, the same confused Forretress chose Rock Slide and both sides took 17.

## Cause

- C: the confusion self-hit is `CalculateBaseDamage(&gBattleMons[atk], &gBattleMons[atk], MOVE_POUND, 0, 40, 0, atk, atk)`
  (`battle_util.c:2173`). Inside, `pokemon.c:3229` tests `gBattleMoves[gCurrentMove].effect == EFFECT_EXPLOSION` on the
  GLOBAL `gCurrentMove`, not on the `move` argument, and halves the defender's Defense. `gCurrentMove` is still the move the
  confused Pokémon chose, so a self-hit while "using" Explosion or Selfdestruct is taken against half Defense.
- Engine: `src/engine/battleScriptActionAdmission.ts` (confused canceller, `calculateBaseDamage` call) passed no `moveEffect`.

## Fix

That call passes `moveEffect: "EFFECT_EXPLOSION"` when `rulesContext.currentMoveEffect` is `EFFECT_EXPLOSION` (7).

## Test

`tests/aiv267AiScreensSelfHit.test.ts` "confusion self-hit halves Defense when the chosen move is Explosion / Selfdestruct":
Tackle chosen 19 (control), Explosion 37, Selfdestruct 37 (both fail unfixed with 19).

## ROM replay

Seed 218: see `STATUS.md`. The other four seeds that carried the confusion signature (457 616 838 986) were the
opponent-replacement rule (`opponent-replacement-pass1.md`) and match since that fix.
