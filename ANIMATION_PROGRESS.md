# Animation coverage

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

## Priority and acceptance

1. Level 50 Factory: all **276** reachable, executable moves (`MOVE_NONE`
   empty slots are excluded).
2. Open Level additions: **1** move (`OUTRAGE`), plus a geometry audit of
   **8** exclusive species across **32** sets and **37** overlapping moves.
   Overlapping moves retain Level 50 evidence unless that audit finds a real
   variant dependency.
3. The **77** remaining Emerald moves, after Factory coverage.

Moves remain the acceptance unit. Components—scripts, assets, sprites, tasks,
and visual commands—are the implementation unit. A track may overlap other
tracks; FIRE PUNCH can belong to both punch and fire work. Prove a component
with one representative, batch-check siblings, and keep separate move-level
oracle evidence. Do not build one absolute-tick timeline per move.

Move acceptance covers the move-owned animation body and its evidence-required
geometry variants. Generic hit reactions, HP/result presentation, statuses,
held-item use, and controller/menu handoffs are reusable presentation
components with independent coverage; they neither block nor promote a move
animation. A status caused by a move is not part of that move's animation.

- `staged`: a deterministic matching ON-oracle/app case exists.
- `partial`: a meaningful dense window is green, but portability or a required
  variant remains.
- `exact`: the complete dense animation window is green through the shared
  presentation seam and all source- or evidence-required variants are covered.
- No entry means unsupported.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.

## Current handoff

- **State:** **14 exact / 1 partial / 261 unsupported**. MUD SLAP is exact for
  its complete move-owned body in both source-required battle orientations;
  SAND ATTACK remains exact.
- **Did:** added the shared side-parameterized mud/sand slide choreography and
  MUD SLAP's independent 16x16 `gMudSlapMudSpriteTemplate` program. Legal
  zero-PP-Up PIDGEOTTO→ONIX probes cover opponent-front frames **84–134** and
  player-back frames **80–130**, both relative animation ages **45–95**.
- **Evidence:** source callback/OAM **51/51 + 51/51** and live RGB
  **51/51 + 51/51** are exact. Evidence pins the one-frame callback/display
  latch, six five-sprite waves, signed Q8.8 geometry, frame-1 art, lifetime,
  stable OAM ordering, and side-dependent attacker/mud/target depth. Both SAND
  ATTACK dense controls remain **269/269**.
- **Next:** select the next bounded Level-50 component track. Generic hit,
  damage/HP, accuracy result, and controller tails remain separate ownership
  and do not reopen MUD SLAP.
