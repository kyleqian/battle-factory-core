# Real-ROM replay, fourth pass: three test players and the wide compare (Mac, Scene OFF, 2026-11-13)

Run by the Mac battle-parity lane (`worker/parity-mac`). Per-battle data: `2026-11-13-fourth-pass.json`. The tally table:
`2026-11-13-fourth-pass-tally.md`. What was found and fixed: `docs/parity-mac/STATUS.md`, section "Fourth pass".

Every number in this file is a count of battles of a named list and player. It says what was driven. It is not a
quality figure.

## In plain words

- The replay has three test players now. `census` is the old one (least-used move, never switches by choice).
  `ai-v1` lets the game's own trainer AI play the player's side. `random-v1` picks random legal actions, switches by
  choice, and tries actions the engine says are not allowed, to see that the game refuses them too.
- The compare is wider. At every point where the player decides, it now checks status, stat stages, PP, items,
  abilities, types, the counters of both Pokemon on the field, both parties, screens, Spikes, weather, Future Sight
  and Wish. At the end it checks the winner.
- 2,421 battles are in the JSON. 2,418 match the real game to the end. 2 are endless stalls (no difference in what the
  frame cap reaches). 1 gold Noland battle cannot be set up by the lab (known).
- Before the fixes, the same lists showed differences in six battles. They come from three battle-rule errors of the
  engine, now fixed (fixes 29, 30 and 33). Fix 31 has no effect on play; fix 32 came from a lead of the earlier pass.

## What a "match" is in this pass

Every engine turn state (both HP values, `gRngValue`, last moves) is in the ROM timeline in order; the ROM drive used
every decision and ended at the battle's outcome; both sides name the same winner; no wide field differs at any
decision. A battle is driven a second time before a failure counts. Details: `docs/parity-mac/wide-compare.md`.

## Engines

| commit | what |
|---|---|
| `50474f0dc` | fixes 29 to 32, on box master `ba8910f95` |
| `61d84a74f` | fixes 29 to 33, with box master `a21ec4148` merged in. The gate of this stop ran on this commit. |

Fix 33 came out of the pool run, after the mixed batch was done. Fix 33 changes only what Perish Song, Magic Coat and
a Leppa Berry write, and Metronome can call the two moves. So every battle of the three lists that has one of these
in a party (225 battles) was driven again on `61d84a74f`, with the proof batch, the long battles and the staged
battle. The JSON names the engine of every row.

## The lists

| list | what it is | battles | players |
|---|---|---|---|
| proof | seeds 20001..20050 | 50 | `random-v1` |
| mixed | seeds 20101..21100. Player by `seed % 5`: 0, 1, 2 = `ai-v1`; 3 = `census`; 4 = `random-v1`. A seed with `seed % 49 == 33` is a silver Noland battle; `seed % 49 == 26` a gold one (driven with symbols 1). | 1,000 (20 silver, 21 gold) | 600 `ai-v1`, 200 `census`, 200 `random-v1` |
| pool | `regression-pool.txt`: 962 seeds that differed from the ROM on an older engine. The 64 seeds of the first regression list are inside. | 962 | `census` |
| brain | silver Noland: `seed % 49 == 33` in 1..10000 (204); gold Noland: `seed % 49 == 26` in 1..10000, symbols 1 (204) | 408 | `census` |
| staged | `docs/parity-mac/stages/foresight-noland.json` | 1 | `script` |

## Results

| list | player | driven | match | other | voluntary switches | refusal probes |
|---|---|---|---|---|---|---|
| proof | `random-v1` | 50 | 49 | 1 endless (20035) | 133 | 33 |
| mixed | `ai-v1` | 600 | 600 | - | 34 | - |
| mixed | `census` | 200 | 200 | - | - | - |
| mixed | `random-v1` | 200 | 199 | 1 endless (20734) | 593 | 119 |
| pool | `census` | 962 | 962 | - | - | - |
| brain | `census` | 408 | 407 | 1 not staged (gold 1447) | - | - |
| staged | `script` | 1 | 1 | - | 1 | - |

- The ROM refused every refusal probe, and took every decision the engine offered. No legality difference in any
  battle.
- Endless stalls: 20035 (130 states match up to the stock frame cap) and 20734 (729 states match up to a ROM cap of
  600,000 frames; the engine ran 4,972 states in its 4,000,000-frame budget). Both sides are out of PP and Leftovers
  heals the Struggle damage. The same kind as the twelve stalls of the earlier passes.
