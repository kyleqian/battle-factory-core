# Real-ROM replay, fourth pass: three test players, the wide compare, the eighth challenge, staged battles (Mac, 2026-11-13)

Run by the Mac battle-parity lane (`worker/parity-mac`). Per-battle data: `2026-11-13-fourth-pass.json`. The tally table:
`2026-11-13-fourth-pass-tally.md`. What was found and fixed: `docs/parity-mac/STATUS.md`, section "Fourth pass".

Every number in this file is a count of battles of a named list and player. It says what was driven. It is not a
quality figure.

This file describes the **final run** of the pass: every list driven from scratch on one engine, `b36f7b6c9` (fixes 29
to 40). The first stop of the pass (earlier the same day, engine with fixes 29 to 33) is summarised at the end.

## In plain words

- The replay has three test players. `census` is the old one (least-used move, never switches by choice). `ai-v1`
  lets the game's own trainer AI play the player's side. `random-v1` picks random legal actions, switches by choice,
  and tries actions the engine says are not allowed, to see that the game refuses them too.
- The compare is wider. At every point where the player decides it checks status, stat stages, PP, items, abilities,
  types, the counters of both Pokemon on the field, both parties, screens, Spikes, weather, Future Sight and Wish. At
  the end it checks the winner.
- New in the second half of the pass: battles of the eighth challenge (sets 372..849, the legendary Pokemon), staged
  battles for rows no generated battle filled, a sweep of 497 staged Metronome battles, and 500 battles with Battle
  Scene ON.
- 4,039 battles are in the JSON. 4,034 match the real game to the end. 5 are endless stalls (no difference in what
  the frame cap reaches).
- Before the fixes the lists showed differences that came from nine engine errors (fixes 29, 30, 31, 33 and 36 to
  40; the table below). After the fixes none is left.

## What a "match" is in this pass

Every engine turn state (both HP values, `gRngValue`, last moves) is in the ROM timeline in order; the ROM drive used
every decision and ended at the battle's outcome; both sides name the same winner; no wide field differs at any
decision. A battle is driven a second time before a failure counts. Details: `docs/parity-mac/wide-compare.md`.

## The lists

| list | what it is | battles | players |
|---|---|---|---|
| proof | seeds 20001..20050 | 50 | `random-v1` |
| mixed | seeds 20101..21100. Player by `seed % 5`: 0, 1, 2 = `ai-v1`; 3 = `census`; 4 = `random-v1`. A seed with `seed % 49 == 33` is a silver Noland battle; `seed % 49 == 26` a gold one (driven with symbols 1). | 1,000 (20 silver, 21 gold) | 600 `ai-v1`, 200 `census`, 200 `random-v1` |
| pool | `regression-pool.txt`: 962 seeds that differed from the ROM on an older engine. The 64 seeds of the first regression list are inside. | 962 | `census` |
| brain | silver Noland: `seed % 49 == 33` in 1..10000 (204); gold Noland: `seed % 49 == 26` in 1..10000, symbols 1 (204) | 408 | `census` |
| challenge8 | seeds 22001..22600 at the game's challenge number 7 (the eighth challenge: sets 372..849, trainers 200 and up). Players by `seed % 5` as in the mixed list. | 600 | 360 `ai-v1`, 120 `census`, 120 `random-v1` |
| lab | the seeds the lab could not stage before the top layer's lab fix | 9 | `census` |
| staged | `docs/parity-mac/stages/*.json` | 13 | `script` |
| sweep | the Metronome sweep (`docs/parity-mac/staged-battles.md`) | 497 | `script`, then `census` or `random-v1` |
| sceneon | Battle Scene ON: the first 500 battles of the mixed list again | 500 | 300 `ai-v1`, 100 `census`, 100 `random-v1` |

## Results

All on engine `b36f7b6c9`, Scene OFF unless the list says otherwise.

| list | player | driven | match | other | voluntary switches | refusal probes |
|---|---|---|---|---|---|---|
| proof | `random-v1` | 50 | 49 | 1 endless (20035) | 133 | 33 |
| mixed | `ai-v1` | 600 | 600 | - | 34 | - |
| mixed | `census` | 200 | 200 | - | - | - |
| mixed | `random-v1` | 200 | 199 | 1 endless (20734) | 593 | 119 |
| pool | `census` | 962 | 962 | - | - | - |
| brain | `census` | 408 | 408 | - | - | - |
| challenge8 | `ai-v1` | 360 | 357 | 3 endless (22152, 22462, 22527) | 10 | - |
| challenge8 | `census` | 120 | 120 | - | - | - |
| challenge8 | `random-v1` | 120 | 120 | - | 237 | 17 |
| lab | `census` | 9 | 9 | - | - | - |
| staged | `script` | 13 | 13 | - | 47 | 14 |
| sweep | `script` | 497 | 497 | - | 1,470 | 407 |
| sceneon | all three | 500 | 500 | - | 309 | 47 |

- The ROM refused every refusal probe and took every decision the engine offered. No legality difference in any
  battle.
- Endless stalls (both sides out of PP, Leftovers heals the Struggle damage): 20035 (951 states match up to a ROM cap
  of 600,000 frames), 20734 (729), and at the eighth challenge 22152 (804), 22462 (979), 22527 (1,043). No difference
  in the states compared.
- Long battles that end, driven with long caps (engine 4,000,000 frames, ROM drive 600,000 or more): 20293 (157,308
  ROM frames), 20493 (306,813), 20569 (109,643), silver 9098 (1,212,712), gold 6347 (1,526,588). All match to the end.
