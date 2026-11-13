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

## What a staged battle cannot do

Pokemon that are not Factory sets (a level, a move set or an item no set has). Those need the Mechanic Lab with
`overrides.parties`, which only the ROM side can stage: such a proof is a ROM run plus an engine unit test with the same
numbers, as in the earlier passes (for example `ai-heal-weather-stale-register.md`).
