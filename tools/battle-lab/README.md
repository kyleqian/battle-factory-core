# Battle-lab scenarios

The harness oracle exposes `POST /v1/battle-lab/run` so a worker can stage a
specific real-ROM Factory battle without replaying an entire challenge to
reach it.

Run a checked-in scenario with:

```sh
bin/oracle lab tools/battle-lab/factory-varied.json -o /tmp/factory-varied
bin/oracle lab tools/battle-lab/mechanic-perish-song.json -o /tmp/perish-song
```

The output directory contains framebuffer PNGs and `manifest.json`. Each
capture in the manifest also contains semantic battle state: both active
battlers, stats, moves, PP, abilities, types, items, permanent/volatile
statuses, weather, side conditions, RNG, and controller state. Timed state is
named explicitly, including weather duration, confusion, Leech Seed, Perish
Song, Reflect, Light Screen, Mist, Safeguard, and Spikes.

## The two modes

`factoryLegal` is a real Battle Factory setup. Choose three player Frontier
set IDs, three opponent set IDs, a legal trainer ID, challenge/battle numbers,
the prior rental-swap count, and a seed. The service rejects teams outside
the source ranges or with illegal species/item duplication. Past rentals
unlock higher-band candidate positions at the source's real thresholds. The
ROM constructs the parties and runs normal battle initialization.

`mechanicLab` still requires those two legal three-Pokémon parties. They are
the baseline species and stats. Its interim v1 contract permits only active
loadout choices—move slots/PP, item, ability, types, and friendship—so a
worker can isolate a mechanic before supplying ordinary controller input.

Override IDs are source-bounded: moves `0..354`, items `0..376`, abilities
`0..77`, and types `0..17`. The setup arrays contain raw catalog records;
captured battler state is authoritative after construction, including
Emerald's intentional replacement of Return with Frustration for
zero-friendship rentals.

Neither mode permits transient battle-state injection. HP damage, status,
volatile effects, stat stages, weather/timers, side conditions, delayed
effects, faint state, and outcomes must be created by actual ROM-executed
moves, items, abilities, switching, and end-turn processing. The nested
`trace` is ordinary controller input; semantic captures expose the resulting
state read-only.

S10 owns a future full Mechanics Lab builder that constructs each Pokémon
before battle initialization: species, level, nature, IVs, EVs, moves,
PP Ups/current PP, held item, species-valid ability slot, friendship, and
relevant personality properties. Emerald must derive its types, stats, max
HP, ability, gender, PP, and clean starting battle state. The interim live
loadout substitutions are groundwork, not that completed builder.

Version 1 is Level-50 singles. It stages regular trainers rather than Noland,
and applies interim loadout choices only to active battlers rather than
constructing bench Pokémon. Its checkpoint is after the attendant's scouting
speech, so it does not regenerate that earlier dialogue.

The complete schema and source-level implementation live in the umbrella
harness at `oracle/BATTLE_LAB.md` and `oracle/battle_lab.py`.