- brain: gold 1447 is staged now (the top layer fixed the lab) and matches. The nine seeds of the list "lab" are the
  other former lab failures.
- staged: each of the 13 matches and has its expected rows in its own tally.
- sweep: 497 of 497. Seven long battles needed the long caps (83,660 to 257,247 ROM frames).
- sceneon: 500 of 500. A Scene ON battle has about three times the frames of its Scene OFF twin; seven needed a ROM cap above
  the stock 80,000 (81,968 to 479,584 frames). These are the same battles and players as the first 500 of the mixed
  list, so they are not added to the tally.

## What each list added to the tally

The rows of the work order (384: move effects, abilities, hold effects, situations; 10 cannot occur), the move effects
only Metronome can reach (29; 1 cannot work), and the sets (739):

| after | rows covered | Metronome rows | sets on the field |
|---|---|---|---|
| proof (50) | 240 | 0 | 210 |
| + mixed (1,000) | 348 | 4 | 645 |
| + pool (962) | 359 | 13 | 645 |
| + brain (408) | 359 | 13 | 645 |
| + challenge8 (600) | 359 | 13 | 739 |
| + staged (13) | 369 | 15 | 739 |
| + sweep (497) | 371 | 26 | 739 |

At the end: 371 of 374 rows covered, 3 zero (a move refused under Imprison, Imprison blocking a chosen move, Rage
building); 26 of 28 Metronome rows (Camouflage and the flinch of Twister are zero); 739 of 739 sets; 273 of 273 moves
that can work.

Rows covered by each player, over all lists (matching battles): `census` 1,699 battles, 344 rows, 3 only it;
`random-v1` 368 battles, 336 rows, 4 only it; `ai-v1` 957 battles, 329 rows, 1 only it; staged battles 510, 340 rows,
12 only they.

## What the pass found before the fixes

| battle | list, player | what differed | fix |
|---|---|---|---|
| 342, 457 | pool, `census` | the state after the last blow: the game goes on with Perish Song after the deciding faint | 29 |
| 20596 | mixed, `ai-v1` | the winner: Perish Song took both last Pokemon; the game says draw, the engine said the player won | 29 |
| 20276 | mixed, `ai-v1` | party status: a Pokemon thawed by a Fire move stayed frozen in its party record | 30 |
| 5908 | pool, `census` | party PP: Perish Song against Pressure (ROM 0, engine 1) | 33 |
| 7879 | pool, `census` | party PP: a Leppa Berry (ROM 5, engine 0) | 33 |
| sweep `metro-chansey-110` and five more | sweep | party PP after Transform (ROM 2, engine 4) | 36 |
| sweep `metro-chansey-39` | sweep | the Lock-On mark at the replacement menu (ROM 8, engine 0) | 37 |
| the same battle | sweep | Attack stage of an Intimidate user blocked by Mist (ROM 6, engine 5) | 38 |
| sweep `metro-foe-165` | sweep, `random-v1` | the opponent's PP after a turn in which the player's switched-in Pokemon fainted from Spikes (ROM 18, engine 17) | 39 |
| sweep `metro-foe-79` | sweep, `random-v1` | `gLastMoves` after an end-of-turn replacement fainted from Spikes (ROM `[0xFFFF, 0]`, engine `[61, 0xFFFF]`) | 40 |

Fixes 32, 34 and 35 came from leads of the earlier passes and have their own ROM proofs (`STATUS.md`).

## Not in these lists

- Open Level. Later battles of a round with a carried team or a rental swap. (`STATUS.md` says what each would take.)

## How to drive a row again

    REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh SEED POLICY SYMBOLS [CHALLENGE]
    REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh --stage docs/parity-mac/stages/NAME.json
    REPLAY_SCENE=on REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh SEED POLICY SYMBOLS

`POLICY` is `census`, `ai-v1` or `random-v1`; `SYMBOLS` is 1 for a gold Noland battle, else 0; `CHALLENGE` is 7 for the
eighth-challenge list and left out for the others. Long battles: `REPLAY_FRAME_BUDGET=4000000 REPLAY_DRIVE_FRAMES=600000`
(9098: 1500000; 6347: 1900000). The report of a directory: `python3 tools/audio/romReplayBatchReport.py DIR`; the tally:
`python3 tools/audio/romReplayTally.py DIR --zero`.

## JSON

`battles`: one row per battle: `list`, `engine`, `id`, `seed`, `policy`, `symbols`, `scene`, `challengeNum`, `result`
(`match`, `unfinished`, `not-staged`), `statesMatched` / `engineStates`, `decisions`, `romFrames`, `voluntarySwitches`,
`probes`, `outcome` (the engine's and the ROM's `gBattleOutcome`); a staged row also has `stage` and `stageOk`.
`tally.rows`: every row with its counts per player.

## The first stop of the pass (for the record)

On the engine with fixes 29 to 33 (`61d84a74f`): mixed 999 of 1,000 (one endless stall), proof 49 of 50 (one endless
stall), pool 962 of 962, brain 407 of 408 (gold 1447 was not staged by the lab then), one staged battle. Its tally had
383 rows, 357 covered, 12 marked "cannot occur", 14 zero. Two of the 12 were wrong (Return and Hidden Power: Metronome
can call them), and the record of each turn missed the turns without a player decision; both are corrected in the
final run.
