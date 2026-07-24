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
and a seed. The service rejects teams outside the source ranges or with
illegal species/item duplication. The ROM constructs the parties and runs
normal battle initialization.

`mechanicLab` still requires those two legal three-Pokémon parties. They are
the baseline species, stats, moves, items, and abilities. It then permits
small, named overrides to the active player and opponent or the field so a
worker can isolate a mechanic. Overrides can cover HP, move slots/PP, stat
stages, item, ability, types, friendship, permanent status, confusion, Leech
Seed, Perish Song, weather, and side conditions.

Override IDs are source-bounded: moves `0..354`, items `0..376`, abilities
`0..77`, and types `0..17`. HP must remain between zero and max HP. The setup
arrays contain raw catalog records; captured battler state is authoritative
after construction, including Emerald's intentional replacement of Return
with Frustration for zero-friendship rentals.

Neither mode injects a hit, damage value, status outcome, winner, or opponent
choice. After staging, the nested `trace` is ordinary controller input and
the stock ROM owns move execution, RNG, hooks, damage, statuses, and end-turn
effects.

Version 1 is Level-50 singles. It stages regular trainers rather than Noland,
and overrides active battlers rather than bench Pokémon. Its checkpoint is
after the attendant's scouting speech, so it does not regenerate that earlier
dialogue.

The complete schema and source-level implementation live in the umbrella
harness at `oracle/BATTLE_LAB.md` and `oracle/battle_lab.py`.
