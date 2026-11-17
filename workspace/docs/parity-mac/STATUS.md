# Mac battle-parity lane: status

Branch `worker/parity-mac`. Method: every seed is played by the engine and replayed on the real ROM
(`tools/audio/romDriveSeed.sh SEED off DIR`; HP of both sides, `gRngValue` and last moves compared after every turn). A seed
"matches" when every engine state is found in order on the ROM to battle end. Lists and decision: `docs/cax31-session-handoff.md`
item 0d, `docs/gameplay-parity-audit-2026-11-12.md` sections 7 and 8. Evidence is kept outside git; every row re-derives from the seed.

## Stopped 2026-11-13 (Kyle winds down the Mac)

Sixth pass, stopped at about 20:00 UTC on the top layer's word: the battle-rule work moves to the box.

### Fixes 42 and 43 (what was wrong for the game, the ROM result)

| # | What was wrong for the game | ROM result | Doc |
|---|---|---|---|
| 42 | The player's Curse, used by a Pokemon that is not a Ghost type, is aimed at its own user. When the opponent used Follow Me earlier in the turn, the game aims it at the Follow Me user instead, so Pressure on that Pokemon makes the Curse cost two PP. The engine kept the Curse on its user and took one PP. Reachable only with a Follow Me user that has Pressure (a Metronome-called Role Play or Skill Swap). | Mechanic Lab, lab seed 801: Curse PP 10, 8, 6 against Dusclops (Pressure) using Follow Me; control (Splash) 10, 9, 8. The engine test with the same numbers fails without the fix (9) and passes with it (8). | `follow-me-redirect.md` |
| 43 | When Pursuit hits a switching Pokemon and that Pokemon's Static, Poison Point or Flame Body gives the Pursuit user a status that its Synchronize passes back, the game ends the after-move steps there and goes on with the switch. The engine ran the remaining steps; one of them swapped attacker and target back and the switch then ran for the wrong side: the engine stopped with an error. Reachable only when the Pursuit user got Synchronize (Skill Swap from Alakazam 596 onto Fearow 473 or Altaria 508). | Mechanic Lab, lab seeds 801 and 802: Umbreon's Pursuit on the switching Electabuzz, Static paralyses Umbreon, Synchronize paralyses Electabuzz back, the switch goes on, last moves stay 0; seed 803 (Static never fires) is the control. The engine test stops with the error without the fix (about one seed in three of 40 did) and gives the ROM's result with it. | `pursuit-synchronize-moveend.md` |

Both came from the two leads of the fifth pass. The lead "getmovetarget ignores Follow Me" itself cannot happen in a
singles battle (the reason is in `follow-me-redirect.md` and `rule-coverage.md`). The lab requests and decisions are in
`stages/mechanic-lab/` with how to drive them.

### What is on hold by Kyle's word

- **The (c) list of the finer tally** (`rule-coverage-list.md`; numbered in `rule-coverage-c-rules.json`, R001..R110,
  uncommon first). 110 reachable rules no matching battle had run. **12 are now covered**: a staged battle that ran the
  rule's piece of code and matched the ROM to the end (`stages/coverage/`, with the lab seeds: R011, R013-R018, R020,
  R022-R025). **98 are not covered.** For 31 more of them a stage file was designed (in scratch, not committed): two were hunted
  without a hit (R012 over 64 seeds, R019 over 20), the others were stopped before or during their hunt. One design reading says R029 (the battle ending on the Leech
  Seed damage) cannot happen, because the Leech Seed scripts never run `checkteamslost`; that reading is not checked.
  No engine difference was found by the twelve; two engine errors during the hunt were the staging's own mistake (a
  replacement into a fainted slot), not the engine's.
- **Discovery batches.** Batch 1 (1,000) added no tally row and no difference, but ran 45 pieces of code the final run
  had not; batch 2 was stopped at 793 of 1,000 battles driven (no difference; the battles that reached a frame cap had no difference up to it). Its record
  is not in `docs/replay-batches/` (the fifth-pass JSON has the first 221).
- **The swap round flow and Open Level**: the plan below, nothing built.

#### The round flow between battles (the swap) and Open Level: what can be reached, what a tool would need (plan only)

**What the replay and the lab reach today.**

- Every generated battle is the first battle of a fresh rental: the lab's `factoryLegal` mode restores its rental
  checkpoint, re-enters the select screen (`DoBattleFactorySelectScreen`), takes the three requested sets and starts one
  battle (`oracle/BATTLE_LAB.md`, "Modes"). The battle number is a request field, but the team is always freshly
  rented: no HP, PP, status or held item carried in, no swapped Pokemon.
- `rentalSwapCount` only changes which rentals the select screen may offer (the rental rank). It does not play a swap.
- `factoryBrain` with `walkup: true` drives the room before Noland (the heal line, his call, the GO ON / RECORD /
  REST / RETIRE menu, the swap prompt), and nothing after the battle.
- The lab is Level 50 only (challenge numbers 0..7; "Version-1 boundaries").
- The replay (`tools/integration/soundCensusRomReplay.ts`) builds one battle on the engine side from the ROM's read-back
  and enters the engine below the app shell (`core.ts` is not loaded). The engine has the round flow
  (`factoryRoundBattleOrchestrator.ts`, `factorySwap.ts`, `factoryRoundChaining.ts`, `roundController.ts`), but no
  replay has run it.

**The round flow: what a tool would need.**

1. A ROM drive that goes on after the last turn of a battle: the win text, the heal, the swap screen (keep or swap; which
   own Pokemon; which of the beaten trainer's three), the walk to the next battle and its intro, up to the next action
   menu. The ROM decision driver (`tools/audio/romDecisionDriver.py`) would need these screens as decision points, the
   way it has the action and party menus now. Alternative: a lab checkpoint at the swap screen of battle N (a new lab
   mode), which would make each later battle a short drive.
2. A replay request for a round: the seed, the first team, and the swap decisions (from the test players: never swap,
   always swap the weakest, random). The engine side would run `factoryRoundBattleOrchestrator.ts` from the rental
   screen through all seven battles, with the same decisions.
3. A compare at the start of every battle: the player's three party records (species, moves, PP, HP, IVs, EVs,
   personality, item), the trainer id and the opponent's three, and the battle number; then the turn compare as now.
   What the game carries between battles and must match: full heal of HP, PP and status (`special HealPlayerParty`,
   `data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:82` and `:172`), the held items restored, the swapped Pokemon built from the opponent's record, the
   next trainer from the trainer schedule (the seventh battle from the "hard" table, `battle_tower.c:1104-1129`), the
   opponents' sets and their IVs (the seventh battle's higher IVs, `GetFactoryMonFixedIV`).
4. Tally rows for the round: swaps (none / one), each battle number 1..7, the seventh battle's trainer table.
5. Cost: a round is seven battles, about seven times the frames of one battle plus the screens; a long-cap drive.

**Open Level: what a tool would need.**

1. The lab: an Open Level `factoryLegal` staging. Today the request's `level` is fixed at 50 and the set ranges are
   the Level 50 table; Open Level uses the second half of `sInitialRentalMonRanges` (`battle_factory.c:169-190`: sets
   372..881) and the Open Level level (`GetFrontierEnemyMonLevel`, `battle_tower.c:3233-3260`; the Factory builds its
   Pokemon at `FRONTIER_MAX_LEVEL_OPEN` = `MAX_LEVEL`, `battle_factory.c:417-425`).
2. The replay request and the engine's battle construction with the level mode (the damage formula's level term, the
   stats at that level, the Open Level set ranges in `factoryRentalGeneration.ts`). The engine side was not checked
   in this lane for Open Level.
3. A tally pool for the Open Level sets (372..881; sets above `FRONTIER_MONS_HIGH_TIER` = 849 appear only above level 50,
   `include/constants/battle_frontier_mons.h:862`).
4. The battle rules are the same code; what is new is the sets, the levels and the larger numbers.


### How the box re-drives these battles and runs the coverage tool

- Staged battles: `REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh --stage docs/parity-mac/stages/NAME.json` (also
  for `stages/coverage/*.json`). The probe finds `vendor/mgba-venv` itself, or takes `POKEBENCH_MGBA_PYTHON`. Nothing
  in the repo tools is Mac-only.
- Mechanic Lab runs: `stages/mechanic-lab/README.md` (repo tools only).
- The coverage tool: `python3 tools/audio/romReplayCoverage.py collect OUT.cov DIR ... [--stages docs/parity-mac/stages]
  [--skip-policy ai-v1]` reads the `ID.summary.json` and `ID.setup.json` that `romReplayWide.sh` keeps for every
  matching battle; it needs Node (with `--experimental-strip-types`) and Python 3, nothing else. The evidence
  directories of this lane are on the Mac (outside git), so on the box the lists must be driven again first. The coverage
  file must be collected on one engine: `merge` and `report` refuse files whose source differs.
- Not in the repo (scratch scripts on the Mac): the hunter that drives a stage file with many lab seeds and screens
  each seed on the engine for the piece of code before driving it on the ROM, and the batch / snapshot runners. What
  the hunter does: per lab seed, `soundCensusRomReplay.ts request --stage`, the lab setup
  (`soundEventProbe.py ... --setup-out`), the engine replay with `NODE_V8_COVERAGE` set, `count_at` for the stage's
  `cover` markers, and only then the full `romReplayWide.sh --stage` drive.

## Fifth pass (2026-11-13, evening): the zero rows, the finer tally, discovery batches

Task (work order of 14:10 UTC): fill the zero rows of the tally; a finer tally that names the rule code no ROM-matched
battle has run, classified; discovery batches with new seeds in the background.

### What was wrong for the game (fix 41)

| # | What was wrong | Found by | ROM proof |
|---|---|---|---|
| 41 | The trainer AI's score for its own Foresight when the Foresight user is a Ghost type: the game rolls twice, the engine rolled once. The engine's battle took one random number too few and went on differently from the game. A player meets it only against silver Noland's Machoke or Hitmonlee after moving Color Change to it (Skill Swap) and hitting it with a Ghost move. | the finer tally: the branch had never run in a matching battle; read against the game's script | staged battle `noland-foresight-ghost` (lab seed 79001): 20 of 20 states with the fix; 6 of 21 without it |

Details: `ai-foresight-ghost-second-roll.md`. Test: `tests/factoryAiCheckViability.test.ts` ("AI_CV_Foresight").

### Step 1: the zero rows are filled

Every row of the tally that was zero is now covered by a staged battle that matches the ROM (`staged-battles.md`,
section "Fifth pass"): a move refused under Imprison, Imprison stopping a chosen move, Rage building, the flinch of
Twister, Camouflage. The tally has one new row, Magic Coat reflecting the move of a Pressure Pokemon; two staged
battles fill it.

