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

Round replay with both symbols staged (phase 2, `round-replay.md`): see STATUS.
