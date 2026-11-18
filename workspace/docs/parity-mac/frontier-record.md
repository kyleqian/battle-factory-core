# The save's Factory record across challenges (2026-11-18)

Kyle: the website should keep a player's Factory symbols across challenges, as the real save does.

## What the real save keeps (Factory, singles, Level 50)

- **The symbols**: `FLAG_SYS_FACTORY_SILVER` and `FLAG_SYS_FACTORY_GOLD` (SaveBlock1 flags), given by `frontier_givesymbol` after silver and
  gold Noland (`BattleFactoryBattleRoom/scripts.inc:128-140`, `:154-166`). Nothing clears them.
- **The heard-speech bits**: `FRONTIER_DATA_HEARD_BRAIN_SPEECH` is `battledBrainFlags & sBattledBrainBitFlags[facility][hasSymbol]`
  (`frontier_util.c:846-847`, Factory bits `1 << 8` and `1 << 9`, `:596-605`), where `hasSymbol` is the symbol count with 2 read as 1
  (`:821-823`, `:856-858`): with no symbol the silver bit, with one or two the gold bit. `SetFrontierData` only ever sets it (`:881-882`). The first
  meeting with silver (`scripts.inc:118-121`) and gold Noland (`:144-147`) shows his first speech and sets the bit; once set, that tier's
  later meetings skip it.
- **Reset on a loss**: the streak and the rent count (`InitFactoryChallenge`, `battle_factory.c:208-212`, when the streak flag is off).

## What follows (`GetFrontierBrainStatus`, `frontier_util.c:1656-1693`; Factory `{21, 42, 21, 1}`, `:92`)

| Symbols | Battle 21 | Battle 42 | Battle 63, 84, ... |
|---|---|---|---|
| 0 | silver Noland (first speech unless heard; the silver symbol) | ordinary | ordinary |
| 1 | ordinary | gold Noland (first speech unless heard; the gold symbol) | ordinary |
| 2 | return battle, silver lines (`STREAK`) | return battle, gold lines (`STREAK_LONG`) | return battle, gold lines |

The return battles have no first speech and no heard-bit check (`scripts.inc:113-117`) and give no symbol (`DefeatedNolandSilver` /
`DefeatedNolandGold`, `:128-130`, `:154-156`). Noland's team strength follows the challenge, not the tier (`FillFactoryBrainParty`:
`GetFactoryMonFixedIV(challengeNum + 2)`).

A save can hold only these records: a symbol needs the silver bit (it is set before the silver battle), two symbols need the gold bit, the
gold bit needs a symbol.

## The library

- `FactoryGameOptions.frontier` and `ReplayOptions.frontier`: `{ symbols: 0 | 1 | 2, heardBrainSpeech: { silver, gold } }` (`FactoryFrontierRecord`).
  Absent = a fresh save, exactly as before. Both starts take it; a resume and `replayChallenge` must pass the same. Any other record throws.
- `ReplayResult.frontier`: the record at the end of the replay (the start record plus what the challenge earned; a symbol counts as soon as
  its round ends, with the speech it implies).
- The engine: `FactoryCarry.heardBrainSpeech` (new) carries the bits from round to round and across a loss, like the symbols; every round is
  built from the carry (the anchor round too, which before passed no symbol count). Before, the bits lived only in each round's state and
  were dropped at the next round: within one session, a player who lost to silver Noland heard his first speech again at the next battle 21.
- Fix 48 (`noland-return-battles.md`): the return battles at 42 and 63 now use the gold lines.
- Fix 49 (`heard-speech-kept-at-rent.md`): inside a round the bits were dropped at the first paid win, so the carried bits never reached
  Noland's battle; now they do.
- Tests: `tests/factoryLibraryFrontier.test.ts`, `tests/parityMacHeardSpeechKeptAtRent.test.ts`.

## The real game

The round replay stages the record on the ROM and checks it (`round-replay.md`; STATUS, fourth part of the round replay): 1 symbol, battle
21 ordinary; 2 symbols, the return battles at 21, 42 and 63 with the short lines and no symbol; a heard speech skipped at 21 (no symbol) and
at 42 (one symbol), with the symbol given; the first speeches when nothing is heard. Every run matched the engine after fix 49.
