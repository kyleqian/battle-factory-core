# The AI remembered a Pokémon that had left and come back while the AI was locked (audit "suspected" lead) — fixed

Mac parity lane, 2026-11-12. No replay seed shows this (the replay's player never switches by choice). Proof is the source.

## Symptom

The opponent AI keeps a record of the player's Pokémon: the moves it has seen and its ability. The real game wipes that
record every time a Pokémon enters the field. The engine wiped it only when it noticed a different Pokémon at the
opponent's next decision. If the opponent was locked into a multi-turn move (Rollout, Outrage, Thrash, Uproar ...) and
made no decision for two turns, the player could switch A -> B -> A, and at its next decision the engine's AI still
"knew" A's moves and ability. That changes move scores, and for a two-ability species it removes the `Random() & 1`
ability guess, so the opponent spends a different number of random numbers.

## Cause

- C: `SwitchInClearSetData` ends with `ClearBattlerMoveHistory(gActiveBattler); ClearBattlerAbilityHistory(gActiveBattler);`
  (`battle_main.c:3260-3261`). Every switch-in, at once.
- Engine: the history lives outside the battle kernel (`FactoryAiBattleHistory`, `src/engine/factoryAiLiveDriver.ts`)
  and is brought up to date by `syncFactoryAiBattleHistory`, which runs only when the AI makes a decision. Its one clear
  rule was "the slot's party index differs from last time". After A -> B -> A it is the same index.

## Fix

- The kernel counts the two source calls per battler slot: `aiHistoryClears` in the rules context, incremented by the
  switch-in data update (`src/engine/battleScriptSwitchinOpcode.ts`), next to its existing reset of the observed ability.
- The history stores the counts seen at the last sync; a changed count clears the slot's moves and ability like a changed
  party index does. The item-effect record is kept, as in the source.

## Tests

- `tests/factoryAiLiveDriver.test.ts`, "forgets a Pokemon that left and came back between two AI decisions" (unfixed:
  the move list is kept).
- `tests/battleScriptSwitchinOpcode.test.ts`: the switch-in data update counts the clear for its slot.

## Not done

No ROM scenario. It needs an opponent locked for two turns, a player double switch, and an AI decision afterwards whose
random draws depend on the forgotten ability; the source lines are unconditional.
