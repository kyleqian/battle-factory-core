# opl4: Open Level real runs against the ROM (2026-11-22)

Kyle (11-22): "I want you to be able to play through different rounds and have it match what the actual ROM would produce." This doc
is the evidence for the engine's Open Level mode (`docs/opl2-open-level-engine.md`) against the ROM (`docs/opl1-open-level-rom.md`).
Every number here was measured on the Mac on branch `claude/open-level-a323ec`; evidence under `workspace/.integration/evidence/opl*/`
(not in git).

## In short

- **Real multi-round runs:** the frame catcher played whole Open Level challenges on both sides from the same seeds and inputs, the ROM
  from its own Open Level route (one DOWN at the attendant). Every game-loop check that reads the ROM's RAM came out the same:
  see the table below.
- **Generation over many seeds:** the ROM generation lab (`tools/openlevel/romGenLab.py`) against the engine
  (`tools/openlevel/genLabCompare.ts`): 3,000 / 3,000 deals and opponent rolls and 240 / 240 full draft builds (1,440 Pokemon)
  identical, both levels, challenges 0 to 10.
- **Battles:** whole-battle ROM replay at level 100: 165 / 165 battles (3,299 states) match, incl. Noland and 7 staged
  level-dependent rules. Census at Open, 200 seeds x 2 scenes: 0 errors (after one
  rule fix: Sand Stream's permanent sandstorm).
- **Crash / hang soak gates at Open** (the Level 50 set, `--level open`): 620 runs, 0 crash, 0 hang.
- **Level 50 unchanged:** census 0..199 both scenes byte-identical to master; catcher findings identical to master's.

## Real runs (frame catcher, `tools/frame-catcher/`, `tools/openlevel/catcherChecks.py`)

Traces: `makeTrace.mjs --level open --policy winning-swap` (two rounds: `--battles 14 --lobby-tail 120`; Noland: `--start-streak 14
--battles 7`; later challenges: `--start-streak 28 / 49`). The ROM starts from `oracle/bootstrap/factory-open*.json` (lvlMode 1 set by
the ROM's own Lobby script). The ROM's draft (round 1) gets the engine's six set ids written, then builds them itself; every later
round's deal is the ROM's own `GenerateInitialRentalMons` / `GenerateOpponentMons` from the engine's cursor; every later trainer is the
ROM's own roll from the engine's cursor; the Factory Head's party is the ROM's own `FillFactoryBrainParty` from the engine's cursor.
Each Pokemon's level, experience and stats are read from the ROM's RAM before the catcher patches anything (only personalities are
patched; why: "Personalities" below).

15 runs, both scenes, 121 battles, 1,558,907 engine frames: six two-round challenges (seeds 0 / 5 / 18 Scene OFF, 13 / 14 / 15 Scene ON:
rounds 1-2, the Lobby, the attendant's new challenge with OPEN LEVEL, round 2), four challenge-2 rounds that reach the Factory Head at
battle 21 (seeds 10 / 35 Scene OFF and 16 Scene ON beat him and play on into round 2; seed 28 Scene OFF loses to him), and five runs
at challenges 4 and 7 (streak 28 / 49). Menus followed: 5,483 of 5,486 (the 3 not followed: the Lobby after a lost challenge-4 run,
below).

| check (ROM RAM against the engine) | same / checked |
|---|---|
| each draft's six as the ROM built them (set ids; level 100, experience and stats) | 144 / 144 |
| the draft's IVs, rising with the challenge (3, 6, 9, 12, 15, 31 seen) | 144 / 144 |
| a new round's deal: the ROM's own six set ids and first opponent from the engine's cursor | 9 / 9 |
| a new round's deal: the level, streak and rent count the ROM read (per level; the Level 50 slots stay 0) | 9 / 9 |
| every later trainer: the ROM's own roll from the engine's cursor gave the engine's trainer and three sets | 93 / 93 |
| every foe as the ROM built it (IVs; level 100, experience, stats) | 363 / 363 |
| the player's three at every battle start, after swaps too (personality, species, ability, gender, level, HP, stats) | 121 / 121 |
| the battle-start transition | 121 / 121 |
| the Factory Head's team (the ROM's own FillFactoryBrainParty from the engine's cursor; his draws were the engine's stream) | 4 / 4 |

Pictures and sounds: the same kinds of differences as Level 50 catcher runs of the same length (the Level 50 baseline below). The
level-100 HP box ("Lv100", three-digit HP like 296/413, the empty EXP strip), the summary pages and the right-hand walk draw as on the
ROM. Sound: after the fix below, no Open-specific difference.

## Generation over many seeds (ROM generation lab)

`romGenLab.py` loads the ROM just before the PreBattleRoom deal (both levels' bootstraps), writes the save's own inputs (the level's
streak and rents slots, the battle number, earlier trainers), sets the cursor at each function's entry and reads the results from RAM.
Random cursors (3,000 deal samples, 240 build samples), streaks 0..70 (challenges 0..10, so the better range, the row 7 pin and the
challenge 8 random-IV overread), rent counts 0..271 (every rental rank and the 256 wrap), battle numbers 1..7 (battle 7's harder
trainer table):

| what | identical |
|---|---|
| six rental set ids, first opponent's trainer and three sets, both levels | 3,000 / 3,000 |
| the draft's six as built (personality, nature, level, experience, IVs, stats, moves, item, ability) | 240 / 240 (1,440 Pokemon) |

IVs by challenge, as the ROM built them (both levels the same): 3 / 6 (better range), 6 / 9, 9 / 12, 12 / 15, 15 / 21, 21 / 31, 31,
then 31 or a random spread (challenges 7-8, the source's table overread). Open sets: challenge 0 372-467 (better 468-563) up to
372-881 from challenge 3's better range on; Level 50 never above 849. Every Open Pokemon level 100.

## Personalities

The draft's personalities depend on the overworld's once-a-frame random draw that falls inside the ROM's ~50-frame build (36-62 extra
draws per build). The engine draws them back to back, as at Level 50 (ISSUES #55, distribution parity, parked since 2026-08-13). With
those draws undone the ROM's personalities equal the engine's (1,440 / 1,440, above); in a real run 2-5 of the six differ, at Level 50
the same way. Nothing in the battle depends on which personality: nature, IVs and stats match; the catcher gives the ROM the engine's.

## Battles

Whole-battle ROM replay at level 100 (`docs/opl3-open-level-rom-replay.md`: the battle lab stages Open Level battles with lvlMode 1, the
Open slots and the Open set ranges, and the ROM builds both level-100 parties itself; the replay drives the engine's decisions on the ROM
to the battle's end and compares every turn's state). Every battle driven matches: **165 battles, 3,299 states, no divergence**.

| batch | matched / driven |
|---|---|
| Open census seeds 0..59, Scene OFF | 60 / 60 |
| Scene ON spot check (seeds 1, 8, 30, 33, 57) | 5 / 5 |
| the `ai-v1` player, seeds 0..59 | 60 / 60 |
| the eighth challenge (full AI, sets 372..881), seeds 0..29 | 30 / 30 |
| Noland at Open: silver (seed 82), gold (26, 75) | 3 / 3 |
| staged level-dependent rules | 7 / 7 |

The staged rules (`docs/parity-mac/stages/opl3/`): Seismic Toss and Night Shade do 100; Psywave's damage steps of 10 between 50 and 150;
Beat Up with members of levels 100 / 50 / 100 (each hit from that member's own level); the OHKO moves at equal levels, with the
target above the user ("unaffected", the random draw still taken) and with the user above the target. The damage and stat formulas
at 100 are in every Open battle; the AI's damage scoring at level-100 numbers in the 26 census seeds at challenge 4+, the 30
eighth-challenge seeds and the Noland battles. A Tier-1 test replays Open seed 8 (a high-tier set, Tyranitar's Sand Stream, challenge
5's full AI) from a ROM fixture (`tests/opl3OpenLevelRomReplay.test.ts`).

Found on the way (not an Open Level rule, not fixed): the occasional "re-drive once" replay flake is the host clock reaching the ROM
(`oracle/emerald_core.py` starts the emulated clock at the process start time; a process started in a ~30-second window each day draws
another random value at the first menu). Pinning the clock would change every Level 50 tool run, so it is left for a decision.

## Soak gates (crash / hang, frozen tree 5cc539e1e, `--level open`)

The Level 50 gate set, every run `--level open`, on a frozen copy of 5cc539e1e (the later engine commits are the Open walk's
pictures, one Lobby sound and the tools-only start streak). **620 runs: 0 crash, 0 hang.**

| gate | OK / runs | deepest carry |
|---|---|---|
| vanilla 0:20 Scene OFF | 20 / 20 | |
| vanilla 0:20 Scene ON | 20 / 20 | |
| default (full) 0:60 | 60 / 60 | |
| winning 0:60 | 60 / 60 | |
| winning-swap 0:60 | 60 / 60 | |
| varied RNG, winning, carry 0 (0:100) | 100 / 100 | 28 (challenge 4 reached in 1) |
| varied RNG, winning, carry 14 | 100 / 100 | 28 |
| varied RNG, winning, carry 28 | 100 / 100 | 35 (challenge 5 in all 100) |
| varied RNG, winning-swap, carry 0 | 100 / 100 | 21 |

Every run ended on its frame budget. Before them, a quick check on the first engine commit: 24 / 24 (winning-swap, both scenes).

## Level 50 baseline and Level 50 unchanged

- Baseline (the same catcher on two-round Level 50 runs, seeds 8 Scene OFF and 2 Scene ON, 28 battles): every game-loop check the same
  (rentals, IVs, deals, carry, 24 trainer rolls, 84 foes, 28 player parties, 28 transitions); picture differences per stretch like
  the Open runs' (l8off 248 content / 385 timing stretches in 148k frames, Open o5off 234 / 400 in 170k).
- Level 50 unchanged: census 0..199 both scenes on 98ea58f5e against master 32c233e62: eventsDigest and error identical 200 / 200,
  0 changed commands, byte-identical shards; the catcher's findings on two Level 50 traces identical to master's (driver and engine of
  this branch); the engine side identical to master frame for frame on four Level 50 traces (pictures, sounds, menus, digest). Full suite
  on 9e9aa854c (all merged): 1,946 files / 16,852 tests passed, 0 failed (44 files skipped, as on master); typecheck clean.

## Found and fixed

- Sand Stream: a permanent weather never runs down at the end of the turn (battle_util.c:1340-1411); the engine's timer went to -1 and
  threw (Open census 2 of 50). Level 50 cannot reach it.
- A on OPEN LEVEL now plays the multichoice's SE_SELECT (the one sound difference in every two-round catcher run).

## Found, not fixed (not Open Level rules)

- **A player's Pokemon knocked out at the end of the turn by Leech Seed or Perish Song**: on the ROM the Pokemon drops and
  "X fainted!" then waits for a press; ours waits on the message before ("X's health is sapped by LEECH SEED!" / "X's PERISH count fell
  to 0!") and shows "fainted!" for a few frames only. The turn lasts about as long; the wait is on the wrong message. Seen in o14on
  (DODRIO, battle 11: ours 189900-190300, ROM 195000-195400) and o5off (SLAKING, battle 11: ours 130054-131385, ROM 135015-136647).
  These rules do not read the level; the Level 50 baseline below had only poison knock-outs at the end of the turn, and those are
  timing-only there (14 frames over the turn). Belongs with the end-turn knock-out timing (docs/fnt1-fainted-box-clear.md "Not landed").
- **The Lobby after a lost challenge** (h28s2on, the only run whose menus were not all followed): after "Would you like to record your
  last BATTLE FACTORY match?" NO, the ROM's farewell box closes earlier than ours relative to the menu, so two DOWN presses ours makes
  during its own text walk the ROM's player away from the attendant, and the catcher cannot follow the next challenge. All three battles
  before it matched. Not measured further: the farewell's first-glyph frame on both sides is the next step (`docs/lbb1-lobby-b-press.md`
  measured these Lobby menus at Level 50).
- **The healthbox bob** after the party menu: ours one pixel off the ROM's phase on returning to the action menu (the largest picture
  item in most runs, at Level 50 too).

## Not checked

- A real Lobby switch between levels (an Open round, then LV. 50 at the attendant, or the reverse): the engine's per-level carry is
  tested from the source rule (`tests/opl2OpenLevelEngine.test.ts`) but no ROM run picks the other level.
- Symbols or heard speech staged on the ROM: the catcher's Noland runs start from a fresh record (silver at battle 21); the gold Noland
  is in the battle replay (the lab stages its symbol) but not in a catcher run.
- Open Level round replay in the replay tool (round chaining): the catcher covers rounds instead.
- The "after-save" start at Open Level (engine supported; no ROM snapshot of the Open Lobby after the save).
- The nightly box replay drives no Open battles yet.
