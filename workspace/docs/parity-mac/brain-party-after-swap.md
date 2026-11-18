# Fix 45: the Factory Head's team is rolled after the swap (2026-11-18, round replay)

## What was wrong for a player

Before Noland (the seventh battle of the third and sixth challenges), the player may swap one Pokemon for one of the beaten trainer's.
In the game, Noland's three Pokemon are chosen when that battle starts, after the swap. The game only forbids him the sets the player holds
at that moment and the beaten trainer's three. So Noland can use the very set the player has just swapped away. The engine chose his team
earlier, at GO ON, before the swap, and forbade him the player's team from before the swap: he could never have the swapped-away set.
Rare (it needs a swap right before Noland and his roll landing on that set: a few such rounds in a hundred), but a different opponent team.

## The source

- Before an ordinary trainer, GO ON runs `factory_generateopponentmons` (the trainer and the three sets), then the swap prompt
  (`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:137-158`). Before the Head, `AskReadyForHead` goes to
  `AskSwapBeforeHead`, which has no roll (`:349-376`).
- His team is rolled at the battle's start: `DoSpecialTrainerBattle` -> `FillFactoryTrainerParty` -> `FillFactoryBrainParty`
  (`battle_tower.c:1857`), which refuses a set id held in any of the six `rentalMons` (`battle_factory.c:786-792`). After a swap those are the
  player's three as swapped (`CopySwappedMonData`, `battle_factory_screen.c:2350-2361`) and the beaten trainer's three (`SetRentalsToOpponentParty`,
  `battle_factory.c:384-401`).

## The ROM

Round replay, seed 202, challenge 2, test player ai-v1 swapping its weakest Pokemon after every win. Before battle 7 the player swaps set 361
away for the beaten trainer's set 318. Waiting at the swap prompt changes the RNG cursor of Noland's roll (one VBlank `Random()` per overworld
frame): over 51 waits of 0 to 400 frames, the waits of 128 and 136 frames give Noland sets 348, 320 and **361**. The ROM's `rentalMons` at that
battle's start: 364, 358, 318 (the player's three after the swap), 318, 310, 280 (the beaten trainer's). The engine's rule at GO ON excluded
364, 358, 361, 318, 310, 280 and refuses 361 ("saved-rental-set-id"). The battle itself, with the ROM's team, matched turn by turn (32 states).

## The fix

`preGenerateFactoryRoundNextOpponent` (the GO ON seam) rolls nothing for a Frontier Brain battle. The swap's resolution
(`advanceFactoryRoundPresentation`) rolls him, from the same RNG cursor, with the rentals after the swap (`nextSavedRentalRecords`), through
`adoptNextOpponentOrGenerate` (so the round replay's new `adoptedNextBrainOpponent` seam is honoured there too).

Tests: `tests/parityMacBrainPartyAfterSwap.test.ts` (fails without the fix: the GO ON roll is made, from the rentals before the swap). The
Brain-scheduling tests of `factoryRoundBattleOrchestrator.test.ts` and `factoryBrainRoundShape.test.ts` now read the Head's schedule at the
swap's resolution; every structural check is unchanged (status, trainer, challenge, fixed IV, the cursor handoff, the transition draw).
On the fixed engine the same waits give an exclusion list equal to the ROM's, and the round with Noland on set 361 matches throughout.
