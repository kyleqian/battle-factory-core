# Real-ROM replay, fifth pass: the final run on the engine with fix 41, discovery batches, Metronome shapes, staged battles (Mac, 2026-11-13)

Run by the Mac battle-parity lane (`worker/parity-mac`). Per-battle data: `2026-11-13-fifth-pass.json`. The tally table:
`2026-11-13-fifth-pass-tally.md`. What was found and fixed: `docs/parity-mac/STATUS.md`, section "Fifth pass". The
finer tally (rule code no matching battle has run): `docs/parity-mac/rule-coverage.md`.

Every number in this file is a count of battles of a named list and player. It says what was driven. It is not a
quality figure.

## In plain words

- **The final run**: every list of the fourth pass driven again from scratch on the engine with fix 41 (`4f90eaf6c`,
  fixes 29 to 41), plus the six staged battles of this pass and the proof of fix 41.
- **Discovery batches** with new seeds (all three players, challenge numbers 0 to 7, one in four with Battle Scene
  ON) on the engine before fix 41 (`b36f7b6c9`; fix 41 needs a staged battle to show).
- **Metronome shapes**: 320 staged battles made by a script to reach Imprison, Rage and Twister's flinch through the
  opponent's Metronome.
- **The proof of fix 41**: the same staged battle on both engines. With the fix it matches the ROM to the end; without
  it, it leaves the ROM's battle at the first turn after the change.
- 5,095 battles are in the JSON, 5,085 match the real game to the end. The final run: 3,546 battles, 3,541 match, 5 are endless Struggle stalls (no difference up to the frame cap). No battle-rule difference anywhere, except the planned row of the proof battle on the engine before fix 41.

## Results

| list | engine | player | driven | match | other | voluntary switches | refusal probes |
|---|---|---|---|---|---|---|---|
| proof | `4f90eaf6c` | `random-v1` | 50 | 49 | 1 unfinished (20035) | 133 | 33 |
| mixed | `4f90eaf6c` | `ai-v1` | 600 | 600 | - | 34 | - |
| mixed | `4f90eaf6c` | `census` | 200 | 200 | - | - | - |
| mixed | `4f90eaf6c` | `random-v1` | 200 | 199 | 1 unfinished (20734) | 593 | 119 |
| pool | `4f90eaf6c` | `census` | 962 | 962 | - | - | - |
| brain | `4f90eaf6c` | `census` | 408 | 408 | - | - | - |
| challenge8 | `4f90eaf6c` | `ai-v1` | 360 | 357 | 3 unfinished (22152, 22462, 22527) | 10 | - |
| challenge8 | `4f90eaf6c` | `census` | 120 | 120 | - | - | - |
| challenge8 | `4f90eaf6c` | `random-v1` | 120 | 120 | - | 237 | 17 |
| lab | `4f90eaf6c` | `census` | 9 | 9 | - | - | - |
| staged | `4f90eaf6c` | `script` | 20 | 20 | - | 67 | 31 |
| sweep | `4f90eaf6c` | `script` | 497 | 497 | - | 1470 | 407 |
| discovery1 | `b36f7b6c9` | `ai-v1` | 600 | 598 | 2 unfinished (60421, 60987) | 25 | - |
| discovery1 | `b36f7b6c9` | `census` | 200 | 199 | 1 unfinished (60183) | - | - |
| discovery1 | `b36f7b6c9` | `random-v1` | 200 | 199 | 1 unfinished (60039) | 511 | 153 |
| discovery2 | `b36f7b6c9` | `random-v1` | 89 | 89 | - | 233 | 38 |
| discovery2 | `b36f7b6c9` | `ai-v1` | 88 | 88 | - | 4 | - |
| discovery2 | `b36f7b6c9` | `census` | 44 | 44 | - | - | - |
| shapes | `b36f7b6c9` | `script` | 320 | 320 | - | 1100 | 2060 |
| hunted | `b36f7b6c9` | `script` | 6 | 6 | - | 18 | 17 |
| fix41-proof | `4f90eaf6c` | `script` | 1 | 1 | - | 2 | - |
| fix41-proof-before | `b36f7b6c9` | `script` | 1 | 0 | 1 legality (noland-foresight-ghost) | 2 | - |

- "unfinished": a frame cap was reached and every state compared up to it matches. The battles of the final run that
  hit the stock caps were driven again with long caps (engine 4,000,000 frames, ROM drive 600,000; Brain 9098 1,500,000,
  gold 6347 1,900,000); what remains unfinished is a Struggle stall (both sides out of PP, Leftovers heals the
  Struggle damage), as in the fourth pass.
- "legality": the ROM refused a decision the engine took. The one such row is the proof battle of fix 41 on the
  engine before the fix, as expected.
- The ROM refused every refusal probe and took every decision the engine offered in every other battle.

## What the lists added to the tally

The rows of the work order (385 with this pass's new row: move effects, abilities, hold effects, situations; 10
cannot occur), the move effects only Metronome can reach (29; 1 cannot work), the sets (739) and the moves (274; 1
cannot work):

| tally | rows covered | zero | Metronome rows | sets on the field | moves used and worked |
|---|---|---|---|---|---|
| fourth pass, final run | 371 of 384 | 3 | 26 of 28 | 739 | 273 of 273 |
| fifth pass, final run (with the six new stage files) | 375 of 385 | **0** | **28 of 28** | 739 | 273 of 273 |
| fifth pass, every list | 375 of 385 | 0 | 28 of 28 | 739 | 273 of 273 |

Discovery batch 1 (1,000 battles) added no tally row. Rows covered by each player over every list (matching battles):
`census` 1,942 battles, 345 rows; `random-v1` 656 battles, 348 rows, 3 only it; `ai-v1` 1,643 battles, 336 rows, 1
only it; staged battles 844, 348 rows, 14 only they.

## How to drive a row again

    REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh SEED POLICY SYMBOLS [CHALLENGE]
    REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh --stage docs/parity-mac/stages/NAME.json
    REPLAY_SCENE=on REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh SEED POLICY SYMBOLS [CHALLENGE]

`POLICY` is `census`, `ai-v1` or `random-v1`; `SYMBOLS` is 1 for a gold Noland battle, else 0; `CHALLENGE` is the
game's 0-based challenge number (the `-cN` of an id). An id ending in `-on` is Scene ON. The Metronome shapes and the
sweep are made by scripts and are not kept in the repo; the stage files that found something are in
`docs/parity-mac/stages/`. Long battles: `REPLAY_FRAME_BUDGET=4000000 REPLAY_DRIVE_FRAMES=600000`.

## JSON

The same fields as the fourth pass's record (`battles`: `list`, `engine`, `id`, `seed`, `policy`, `symbols`, `scene`,
`challengeNum`, `result`, `statesMatched` / `engineStates`, `decisions`, `romFrames`, `voluntarySwitches`, `probes`,
`outcome`; a staged row also `stage` and `stageOk`). `tally.rows`: every row with its counts per player.
