# Frontier Brain (Noland) battles in the real-ROM replay

Not a battle-rule fix. This is the replay upgrade that lets a Noland battle be played on the real ROM and compared with
the engine, turn by turn, like an ordinary battle.

## What was missing

- The replay tool (`tools/integration/soundCensusRomReplay.ts`) asked the lab for a `factoryLegal` battle with a trainer
  id. The lab refuses trainer 1022 (Noland) there; it has its own `factoryBrain` mode.
- The engine side of the replay could only adopt an ordinary opponent (`adoptFactoryOpponentSchedule`, a trainer row and
  catalog set ids).
- So the 204 census seeds with a silver Noland battle (seed % 49 == 33, streak 20) stopped at chain step 2 (rc 12), and
  a gold Noland battle did not exist at all (the census config holds no symbol).

## What the ROM does (why one RNG cursor is not enough)

`FillFactoryBrainParty` (`battle_factory.c:759-822`) rolls each member on the spot: `GetFactoryMonId` draws until a set
passes the five rejection rules, then `CreateMonWithEVSpreadNatureOTID` draws `Random32` pairs until the nature fits.

On hardware that function runs for about 28 frames, and `gMain.inBattle` is still clear, so `VBlankIntr` spends its own
`Random()` each frame in the middle of it (`main.c:365-366`). ROM seed 1209: the three accepted personality pairs sit 29
and 47 draws apart. Decoded: after the first member's pair come 8 frame draws, then the draw that picks Solrock (set
328), then 9 rejected pairs and the accepted one; after the second member's pair come 10 frame draws, then Pidgeot (set
355). A single cursor that rolls the first member goes on to pick set 340 (Girafarig) instead.

This was already known for the two probe receipts (`tests/factoryBrainOpponentRomReceipts.test.ts`: 30 and 31 frame
draws). The ordinary opponent has the same problem and solves it with one construction cursor per member.

## The seam

Rule: take from the ROM only what the ROM chose by dice. Everything derived is built by the engine's production code and
then checked against the ROM read-back.

1. `adoptFactoryBrainOpponentSchedule` (`src/engine/factoryBrainOpponentGeneration.ts`). Input: the three set ids and
   one personality cursor per member. It uses the same code as `generateFactoryBrainOpponent` for the rejection rules
   and for building a member (the generation was split into shared helpers; its behaviour and tests are unchanged). An
   adopted set that the source rules would reject at its position (out of the challenge's range, Unown, one of the six
   rental sets, duplicate species, duplicate item) is an error.
2. `adoptedInitialBrainOpponent` (`src/engine/factoryRoundBattleOrchestrator.ts` config). Battle 1's opponent is that
   adopted party and the battle RNG starts at a given value. The battle must be a Brain battle by the config's own
   streak and symbols (`getFactoryFrontierBrainStatus`); status, trainer id 1022 and the transition come from the same
   helper as a generated Brain opponent. An ordinary streak, or a party built for the other tier, is refused.
3. Replay tool, `request`: a census battle whose first opponent is the Brain gives a `factoryBrain` request (challenge 2
   or 5, no trainer id / battle number / opponent sets).
4. Replay tool, `replay`: for a `factoryBrain` setup it
   - finds each ROM member's Frontier set in the challenge's range by species, the four moves (Return reads as
     Frustration, `SetMonMoveAvoidReturn`), held item and nature; exactly one set must fit;
   - takes each member's personality cursor from its personality (as the ordinary path does);
   - adopts, builds the orchestrator, and compares every engine member with the ROM read-back: species, level,
     personality, OT id, nature, ability slot, ability, item, moves, PP, six IVs, six EVs, friendship, HP and the five
     stats. The lab's `fixedIv` is compared too. Any difference stops the replay with both values in the message.
   - The AI script mask is not adopted: the live AI driver gets trainer id 1022 and the streak from the orchestrator and
     picks the mask itself (`GetAiScriptsInBattleFactory`, `battle_factory.c:889-911`: the Brain always runs all three
     scripts).
5. `tools/audio/soundEventProbe.py --drive-out`: the frozen request of a `factoryBrain` staging dropped the three fields
   the lab fills in itself (`battleNum`, `trainerId`, `opponentSetIds`); the lab refuses them on input, so the timeline
   step could not stage the frozen trace again.

Nothing under `oracle/` changed.

## Gold Noland

The census config has no symbol, so streak 41 is an ordinary battle there. `request` and `native` take `--symbols=1` (or
the environment variable `ROM_REPLAY_SYMBOLS=1`, for unchanged chain scripts): the engine side then holds the silver
symbol, streak 41 (seed % 49 == 26) is the gold battle, and the request is `factoryBrain` challenge 5. The lab sets the
silver symbol itself for that request. `replay` reads the tier from the setup, not from the flag.

    ROM_REPLAY_SYMBOLS=1 tools/audio/romDriveSeed.sh 26 off OUTDIR

## Census battle "streak 20, battle 1" against the lab's "challenge 2, battle 7"

The census engine config is `factoryWinStreak` 20 (or 41), battle index 0. The lab stages `factoryWinStreaks` 20 (41),
`curChallengeBattleNum` 6 and the Tower streak at 20 (41). Checked in the C source that no battle input depends on the
difference:

- `FillFactoryBrainParty` reads only `factoryWinStreaks / 7` (set range, fixed IV argument `challengeNum + 2`), the six
  rental set ids and the player's trainer id (`battle_factory.c:769-775`). Same value on both sides.
- `GetAiScriptsInBattleFactory` returns all three scripts for the Brain before it looks at the challenge number
  (`battle_factory.c:902-903`).
- `curChallengeBattleNum` is read by `GenerateOpponentMons` (`battle_factory.c:319-329`, never run for a Brain battle),
  by the ordinary fixed-IV branch (`battle_tower.c:1844`, the Brain branch at `:1855` is separate) and by the
  transition choice (`battle_setup.c:905`, presentation).
- The Tower streak is read only in that ordinary fixed-IV branch (`battle_tower.c:1842`).
- Engine side: the battle index enters the battle only as `factoryWinStreak + battleIndex` for the AI
  (`factoryRoundBattleOrchestrator.ts`, `driveTrainerBoundary`), 20 + 0 here.

The first runs agree: see the Brain section of `STATUS.md`.

## Tests

`tests/parityMacBrainReplaySeam.test.ts`: the ROM party of seed 1209 from its dice (every stat against the read-back);
the single-cursor roll that picks Girafarig; equality with the single-cursor generation when handed its own dice
(silver, gold and the random-IV challenge 6); the four refusals; the orchestrator scheduling (silver, gold, the three
wrong-opponent refusals).
