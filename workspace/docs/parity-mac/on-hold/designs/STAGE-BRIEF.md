# Brief: design staged Factory battles that run a given piece of battle-rule code

Project: a TypeScript re-implementation of Pokemon Emerald's Battle Factory (Level 50, singles). Each battle is replayed on the
real ROM and compared turn by turn. A list of battle-rule pieces has never been run by any battle that matched the ROM. Your job:
for each rule in your group, write a **stage file**: a battle with real Factory sets and a written script for the player's
actions, built so that the rule's code runs with a good chance. A hunter then drives the stage with many lab seeds (each seed
changes the random numbers, the opponent's AI choices and the opponent's ability slot for two-ability species), screens each seed
on the engine (did the code run?), and drives the hits on the ROM.

READ ONLY except your own output directory: do not edit any repository file, do not run git, do not run the game, the lab or any
batch. You may run `python3`, `grep`, `sed -n`.

## Paths

- ENGINE: `<repo>/workspace/.worktrees/parity-mac/workspace/src/engine/`
- REF (the game's C source): `<repo>/workspace/.worktrees/parity-mac/workspace/reference/pokeemerald/`
  (`src/battle_script_commands.c`, `src/battle_util.c`, `src/battle_main.c`, `data/battle_scripts_1.s`, `data/battle_ai_scripts.s`,
  `src/battle_ai_script_commands.c`, `src/battle_ai_switch_items.c`)
- Facts about the pool (read first): `<scratchpad>/p5/cov/pool-facts.md`
- Sets helper: `cd <scratchpad>/p4 && python3 sets.py "EXPR over m"`
  (m.index, m.sp species, m.moves, m.item, m.ab abilities, m.ty types, m.spe base speed, m.eff move effects, m.he hold effect,
  m.gr gender ratio, m.ch = the 0-based challenge numbers whose range holds the set). Inside the expression `moves` is the move
  table: `moves['MOVE_X']['type']`, `['power']`, `['effect']`.
- The rules: `<scratchpad>/p5/cov/crules.json`
  (each: `id`, `rule`, `freq`, `how` = what a battle needs, `reason`, `pieces` = the code: file, function, line, `cover` = the marker
  the hunter checks, `body` = the code text). Read the engine code around each piece and the C it ports before you design.
- Examples of stage files that worked: `<repo>/workspace/.worktrees/parity-mac/workspace/docs/parity-mac/stages/*.json`
  (for instance `metronome-camouflage.json`, `magic-coat-pressure.json`, `noland-foresight-ghost.json`).

## The stage file

    {
     "name": "R018-endure-fixed-damage",                 // the rule id first; lowercase, digits and dashes
     "rules": ["R018"],                                   // the rule ids this stage is for
     "why": "plain sentences: who does what, and why the code runs",
     "seed": 0,                                           // the hunter sets it
     "challengeNum": 2, "battleNum": 0, "trainerId": 100,
     "playerSetIds": [a, b, c], "opponentSetIds": [d, e, f],
     "script": {"actions": [ {"prefer": 1}, {"switch": 2}, ... ], "then": "census"},
     "expect": [],                                        // optional tally rows (leave empty unless sure)
     "cover": [ <the rule's cover objects, copied exactly from crules.json> ],
     "coverAny": true,
     "chance": 0.1,                                       // your rough estimate: share of seeds whose engine battle runs the code
     "seeds": 80                                          // how many lab seeds the hunter should try (at most 200)
    }

Rules of the lab and the replay (a stage that breaks them is refused):

- `challengeNum` is 0..7 (0-based). Both sides' sets come from that challenge's range: 0: 110..199, 1: 162..266, 2: 267..371,
  3: 372..467, 4: 468..563, 5: 564..659, 6: 660..755, 7: 372..849. Use the `ch` of a set (`7 in m.ch`, ...).
- `trainerId`: 0 for challenge 0, 80 for 1, 100 for 2, 120 for 3, 140 for 4, 160 for 5, 180 for 6, 200 for 7. `battleNum` 0.
- Three sets per side. No species twice and no held item twice on one side; do not use a species on both sides either.
- The trainer AI chooses the opponent's moves; which scripts it runs depends on the challenge (facts file, "Which sets meet which AI
  script"; at challenges 0 and 1 the AI picks among its moves at random). The opponent's first Pokemon is opponentSetIds[0]; its
  replacements are chosen by the game's AI (the one that does best against the player's Pokemon on the field).
- The opponent switches by itself only in a few AI cases. Plan with what the player controls.
- Player script, one step per turn the player is asked to act (a turn where the player's Pokemon is locked, recharging or
  charging is not asked): `{"move": slot}` (0..3; the battle stops with an error if the slot is not usable that turn: prefer
  `prefer`), `{"prefer": slot}` (use it if offered, else the `then` player decides that turn), `{"switch": partySlot}` (party slot =
  0, 1, 2 in playerSetIds order; error if not offered), `{"preferSwitch": partySlot}` (switch if offered, else `then`).
  `"replacements": [partySlot, ...]` optional: who comes in after each faint (else the `then` player chooses). `"then"`:
  `census` (least-used legal move, never switches), `random-v1` (random legal actions and switches) or `ai-v1` (the game's AI
  playing the player's side) for the turns after the list.
- The battle lasts until one side has no Pokemon. Keep the script short where the rule happens early.
- A move that no set has can still happen when the AI's or the player's Metronome (Chansey 227 at challenge 1, Clefable 389 at 3
  and 7) calls it: about 1 in 340 per call per move, so only if nothing else works (say so in `chance`).

## What to write

Into your output directory (given in your task), one stage file per rule (two variants only if one cannot cover it well), and one
`notes.json`:

    {"group": "...", "rules": [ {"id": "R018", "stages": ["R018-endure-fixed-damage"], "chance": 0.1,
                                 "comment": "one line"},
                                {"id": "R024", "stages": [], "notStageable": "why the lab cannot stage it with real sets and
                                 what it would need (for example the Mechanic Lab with a custom party), or why the rule is in fact
                                 impossible (with the source line)"} ]}

Check your sets with the helper (range, species and items unique on each side, the moves you rely on really in the sets). Prefer a
design where the player's own actions make the situation happen and the random part is small. Keep your final reply short: how
many stage files, which rules have none and why.
