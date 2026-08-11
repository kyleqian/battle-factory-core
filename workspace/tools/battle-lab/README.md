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

`mechanicLab` still routes through a legal Factory base battle, then takes one
of two forms.

**`overrides.parties` (preferred, shipped 2026-07-24 — harness `b30c5d8`).**
The complete pre-battle builder. Supply exactly three Pokémon per side; each
takes `species` and four `moves` plus optional `level`, `nature`, six `ivs`
(`0..31`), six `evs` (`0..255` each, total `<= 510`), `ppUps`, `item`,
`abilitySlot` (must exist on the species), `friendship`, `gender`, `shiny`, and
an exact `personality`. Records are written encrypted and checksummed after the
Factory constructors but **before `CB2_InitBattle`**, so Emerald derives types,
ability, experience, stats, max/current HP, and PP itself. Entry hooks
(Intimidate, Drought, Sand Stream, Trace) therefore fire at their real time,
all three bench records survive for switching tests, and `state.parties.*`
exposes every persistent record with `checksumValid`; active battlers carry
`partyIndex`. To constrain the opponent without injecting an AI result, give
all four of its slots the same move — the Factory AI still runs normally.

**`overrides.battlers` (legacy).** Active-battler loadout only—move slots/PP
Ups, item, ability, types, friendship—applied after the initial send-out and
before either side's first action choice. Mutually exclusive with
`overrides.parties`. Persistent checks consulted during later move execution
work (Own Tempo, Choice Band), but a substituted Drought or Intimidate does
**not** replay its missed switch-in hook, and switching reconstructs from the
unmodified party. Keep it for existing traces; use `overrides.parties` for new
mechanic, entry-hook, and switching work.

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

That builder is no longer future work — see `overrides.parties` above and
`../../../../oracle/BATTLE_LAB.md` for the authoritative contract.

Version 1 is Level-50 singles. It stages regular trainers rather than Noland,
and applies interim loadout choices only to active battlers rather than
constructing bench Pokémon. Its checkpoint is after the attendant's scouting
speech, so it does not regenerate that earlier dialogue.

The complete schema and source-level implementation live in the umbrella
harness at `oracle/BATTLE_LAB.md` and `oracle/battle_lab.py`.
