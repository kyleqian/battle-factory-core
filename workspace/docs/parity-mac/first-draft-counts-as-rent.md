# Fix 44: the first draft of a challenge counts as a rent (2026-11-18, round replay)

## What was wrong for a player

The game keeps a count of rentals (`factoryRentsCount`; a lost challenge resets it). From 15, and at every 7 more, the next challenge's draft
offers one more of its six rentals from the better set range (`GetNumPastRentalsRank`, the "rental rank"). The game counts the first draft
of every challenge as a rental, and every swap after it. The engine counted the swaps only. So on the engine a player who never swaps
never gets a better draft; in the game they do after 15 won challenges in a row. A player who swaps often got each better draft at the same
challenge or one challenge later on the engine than in the game.

## The source

- The fresh-draft entry of the pre-battle room runs `factory_setswapped` right before the rental screen
  (`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:39-41`: `fadescreen`, `factory_setswapped`, `factory_rentmons`).
  `factory_setswapped` is `SetPerformedRentalSwap` (`battle_factory.c:298-301`): `sPerformedRentalSwap = TRUE`.
- Every won battle runs `factory_get FACTORY_DATA_WIN_STREAK_SWAPS`, adds one and `factory_set`s it
  (`BattleFrontier_BattleFactoryBattleRoom/scripts.inc:92-97`); the set writes the count only while `sPerformedRentalSwap` is TRUE and then
  clears it (`SetBattleFactoryData`, `battle_factory.c:259-265`).
- So the first win of a challenge pays the draft, and the win after each accepted swap pays that swap. `docs/factory-round-rules.md` already
  said so ("The initial draft and an accepted post-battle swap call `factory_setswapped`"); the orchestrator created every round with
  `performedRentalSwap: false`.

## The ROM

Read at the first action menu of every battle of two whole rounds (round replay, challenge 0; `factoryRentsCount[0][0]` at SaveBlock2
+0xDF2, `sPerformedRentalSwap` at 0x03001288):

| Round | Count at battles 1..7 | Flag at battle 1 |
|---|---|---|
| seed 25, census, never swaps | 0, 1, 1, 1, 1, 1, 1 | 1 (the draft) |
| seed 10, ai-v1, swaps after every win | 0, 1, 2, 3, 4, 5, 6 | 1 |

The engine before the fix: 0 at every battle of the first round, and 0, 0, 1, 2, 3, 4, 5 in the second.

## The fix

`createFactoryRoundBattleOrchestrator` starts every round with `performedRentalSwap: true`: every round of the engine starts from a fresh
draft (the engine has no paused-challenge resume, whose `ResumeChallenge` path does not run `factory_setswapped`). The round replay now
compares the count and the streak at the start of every battle. Tests: `tests/parityMacFirstDraftCountsAsRent.test.ts` (fails without the
fix), and the rent-count pins of `tests/factoryRoundBattleOrchestrator.test.ts` moved to the game's numbers (each round's count is one more).

## Found on the way: the lab's rent-count address

`oracle/battle_lab.py` writes the request's `rentalSwapCount` to SaveBlock2 +0xDF6 (`SB2_FACTORY_RENTS_SINGLES_50`), copied from the
offset comment in `include/global.h`. That comment is wrong: `factoryRecordWinStreaks[2][2]` ends at 0xDF2 and `factoryRecordRentsCount`
starts at 0xDFA, so `factoryRentsCount[0][0]` (singles, Level 50) is at 0xDF2; 0xDF6 is `[1][0]` (doubles). The ROM confirms it: 0xDF2
counts the rents above, 0xDF6 stays 0. The lab's own rental-rank checks use the request value, and its staged rentals are written
directly, so single-battle stagings are not affected; but the saved count the ROM goes on with is not the requested one. Not fixed here
(top-layer file); for the top layer.
