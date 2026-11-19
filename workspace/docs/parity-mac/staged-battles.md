# Staged battles of the real-ROM replay (fourth pass)

Not a battle-rule fix. Batches of generated battles reach what a player and the AI happen to do. A rule that needs a
rare team or a rare sequence of actions is reached by a staged battle instead: the teams and the player's actions are
written down, everything else is the ordinary replay.

## What a staged battle is

- **Real Factory sets and a real Factory trainer**, chosen by hand, staged by the lab's own `factoryLegal` mode (or
  `factoryBrain`: the player's sets are chosen, Noland's party is rolled by the ROM from the seed). No Pokemon is built
  by hand, so the engine side goes through the same production path as every other replay (it adopts the ROM's dice and
  checks what it derives against the ROM read-back).
- **A written script** for the player (`script` player in `tools/integration/romReplayPlayers.ts`): one step per turn,
  `{"move": slot}` or `{"switch": partySlot}`, with optional refusal probes `{"probeSwitch": partySlot}` /
  `{"probeMove": slot}` before it; `replacements` for forced replacements; `then` names the player that takes over when
  the list ends (default `census`). A written step the engine does not offer stops the replay with an error: a staging
  is never bent into something else.
- **The same compare**: every turn state, every wide state, the winner.
- **`expect`**: the tally rows the battle exists for. The summary has `stage.ok` only when the battle matches the ROM
  and every expected row is in the tally of this very battle. A staged battle that matches but did not do what it was
  written for does not count.

## Files and commands

A stage file (kept in `docs/parity-mac/stages/`, so every staged row can be driven again):

    { "name": "...", "why": "...", "seed": 20276, "challengeNum": 5, "battleNum": 0, "trainerId": 165,
      "playerSetIds": [655, 576, 619], "opponentSetIds": [567, 636, 654],
      "script": { "actions": [{"move": 0}, {"switch": 1}], "replacements": [2], "then": "census" },
      "expect": ["situation:switch:voluntary"] }

    REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh --stage docs/parity-mac/stages/NAME.json

The lab accepts only teams the Factory could hand out (no repeated species or held item on a side; sets of the
challenge's range). The opponent's moves are still chosen by the game's AI and the ROM's RNG, so a staging usually
needs a few seeds until the wanted situation happens; `expect` says when it did.

## The scripted player's steps

- `{"move": slot}` / `{"switch": partySlot}`: the action of that turn. The replay stops with an error when the engine
  does not offer it.
- `{"prefer": slot}`: the move when the engine offers it; else this turn goes to the `then` player and the list goes
  on. For a staging whose move the other side can take away (Pressure, Disable, Torment, a copied move set).
- `"probeSwitch"` / `"probeMove"` before a step: a refusal probe.

## The Metronome sweep

Two Level 50 sets have Metronome (Chansey 227, Clefable 389). 31 move effects, and several situations (Mist, Imprison,
Rage, Transform, Lock-On), are reached only when Metronome calls the move. The sweep is 497 staged battles made by a
script (not kept in the repo; the ones that found something are in `stages/`): 220 with the player's Chansey using
Metronome until its ten PP are gone, 110 with Clefable at the fourth challenge, 167 with the opponent's Chansey against
a player Pokemon that shares a move with it (so that Imprison can seal it; the random player probes). It found fixes 36
to 40.

## Fifth pass: the last zero rows

Six stage files fill what the fourth pass left at zero. Each was found by driving one staging with many lab seeds,
then driven again from the repo file (match, expected rows present).

| stage file | lab seed | what happens | rows |
|---|---|---|---|
| `imprison.json` | 70080 | the opponent's Chansey 227 calls Imprison through Metronome; the player's Graveler 166 has Defense Curl, as Chansey has | `move-refused:imprison`, `volatile:imprison:blocks-chosen-move` |
| `rage-builds.json` | 71118 | Chansey calls Rage and moves first; the player's slower Parasect 177 hits it in the same turn | `volatile:rage:builds` |
| `metronome-twister-flinch.json` | 70107 | Chansey calls Twister, moves first, the player's Pokemon flinches | `move:EFFECT_TWISTER` (the flinch) |
| `metronome-camouflage.json` | 77050 | Chansey is made a Psychic type first (Color Change moved to it by two Skill Swaps, then Psybeam); its Metronome calls Camouflage, which gives the Normal type back | `move:EFFECT_CAMOUFLAGE` |
| `magic-coat-pressure.json` | 73000 | Kecleon 220 reflects the Sleep Powder of a Venomoth that took Pressure by Skill Swap | `volatile:magic-coat:bounces-under-pressure` |
| `metronome-magic-coat-pressure.json` | 76026 | Clefable 389 calls Magic Coat through Metronome and reflects the Will-O-Wisp of Dusclops 378 (Pressure) | the same row |

How they were found:

- **Two shapes of 160 staged battles each** (made by a script, not kept in the repo): the opponent's Chansey against a
  slower player Pokemon that keeps using Defense Curl (Imprison, Twister), and against a slower player Pokemon that
  attacks every turn (Rage). All 320 match the ROM; five needed the long frame caps.
- **A cheaper hunt for the rarest ones** (Camouflage; Magic Coat called by Metronome): per lab seed only the request,
  the ROM's setup and the engine's replay are run (about 8 seconds), and the stage's `expect` rows are looked for in
  the engine's own events. Only a seed whose engine battle has the rows is driven on the ROM. Camouflage took 51 seeds
  of one staging and 55 of a variant; Magic Coat by Metronome took 27.
- Why Camouflage needs the detour, and what the game does with the PP when Magic Coat meets Pressure: `tally.md`,
  `party-pp-writes.md`.

## Stage parties (rrh5)

A stage may carry `parties: { player: [3 members], opponent: [3 members] }`, handed to the oracle as Mechanic Lab `overrides.parties` (`mode: "mechanicLab"`).
Each member is the lab's full record (species, level, nature, ivs, evs, moves, ppUps, item, abilitySlot, friendship, gender, personality). The engine replay
(`applyStageParties` in `tools/integration/soundCensusRomReplay.ts`) rebuilds the members as Factory-row-shaped records, so:

- `level` must be 50 (the replay throws for any other level; the engine rebuilds every member at Level 50).
- EVs must be the engine split: `floor(510 / n)` on each of the n flagged stats, 0 elsewhere (otherwise it throws).
- `item` must be in the Frontier held-item table.
- An opponent without a `personality` gets a cursor-reachable one with the right nature, ability slot (low bit) and gender (looked up by species id from `species-stats.json`).
- Species ids are the internal ones (Spinda 308, Slaking 366, Exploud 372, Absol 376, Clefable 36, Snorlax 143, Magikarp 129, Caterpie 10, Shedinja 303).
- A stall (both sides on Splash) never ends: give the player a damaging move and expect 100+ decisions as the sign of a stall (`prehunt.py` warns).
- A direct move on a hand-built party is the way to cover a rule no Factory set can reach. Known failing example: `stages/coverage/R057-beat-up-shedinja.json` (the engine's Factory Shedinja has 88 max HP, the ROM's 1).

## What a staged battle cannot do

Pokemon that are not Factory sets (a level, a move set or an item no set has). Those need the Mechanic Lab with
`overrides.parties`, which only the ROM side can stage: such a proof is a ROM run plus an engine unit test with the same
numbers, as in the earlier passes (for example `ai-heal-weather-stale-register.md`).
