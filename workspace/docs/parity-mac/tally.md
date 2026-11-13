# The tally: what really took effect in battles that matched the ROM (fourth pass)

Tool: `tools/audio/romReplayTally.py DIR [DIR ...] [--out tally.json] [--md tally.md] [--zero]`.
Input: the `*.facts.json.gz` file that `tools/audio/romReplayWide.sh` writes for every **matching** battle (decisions, the
wide state at every decision, every turn's events with the script label each event came from).

A row counts only what the engine did in a battle whose every turn state, every wide state and winner agreed with the
ROM. So a counted effect is one the ROM did too. "Named in the source" and "printed a message" are not counted.

## Rows

The Level 50 pool is the Frontier sets 110..849 (`src/data/gen/battle-frontier-mons.json`).

| kind | rows | covered when |
|---|---|---|
| `move:EFFECT_X` | every move effect of a move in the pool (166) | the move was used and its span has no miss / failure / immunity message (`worked`); for an effect with an added effect (the table `SECONDARY` in the tool: paralysis, burn, freeze, poison, confusion, flinch, stat changes by a hit) the added effect itself must have been applied |
| `ability:ABILITY_X` | every ability a pool species can have (71) | the ability's own script ran (the label table `ABILITY_LABELS`), or, for an ability that only changes a number or a roll, the situation in which it does occurred (below) |
| `hold:HOLD_EFFECT_X` | every hold effect in the pool (39) | the item's script ran (credited to the item the Pokemon held), or the situation in which the item changes a number or a roll occurred |
| `situation:...` | switches, traps, refusals, statuses with their per-turn step, weather, screens, outcomes (107) | the script label, decision or state named by the row |

The tool prints three numbers for a move row: `used`, `worked`, and the covering count.

### Abilities and items that only change a number or a roll

These have no script of their own. The row is covered by the situation in which the game applies them, in a battle
whose resulting numbers (HP, the RNG stream, the wide state) matched the ROM:

| row | situation counted |
|---|---|
| Battle Armor, Shell Armor | the holder took damage from a move (the critical-hit roll is skipped, which shifts the RNG stream) |
| Huge Power, Pure Power, Hustle | the holder dealt damage with a physical-type move; Hustle also on any accuracy check of one |
| Guts / Marvel Scale | the holder had a status and dealt / took physical damage |
| Overgrow, Blaze, Torrent, Swarm | the holder was at a third of its HP or less and dealt damage with a move of that type |
| Thick Fat | the holder took damage from a Fire or Ice move |
| Serene Grace / Shield Dust | the holder landed / took a hit that has an added-effect chance |
| Limber, Immunity, Water Veil, Magma Armor, Own Tempo, Inner Focus | the holder took a hit whose added effect the ability blocks without a message (they also have script rows) |
| Rock Head | the holder landed a recoil move and no recoil followed |
| Compound Eyes / Sand Veil / Bright Powder, Lax Incense | an accuracy check with the holder as user / as target in a sandstorm / as target |
| Pressure | the other Pokemon used a move aimed at the holder |
| Swift Swim, Chlorophyll | the holder moved in a turn with its weather in which both Pokemon used a move |
| Cloud Nine | the holder was on the field while a weather was up |
| Early Bird | the holder was asleep at its move |
| Natural Cure | the holder left the field with a status |
| Levitate | a Ground move at the holder gave the "makes Ground moves miss" line |
| Shadow Tag, Arena Trap, Magnet Pull | a refusal probe: the engine offered no switch for that reason and the ROM refused the switch |
| type-boosting items, Choice Band, Thick Club, Stick, Scope Lens, Deep Sea Scale | the holder (of the right species where the item needs one) landed / took a damaging hit of the matching kind; Choice Band also by a refused move probe |
| King's Rock | the target flinched after a hit by the holder with a move that has no flinch effect |
| Quick Claw | the holder moved first in a turn although its speed was lower and the priorities were equal |

### Rows with no effect in a Factory singles battle

Shown with their reason instead of a count:

- Illuminate, Stench (field abilities), Run Away (wild battles), Pickup (after a wild battle), Plus / Minus (need the
  partner in doubles), Lightning Rod (redirects in doubles only).
- Helping Hand: `Cmd_trysethelpinghand` (`battle_script_commands.c:9170-9186`) needs `BATTLE_TYPE_DOUBLE`; in singles
  the move always fails (it is used and fails in the batches).
- Return: no Factory Pokemon has it. `SetMonMoveAvoidReturn` (`battle_factory.c:913`) writes Frustration instead at
  every place a Factory Pokemon is made (`:461` rentals, `:501` opponents, `:822` Noland). The row is in the list
  because the set table names Return.
- Hidden Power: the only Level 50 set with it is Unown (set 126), and the Factory never hands out Unown: the three
  places that draw a Factory Pokemon skip it (`battle_factory.c:337` opponents, `:562` rentals, `:781` Noland).
- Snatch stealing a move: Snatch can never run. No Level 50 set has it; Metronome may not call it
  (`sMovesForbiddenToCopy`, `battle_script_commands.c:725-747`, read by `Cmd_metronome` `:7898-7921`); no set has
  Mirror Move, Assist or Mimic, and what those could copy after a Metronome call is a move that ran, so never Snatch.
- "Torment blocks the chosen move" at move use: the script `BattleScript_MoveUsedIsTormented`
  (`battle_scripts_1.s:3567`) is referenced by no C code (only declared, `include/battle_scripts.h:81`). Torment acts
  at move selection only (`battle_util.c:999-1012`); that is the row `move-refused:torment`.

## Limits

- Counts are "at least": two activations of one script back to back in one turn count once.
- The start-of-battle entry abilities are before the first recorded turn; Intimidate and Trace are read from the first
  wide state.
- The move span ends at the next move or at the first end-of-turn script; a message that belongs to an ability's own
  script inside a span still fails the move (that is how the game shows it).
- A forced Struggle is counted from the move itself (no set has Struggle, so a Struggle that ran is a forced one). The
  engine does not play the game's "has no moves left" line (a known presentation gap, `STATUS.md`), so that line
  cannot be the evidence.
- A staged battle names its rows in `expect` and is checked against this same tally (`staged-battles.md`).
