# The opponent's replacement after a faint: pass 1 read the type chart, not `TypeCalc`'s flags (audit leads A2, A3) — fixed

Mac parity lane, 2026-11-12. Evidence is not in git; every number re-derives from the seed with `tools/audio/romDriveSeed.sh SEED off DIR`.

## Symptom

After an opponent Pokémon fainted, the engine sometimes sent in a different Pokémon than the real game. Two rules were wrong,
both in the first pass of `GetMostSuitableMonToSwitchInto` ("the bench Pokémon with the best typing must also have a super
effective move").

1. **Status moves counted as super effective moves (A2).** Seed 332: player Aggron (Steel / Rock). Bench: Ampharos (Thunder,
   Rain Dance, Thunder Wave, Attract) and Slowking (Psychic, Brick Break, Amnesia, Attract). Typing ties, Ampharos is first.
   The engine accepted Ampharos because Rain Dance is a Water-type move and Water is x2 into Rock. The ROM rejects Ampharos and
   sends Slowking (Brick Break is x4). Same shape: seed 491 (Sand-Attack into Relicanth; ROM sends Wobbuffet for Counter,
   power 1), 566 (Sand-Attack into Corsola), 573 (Will-O-Wisp into Steelix), 675 (Detect into Glalie).
2. **Levitate was ignored (A3).** Seed 284: player Weezing (Poison, Levitate). Bench: Quagsire (Earthquake, Sludge Bomb,
   Double-Edge, Curse) and Whiscash (Sleep Talk, Rest, Surf, Fissure). The engine accepted Quagsire for Earthquake. The ROM
   single-step shows `TypeCalc(EARTHQUAKE)` returning flags 9 (`MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE`), no bench
   Pokémon passing pass 1, then pass 2: `AI_CalcDmg` 64 for every candidate move, Rest (Psychic into Poison) 128, so Whiscash.

## Cause

- C: `battle_ai_switch_items.c:733` tests `TypeCalc(move, gActiveBattler, opposingBattler) & MOVE_RESULT_SUPER_EFFECTIVE`.
  `TypeCalc` (`battle_script_commands.c:1536-1591`): returns 0 for `MOVE_STRUGGLE`; a Ground move into `ABILITY_LEVITATE` sets
  only `MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE` (`:1554`); otherwise `ModulateDmgByType2` (`:1487-1534`) sets
  `MOVE_RESULT_SUPER_EFFECTIVE` only `if (gBattleMoves[move].power && !(*flags & MOVE_RESULT_NO_EFFECT))` (`:1524`).
  A power-0 move never gets the flag. Variable-power moves carry power 1 and do.
- Engine: `src/engine/battleAiSwitchInto.ts` `moveIsSuperEffectiveAgainst` multiplied the type chart with no power test.
  `src/engine/battleScriptOpenPartyScreenOpcode.ts` called pass 1 with no opposing ability / status2 (they were only part of
  the pass-2 "damage fallback" object, built after pass 1 had already answered).

Pass 2 (`:748-789`) was already source-shaped (status moves DO score there, through their type): seed 284's ROM numbers
(64 / 128) are what the engine computes.

## Fix

- `moveIsSuperEffectiveAgainst`: `MOVE_STRUGGLE` and power-0 moves return false.
- `BattleAiSwitchDamageFallback.baseDamage` may be a thunk, evaluated once and only when pass 2 is reached (C calls
  `AI_CalcDmg` only there). `Cmd_openpartyscreen` now makes one call with the whole opposing-battler context, so pass 1 sees
  Levitate and Foresight.

## Tests (all fail on the unfixed code)

- `tests/battleAiSwitchInto.test.ts`, "pass 1 reads TypeCalc's flags": the benches of seeds 332, 491 and 284 (and a control
  without Levitate that must resolve in pass 1 without running `AI_CalcDmg`).
- `tests/battleScriptOpenPartyScreenOpcode.test.ts`: the seed 284 bench through the real opcode, Levitate vs no Levitate.

## ROM replay

See `STATUS.md` for the seed lists after this fix.

## Not in this fix

Audit lead A4 (the AI's VOLUNTARY switch reaches the same function with a base damage of 0 in
`src/engine/factoryAiSwitchPolicy.ts`): see `STATUS.md`.
