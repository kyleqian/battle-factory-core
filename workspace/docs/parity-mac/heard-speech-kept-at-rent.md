# Fix 49: a win that pays a rent keeps the heard-speech bits (2026-11-18)

## What was wrong for a player

The save remembers whether Noland's first speech has been heard (one bit for silver, one for gold), and the website now keeps that record
from one challenge to the next (`frontier-record.md`). But inside a round the engine lost it at the first win that paid a rent, and every
challenge's first win pays one (the draft counts as a rent, fix 44). So a player who had heard silver Noland's first speech (lost to him,
say) and came back to battle 21 heard the whole first speech again; the game skips it and goes straight to "Shake out your knowledge...".
The same for gold Noland at battle 42 with one symbol. Text only: the battle is the same.

## The source

A win pays the rent in `SetBattleFactoryData` (`FACTORY_DATA_WIN_STREAK_SWAPS`, `battle_factory.c:259-265`): it writes
`factoryRentsCount` and clears `sPerformedRentalSwap`, nothing else. The heard bits are `battledBrainFlags` (`frontier_util.c:846-847`,
set only by `SetFrontierData`, `:881-882`), which no win touches.

## The fix

`factoryRoundBattleOrchestrator.ts`, the battle-won reducer: the facility state after a paid win is the old one with the rent count + 1
(it was a new object with the rent count only). Test: `tests/parityMacHeardSpeechKeptAtRent.test.ts` (silver heard with no symbol at
streak 14: the bit survives the round's wins and battle 21 skips the first speech; gold heard with one symbol at streak 35). Both fail
without the fix. The test helper `tools/compare/factoryRoundCarrier.ts` now builds a round with the carry's heard bits, as `core.ts` does.

## The ROM

Found by the round replay with the start record staged (`round-replay.md`, "What is compared"): at every battle start after the first,
the ROM still held the staged bits and the engine had none. On the ROM recordings with a heard speech (no symbol, silver heard, challenge 2,
3 runs; one symbol, both heard, challenge 5, 3 runs) the ROM goes straight to Noland's short lines; the engine without the fix plays the first
speech ("I'm Noland, the Factory Head..." / "...a harder look than last time") in all six; with it, all six match. Fixtures:
`heard-silver-no-symbol` and `heard-gold-one-symbol` in `tests/parityMacRoundReplayFixtures.test.ts`, which fail without the fix.
