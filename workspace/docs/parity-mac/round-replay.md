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
- `REPLAY_SYMBOLS=1`: the player holds the silver Factory symbol (staged after the lab staging, as the lab does for a factoryBrain staging);
  challenge 5's seventh battle is then gold Noland. The ID gets `-gold`.
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

- Noland with both symbols (his later "streak" battles). Gold Noland is covered with `REPLAY_SYMBOLS=1` (the driver stages the silver
  symbol; challenge 5's seventh battle is then gold Noland); without it challenge 5's seventh battle is an ordinary trainer.
- On the screens: RECORD, REST and RETIRE at the GO ON menu; YES at the swap prompt followed by keeping the team (cancel); the summary
  screen from the swap screen; the swap screen's same-species refusal. None changes the team except the refusal, which no policy reaches.
- Open Level (level 100 sets 372..881): the lab and the replay are Level 50 only.
- The round end: the Lobby after the seventh win or a loss (Battle Points, symbols) is not compared.
