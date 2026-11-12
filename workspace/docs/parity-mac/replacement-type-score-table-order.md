# The opponent's replacement: the type score ran in the wrong order — fixed

Mac parity lane, 2026-11-12. Evidence is not in git; every number re-derives from the seed with `tools/audio/romDriveSeed.sh SEED off DIR`.

## Symptom

After an opponent Pokémon fainted, the engine sometimes sent in a different Pokémon than the real game when a bench Pokémon
had two types and the player's Pokémon hit one of them hard and the other weakly.

Seed 1414 (Scene OFF): the player's Rhydon (Ground / Rock) is out; the opponent's Aggron faints. Bench: Heracross
(Bug / Fighting) and Machamp (Fighting). The ROM sends Machamp. The engine sent Heracross.

## Cause

- C: `GetMostSuitableMonToSwitchInto` scores each bench Pokémon with two `ModulateByTypeEffectiveness` calls
  (`battle_ai_switch_items.c:702-703`) and keeps the HIGHEST score (`:704`). `ModulateByTypeEffectiveness` (`:605-627`)
  walks `gTypeEffectiveness` from the top and applies every matching row as it meets it: `*var = *var * mult / 10`,
  a `u8`, truncating each time. The order is the TABLE's order. For Rock into Bug / Fighting the table has
  `ROCK, FIGHTING, x0.5` (`battle_main.c:422`) before `ROCK, BUG, x2` (`:425`).
  Heracross: 10, Ground into Bug x0.5 = 5, Rock into Fighting x0.5 = 2, Rock into Bug x2 = **4**. Machamp: 10, Rock into
  Fighting x0.5 = **5**. Machamp wins.
- Engine: `src/engine/battleAiSwitchInto.ts` `modulateByTypeEffectiveness` applied the candidate's first type, then its
  second type: Heracross 5 -> x2 = 10 -> x0.5 = **5**, a tie with Machamp, and the first slot (Heracross) won.

## Fix

`modulateByTypeEffectiveness` uses `matchingTypeEffectivenessRows` (the same table walk the damage code uses), so the rows
apply in table order with the per-step truncation. The Foresight marker row is skipped and the two rows after it still
apply, as in the source (`:611-615`).

Pass 1's "has a super effective move" test did not need a change: it reads flags, and two rows cancel in either order.

## Test

`tests/battleAiSwitchInto.test.ts`, "seed 1414: the type score applies gTypeEffectiveness rows in TABLE order": seed 1414's
bench. Fixed: party slot 2 (Machamp). Unfixed: slot 1 (Heracross).

## ROM replay

Seed 1414 matches 12 / 12 (was 2 / 9). See `STATUS.md`.
