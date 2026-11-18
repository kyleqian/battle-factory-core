# Round replay: whole Battle Factory rounds on the real ROM (2026-11-18)

Every real-ROM replay before this one was the first battle of a freshly rented team (the lab's `factoryLegal` staging). This tool replays a
whole round: up to seven battles, with the win, the heal, the swap and the next trainer between them, on the ROM and on the engine's round
orchestrator, and compares them at the start of every battle and turn by turn.

## How to run

```sh
cd workspace
REPLAY_OUT=/abs/outdir tools/audio/romRoundReplay.sh SEED [POLICY [SWAP [CHALLENGE]]]
python3 tools/audio/romRoundSummary.py /abs/outdir
```

- `POLICY`: the test player of the battles, `census` (default), `ai-v1`, `random-v1` (`replay-players.md`) or `power-v1` (below).
- `SWAP`: the swap decision after a won battle, `never` (default), `weakest` or `random` (below).
- `CHALLENGE`: the 0-based Level 50 challenge, 0..7 (default: the census mapping's challenge of the seed). The round starts at battle
  number 0 of that challenge (`--round=1` of `soundCensusRomReplay.ts`).
- `REPLAY_SCENE=on` drives Battle Scene ON. `REPLAY_FRAME_BUDGET` / `REPLAY_DRIVE_FRAMES` raise the per-battle caps for very long battles.
- `REPLAY_SYMBOLS=1|2`: the player holds the silver (and the gold) Factory symbol (`FLAG_SYS_FACTORY_SILVER` / `GOLD`, staged after the lab
  staging, as the lab does for a factoryBrain staging). With 1, challenge 5's seventh battle is gold Noland and challenge 2's is ordinary;
  with 2, Noland's return battles are at 21, 42, 63, ... (`frontier-record.md`). The ID gets `-gold` / `-sym2`.
- `REPLAY_HEARD=S,G` (0 or 1 each): the heard-speech bits the save starts with (`battledBrainFlags`, Factory bits `1 << 8` silver, `1 << 9`
  gold), staged with the symbols; the engine's round starts with the same record (`ROM_REPLAY_HEARD`, checked as the library checks a start
  record). Absent: the bits as the checkpoint holds them (none) and none on the engine. The ID gets `-hS-G`.
- `REPLAY_ROUNDS=R`: R rounds back to back. After a round ends (a loss, a draw, or the seventh win) the ROM plays the Lobby (the result text,
  the save, the record prompt), talks to the attendant (the player stands facing him), takes the challenge at Level 50, saves, walks in and
  plays the new draft (the rental screen, driven by RAM state: the first three rentals with no species twice, the rule the engine's player uses).
  Nothing is staged between rounds. The ID gets `-rR`.
- `ROM_REPLAY_SWAP_OVERRIDE=N:player|enemy`: after battle N (0-based, over the whole run) cancel the swap instead (YES, then back out at that
  list). The swap policy `cancel` does this after every win.
- `REPLAY_PROMPT_DELAY=K@N`: the ROM waits K more frames at the swap prompt after battle N (0-based) before answering, like a slower player.
  Every overworld frame draws one VBlank `Random()`, so this moves the RNG cursor of everything rolled after it (the next trainer, Noland's team)
  without any memory write; battles 0..N are unchanged. The ID gets `-dK@N`.
- Writes `OUTDIR/ID.cmp.json` (the compare), `OUTDIR/ID.drive.json` (the ROM drive) and `OUTDIR/ID.d/` (`setup-N.json` per battle and the
  engine's `engine.json`); `ID` = `SEED-POLICY-SWAP-cC`. Many rounds: a list of `SEED POLICY SWAP CHALLENGE` lines through
  `xargs -P 8 -L 1 tools/audio/romRoundReplay.sh` (about 8 lanes on the Mac; a seven-battle round takes about 40 seconds).

## What happens

1. `soundCensusRomReplay.ts request --round=1`: the engine's census battle of the seed at the first battle of the challenge gives the
   factoryLegal request (the player's three rentals, the trainer, the opponent's three sets).
2. `tools/audio/romRoundDriver.py` (one mGBA process for the whole round): the lab stages battle 1 as for a single replay. From then on
   nothing is staged; the ROM plays the round. For every battle N:
   - at the first action menu it writes `setup-N.json` (the `--setup-out` read-back plus `round`: battle number, streak, trainer,
     `gFrontierTempParty`, the trainer history `frontier.trainerIds`, the six `rentalMons` records, and the RNG record of the frame that
     rolled this battle's trainer);
   - it runs `soundCensusRomReplay.ts round` on `setup-0..N`: the engine plays battles 0..N on its round orchestrator and gives battle N's
     decisions and, after a win, the swap decision;
   - it drives battle N with those decisions (the closed-loop decision driver, as for one battle);
   - after a won battle 1..6 it drives the screens between the battles by their RAM state: the win text, the heal, GO ON, the swap prompt
     (B = NO, A = YES; only the swap prompt's YES/NO box is answered, checked by the script's return address), the swap screen (own
     Pokemon, SWAP, the beaten trainer's Pokemon, YES; by the swap screen's task and cursor fields), "Your swap is complete", the walk, the
     next trainer's intro, up to the next first action menu. No A is pressed once the player's controller holds the choose-action command.
3. `soundCensusRomReplay.ts round-compare`: per battle, the battle-start check, the trainer-roll check and the turn compare (the timeline
   and the wide compare of `wide-compare.md`). A round matches when every battle driven matches in all three.

## Rounds back to back

At the first battle of every later round the engine carries the counters with the site's own chaining (`factoryRoundChaining.ts`:
`advanceFactoryCarry` at the Lobby, `carryForNewChallengeAfterLobby` when the last round was lost) and runs the production round construction
(`createFactoryRoundBattleOrchestrator` with `generateInitial`, as `core.ts` builds a chained round) from each cursor of the ROM frame that rolled
the new draft. It must give the ROM's six rentals and the ROM's first trainer and sets. The battle is then played from the engine's own records
(set, fixed IV: the rental rank) with the ROM's personality cursors. The battle-start check then covers the carried streak, rent count, swap flag
and symbol count. One known difference is named apart: the first trainer's roll order (`first-trainer-after-draft-picks.md`, not fixed).

## The test (no emulator)

`tests/parityMacRoundReplayFixtures.test.ts` replays recorded real-ROM runs (`tests/fixtures/round-replay/*.json.gz`, eight files, about 156 KB in all) through
`soundCensusRomReplay.ts round` and `round-compare`, and checks every battle start, every trainer and draft roll and every turn, as the ROM replay
does; what each run is for is pinned on the ROM's own data. `tools/audio/romRoundFixture.py RUN NAME --note ...` makes a fixture from a run of
`romRoundReplay.sh`: it keeps the setup fields the engine reads, the ROM drive fields the compare reads, and of the ROM timeline the rows the turn
compare found the engine's states at (the ROM's state after every turn) and Noland's lines; it refuses a run that does not match. The fixtures:
never swapping, swapping every win, cancel after YES, silver Noland holding the swapped-away set (fix 45), gold Noland (staged symbol), a draft
rolled at 15 rents, a draft rolled at 256 rents (fix 46; the start count staged before battle 1), the unbroken 42-battle run below, and six with
a staged Factory record: both symbols at battles 21, 42 and 63 (challenges 7 and 8 back to back), one symbol at battle 21, a heard silver speech
with no symbol, a heard gold speech with one symbol. Reverting fix 44 fails the first eight, fix 45 the three with Noland among them, fix 46 the
wrap run, fix 48 the 42 and 63 runs, fix 49 the record runs.

At challenge 8 the draft's rentals have rolled IVs (the select screen reads the fixed-IV table one row past its end). The tool then finds each
picked rental's personality and IV words in the ROM's random stream from the draft roll (VBlank draws can fall between them) and applies the
engine's rule; the strongest-draft pick is then the ROM player's own (`selectedFrom: "rom-party"`), since it depends on those IVs.

## The unbroken run

`REPLAY_ROUNDS=6 REPLAY_DRAFT=strongest REPLAY_SEARCH=300 REPLAY_STOP_ON_LOSS=1 tools/audio/romRoundReplay.sh SEED power-v1 pace 0`: one ROM
play from streak 0, rent count 0 and no symbols, nothing staged after battle 1. The engine predicts each battle (it has matched every turn so
far), so before the ROM plays a battle the engine tries other plays of it (`power-eps` tries) when its first play loses, and the ROM plays the
first that wins; the ROM never needs a retry. `pace` swaps after every win of the first two rounds (14 rents), then only when the swap does not
make the team weaker; `strongest` drafts the three strongest rentals.

## What is compared

- **At the start of every battle** (the engine at its first action menu against the ROM at its first action menu): the battle number,
  the streak, the rent count (`factoryRentsCount`) and the swap flag the next win pays (`sPerformedRentalSwap`), the trainer, the opponent's
  three set ids, the player's three set ids, and every field of all six party records: species, level,
  personality, experience, friendship, ability slot, held item, moves, PP, PP Ups, IVs, EVs, max HP, HP, the five stats, status.
  This is where the heal (HP, PP, status), the held items restored (`factory_resethelditems`), the swapped Pokemon (built from the beaten
  trainer's record, friendship 0, `CopySwappedMonData`), the next trainer's three Pokemon and their IVs (the seventh battle's higher IV,
  `GetFactoryMonFixedIV`) are checked.
- **Noland** (the seventh battle of challenge 2 with no symbols): his team is rolled at the battle's start, after the swap (fix 45), with
  VBlank draws between the members, so the engine adopts the ROM's team (`adoptedNextBrainOpponent`); `adoptFactoryBrainOpponentSchedule`
  refuses a set the engine's own rules (its exclusion list at the swap's result) would not roll, and that refusal is the check.
- **The trainer roll** (battles 2..7): the engine's own production code (`preGenerateFactoryRoundNextOpponent`, the GO ON pre-generation,
  no adoption) is run from each RNG cursor of the ROM frame in which `gTrainerBattleOpponent_A` and `gFrontierTempParty` took their final
  values; it must give the ROM's trainer and the ROM's three sets within that frame's draws. This checks the trainer table of each battle
  number (the seventh battle's "hard" table, `battle_tower.c:1104-1129`), the trainer history (no trainer twice in a round), the set range of
  the challenge and every rejection rule of `GenerateOpponentMons` (Unown, the player's and the beaten trainer's species, duplicate species
  and items).
- **Turn by turn**: as for one battle (`compareBattle`: HP of both sides, `gRngValue` and the last moves after every turn; the wide state at
  every decision).
- **The save's Factory record** (`frontier-record.md`): at every battle start the two heard-speech bits as well (the ROM's
  `battledBrainFlags`, the engine's facility state). Noland's lines: the driver finds each of his texts' commands in the battle room script's
  bytecode (`BattleNoland` .. the first text; the msgbox's `loadword`, the `message` command) and records a line while the script pointer, or a
  `callstd` return address on the script stack, sits just past one (up to 3 bytes: the `call DoNolandBattle` after a msgbox leaves its return
  address 7 bytes on, for the whole battle). Before his battle the engine's speech (`battleRoomStateForOpponent` with the tier's heard bit, as
  `core.ts` builds the battle room; a first speech sets the bit, as `core.ts` does) must be the ROM's lines: the first speech and the short
  lines, or the short lines only. After a round's last battle the lines of the symbol (`DefeatedNolandSilver` / `Gold`) must be there exactly
  when the engine's round outcome gives a symbol. After the run's last battle the ROM plays on to the next draft screen (the epilogue) and
  the save's symbols and heard bits there must be the engine's. The site itself shows no symbol scene (below).

## What the engine takes from the ROM, and why

The overworld's VBlank handler draws one `Random()` every frame (`main.c`, VBlankIntr; it skips only during link, recorded and Frontier
battles). So the RNG between two battles depends on how many frames the player spends on the screens: timing, not rules. The engine
therefore takes three cursors from the ROM, each found by search, never by reading the result:

1. the RNG cursor before the trainer roll: the search above, over the draws of the one ROM frame that rolled the trainer (the VBlank draw
   comes first; the engine's match is found at offset 1);
2. the cursors of the three personality loops (the opponent's party is built at battle start, with VBlank draws between the members), as
   for battle 1 (`constructionCursor`);
3. the battle RNG at the first action menu, as for battle 1 (`alignedPlay`: the engine's `gRandomTurnNumber` and the opponent AI's
   simulated RNG must fit the ROM's).

Everything that follows from those cursors is the engine's own: which trainer and sets, the IVs, ability slots, stats, the battle.

## Two staging writes added to the lab's

- The lab writes `gTrainerBattleOpponent_A` (the requested trainer) but not `frontier.trainerIds[0]`, which still holds the canonical
  checkpoint's own first trainer. The game rolls no trainer twice in a round by that history (`GenerateOpponentMons`,
  `battle_factory.c:316-329`), so the round driver writes `trainerIds[0]` = the staged trainer after the lab staging: what the game holds
  after a real battle-1 roll.
- The lab writes the request's `rentalSwapCount` to SaveBlock2 +0xDF6, which is the doubles count (`first-draft-counts-as-rent.md`); the
  round driver writes the singles Level 50 count (+0xDF2) to the same value (0 in every request; the checkpoint holds 0 too).

The drive records the old values (`stagingFix`).

## The test players of a round

- Battles: `census`, `ai-v1`, `random-v1` (`replay-players.md`), and `power-v1`, new for rounds: the legal move with the highest power x type
  effectiveness x 1.5 for its own type x accuracy (a status move scores 0; the least-used legal move when all score 0), no voluntary
  switch, a forced replacement by the best such score. The three older players lose most rounds in the first battles; `power-v1` reaches the
  later battles and the seventh more often.
- Swaps (`romReplayPlayers.ts`, `createSwapPolicy`): `never` (NO at the prompt), `weakest` (the own Pokemon with the lowest stat total for
  the beaten trainer's Pokemon with the highest that the swap screen accepts), `random` (NO half the time, else random). The swap screen
  refuses a Pokemon whose species a kept Pokemon has (`Swap_AlreadyHasSameSpecies`); no policy picks one.
- Each battle N > 0 seeds its player from the seed and N; battle 1 uses the seed, so battle 1 of a round equals the single replay of the seed
  at that challenge and battle number 0.

## Not covered (yet)

- The symbol scene after a first win over silver or gold Noland (his lines, the walk to him, `MUS_OBTAIN_SYMBOL`): the site shows none
  (`aud240d-script-sounds.md`: the symbol script is not reproduced). The ROM's lines are recorded and the engine's outcome (symbol or none)
  is compared with them, not a screen of the site's.
- The look and timing of Noland's lines on the site (box by box, frames): the replay compares which lines play, not how they are drawn.
- Return battles past 63 (84, 105, ...): the lab stages challenges 0..7; battle 63 is reached as the second round of a run from challenge 7.
- On the screens: RECORD, REST and RETIRE at the GO ON menu; the summary screen from the swap and rental screens; the swap and rental
  screens' same-species refusals (no policy picks a refused Pokemon). Cancel after YES is covered (policy `cancel`).
- Open Level (level 100 sets 372..881): the lab and the replay are Level 50 only.
- The Lobby itself (Battle Points; the site has no use for them). The symbol and the other counters are compared at the next round's start.