- Long battles that end, driven with long caps (engine 4,000,000 frames, ROM drive 600,000 or more): 20293 (157,308
  ROM frames), 20493 (306,813), 20569 (109,643), silver 9098 (1,212,712), gold 6347 (1,526,588). All match to the end.
- Gold 1447: the lab does not reach the player's action menu (`oracle/battle_lab.py`, known since the third pass).
- The wide state was compared at 72,321 decisions: mixed 25,159, proof 1,463, pool 34,991, brain 10,708.

## What the lists found before the fixes

| battle | list, player | what differed | fix |
|---|---|---|---|
| 342, 457 | pool, `census` | the state after the last blow: the game goes on with Perish Song after the deciding faint | 29 |
| 20596 | mixed, `ai-v1` | the winner: Perish Song took both last Pokemon; the game says draw (the challenge ends), the engine said the player won | 29 |
| 20276 | mixed, `ai-v1` | party status: a Pokemon thawed by a Fire move stayed frozen in its party record | 30 |
| 5908 | pool, `census` | party PP: Perish Song against Pressure (ROM 0, engine 1) | 33 |
| 7879 | pool, `census` | party PP: a Leppa Berry (ROM 5, engine 0) | 33 |

The first run of the mixed list was on the engine without fixes 29 to 32: 622 battles driven, 617 matched, the two
above differed, 3 were the long ones. The whole list was then driven on `50474f0dc`.

## What each list added to the tally

383 rows. 12 cannot occur in a Level 50 Factory battle (source reasons in `docs/parity-mac/tally.md`). Of the other
371:

| after | rows covered | added |
|---|---|---|
| the mixed list | 345 | - |
| + the proof list | 347 | Pursuit hitting a switching Pokemon; Marvel Scale |
| + the pool, the brain lists, the staged battle | 357 | Damp, Sturdy, Vital Spirit, White Smoke, Focus Band, the Leppa Berry, the burn of Blaze Kick, the burn of a thawing Fire move, Bide storing and attacking (through Metronome) |

Rows covered by each player:

| | battles that match | rows it covers | rows only it covers |
|---|---|---|---|
| mixed list only: `ai-v1` | 600 | 317 | 8 |
| mixed list only: `census` | 200 | 303 | 7 |
| mixed list only: `random-v1` | 199 | 317 | 18 |
| all lists: `ai-v1` | 600 | 317 | 1 |
| all lists: `census` | 1,569 | 342 | 17 |
| all lists: `random-v1` | 248 | 323 | 13 |

The 14 rows still at zero: Liquid Ooze; Magnet Pull and the switch it refuses; Mental Herb; Rawst Berry; the flinch of
Sky Attack; Rapid Spin clearing Spikes / Leech Seed / a trap; a move refused under Disable; Uproar waking a sleeper;
and five that only Metronome can reach (Mist blocking a stat drop, Mist ending, a move refused under Imprison,
Imprison blocking a chosen move, Rage building).

## Not in these lists

- **The eighth challenge and later.** A seed's streak is `(seed * 11) % 49`, so every generated battle is of
  challenges 1 to 7 (sets 110..755). The 94 sets 756..849 (the legendary birds and beasts, the Regis, Latias, Latios
  and the strongest sets of ten other species) were never in a replayed battle, in this pass or an earlier one.
- Scene ON (the 500 battles of the work order are not driven yet).
- Open Level. Later battles of a round with a carried team or a rental swap.

## How to drive a row again

    REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh SEED POLICY SYMBOLS
    REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh --stage docs/parity-mac/stages/foresight-noland.json

`POLICY` is `census`, `ai-v1` or `random-v1`; `SYMBOLS` is 1 for a gold Noland battle, else 0. Long battles:
`REPLAY_FRAME_BUDGET=4000000 REPLAY_DRIVE_FRAMES=600000` (9098: 1500000; 6347: 1900000). The report of a directory:
`python3 tools/audio/romReplayBatchReport.py DIR`; the tally: `python3 tools/audio/romReplayTally.py DIR --zero`.

## JSON

`battles`: one row per battle: `list`, `engine`, `id`, `seed`, `policy`, `symbols`, `scene`, `result` (`match`,
`unfinished`, `not-staged`), `statesMatched` / `engineStates`, `decisions`, `romFrames`, `voluntarySwitches`, `probes`,
`outcome` (the engine's and the ROM's `gBattleOutcome`). `tally.rows`: the 383 rows with their counts per player.
