# Fix 48: Noland's return battles use the game's lines (2026-11-18)

## What was wrong for a player

With both symbols, Noland comes back at battles 21, 42, 63 and every 21 after. The game greets him there with his short lines only: the
silver ones at battle 21 ("ShakeOutKnowledge... Bring it on!"), the gold ones at 42 and later ("All right! Bring it on!"). The engine used the
silver lines for all of them, and checked the silver heard-speech bit, so on a save without it (not a record the game can hold) the first
silver speech would have played. Text only: the battle is the same.

## The source

`BattleNoland` (`BattleFactoryBattleRoom/scripts.inc:113-117`): `STREAK` goes to `BattleNolandSilver`, `STREAK_LONG` to `BattleNolandGold`,
both past the heard-bit checks of `SILVER` (`:118-121`) and `GOLD` (`IntroNolandGold`, `:143-147`).

## The fix

`battleRoomStateForOpponent` (`src/engine/battleRoom.ts`): gold and streak-long take the gold tier, silver and streak the silver tier; the
return battles never show the first speech. Tests: `tests/battleRoomBrainEntrance.test.ts` (the tier per status, no first speech on return
battles; the old test pinned the silver default), `tests/factoryLibraryFrontier.test.ts`.

## The ROM

Round replay with both symbols and both heard bits staged (`REPLAY_SYMBOLS=2 REPLAY_HEARD=1,1`, `round-replay.md`; STATUS, fourth part of the
round replay). The driver reads which of Noland's texts the battle room script shows. Battle 21 (challenge 2, 4 runs): "Shake out your
knowledge" only. Battle 42 (challenge 5, 4 runs) and battle 63 (challenges 7 and 8 back to back, 6 runs that got there): "All right! Bring it
on!" only. No symbol lines after any of them, and the save still holds 2 symbols at the next draft screen. The engine before the fix had the
silver lines at 42 and 63. Fixtures: `two-symbols-battle-21`, `-42`, `-63` in `tests/parityMacRoundReplayFixtures.test.ts` (the 42 and 63 ones
fail without the fix).
