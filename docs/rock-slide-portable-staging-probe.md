# ROCK SLIDE portable Scene-ON evidence

`tools/probe/stage-fire-punch-portable-on.py opponent rock-slide` replays the
accepted first-battle prefix, then changes only GROVYLE's already-loaded AI
move slot 3 and PP from DOUBLE TEAM 15/15 to ROCK SLIDE 10/10. The stock
controller retains attacker, target, turn order, damage, RNG, and resolution
ownership. It produces the opposite singles orientation:

- attacker: opponent-front GROVYLE, source battle position `(176,40)`;
- target: player-back ONIX, source battle position `(72,80)`;
- first falling-rock RAM creation: oracle frame 1974, relative age 7;
- generic target hit controller: oracle frame 2108, relative age 141;
- immutable stock outcome after the presentation-owned window: 117→109 HP.

The profile's pre-allocation `sSpriteOrder` is read at frame 1965. It is an
immutable initial condition for the source `CreateSprite`/`SortSprites`
simulation, not a per-frame drawing table. `SetAverageBattlerPositions(target,
FALSE)` supplies `(72,80)` and `AnimFallingRock` adds 14 to Y, so every rock
uses the source-derived origin `(72,94)`.

`node --experimental-strip-types tools/compare/rockSlidePortable.ts` compares
every oracle/app frame from 1967 through 2141. The **175/175** result covers
the complete unique `Move_ROCK_SLIDE` body, including the silent script entry,
BG3 shake, all 20 falling rocks and their overlap order, player-back target
shake, script teardown, healthbox wobble, four-cycle target blink, and the
settled used-move printer.

Retained controls:

- `turn1-rockslide.json`: canonical Scene-ON player-back ONIX →
  opponent-front GROVYLE, **256/256**;
- `battle2-turn1-rockslide.json`: staged Scene-OFF player-back ONIX →
  opponent-front KABUTO, **191/191**;
- both FIRE PUNCH portable orientations: **225/225**, **277/277**;
- portable FAINT ATTACK: **221/221**.

Oracle RGB is written only to fresh temporary directories by the comparator.
No screenshot, framebuffer lookup, absolute battle tick, damage calculation,
RNG update, turn mutation, or facility-state mutation is part of the runtime
presentation path.