Magic Coat against Pressure, what the game does with the PP: the Magic Coat user pays one more PP **from its Magic
Coat slot**, on the field and in the party record. When Metronome called the Magic Coat there is no Magic Coat slot, so
nothing more is paid; the Metronome slot pays one PP for the use (Magic Coat's own use is never raised by Pressure).
Both match the ROM (`party-pp-writes.md`). The fourth pass said Factory sets alone cannot stage this; that was wrong
(Skill Swap moves Pressure to the Pokemon whose move is reflected).

### Step 2: the finer tally (rule code no matching battle has run)

The tool `tools/audio/romReplayCoverage.py` replays, engine side only, every battle that matched the ROM, with V8
coverage, and lists every piece of the battle-rule code (134 files of `src/engine/`) that no such battle ran. The
offsets were proven to map to the `.ts` source on a known branch. Method, scope, what is left out:
`rule-coverage.md`. The list by rule: `rule-coverage-list.md`.

- Counted: every matching battle of the lists, 5,352 (the fourth pass's final run and Scene ON list, discovery batch 1,
  the Metronome shapes, the new stage files; none dropped); for the trainer AI files only the 2,903 without the
  `ai-v1` player, because `ai-v1` runs the same AI code for the player's side.
- **1,933 pieces of rule code were never run.** (a) cannot occur in a Factory Level 50 singles battle: 290 pieces, 163
  rules. (b) not a battle rule: 1,445 pieces, 172 rules. **(c) reachable: 198 pieces, 110 rules**: 29 that a player
  meets uncommonly, 81 rarely, none commonly. 134 of the 198 are in the battle scripts and the turn flow, 64 in the
  trainer AI.
- Reading the (c) list against the source gave fix 41 and two suspected differences that need rare set-ups (leads
  for the next pass, in `rule-coverage.md`).
- Not done: a staged battle or a steered batch for each (c) group (to start with the 29 uncommon ones).

### Step 3: discovery batches

- **Batch 1** (engine `b36f7b6c9`): seeds 60001..61000, 600 `ai-v1`, 200 `census`, 200 `random-v1`, challenge
  numbers 0 to 7 (125 battles each), one in four with Battle Scene ON. 996 match the ROM to the end. 4 are Struggle
  stalls that reach the ROM's frame cap of 600,000 frames (60039, 60183, 60421, 60987): every state compared matches.
  No difference. 511 voluntary switches and 153 refusal probes by `random-v1`; the ROM refused every probe.
- What batch 1 added: **no new tally row and no difference, but 45 pieces of rule code** that no battle of the final
  run had run (28 of them the Scene ON list of the fourth pass runs too). By the work order's rule the family goes on.
- **Batch 2** (seeds 61001..62000, the same mix): 221 battles in the record (89 `random-v1`, 88 `ai-v1`, 44 `census`),
  221 match. It ran on the lanes the fold work left free and goes on; 779 not in the record.
- Every battle is staged as the first battle of its challenge (the lab's request); the seventh battle of a challenge
  (the "hard" trainer table, higher IVs) is only reached by the Noland battles.

### Above the eighth challenge (checked in the source)

The sets, the trainers and the AI do not change again above the eighth challenge (sets 372..849, trainers 200..299,
all three AI scripts). Only the IVs change: the ninth challenge reads one row past the game's IV table and gets random
IVs; from the tenth every IV is 31, as in the eighth. The lab stages challenge numbers 0..7 only, so the ninth
challenge is not driven. Source lines: `replay-players.md`.

### The final run on the engine with fix 41

Every list of the fourth pass driven again from scratch on the engine with fix 41 (`4f90eaf6c`), with the six new
stage files and the long-cap re-drives. Rows: `docs/replay-batches/2026-11-13-fifth-pass.json`; text and table:
`2026-11-13-fifth-pass.md`.

| list | battles | result |
|---|---|---|
| proof (`random-v1`) | 50 | 49 match; 20035 is the endless Struggle stall of the fourth pass (951 states match up to the cap) |
| mixed (600 `ai-v1`, 200 `census`, 200 `random-v1`) | 1,000 | 999 match; 20734 the same stall (729 states) |
| pool (`census`) | 962 | 962 match |
| brain (`census`, silver and gold Noland) | 408 | 408 match (9098 and 6347 with the long ROM caps) |
| challenge8 (eighth challenge) | 600 | 597 match; 22152, 22462, 22527 the same stalls |
| lab (former lab failures) | 9 | 9 match |
| staged (`docs/parity-mac/stages/`, 20 files) | 20 | 20 match, each with its expected rows |
| Metronome sweep | 497 | 497 match |

3,546 battles, 3,541 match, 5 Struggle stalls with no difference up to the cap. **The tally of this run alone: 375
rows covered, 10 cannot occur, 0 zero** (385 rows); 28 of 28 Metronome-only effects; 739 of 739 sets; 273 of 273
moves. Discovery batches, shapes and the proof battles (all lists of the pass): 5,095 battles in the JSON.

### Not done

- **(c) groups of the finer tally:** 110 reachable rules never run in a matching battle; no staged battle or steered
  batch for them yet. The 29 uncommon ones first.
- **Two suspected differences** from the reading (move-end steps after a Pursuit on a switching Pokemon that gets
  Synchronize; Follow Me and a self-aimed Ghost Curse): not proven, `rule-coverage.md`.
- **The discovery family is not finished:** batch 1 added covered code, batch 2 has 221 of 1,000 battles in the record.
- **The ninth challenge** (random IVs) cannot be driven: the lab stages challenge numbers 0..7 only.
- **The four Struggle stalls of batch 1** were not driven to their end (each would need several million frames).
- **Open Level, and the round flow between battles:** not started, by the work order.

## Fourth pass (2026-11-13): three test players, the wide compare, the tally

Task: the replay could not see part of the game. Its player took the least-used legal move and never switched by
choice, and the compare was two HP values, `gRngValue` and the last moves. This pass widens both, and counts what
really took effect. The finish line is the tally, not a number of battles.

What was built (tools only, no rule in them):

| | file | record |
|---|---|---|
| three test players: `census` (the old one), `ai-v1` (the game's own AI on the player's side), `random-v1` (random legal actions, voluntary switches, refusal probes) | `tools/integration/romReplayPlayers.ts` | `replay-players.md` |
| wide compare at every decision, and the winner | `tools/integration/soundCensusRomReplay.ts`, `tools/audio/soundEventProbe.py` | `wide-compare.md` |
| one battle: `REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh SEED [POLICY [SYMBOLS [CHALLENGE]]]` | `tools/audio/romReplayWide.sh`, `romReplaySummary.py`, `romReplayBatchReport.py` | `wide-compare.md`, `replay-players.md` |
| the eighth challenge and later (sets 372..849): the fourth argument, `7` | the same | `replay-players.md` |
| the tally | `tools/audio/romReplayTally.py` | `tally.md` |
| staged battles (real sets, a written script, `expect` rows); the Metronome sweep is 497 of them | `--stage FILE`, `docs/parity-mac/stages/` | `staged-battles.md` |

A battle "matches" in this pass when every engine turn state is in the ROM timeline in order, the ROM drive used every
decision and ended at the outcome, both sides name the same winner, and no wide field differs at any decision.

### Results

Every number here is a count of battles of the named list and player. It says what was driven, not how good the engine
is. Per-battle rows: `docs/replay-batches/2026-11-13-fourth-pass.json`; text: `docs/replay-batches/2026-11-13-fourth-pass.md`.

This is the **final run** of the pass: every list driven from scratch on one engine, `b36f7b6c9` (fixes 29 to 40), after
the last fix. It is also the confirming batch of the work order.

| list | what it is | battles | result |
|---|---|---|---|
| proof | `random-v1`, seeds 20001..20050 | 50 | 49 match. 20035 is an endless stall (951 states match up to the 600,000-frame cap). 133 voluntary switches, 33 refusal probes; the ROM refused every probe. |
| mixed | seeds 20101..21100: 600 `ai-v1`, 200 `census`, 200 `random-v1`; 41 of them Noland battles | 1,000 | `ai-v1` 600 of 600. `census` 200 of 200. `random-v1` 199 of 200: 20734 is an endless stall (729 states match). 627 voluntary switches, 119 refusal probes, all refused. 20293, 20493 and 20569 needed the long caps. |
| pool | old player, the 962 seeds of `docs/replay-batches/regression-pool.txt` (the 64 list is inside) | 962 | 962 match. |
| Brain | old player, 204 silver and 204 gold Noland battles | 408 | 408 match (9098 and 6347 with the long caps; gold 1447 is staged now). |
| **eighth challenge** | seeds 22001..22600 at the game's challenge number 7 (sets 372..849, the legendary Pokemon, trainers 200 and up): 360 `ai-v1`, 120 `census`, 120 `random-v1` | 600 | `ai-v1` 357 of 360: 22152, 22462 and 22527 are endless stalls (804, 979 and 1,043 states match). `census` 120 of 120. `random-v1` 120 of 120. 247 voluntary switches, 17 refusal probes, all refused. |
| former lab failures | 3623 5633 5736 8075 9188 6048 9073, silver 10127, gold 10022 | 9 | 9 match. |
| staged | `docs/parity-mac/stages/*.json` | 13 | 13 match, each with its expected rows in its own tally. |
| Metronome sweep | 497 staged battles (`staged-battles.md`) | 497 | 497 match (7 of them with the long caps). 1,470 voluntary switches and 407 refusal probes (the random player, in the 167 battles against the opponent's Chansey); the ROM refused every probe. |
| Battle Scene ON | the first 500 battles of the mixed list again, Scene ON (300 `ai-v1`, 100 `census`, 100 `random-v1`) | 500 | 500 match (7 of them with a longer frame cap: a Scene ON battle has about three times the frames). 309 voluntary switches, 47 refusal probes, all refused. |

No difference is left in anything driven: no wrong damage, status, stage, PP, item, timer, weather or winner at any
decision, and no legality error (the ROM took every decision the engine offered and refused every refusal probe). The
five battles that do not count as a match are endless stalls, with every state up to the frame cap equal.

The eighth challenge had never been replayed in any pass (a seed's streak was `(seed * 11) % 49`: challenges 1 to 7
only). All 94 sets that exist only there (756..849) were on the field in a matching battle of this list.

### What the pass found (fixes 29 to 40, in the table below)

Found by the wide compare and the new players, in generated battles:

- **Fix 29: Perish Song after the deciding faint** (342, 457; the wrong winner in 20596: a draw, the engine said the
  player won).
- **Fix 30: a Pokemon thawed by a Fire move** stayed frozen in its party record (20276).
- **Fix 31:** a fainted Pokemon's party status (no effect on play).
- **Fix 33: three PP changes that did not reach the party record** (5908, 7879).

Leads of the earlier passes, each with a ROM proof:

- **Fix 32: Foresight in the AI's other two passes** (staged silver Noland battle).
- **Fix 34: the game's item check after every action** (the cure berry after Pursuit on a switching Pokemon, #214).
- **Fix 35: a forced Struggle that never starts** sorts as Struggle at the end of the turn.

Found by the Metronome sweep (497 staged battles with real sets; the last two have nothing to do with Metronome, the
sweep only happened to reach them):

- **Fix 36: a Transformed Pokemon's moves spent the PP of its own moves** in the party record.
- **Fix 37:** a faint cleared the Lock-On mark early (no effect on play).
- **Fix 38: an opponent's Intimidate blocked by the player's Mist lowered the opponent's own Attack.**
- **Fix 39: a Pokemon that faints from Spikes as it is switched in ends the turn.** The engine let the other side still
  use its move against the replacement. This one needs no rare move: Spikes and a weak switch-in are enough.
- **Fix 40:** after an end-of-turn faint whose replacement dies on Spikes, the game forgets the player's last move;
  the engine forgot the other side's.

Fixes 30, 31, 33 and 36 are one kind of error: the Pokemon on the field was right and its party record was not. The
old compare could not see a party record, and the old player never left the field by choice.

The record of each turn had a hole until the first stop of this pass: a turn without a player decision (the second
turn of a two-turn move, a recharge turn, the later turns of Rollout / Outrage / Uproar) was not in it, so the tally
could not count what happened there (`tally.md`). The final run's records have every turn.

### Known leads of the earlier passes: all closed

| lead | state |
|---|---|
| Foresight in the AI try-to-faint and check-viability type checks | **fixed** (fix 32), staged ROM battle `stages/foresight-noland.json` |
| The AI final pick with masked slots and the score flattening at 0 | **proven unreachable** from the source: `tools/report/ai-score-bounds.py` (a usable slot ends at 77 or more, a masked slot at 25 or less; `ai-scripts-unusable-slots.md`) |
| The Rain Dance stale-register read (`AI_CV_RainDance`) | **proven unreachable** from the pool data: no Rain Dance set belongs to a species with Drizzle or Speed Boost (`ai-heal-weather-stale-register.md`) |
| Cure berries in the after-action item pass (`HandleFaintedMonActions` state 6) | **fixed** (fix 34), Mechanic Lab ROM proof (`cure-berry-after-action.md`) |
| The forced Struggle that never started (`gProtectStructs[].noValidMoves` kept) | **fixed** (fix 35), Mechanic Lab ROM proof (`forced-struggle-never-started.md`) |
| White Herb on a Baton Pass switch-in: "Spikes already damaged" stays set | **seen on the ROM** (Mechanic Lab seed 701): the next Pokemon of that side takes no Spikes damage. The engine already did this; a test pins it (`white-herb-baton-pass.md`) |
| Magic Coat against Pressure (fix 33) | **closed in the fifth pass, ROM proof.** The fourth pass said Factory sets alone cannot stage it; that was wrong: Skill Swap can move Pressure to the Pokemon whose move is reflected. Two staged battles match the ROM: a real Magic Coat slot (`stages/magic-coat-pressure.json`, Kecleon 220 against a Venomoth that took Absol's Pressure: the Magic Coat slot pays one more PP, in the party record too) and Magic Coat called by Metronome (`stages/metronome-magic-coat-pressure.json`: no slot pays the extra PP). `party-pp-writes.md` |

### The tally

The full table, with a column per player: `docs/replay-batches/2026-11-13-fourth-pass-tally.md`. Rules: `tally.md`.
It is made from the 3,534 matching Scene OFF battles of the final run.

The rows of the work order (every move effect, ability and hold effect of the Level 50 sets, and the situations):

| rows | count | cannot occur (source proof) | covered by a matching battle | zero |
|---|---|---|---|---|
| move effects | 166 | 1 | 165 | 0 |
| abilities | 71 | 7 | 64 | 0 |
| hold effects | 39 | 0 | 39 | 0 |
| situations | 108 | 2 | 103 | 3 |
| together | 384 | 10 | 371 | **3** |

Row families added in this pass:

| rows | count | cannot occur | covered | zero |
|---|---|---|---|---|
| move effects only Metronome can reach | 29 | 1 | 26 | 2 |
| every set on the field | 739 | 0 | 739 | 0 |
| every move of the sets used and worked | 274 | 1 | 273 | 0 |

- **The 3 zero rows:** a move refused under Imprison; Imprison blocking a move that was already chosen; Rage building.
  All three need Metronome to call the move at the right moment (no set has Imprison or Rage). The sweep called
  Imprison and Rage, but not in the turn that shows these. They need more Metronome battles of the right shape.
- **The 2 zero Metronome rows:** Camouflage; the flinch of Twister. Not called (or no flinch) in 497 sweep battles.
- **The 10 + 2 rows that cannot occur**, each with its source reason in `tally.md`: Illuminate, Stench, Run Away,
  Pickup, Plus, Minus, Lightning Rod; Helping Hand (always fails in singles; also as a move row); Snatch stealing a
  move; "Torment blocks the chosen move" at move use (a dead script); Teleport (always fails in a trainer battle).
- Return and Hidden Power were wrongly on that list at the first stop: no Factory Pokemon has them, but Metronome can
  call them. They are covered now (the sweep).

What each list added (rows of the first table / Metronome rows / sets):

| after | rows covered | Metronome rows | sets on the field |
|---|---|---|---|
| proof (50) | 240 | 0 | 210 |
| + mixed (1,000) | 348 | 4 | 645 |
| + pool (962) | 359 | 13 | 645 |
| + Brain (408) | 359 | 13 | 645 |
| + eighth challenge (600) | 359 | 13 | **739** |
| + staged (13) | 369 | 15 | 739 |
| + Metronome sweep (497) | 371 | 26 | 739 |

Per player, over all lists: `census` (1,699 matching battles) covers 344 of the 371 rows, 3 of them only it;
`random-v1` (368) covers 336, 4 only it (the refusal rows); `ai-v1` (957) covers 329, 1 only it; the staged battles
(510) cover 340, 12 only they.

The 13 staged battles fill 10 rows no generated battle filled: Magnet Pull and the switch it refuses, Mental Herb,
Rawst Berry, the flinch of Sky Attack, Rapid Spin clearing, a move refused under Disable, an uproar waking a sleeper at
the end of the turn, Mist blocking a stat drop, Mist ending.

### Found on the way, outside the battle rules (not fixed here)

- **The rental select screen lets the player take two Pokemon of one species.** The six rentals can hold one species
  twice (a quirk of `GenerateInitialRentalMons`, which the engine has). The game's select screen then refuses the
  second one: "Can't select same POKeMON." (`Select_AreSpeciesValid`, `battle_factory_screen.c:2256-2276`; the swap
  screen has the same check, `Swap_AlreadyHasSameSpecies`, `:4162`). The engine's RENT handler has no such check
  (`src/engine/core.ts`, the `MENU_OPTION_RENT` branch; `docs/rent-flow-notes.md` lists it as an open risk). It shows
  mostly from the eighth challenge on, where about 3 teams in 100 have such a pair in their first three rentals. The
  replay tool now picks a team the game would allow. For the box.
- **One animation evidence test fails on master** (`tests/animation/sandTombEvidenceCheckpoint`): a file-hash pin that
  a box commit did not update (see "Gates"). For the box.

### Not done

- ~~3 tally rows are zero; 2 Metronome rows are zero~~ **closed in the fifth pass** (staged battles, section "Fifth
  pass").
- ~~Magic Coat against Pressure: source and test only; Factory sets alone cannot stage it~~ **wrong, and closed in the
  fifth pass**: Factory sets can stage it (Skill Swap moves Pressure to the Pokemon whose move is reflected), and
  Metronome can call Magic Coat. Both are staged and match the ROM (`party-pp-writes.md`).
- **Open Level, and later battles of a round:** not started, by the work order. What each would take is below.
- **Presentation, seen in code only, not touched:** when the player is trapped the engine's party menu says the
  Pokemon "is already in battle"; the game says it "can't be switched out". The forced-move menu gap of the earlier
  passes is unchanged.
- **What the wide compare leaves out** is listed in `wide-compare.md` ("What is left out, and why").
- **`ai-v1`** sees only what was revealed of the opponent and is a decision policy, not a faithful copy of the game's
  AI on the player's side (`replay-players.md`). Its switches are few (34 in 600 battles); `random-v1` supplies the
  switches.

### Open Level and later battles of a round: what it would take (not started)

- **Open Level.** The replay request and the lab are Level 50 only (`level: 50`; `LEVEL_50_SET_RANGES` in
  `oracle/battle_lab.py`). It needs: the lab's `factoryLegal` staging for the Open Level ranges and levels; the level
  mode in the replay request and in the engine's battle construction (the engine side was not looked at in this lane);
  a tally pool for the Open Level sets. The battle rules are the same code; what is new is the sets (372..881) and the
  level-100 numbers.
- **Later battles of a round** (the team carried over, HP and PP restored, a rental swap between battles). Every battle
  driven so far starts from a fresh team. It needs a ROM drive through the screens between two battles (the lab has a
  `walkup` mode for the walk to the first battle only), the swap screen's decisions in the test players, and a compare
  of the team at the start of each battle. `rentalSwapCount` in the request already sets the rental rank.

## Third pass (2026-11-12): Frontier Brain (Noland) battles

Noland battles can now be replayed on the real ROM like any other battle (`brain-replay-seam.md`). Before this pass no
Brain battle had ever been compared with the ROM (the bulk batch counted them as "rc 12, not drivable").

| | silver Noland (challenge 2, streak 20) | gold Noland (challenge 5, streak 41) |
|---|---|---|
| seeds | 204: every seed with seed % 49 == 33 in 1..10000 | 204: every seed with seed % 49 == 26 in 1..10000, driven with `ROM_REPLAY_SYMBOLS=1` |
| staged by the lab and driven | 204 | 203 |
| **match to battle end** | **204** (203 with the stock chain, 9098 with higher caps) | **203** (202 with the stock chain, 6347 with higher caps) |
| engine mismatch | **0** (first drive: 1, seed 7922, fixed by fix 27) | **0** |
| the long one (both sides Struggle, Leftovers) | 9098: 1,823 / 1,823 states, 1,212,712 ROM frames | 6347: 2,043 / 2,043 states, 1,526,588 ROM frames |
| not drivable | 0 | 1 (seed 1447: the lab does not reach the action menu; see "Still open") |

How the counts were made:

- Silver, first drive on engine `af798050e` (the seam, before any fix of this pass): 202 match, 7922 does not, 9098 hits
  the stock frame caps. 7922 was the only rule difference in the 407 staged Brain battles; it is fix 27 below.
- Gold, first drive on the engine with fix 27: 202 match, 6347 hits the stock frame caps, 1447 fails in the lab.
- 9098 and 6347 were then driven on the final engine with the engine budget at 2,000,000 frames and the ROM drive cap
  at 1,500,000 / 1,900,000 frames: both reach the battle's end on the ROM and every state matches.
- Fixes 27 and 28 change two AI move scripts only (Synthesis / Morning Sun / Moonlight; Fly / Dig / Dive / Bounce). A
  battle whose opponent has none of those seven moves plays the same on every engine of this pass. So after the fixes
  the seeds whose Brain party has one of them were re-driven on the final engine `24ad564bd`: silver 54 seeds (53 match
  with the stock chain, among them 7922 with 16 / 16 states; the 54th is 9098), gold 19 seeds (19 match).
- Every member of every Brain party was checked against the ROM read-back before its battle was played (species, level,
  personality, OT id, nature, ability, item, moves, PP, IVs, EVs, friendship, HP, stats; silver IV 15, gold IV 31). No
  seed failed that check.
- Census "battle 1 at streak 20" against the lab's "battle 7 of challenge 2": no battle input depends on the
  difference (`brain-replay-seam.md`, last section), and 407 matching battles agree.

Ordinary battles on the final engine `24ad564bd` (one fresh batch per list):

| list | result |
|---|---|
| regression list (handoff 0d) | **64 / 64** |
| every earlier seed of this lane whose opponent runs the full AI and has one of the seven moves (49 of 1,114 seeds) | **49 / 49** (47 stock chain; 2658 and 3504 with the long caps) |
| random sample of 120 other seeds from the earlier lists, on the engine with fix 27 | **120 / 120** |

For the bulk replay session: the engine to re-drive against is this tip. Only seeds whose opponent has one of the seven
moves above and runs all three AI scripts (streak 28 and up, or Noland) can differ from `680b907f3`.

## Where it stands (2026-11-12, second pass)

| | seeds |
|---|---|
| open list at the start (audit doc section 8) | 115 |
| **now matching to battle end** | **114** (113 with the stock chain, 705 with a higher driver frame cap) |
| not drivable to its end | 1 (796: see "Still open") |
| regression list (handoff 0d), must keep matching | **64 / 64** |
| new seeds 1161-7056 that did not match on the old engine (bulk replay batch) | 542 (290 up to 4341, 154 up to 6014, 98 up to 7056) |
| of those, now matching to battle end | **529** (516 with the stock chain, 13 long battles with higher caps) |
| of those, endless battles with every state matching up to the cap | 11 |
| of those, not replayable (lab staging, not the engine) | 2 (3623, 5736) |
| random sample of seeds that already matched on the old engine, re-driven on the final engine | **400 / 400** still match |

The bulk batch (another session, engine `a86909863e`) had replayed seeds 1161 to about 7190 when this pass ended: 5,345
matched, 542 did not, 121 are Brain battles. The 542 were re-driven here on this branch. **No seed in any list shows an
engine mismatch now.** Of the 5,345 seeds that already matched on the old engine, a random sample of 400 was re-driven
on the final engine and all 400 still match; the bulk session should re-drive the rest.

Now matching (114), to join the regression list (705 needs `--frames` above 82,835 on the ROM drive):
60 79 87 89 90 94 95 107 109 114 119 123 137 138 152 159 161 165 183 193 203 218 225 228 236 265 284 292 332 342 343 345 392 417
426 444 454 457 475 483 484 491 492 499 522 525 529 542 547 553 566 573 576 577 614 616 631 643 651 675 702 705 707 715 737 758 769
783 799 804 813 830 838 839 848 857 862 867 881 897 898 899 900 904 905 906 907 912 918 926 929 959 965 968 973 986 992 996 1005
1014 1017 1021 1030 1032 1066 1072 1081 1083 1095 1112 1117 1125 1153 1157.

New seeds, by what made them match:

| what | seeds |
|---|---|
| already matched on the first-pass engine (fixes 1-16) | 267 |
| fixes 17-21 below, stock chain | 1414 2215 3375 3704 |
| replay tool false alarms (`replay-tool-fixes.md`), stock chain | 1181 1816 2722 4270 |
| long battles, match to the end with engine `--frame-budget=2000000` and ROM `--frames 600000` | 1338 (154 states) 1904 (155; needs fix 19) 2546 (588) 2658 (127) 2742 (171) 3504 (642) 3589 (125) 3789 (162) |
| endless Struggle / Leftovers stalls: every state matches up to the 600,000-frame ROM cap, no mismatch | 1986 (720 states) 2297 (943) 2716 (941) 2907 (817) 3009 (821) 3807 (929) |
| lab staging played a turn before the snapshot; cannot be replayed | 3623 |

The 154 later seeds (4342-6014), all on the final engine:

| what | seeds |
|---|---|
| match with the stock chain | 146 |
| long battles, match to the end with the higher caps | 4485 (139 states) 5437 (161) 5950 (260) |
| endless stalls, every state matches up to the 600,000-frame ROM cap | 4560 (876 states) 4924 (894) 5464 (770) 5632 (913) |
| lab staging played a turn before the snapshot | 5736 |

No new cause was needed for them: fixes 1-26 and the tool fixes cover all 154.

The 98 seeds after that (6023-7056), all on the final engine: 95 match with the stock chain, 6720 (206 states) and 6765
(162) match to the end with the higher caps, 6430 is one more endless stall (685 states match up to the cap). Again no
new cause.

### Seeds for the regression list

Brain battles (new in the third pass), stock chain:

- silver Noland: every seed with seed % 49 == 33 in 1..10000 (33, 82, 131, ... 9980) except 9098: 203 seeds;
- gold Noland, driven with `ROM_REPLAY_SYMBOLS=1`: every seed with seed % 49 == 26 in 1..10000 (26, 75, 124, ... 9973)
  except 1447 and 6347: 202 seeds.

The 516 new seeds that match to battle end with the stock chain (old-engine mismatches of the bulk batch, seeds 1161-7056):

1164 1174 1181 1184 1185 1193 1194 1215 1225 1233 1234 1243 1267 1274 1277 1280 1302 1321 1350 1368 1389 1400 1414 1415 1420 1437
1440 1448 1461 1467 1469 1473 1478 1499 1507 1522 1545 1585 1602 1618 1629 1684 1687 1692 1705 1714 1724 1745 1750 1757 1759 1779
1787 1811 1816 1822 1842 1843 1851 1859 1862 1880 1884 1890 1914 1928 1937 1939 1940 1951 1958 1959 1964 1966 1967 1976 1988 1994
2000 2004 2006 2015 2016 2025 2027 2035 2039 2049 2061 2071 2082 2097 2108 2118 2121 2127 2132 2134 2173 2178 2182 2188 2193 2200
2203 2215 2230 2235 2250 2265 2270 2274 2275 2303 2311 2318 2324 2347 2349 2355 2358 2363 2380 2416 2421 2430 2440 2459 2475 2484
2510 2513 2542 2554 2575 2583 2613 2634 2641 2653 2664 2699 2713 2722 2738 2741 2783 2797 2800 2801 2804 2812 2834 2846 2850 2851
2871 2873 2918 2922 2944 2947 2955 2965 2967 2984 3011 3020 3023 3025 3027 3033 3041 3044 3067 3088 3089 3096 3097 3102 3103 3131
3134 3152 3158 3162 3173 3209 3231 3240 3262 3305 3330 3335 3344 3356 3375 3377 3379 3387 3388 3397 3420 3455 3461 3465 3478 3493
3495 3501 3534 3539 3540 3547 3573 3590 3591 3602 3671 3672 3689 3704 3706 3710 3738 3741 3745 3772 3775 3776 3784 3787 3788 3792
3804 3825 3832 3839 3843 3849 3867 3887 3892 3901 3914 3923 3931 3934 3945 3959 4001 4009 4020 4072 4073 4108 4111 4179 4191 4194
4204 4206 4214 4222 4235 4237 4243 4266 4268 4270 4284 4306 4322 4331 4341 4357 4360 4369 4373 4401 4408 4410 4412 4413 4419 4447
4457 4498 4509 4513 4526 4533 4534 4535 4540 4564 4576 4608 4612 4636 4651 4666 4667 4671 4686 4689 4690 4698 4707 4732 4734 4742
4743 4748 4764 4767 4777 4787 4804 4809 4814 4850 4863 4888 4895 4896 4919 4925 4927 4932 4934 4964 4965 4974 4975 4988 4992 5001
5005 5010 5039 5055 5056 5060 5063 5077 5088 5104 5113 5120 5128 5198 5210 5226 5233 5245 5250 5254 5272 5281 5282 5287 5290 5295
5297 5309 5313 5378 5382 5400 5420 5436 5461 5474 5482 5486 5488 5489 5491 5493 5526 5540 5549 5569 5583 5584 5607 5612 5614 5623
5641 5647 5660 5676 5682 5684 5686 5709 5721 5731 5753 5756 5761 5811 5822 5823 5837 5883 5903 5907 5908 5918 5919 5922 5923 5928
5951 5966 5981 6003 6014 6023 6069 6079 6116 6117 6130 6143 6152 6155 6168 6174 6181 6197 6224 6244 6249 6260 6269 6279 6288 6298
6310 6317 6351 6370 6373 6379 6385 6407 6412 6423 6434 6444 6447 6464 6480 6491 6497 6506 6531 6547 6556 6559 6568 6581 6595 6619
6635 6643 6661 6662 6672 6680 6684 6701 6704 6713 6727 6740 6757 6774 6784 6790 6805 6806 6808 6813 6816 6817 6819 6834 6838 6839
6843 6849 6876 6880 6881 6882 6884 6888 6894 6912 6946 6948 6995 7009 7013 7020 7024 7025 7027 7035 7037 7056.

## Fixes (one commit each, C-cited, each with a test that fails without it)

"First cleared" = the seeds that started matching in the re-drive where the fix was added (fixes stack, so a seed listed
late may also need the earlier ones).

| # | What was wrong (for the game) | Audit lead | Doc | First cleared |
|---|---|---|---|---|
| 1 | A badly poisoned Pokémon kept its growing Toxic damage after leaving the field and coming back. The game restarts it at 1/16. | B1 | `toxic-counter-switch.md` | 94 165 183 343 499 1014 1030 |
| 2 | After an opponent fainted, the engine sometimes sent in the wrong replacement: it counted status moves as "super effective moves" and ignored Levitate. | A2, A3 | `opponent-replacement-pass1.md` | 79 107 109 138 284 332 392 457 484 491 566 573 616 675 715 830 838 839 857 899 900 904 905 907 918 926 986 1017 |
| 3 | When the opponent chose to switch by itself (Perish Song), it took the first bench Pokémon instead of scoring them. | A4 | same doc, second section | 123 906 1072 (driven together with fix 4) |
| 4 | A confused Pokémon that had picked Explosion / Selfdestruct hurt itself too little (the game halves its Defense for that hit). | B6 | `confusion-self-hit-explosion.md` | 218 |
| 5 | Encore: the Encored side lost its action choice (the player could not switch; the opponent's switch check was skipped). Forced Struggle / Encore: the opponent's move picker still ran and spent random numbers. | B2, dia272 seed 60 | `encore-struggle-selection.md` | 60 87 89 90 119 159 161 193 203 225 228 265 292 345 417 444 492 522 542 553 577 631 702 737 758 769 804 813 862 897 912 929 973 992 1021 1095 1112 1125 1157 |
| 6 | The opponent AI scored only the moves it could select. The game scores every move that still has PP (a Choice Band lock, Disable, Taunt, Torment do not stop the scoring) and spends random numbers on them. | new (dia275 group C) | `ai-scripts-unusable-slots.md` | 95 137 454 525 529 576 614 707 783 799 848 881 965 968 996 1032 1066 1081 1153 |
| 7 | Four AI move scripts spent a random number (the speed-tie draw, or a roll) before the script reached that step: Explosion / Memento, Recover-type moves, Baton Pass, Mirror Move. | new | `ai-speed-tie-draw-order.md` | 114 152 426 1005 1117 (driven together with fix 8) |
| 8 | The AI's "switch to something that resists" search skipped one bench slot too few (a quirk of the game's loop). | new | `ai-resist-switch-battlerin1.md` | (with fix 7) |
| 9 | AI "try to faint": a move that is not the strongest gets -1 and stops. The engine went on to roll the 4x bonus. | new | `ai-try-to-faint-not-strongest.md` | 236 |
| 10 | When the last Pokémon to act stayed "frozen solid", the next turn's first move skipped its charge turn, its message and its PP cost (Solar Beam fired at once). | new | `turn-passed-hitmarker-clear.md` | 342 547 |
| 11 | Shell Bell healed its holder off a Future Sight hit. | B4 | `shell-bell-future-sight.md` | 475 867 |
| 12 | Pain Split was recorded as a physical hit (Counter worked after it; Revenge / Focus Punch saw a hit). | B7 | `pain-split-not-physical.md` | 483 |
| 13 | Castform kept its weather form after the weather ended. | B5 | `castform-reverts-with-weather.md` | 643 651 |
| 14 | A second Intimidate (or Trace) Pokémon entering the same field slot before any action finished still activated. | new | `intimidate-once-per-slot.md` | 1083 |
| 15 | The AI's "no effect" check ignored Foresight on its target. | new | `ai-effectiveness-foresight.md` | 959 |
| 16 | AI penalty for two-stat moves when both stats are maxed: -10 only, not -18 (Curse, Bulk Up, Cosmic Power, Calm Mind, Dragon Dance, Tickle). | new | `ai-dual-stat-penalty.md` | 898 |
| 17 | A Pokémon that used Endure survived a Future Sight landing the same turn. The game lets it faint. | B3 | `endure-future-sight.md` | 2215 |
| 18 | After a faint the engine sometimes sent in the wrong replacement when a bench Pokémon had two types: the type score was multiplied in the wrong order (the game follows its type table and rounds down after every step). | new | `replacement-type-score-table-order.md` | 1414 |
| 19 | Rage never ended: once used, every later hit raised Attack. The game drops Rage as soon as another move is chosen. | new | `rage-status-clear.md` | 1904 |
| 20 | The player's Curse (non-Ghost) lost 2 PP against Pressure. The game takes 1 (the opponent's Curse does lose 2). | new | `curse-player-target.md` | 3375 |
| 21 | A player's lead Slaking loafed on turn 1 when the opponent's lead had Cloud Nine or Forecast; an opponent lead's weather ability did nothing at battle start. | new | `battle-start-switchin-battler.md` | 3704 |
| 22 | Hidden Power of a special type could be answered by Mirror Coat and not by Counter. In the game it is always Counter. | B8 | `hidden-power-damage-record.md` | Mechanic Lab |
| 23 | The opponent AI's turn count was always 0 (Swagger with Psych Up kept its first-turn bonus). | A5 | `ai-turn-counter.md` | source only |
| 24 | The AI's move scoring did not see the player's Sp. Atk stage (Roar, Psych Up) or a trapping ability (Skill Swap, Role Play), and spent a different number of random draws. | A6, A7 | `ai-cv-target-ability-spatk.md` | Mechanic Lab |
| 25 | White Herb did nothing when a lowered stat was Baton Passed to its holder; the game uses it at once. | suspected | `white-herb-baton-pass.md` | Mechanic Lab |
| 26 | The AI kept its memory of a Pokémon that left and came back while the AI was locked into a multi-turn move. | suspected | `ai-history-reentry.md` | source only |
| 27 | Full AI (Noland; ordinary trainers from challenge 4): in clear weather the game's weather check for Synthesis / Morning Sun / Moonlight reads a leftover value, and when the opponent's last move is its strongest that value reads "sandstorm" and costs the heal 2 points. The engine never applied it, so the opponent healed where the game attacks. | new (Brain replay) | `ai-heal-weather-stale-register.md` | 7922 (silver Noland) |
| 28 | The same leftover read in the Fly / Dig / Dive / Bounce script: an Ice-type opponent (or a Ground / Rock / Steel one when the leftover reads "hail") makes one extra roll for +1 in clear weather. The engine skipped the roll, so every later random number differed. | new (source read after fix 27) | same doc, second part | Mechanic Lab |
| 29 | When Perish Song took the last Pokémon of one side, the engine ended the turn there. The game goes on with the other Pokémon: its count still runs, and when it is taken too and was its side's last one, the battle is a draw, which ends the player's challenge. The engine gave the player a win. The same holds for a delayed Future Sight hit. | new (wide compare, winner check) | `perish-song-after-outcome.md` | 342 457 (census); 20596 (ai-v1, the draw) |
| 30 | A frozen Pokémon thawed by a Fire move stayed frozen in its party record, so it was frozen again after it left the field and came back. | new (wide compare) | `defrost-party-status.md` | 20276 (ai-v1) |
| 31 | No effect on play: a fainted Pokémon kept its last status in the party record (the game clears it). Fixed so the wide compare checks fainted party members too. | new (wide compare) | `faint-party-status.md` | - |
| 32 | Against a Ghost that the opponent had hit with Foresight, the full AI (silver Noland's Machoke or Hitmonlee) still saw its Normal and Fighting moves as doing 1 damage, and its Cross Chop took one random roll too many. | second-pass lead | `ai-effectiveness-foresight.md` | staged battle `foresight-noland` (lab seed 30046) |
| 33 | A switch-in rebuilds PP from the party record, and three PP changes never reached it. A Perish Song user that paid the extra Pressure PP, and a Magic Coat user that bounced a Pressure Pokémon's move, got that PP back after leaving the field and returning. A Pokémon whose Leppa Berry restored a move lost the restored PP again the same way. The party menu and the summary showed the wrong PP too. | new (wide compare) | `party-pp-writes.md` | 5908 (Perish Song), 7879 (Leppa Berry); Magic Coat: source and test only |
| 34 | After every action the game checks the player's held item once more and eats a cure berry at once. The engine did that for White Herb only. When the player's Pursuit hits a switching opponent whose Static (Poison Point, Flame Body, Effect Spore) strikes, the game cures the player right after the switch; the engine waited for the end-of-turn item step, after the two Pokémon are sorted by speed, so weather damage, Leech Seed and poison could come in the other order. | lead #214 | `cure-berry-after-action.md` | Mechanic Lab (seed 502) |
| 35 | A Pokémon with no usable move must Struggle. When the faster Pokémon on the other side faints from its own move and is replaced at once, the Struggle does not happen; the game then sorts that Pokémon for the end-of-turn effects as if it had used Struggle. The engine used the priority of the move under its cursor (Protect, Endure, Quick Attack ...), so it went first where the game lets the faster one go first. | second-pass lead | `forced-struggle-never-started.md` | Mechanic Lab (seed 601) |
| 36 | After Transform (only through Metronome in the Level 50 Factory) every copied move a Pokémon used wrote its PP over the PP of the Pokémon's own move in that slot. It came back from the bench with the wrong PP on its real moves. | new (Metronome sweep) | `transformed-pp.md` | staged battle `metronome-transform` |
| 37 | No effect on play: a faint cleared the Lock-On mark its owner had left on the other Pokémon; the game clears it when the next Pokémon enters the slot. | new (Metronome sweep) | `lock-on-mark-at-faint.md` | staged battle `metronome-lock-on` |
| 38 | When Mist protected the player's Pokémon from an opponent's Intimidate, the engine lowered the Intimidate user's own Attack by one stage. The game lowers nobody's. | new (Metronome sweep) | `intimidate-against-mist.md` | staged battle `metronome-lock-on` |
| 39 | When a Pokémon that was switched in fainted from Spikes and was replaced, the engine still ran the other side's chosen move against the replacement. The game ends the turn there. Both sides. | new (Metronome sweep; needs no Metronome) | `faint-on-switch-in-cancels-turn.md` | staged battle `spikes-faint-cancels-turn` |
| 40 | When a Pokémon faints at the end of a turn and its replacement faints from Spikes as it comes in, the game forgets the last move of the first Pokémon still present (the player's). The engine forgot the fainted side's. Encore, Disable and Torment read it on the next turn. | new (Metronome sweep; needs no Metronome) | `end-turn-attacker.md` | staged battle `spikes-faint-at-turn-end` |
| 41 | The trainer AI's score for its own Foresight when the Foresight user is a Ghost type: the game rolls a second random number when the first is 80 or more, and gives +2 only when both are. The engine rolled once. So the AI liked Foresight too often there and took one random number too few: the rest of the battle went on differently from the game. A player meets it only against silver Noland's Machoke or Hitmonlee after moving Color Change to it (Skill Swap) and hitting it with a Ghost move. | new (fifth pass: rule code no matching battle had run, read against the script) | `ai-foresight-ghost-second-roll.md` | staged battle `noland-foresight-ghost` (lab seed 79001): 20 of 20 states with the fix; without it the battle leaves the ROM's at the first turn after the type change (6 of 21 states) |
| 42 | The player's non-Ghost Curse is aimed at its own user; with the opponent's Follow Me up the game aims it at the Follow Me user, and Pressure on that Pokemon makes the Curse cost two PP. The engine kept it on its user (one PP). | new (sixth pass, from the fifth pass's Follow Me lead) | `follow-me-redirect.md` | Mechanic Lab lab seed 801 (ROM only; engine test with the same numbers) |
| 43 | When the Pursuit user's Synchronize answers Static, Poison Point or Flame Body during a Pursuit on a switching Pokemon, the game ends the after-move steps there. The engine ran the rest and then stopped with an error in the switch. | new (sixth pass, from the fifth pass's Pursuit lead) | `pursuit-synchronize-moveend.md` | Mechanic Lab lab seeds 801, 802 (ROM only; engine test with the same numbers) |

Group view against the handoff's queue (a seed can sit in two groups):

| group (handoff 0d) | seeds | now matching | still open |
|---|---|---|---|
| (a) the ROM sends in a different opponent | 21 | 21 | - |
| (b) Struggle | 24 | 23 | 796 |
| (c) Encore | 10 | 10 | - |
| (d) confusion self-hit | 5 | 5 | - |
| (e) infatuation | 5 | 5 | - |
| older open seeds and the unsigned rest | 55 | 55 | - |

A signature was a lead, not a cause: group (a) was four causes (fixes 1, 2, 3, 11), most "confusion" and "infatuation" seeds
were fixes 2, 5 and 10, and the unsigned rest was almost entirely the opponent AI spending a different number of random draws
(fixes 6, 7, 9, 16).

## Audit doc section 2: where each lead stands

| lead | state |
|---|---|
| A1 | fixed on box master (`aiv271`: the AI damage sims take the real hit chain's terms); nothing left for this lane |
| A2, A3, A4 | fixed (fixes 2, 3), ROM seeds 332 / 284 / 123 |
| A5 | fixed (fix 23), source only: the lab cannot stage a target already at -3 Attack |
| A6, A7 | fixed (fix 24), Mechanic Lab ROM proof |
| B1, B2, B4, B5, B6, B7 | fixed (fixes 1, 5, 11, 13, 4, 12), each with a ROM seed |
| B3 | fixed (fix 17), ROM seed 2215 |
| B8 | fixed (fix 22), Mechanic Lab ROM proof |
| suspected: White Herb on Baton Pass | fixed (fix 25), Mechanic Lab ROM proof |
| suspected: AI history on a swap during a move lock | fixed (fix 26), source only |
| suspected: end-turn re-sort priority on a forced Struggle | **not a bug.** The ROM does what the engine did (`endturn-order-forced-struggle.md`); the wrong "known gap" comment is replaced and a test pins the ROM order |
| suspected: cure berries after Pursuit-on-switch | open, low value: `HandleFaintedMonActions` state 6 runs the item pass for the player's battler (`ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)`); the engine ports only White Herb there. A status berry would cure a few steps earlier than the engine's end-of-turn pass. The only rule effect found by reading: a paralysis cured before the end-turn speed re-sort |

New source-read leads found on the way (no ROM seed yet):

- AI try-to-faint and check-viability type checks do not take Foresight (`ai-effectiveness-foresight.md`).
- AI final pick: a slot masked by a Choice lock / Disable can only win if every usable slot falls to its score;
  each `score` command clamps at 0 in C and the engine does not clamp (`ai-scripts-unusable-slots.md`).
- After White Herb on a Baton Pass switch-in the game skips the rest of `switchineffects`; the "Spikes already damaged"
  flag then stays set for that side (modeled by fix 25, never seen on the ROM).

## Still open

| seed | state | next step |
|---|---|---|
| 796, 1986, 2297, 2716, 2907, 3009, 3807, 4560, 4924, 5464, 5632, 6430 | Both sides are out of PP and trade Struggle while Leftovers heals; the battle does not end. Driven with the engine budget at 2,000,000 frames and the ROM drive at 600,000 frames: 720 to 943 engine states match in order and no mismatch appears (796: 894). | none: they cannot be driven "to battle end" in practical time. Keep them off the regression list; they are long-run checks, not open rule bugs. |
| 1447 (gold Noland), 3623, 5633, 5736, 8075, 9188, 6048, 9073, silver 10127, gold 10022 | **closed (fourth pass).** These were lab setup failures (`oracle/battle_lab.py`: an A press of the intro landed on the first action menu; or the route did not reach the menu). The top layer fixed the lab (`3917eca39`, on master). All ten are staged now and match to the end on the fourth pass's final engine. | - |

Long battles that do end need higher caps than the stock chain (engine 200,000 frames, ROM drive 80,000): 705 (82,835 ROM
frames), 1338, 1904, 2546 (426,522), 2658, 2742, 3504 (398,092), 3589, 3789, 4485, 5437, 5950 (144,657), 6720, 6765.
All match to the end. The staging race is rare (2 of about 6,000 seeds). Brain battles: 9098 (silver, 1,212,712 ROM
frames) and 6347 (gold, 1,526,588) need the ROM cap above those values; both match to the end.

## Known gap left on purpose (presentation, not battle rules)

Encore / forced Struggle: the engine still opens its move menu after FIGHT with the forced move as the only legal slot; the
real game goes straight to the turn (and prints "… has no moves left!" for Struggle). See `encore-struggle-selection.md`.

## Re-pins (tests anchored to a fixed census / generated battle that really changed)

Commits "re-pin the census-anchored tests ..." and "re-pins for the Castform revert ...". Invariants are unchanged in every case.

| test | change | why |
|---|---|---|
| `factoryRoundBattleOrchestrator` round census | seed 5 calls 1694 -> 1493, seed 15 1503 -> 1672 (both still win at battle 7) | whole-round RNG cursor |
| `factoryRoundBattleOrchestrator` #84(5) | the party record keeps Toxic counter 0 | it asserted the wrong rule (fix 1) |
| `factoryWholeBattle` | self-authored 3v3 trajectory regenerated (ends in a player win) | AI draw counts |
| `factoryRoundChaining` (b) | curated seed 5 -> 9 (first of 0..30 that chains four wins) | every trajectory moved |
| `randomRoundSoak` (b) | seed 2 -> 0 (lowest of 0..30 reaching carry 14) | same |
| `liveSpriteOrderHost` | later 80 -> 73, laterKnown 71 -> 64, postKoLent 12 -> 5, compared 898 -> 840, hostKnown 798 -> 740, laterAfter 72 -> 65 | the 20 sweep battles hold fewer bodies; 0 mismatches as before |
| `playableAnimationLifecycle` | 466 -> 467 | generated matchups changed |
| `fix122AuditDefects` move 113 | census battle 41 -> 2 | battle 41 lost its failed Light Screen |
| `apx222LastStaticClassesApproximate` | battles 41 -> 50 and 138 -> 133, same row counts | those commands moved |
| `sa125StatusAnimationCommand` | + battle 101 (opponent burn) | the listed battles lost that route |
| `stl109Struggle` route 2 | opponent Struggles four times before the player's first (was two) | fix 5 |
| `cf78CastformForm` (battle 950) | 11 transformed bodies (was 21), 31 other live bodies (was 22) | fix 13 |
| `apx221PresentationGateApproximate` | the "opponent Fly at a hail-form CASTFORM" row left | no census seed carries it after fix 13 |
| `factoryBattleScriptInLoveFullTurn` | the UNABLE_TO_USE_MOVE marker is cleared at the turn boundary | it pinned the leak (fix 10) |
| `factoryBattleScriptEncoreFullTurn`, `issue138EncoreDisableReceipt` control arm | the Encored side gets its request | fix 5 |
| `factoryAiCheckBadMove` six "both at the limit" cases, `factoryAiCheckViability` Mirror Move case | -10; no roll | they pinned the wrong rule (fixes 16, 7) |
| `tools/report/ability-item-parity-census.ts`, `docs/ability-item-parity-census.md`, `docs/gate6-coverage-manifest.json` | pinned source lines moved | edits above them |
| `presentationStringIssue108` | the staged Rage holder now chooses Rage | fix 19 drops a staged Rage flag when another move is chosen |
| `tools/integration/sst200Compare.ts` (used by `sst200SecondStatRows`) | the player's Curse decision targets the user | fix 20; the Curse stat rows still equal the ROM's in both scenes |
| `battleScriptRulesContext` key list | + `battleTurnCounter`, `aiHistoryClears` | fixes 23, 26 |
| `tools/report/ability-item-parity-census.ts` | five pinned `factoryAiCheckViability.ts` lines + 6, then + 5 | fixes 27, 28 added lines above them; the census doc and the gate-6 manifest regenerate byte-identical |

Fourth pass:

| test | change | why |
|---|---|---|
| `battleEndTurnOrchestration` "Perish Song after a deciding faint" | the old case expected the turn to stop at the first deciding faint; replaced by four cases | it pinned the wrong rule (fix 29) |
| `factoryBrainRoundShape` | gold seed 24 -> 14 | on seed 24 the third battle of the round ends with Perish Song taking both last Pokemon: a draw now, so the round ends there (fix 29) |
| `tools/report/ability-item-parity-census.ts`, `docs/gate6-coverage-manifest.json` / `.md` | pinned source lines moved (twice) | fixes 29, 32 and 33 added lines above them; no row changed its content |
| `factoryAiScoredWiringParity` samples | + a Foresight target | fix 32 added an input |
| `battleScriptHitChainOpcode` "faint cleanup clears another battler's sure-hit marker ..." | now "... leaves another battler's sure-hit marker alone" | it pinned the wrong rule (fix 37) |
| `battleScriptRulesContext` key list | + `noValidMovesKept`, `intimidateBattler` | fixes 35, 38 |
| `battleScriptSketchOpcode` "transformed user" row | Sketch's party PP after the turn 0 -> 1 | a Transformed Pokemon's `ppreduce` does not write the party record (fix 36) |
| `docs/gate6-coverage-manifest.json` / `.md` | pinned source lines moved, two new test paths | fixes 34 and 35 |
| `factoryAiCheckViability` "AI_CV_Foresight" (fifth pass) | a Ghost-type user with a first roll of 80 or more: one draw and +2 -> two draws and 0 or +2; the type2 row: one draw -> two | fix 41: the game makes the second roll (`data/battle_ai_scripts.s:1957-1961`) |
| `abilityItemParityCensus` (fifth pass) | two pinned sites of `runCvSkillSwap` move 8563 -> 8579 and 8569 -> 8585; the census document is unchanged | fix 41 added 16 lines above them |

One presentation lead seen while re-pinning and not looked at: census battle 32 trips `sa125`'s ON - OFF row check on a
CONFUSION anchor (139 vs 100).

## Gates

Typecheck, full suite and build are run on a clean checkout of the branch tip (a separate gate worktree).

Fifth pass: gate on `59ef2ded9` (fixes 29 to 41, the coverage tool, master `0d84f6bfb` merged in): typecheck ok, build
ok, **14,745 tests pass, 1 fails**: the same `sandTombEvidenceCheckpoint` pin as below, which fails on master too.
Two earlier runs of this pass's gate found two things that are fixed in `59ef2ded9`: a type error in fix 41's own test
(`50da81972`), and the ability/item census pin of two line numbers that fix 41 moved (`59ef2ded9`, an honest re-pin).
The commits after `59ef2ded9` are documents: this section, the finer-tally documents and classes file, the batch
record.

Fourth pass, second stop: gate on `d0afbccc2` (fixes 29 to 40, with master `937c7caee` merged in): typecheck ok, build
ok, **14,745 tests pass, 1 fails**. The one is not from this lane: `tests/animation/sandTombEvidenceCheckpoint` fails
the same way on a clean checkout of master `937c7caee`. Its fixture pins the sha256 of
`tools/compare/sandTombSourceAudit.ts`, and box commit `11e1a66b4` (the sprite pixel provider installs) changed that
file. Left to the box. The commits after `d0afbccc2` are documents, the per-battle JSON, the tally table, one stage
file, and a merge of master `0b80af10e` (one line of handoff text); no test reads them. The gate before it, on `04d65eb7c`, had one more failure: `battleScriptSketchOpcode` "transformed user",
which pinned the party PP write that fix 36 removed (re-pinned in `d0afbccc2`).

Fourth pass, first stop: gate on `61d84a74f` (fixes 29 to 33 with box master `a21ec4148` merged in): typecheck ok,
build ok, **14,724 tests pass, 3 fail**. The three are not from this lane: `tests/animation/megaHornActualCore`,
`revengeActualCore` and `superpowerActualCore` fail the same way on a clean checkout of box master `a21ec4148`
("mon pic pixels not installed"). Their three render tools (`tools/compare/megaHornActualCore.ts`,
`revengeActualCore.ts`, `superpowerActualCore.ts`) do not import `src/engine/monPicPixelsInstall.ts`, which the box's
lazy-sprite change (`bnd257d`) now needs; the other render tools import it. With that module preloaded the Megahorn
tool gives 353 of 353 again. Left to the box (presentation tools). The commits after `61d84a74f` are documents, the
tally tool (Python) and the per-battle JSON; no test reads them. Box master `e83b18c0e` (PROGRESS text and one browser
audio check script) was merged after that run; the gate was not run again.

An earlier gate of this pass, on `7227a52bc` (fixes 29 to 32 with box master `9b877623a`): typecheck ok, build ok,
14,685 pass, 3 fail: three `randomRoundSoak` tests that failed on box master since `9f8c9aa7d`; the box re-pinned them
(`rps278`) and they pass in the gate above.

Third pass, engine tip `24ad564bd` (with box master `1e4019b9c` merged in): typecheck ok, build ok, **14,612 tests pass,
0 fail**. Run again after merging box master `b6d633f83` (handoff text and one trace fixture), on `ced53f33e`: the same.
Box master `572204f7f` (handoff text and one line of that fixture, which no test reads) was merged after that run; the
gate was not run a third time. The five animation evidence tests that failed on the older master `43b0b22e5` were fixed on master
(`1e4019b9c`, three digest re-pins) and pass here.

Replay on that engine: see the third-pass section at the top (regression 64 / 64, the 49 seeds the two AI fixes can
touch 49 / 49, Brain silver 204 / 204 and gold 203 / 203 of the staged battles).

Second pass, engine tip `e05bdf321`: typecheck ok, build ok, 14,592 tests passed; the only failures were those five
animation evidence tests, which failed on the master of that day. Replay on that engine, one fresh batch (stock chain):
regression 64 / 64; the eight seeds fixed in that pass 8 / 8; old open list 113 / 115 (705 and 796 are the two long
ones); the 290 list 267 / 267 of its stock-chain seeds; the 154 list 146 / 146 of its stock-chain seeds; the 98 list
95 / 95; a random sample of 400 seeds that matched on the old engine 400 / 400. The long battles that end (705 and the
thirteen of the new lists) were driven on that engine too and match to the end; the endless ones of the 290 list were
driven on engine `462d6429d` (before fixes 22-26), the later ones on `e05bdf321`.

## Box hunt 2026-11-14 (rrh1): the first eleven on-hold designs

The Mac lane stopped; the rare-rule hunt is a side job of the box. The scratch hunter is now `tools/replay-hunt/`
(`prehunt.py`, `huntq.py`, README; box paths, cwd = `workspace/`, outputs under `.integration/evidence/rrh1/`). Per lab seed
it runs the request, the ROM setup and the engine replay under `NODE_V8_COVERAGE`, checks the stage's `cover` markers
(`romReplayCoverage.count_at`), and drives only a seed that ran the piece with `romReplayWide.sh --stage`. About 15 s per
seed with two hunts side by side next to the nightly check; a matched drive (request, setup, engine, ROM drive, compare)
takes 32 to 68 s.

**Covered: R001..R010 and R012 (11 rules); the finer tally's (c) list is now 23 covered, 87 left. No engine difference
was found.** Each file moved to `stages/coverage/` (the `.design.json` removed, `onHold` dropped, `rules` / `cover`
kept), and re-driven once more from a clean command line: all 11 match, `stage.ok` true.

| rule | stage file (lab seed) | lab seeds tried | states matched |
|---|---|---|---|
| R001 AI Calm Mind -8 when Sp. Def is +6 | R001-lunatone-spdef-max (90000) | 6 (design's `replacements` named a fainted slot: engine errors) + 1 | 13 / 13 |
| R002 AI Charm vs Hyper Cutter | R002-minun-charm-hyper-cutter (90000) | 1 | 19 / 19 |
| R003 AI Bounce / Dive in Hail | R003-rapidash-bounce-hail (90000) | 1 | 83 / 83 |
| R004 AI Encore roll < 30 | R004-dewgong-encore-roll (90000) | 1 | 54 / 54 |
| R005 AI Focus Punch +5 behind a Substitute | R005-machamp-sub-focus-punch-attract (90000) | 1 | 30 / 30 |
| R006 AI Knock Off, target under 30% | R006-armaldo-knock-off-low-target (90000) | 1 | 14 / 14 |
| R007 AI Pain Split +1 (user first, <= 40%) | R007-misdreavus-pain-split-low (90001) | 1 (wrong cover: hit but not the +1 arm) + 2 | 14 / 14 |
| R008 AI Revenge vs asleep target | R008-machamp-revenge-asleep (90000) | 1 | 37 / 37 |
| R009 AI Skill Swap roll | R009-gengar-skill-swap-roll (90002) | 20 (replacements) + 3 | 21 / 21 |
| R010 AI Skill Swap vs Arena Trap | R010-gengar-skill-swap-arena-trap (90000) | 1 | 10 / 10 |
| R012 AI Substitute, statused target | R012-ai-substitute-statused-target (190000) | 15 + 15 + 4 + 1 (judging bug) | 12 / 12 |

Design mistakes fixed on the way (all in the staging, none in the engine):

- R001, R009: the fixed `replacements` list named a party slot that was already fainted (`staged battle, replacement N:
  party slot K is not legal`); removed, the `then` player chooses. R009 hit the piece in 17 of 20 seeds, all lost to that error.
- R007: the first cover marker is the user-moves-first return of AI_CV_PainSplit, which runs for any HP; only the second
  (`: 1` arm, the +1 score) is the rule. Cover reduced to the second marker, `coverAny` unchanged (one marker).
- R012: the design's two `cover` entries have the same display label in `prehunt.py`, so its `got` dict kept only the
  second (the Leech Seed arm, not the rule) and the Mac's 64 seeds plus 15 of mine were judged on the wrong marker. The first
  (the statused-target arm after a status move) alone: the original Zapdos staging hit at lab seed 190000. A Jynx variant
  (sleep from Lovely Kiss) never reaches it: an asleep or fully paralysed Pokemon's `gLastMoves` becomes 0xFFFF, not its Toxic.
  Note for later designs: do not give two cover entries the same `text[at:at+30]`.

### Box hunt rrh1, second part: the rest of the high-chance designs

After R001..R012 the hunt went on to the other designs, by chance note. **14 more rules covered: R021, R026, R027, R028,
R034, R036, R041, R042, R043, R044, R045, R046, R047, R048. The finer tally's (c) list: 37 covered by staged battles
(the Mac's 12 and the box's 25), R019 proven unreachable (class (b)), 72 left. No engine difference was found, so there is
no `stages/coverage/pending/`.** Each of the 14 was re-driven once more from a clean command line (`romReplayWide.sh
--stage`, `nice -n 19`, one at a time): all match, `diffPoints` 0, engine and ROM outcome equal.

| rule | stage file (lab seed) | lab seeds tried | states matched | re-drive wall |
|---|---|---|---|---|
| R021 Immunity vs Poison Fang | R021-immunity-poison-fang (80000) | 1 (design's `replacements` fixed up front) | 16 / 16 | 34 s |
| R026 Sticky Hold vs Trick | R026-sticky-hold-trick (70000) | 1 | 15 / 15 | 34 s |
| R027 Thrash cancelled, user could not move | R027-thrash-ghost-cancels-lock (70000) | 1 | 67 / 67 | 59 s |
| R028 Explosion on both sides: draw | R028-explosion-draw (60000) | 15 + 1 (wrong cover) | 5 / 5, outcome 3 both | 30 s |
| R034 Role Play Own Tempo cures confusion | R034-role-play-own-tempo-cures-confusion (90000) | 1 | 13 / 13 | 33 s |
| R036 AI Roar after Ghost Curse | R036-roar-after-ghost-curse-evasion (90000) | 1 | 17 / 17 | 35 s |
| R041 AI Pain Split, speed tie | R041-pain-split-speed-tie (90000) | 1 | 24 / 24 | 42 s |
| R042 AI Psych Up | R042-cradily-ancientpower-psych-up (91003) | 4 | 62 / 62 | 57 s |
| R043 AI Superpower, speed tie | R043-superpower-speed-tie (91000) | 1 | 10 / 10 | 33 s |
| R044 AI Swagger, Psych Up branch | R044-superpower-atk-minus3-swagger (90000) | 1 | 22 / 22 | 44 s |
| R045 AI Encore / Disable, speed tie | R045-encore-disable-speed-tie (90000) | 1 | 32 / 32 | 45 s |
| R046 AI Scary Face vs Speed Boost | R046-scary-face-vs-speed-boost (91000) | 1 | 17 / 17 | 41 s |
| R047 AI Roar after Leech Seed | R047-roar-after-leech-seed-accuracy-down (90001) | 2 | 29 / 29 | 43 s |
| R048 AI Roar after Toxic | R048-roar-after-toxic-accuracy-down (91000) | 1 | 25 / 25 | 43 s |

More design mistakes fixed on the way (staging only):

- R028: the cover marker was the `throw new` of `mapFactoryBattleOutcome` (an engine stop, class (b)); the 15 seeds all ran the
  draw (outcome 3) and "failed" the marker. The marker is now `return "draw"` (the DREW arm); seed 60000 matches.
- R034: eight cover entries, five of them with one label; cut to the last one (the Own Tempo cure branch,
  `const curedBattler`), which is the rule. R045: six entries in three same-label pairs; cut to the first two. R041 / R043 /
  R045 mark the shared speed-tie draw in `runAiTargetFaster`-style code, so one stage proves the tie draw for the others too.
- R042, R044: of the three or four markers, the Psych Up `-2` roll arm (R042) and the weather ternary arm (R044) did not run in
  the matching battle; the markers that are the rule did (`coverAny`). Those two arms are still not covered.

**R019 (Focus Energy twice) cannot occur, class (b)**: `battle_scripts_1.s:889` jumps to `BattleScript_ButItFailed` when
`STATUS2_FOCUS_ENERGY` is set, before `setfocusenergy` (`:890`); the already-set branch of `Cmd_setfocusenergy` is dead code
(written in `rule-coverage.md`; 20 Mac seeds and 10 of mine never had it). Design removed from `on-hold/designs/`.

Left in `on-hold/designs/` (updated `onHold`):

- **R030** (Curse as the last move, AI replacement damage pass): 44 lab seeds (60000..60043), no hit; the engine battle runs fine.
  In seed 60019 Dugtrio is poisoned but kills Snorlax in two Earthquakes before it faints, so no Curse user is left for the
  replacement. The design needs a sturdier Curse user or faster poison.
- **R039** (AI Memento markers `-10` / `-8`): 80 lab seeds (90000..90079), no hit, no engine error. In seed 90079 Granbull
  (157 HP) is knocked out by Weezing in three turns, before its Sp. Atk reaches -6; the design needs a sturdier Overheat user.
- **R032, R037, R038** (chance 0.01 to 0.02, 200 seeds each): not tried; at 15 s a seed each is about 50 minutes.

## Box hunt 2026-11-14 (rrh2): hunter fixes, source checks, eleven new designs

Evidence under `.integration/evidence/rrh2/` (git-ignored; designs in `designs/`, hunt logs in `chunt/`, clean re-drives in `redrive/`).

**Hunter fixes (commit 3618fe534).** `prehunt.py`: each `cover` entry is judged on its own marker (key `ran:{i}:file:text[at:at+30]`), so a
`coverAny false` stage needs every entry to run. `huntq.py`: `--max-seeds N` and `--out DIR`; tags REJECTED and DESIGN-ERROR (after three
"is not legal" errors). New `designcheck.py`: rejects a design whose `replacements` names a slot twice, more than two, or lead 0 without a
switch, a `cover` snippet that does not occur exactly once, and a cover marker on a `throw` line. Demonstrated on a doctored design
(`demo-bad.json`, `demo-designcheck.txt`): huntq rejected it without spending a seed. `sets.py` (commit f40bc7aed): `python3
tools/replay-hunt/sets.py "EXPR over m"` queries the Factory sets on the box.

**Source checks** (full lines in `rule-coverage.md`): R029, R031, R033 are class (b) (dead code or unreachable in singles, decomp file:line given);
R035 and R040 stay (c) but are not stageable cheaply (no Taunt set from id 267 up; Mechanic Lab is ROM-only).

**New stages: twelve rules, eleven files, all match the ROM, every cover entry run (R054: `coverAny`, see below).** Each was re-driven once
more from a clean command line (`romReplayWide.sh --stage`, `nice -n 19`, one at a time): `match True`, `stage.ok True`, outcome
engine = ROM.

| rule | stage file (lab seed) | lab seeds tried | states matched / decisions | outcome |
|---|---|---|---|---|
| R054 Natural Cure, sleeper switched in | R054-natural-cure-sleeper-switch (91017) | 18 (final design; 18 + 25 in two earlier designs, no hit) | 24 / 24 | 2 / 2 |
| R060 Choice Band, Future Sight | R060-choice-band-future-sight (90000) | 1 | 17 / 17 | 2 / 2 |
| R066 Focus Band, OHKO | R066-focus-band-ohko (90011) | 12 | 54 / 54 | 1 / 1 |
| R070 Guts (Kadabra), Future Sight | R070-kadabra-guts-future-sight (90000) | 1 (final design; the first design's lab setup failed, a second matched with entry 0 only) | 26 / 26 | 1 / 1 |
| R074 Hustle (Kadabra), Future Sight | R074-kadabra-hustle-future-sight (91000) | 1 | 26 / 26 | 2 / 2 |
| R084 Plus (Kadabra), Future Sight | R084-kadabra-plus-future-sight (91000) | 1 (final design; an earlier one matched with entry 0 only) | 33 / 33 | 2 / 2 |
| R087 + R089 Sleep Talk, Encore | R089-sleep-talk-encore (90005) | 6 (final design; 14 + more in earlier ones, no hit) | 78 / 78 | 1 / 1 |
| R088 Sleep Talk, Choice Band | R088-sleep-talk-choice-band (90005) | 6 (final design; v1 swapped the band back) | 53 / 53 | 1 / 1 |
| R092 Covet vs Sticky Hold | R092-covet-sticky-hold (93000) | 1 | 30 / 26 | 2 / 2 |
| R093 Knock Off vs Sticky Hold, no item | R093-knock-off-sticky-hold-no-item (90006) | 7 (the first design's lab setup failed on every seed: two sets outside the challenge range) | 20 / 20 | 2 / 2 |
| R102 White Herb through Baton Pass | R102-white-herb-baton-pass (90000) | 1 | 75 / 75 | 2 / 2 |

R054's design makes `gLastLandedMoves` hold `MOVE_UNAVAILABLE` (a failed Fake Out) so `ShouldSwitchIfNaturalCure` reads the move
table at 0xFFFF; the marker that ran is the `?? 0` arm in `factoryAiSwitchPolicy.ts`. The engine returns 0 for the missing move, and the
ROM's row matched anyway in this seed, so that read produces no visible difference here. The two other markers did not run (`coverAny`).
(An "already asleep" Lovely Kiss does NOT set `MOVE_UNAVAILABLE`; version two spent 25 seeds on that.)

**No engine / ROM difference was found; there is no `stages/coverage/pending/`.** No engine error either, other than the stall below.

**Design mistakes (staging only), for the next hunter:**

- A species on both sides makes the lab setup fail on every seed (R070 v1: Machoke on both teams). `designcheck.py` does not check this yet.
- A stall battle (two mons that cannot hurt each other) hits the ROM frame cap (~80000 frames, about 115+ states): the result is
  "class state" with the ROM stopping early. That is not an engine difference. R080 (Marvel Scale, Milotic Recover against Struggle) hit
  its marker on every seed and stalled on every seed; parked, no stage. R054 v1 (Chansey) stalled the same way ("frame budget").
- The first cover entry alone matching is not enough when `coverAny` is false: R070 and R084 matched with only entry 0 run; the scripts
  were reordered so the boost branch is exercised.
- A census opponent can undo a Trick (R088 v1 swapped the Choice Band back): script the move after the Trick.
- A `?? 0` marker only counts when the right-hand side runs.
- `timeout 520 huntq.py ...` over too many seeds is killed at the 9-minute foreground limit with no output; split into fewer seeds
  and designs per command (`--max-seeds`).

**Not designed or not finished:** R068 (no freeze move in the lab at challenges 0 and 1), R081, R097, R107, R110 (too convoluted for
the time), R106 (probably unreachable; not tested), R080 (above), R099 (not stageable, below). R030, R032, R037, R038, R039 were skipped
by the brief. Counts after rrh2: 49 of the 110 covered; R019, R029, R031, R033 class (b); 57 left.
Read and dropped late: R077 (Regice is the only Sleep Talk user with an Electric move, and its Chesto Berry cures any sleep at once), R099 (Uproar users in range have Vital Spirit, which blocks Yawn itself), R105, R067, R097 (too many steps).

## Box hunt 2026-11-14 (rrh3): one more rule covered, hunter checks, the R054 out-of-bounds read

Evidence under `.integration/evidence/rrh3/` (git-ignored; designs in `designs/`, hunt logs in `chunt/`, clean re-drive in `redrive/`,
`stall-warning-demo.txt`, `designcheck-dup-item.txt`).

**Hunter fixes (commit a4d2b54c9).** `designcheck.py` now also refuses a set id outside the challenge's range, a species twice on one side or
on both sides, and a held item twice on one side (each makes the lab setup fail on every seed; rrh3's first R095 design lost a hunt to a
duplicate Lum Berry). Checked: no false positive on the 50 promoted stage files; the doctored design is rejected
(`designcheck-dup-item.txt`). `prehunt.py` prints `STALL-WARNING` when an engine battle hits the frame budget or has 100 or more decisions
(`PREHUNT_STALL_DECISIONS`) and when the ROM drive matched fewer states than the engine ran; `STALL-ABORT` after three stalled seeds.
Demonstrated on the R076 design with the threshold lowered to 50 (`stall-warning-demo.txt`: seed 90001, 81 decisions, warning printed,
drive then matched 81 / 81).

**New stage: one rule, matches the ROM.** Re-driven once more from a clean command line (`romReplayWide.sh --stage`, `nice -n 19`):
`match True`, `stage.ok True`.

| rule | stage file (lab seed) | lab seeds tried | states matched / decisions | outcome |
|---|---|---|---|---|
| R076 Hi Jump Kick miss against a Ghost: crash damage floor of 1 | R076-hi-jump-kick-miss-ghost (90001) | 2 (design v1: 12 seeds, no hit; v2 hit on the second seed) | 81 / 81 | match |

R076 v1 (Medicham against Gengar) never reached the marker: Gengar's Hypnosis, Confuse Ray and Attract and its speed left Medicham asleep,
confused or fainted within about four turns. v2 uses Challenge 7 and a slow Dusclops lead (476: Toxic, Confuse Ray, Double Team, Protect) that
cannot hurt Medicham quickly, so Hi Jump Kick is used for many turns and a miss takes the `damage = 1` floor.

**Not covered; outcomes of this batch.**

| rule | outcome |
|---|---|
| R095 Trace waiting, no foe to copy | 10 seeds, marker never ran (battles of 5 to 7 decisions). **Not proven unreachable:** `HandleFaintedMonActions` (`battle_util.c:1894-1985`) runs state 4 for every fainted battler, then state 6 (Trace) without looping again, so a foe replacement that faints on entering (Spikes on a damaged bench mon) leaves the player's new Trace holder with no foe at state 6. The rule text's own route (Pursuit user dies of Rough Skin on the last Pokemon) ends the battle first: `BattleScript_HandleFaintedMon` (`battle_scripts_1.s:2830-2832`) stops on `gBattleOutcome`. Stays (c). |
| R109 Curse tick ends the battle | two designs (Dugtrio, Medicham, Dusclops 666 against three opponent orders), 14 seeds each, marker never ran. The last foe must be at 25% or less at the cast turn; a lottery over `random-v1`. Not found. |
| R099 Uproar keeps a Yawn drowsy | not stageable: Uproar users in range (Vigoroth 221) have Vital Spirit, which blocks Yawn on the user; the alternative (Yawner faints after Yawn, Vigoroth uproars on the next turn) needs a Wartortle that dies to a slow Lickitung in one hit. Dropped. |
| Metronome-only rules, R030, R032, R035, R037-R040, R067, R068, R080, R081, R097, R103, R105-R108, R110 | not attempted (no steer; seed lottery of about 15 s per seed at under 1% per rule, or skipped by the brief or already read as not cheaply stageable). |

**No engine / ROM difference was found; no engine error either; there is no `stages/coverage/pending/`.**

**R054 note: what the ROM reads at `gBattleMoves[MOVE_UNAVAILABLE]`.** C: `ShouldSwitchIfNaturalCure` (`battle_ai_switch_items.c:218-256`):
when `gLastLandedMoves` is `MOVE_NONE` or `MOVE_UNAVAILABLE` (0xFFFF) and `Random() & 1` is 0, the `else if` at `:235` reads
`gBattleMoves[0xFFFF].power`. `gBattleMoves` is at 0x0831C898 (`pokeemerald.map`), the entry is 12 bytes (`power` is byte 1), so the read is at
0x0831C898 + 0xFFFF * 12 + 1 = 0x083DC88D, inside the Navel Rock metatile data (`gMetatiles_NavelRock` 0x083DB5A0 up to
`gMetatileAttributes_NavelRock` 0x083DD1D0). In the pinned ROM (`reference-artifacts/pokeemerald.gba`, SHA-1 f3ae088181bf583e55daf962a92bb46f4f1d07b7,
identical to the vendor copy) the 12 bytes there are `00 00 00 00 6b 72 e9 72 7b 72 f9 72`: effect 0, **power 0**. A ROM does not change at
run time and the tileset is not moved, so the read is always 0, and the engine's `?? 0` returns 0. Same value, same `Random() & 1` that
follows, so no Factory battle can make the difference matter. `gLastLandedMoves[target]` becomes `MOVE_UNAVAILABLE` at
`battle_script_commands.c:4433` whenever a move that hit the target did not land (a miss, or `MOVE_RESULT_NO_EFFECT`); for an AI Natural Cure
sleeper at half HP or more the read is reachable (it is what the R054 stage runs). Report only; no `src/` change.

**Counts after rrh3: 50 of the 110 covered; R019, R029, R031, R033 class (b); 56 left.**

**Design mistakes for the next hunter:** (1) a slow, non-disabling lead matters more than the type: Gengar's status moves ended R076 v1;
(2) `prehunt.py` gives no hint that a cover marker needs a battle longer than the design's; R095 ended in 5 to 7 decisions every seed;
(3) the script's `then random-v1` makes a multi-mon plan a lottery (R109); a plan that needs a specific mon to act at a specific turn needs
`switch` actions.

**Brief conflict:** the brief asks for "npm test and npm run build green" and also forbids npm test / typecheck / build. Only `docs/` and
`tools/replay-hunt/` (Python) changed, so no test or build was run.

## Box hunt 2026-11-16 (rrh4): three set-up rules covered, two class moves, no engine difference

Evidence under `.integration/evidence/rrh4/` (git-ignored; designs in `designs/`, hunt logs in `chunt/`, clean re-drives in `redrive/`).
No `src/` change, no hunter change. Hunt: `huntq.py` with one job, `nice -n 19`, `--max-seeds` 3 to 12. Each stage was re-driven once more from a
clean command line (`REPLAY_OUT=<abs> tools/audio/romReplayWide.sh --stage FILE`): `match True`, `stage.ok True`, outcome engine = ROM = 2.

| rule | stage file (lab seed) | lab seeds tried | states matched / decisions | outcome |
|---|---|---|---|---|
| R108 Torment on a Choice Band holder: forced Struggle cancelled when the second mover is already dead | R108-torment-choice-band-explosion (90000) | 1 | 6 / 6 | match |
| R105 a Traced Water Veil blocks a Synchronize burn (`preventionCall` message arm) | R105-trace-water-veil-synchronize-burn (90002) | 3 (90000 and 90001 did not run the marker) | 14 / 14 | match |
| R077 Sleep Talk calls Thunderbolt against a Lightning Rod foe | R077-sleep-talk-thunderbolt-lightning-rod (90004) | 11 (v1: 6, none; v2: 5, hit on the fifth) | 17 / 17 | match |

**Designs.** R108 (challenge 7, trainer 200): player Mr. Mime 572 (faster) Torments the foe's Choice Band Granbull 664, is knocked out by the
locked move, Weezing 597 replaces it and Explodes before Granbull, which has no usable move and is forced to Struggle but is already dead
(`keepNoValidMovesOfCancelledStruggle`). R105: the foe's Gardevoir 813 (Trace) copies Water Veil from the player's lead Wailord 429, the player switches to Alakazam 404
(Synchronize), Gardevoir burns it and Synchronize tries to pass the burn back (`seteffectprimary`), which Water Veil prevents; the six markers are the `preventionCall` arms in `battleScriptHitChainOpcode.ts`. R077:
player Regice 839 (Chesto Berry) against Gardevoir 437 (Hypnosis), then Manectric 393 / Rhydon 403 (Lightning Rod): the first Hypnosis is cured and
uses up the Chesto Berry, the second leaves Regice asleep, Sleep Talk then calls Thunderbolt against the Lightning Rod foe.

**Class moves (read against the decomp, details in `rule-coverage.md`, "Box hunt rrh4").** R065 (Eruption / Water Spout keep an already-set
base power) is class (b): `BattleScript_EffectEruption` has `scaledamagebyhealthratio` as its first command and `gDynamicBasePower` is 0 at every
action start (`battle_main.c:4928`, `battle_util.c:678`). R069 (Ghost Curse aimed at the user) is class (a): only the player menu aims Curse at the
user (`battle_controller_player.c:485-498`), the user must turn Ghost before it moves, and the only route (Color Change, Kecleon 220 / 325 in challenges
1 and 2) never meets a non-Ghost Curse set (458 and up).

**Not covered.**

| rule | outcome |
|---|---|
| R103 cure berry at the end of the turn on a Pursuit user | not stageable cheaply: no Pursuit set holds a cure berry and no set has Trick and Pursuit; needs a Trick chain across both teams plus the AI's Pursuit on the right switch. Stays (c). |
| R083 Own Tempo after Thrash | not stageable cheaply: Own Tempo would have to come from Alakazam 596 / Gengar 613 Skill Swapping twice (first with an Own Tempo foe, then with the thrasher), the Choice Band needs a Trick first, and the AI has to pick Thrash. Stays (c). |
| R073 Hidden Power skips ??? | the only Hidden Power set (Unown 126) is refused by the lab ("Factory forbids" Unown, `battle_lab.py:1604`); design failed on every seed (lab setup failed). Metronome only. Stays (c). |
| R019 (listed in `rule-coverage-c-rules.json`) | already class (b) since rrh1 (`battle_scripts_1.s:889`); a design and three seeds were spent before this was noticed (the marker never ran, as the source says). |
| R099 / R090 / R104 (Uproar) | not stageable without a Metronome Uproar (Vigoroth 221 is Vital Spirit, the Yawn / Soundproof / Effect Spore users never share a battle with it); same finding as rrh3. |
| the Metronome rules (R049-R053, R055-R064, R071, R072, R075, R078, R079, R082, R085, R086, R091, R094, R096, R098, R100, R101) | not attempted: a seed lottery, not a set-up; the luck designs of luck1 are the lane for those. |

**No engine / ROM difference was found; no engine error either; there is no `stages/coverage/pending/` and nothing under `.integration/evidence/rrh4/`
that needs a decision.**

**Counts after rrh4: 53 of the 110 covered; R019, R029, R031, R033, R065 class (b); R069 class (a); 51 left.**

**Counts after luck2 (2026-11-17, the luck-hunt day job, day 1): 59 of the 110 covered (+ R032, R037, R038, R097, R107, R109; stage files in `stages/coverage/`, each re-driven to a full ROM match); 45 left (`rule-coverage.md` "Luck hunt day 1 (luck2)").**

**Design mistakes for the next hunter:** (1) `cover` `at` is a character offset into the snippet and the innermost V8 range decides: a snippet that
starts at the `?` of a ternary lands in the parent range, so a branch that really ran reads as not run (R019 at offset 0; the other markers here
start inside the branch). (2) Check `rule-coverage.md` for class moves before picking a rule from `rule-coverage-c-rules.json`: its list is the
first-pass one (R019, R029, R031, R033 are already class (b)). (3) Rest at full HP fails, and a Chesto Berry cures Rest and any sleep at once: the
R077 first design (Breloom, Focus Punch killed Regice on turn 1) was dead before the berry mattered; the second used a Hypnosis lead that does
not kill. (4) `huntq.py` skips a stage whose `name` already has a log ("done before"); rename or delete the log to re-hunt a changed design, and
the output sits in `<out>/chunt/` when `--out` already ends in `chunt`.
