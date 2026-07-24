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

- **State:** **5 exact / 8 partial / 263 unsupported**. ICE PUNCH is exact:
  both attacker sides now cover complete dense move/controller windows through
  a stable next action menu.
- **Did:** reused the existing source-proved Sitrus presentation as a relative
  component behind the Scene-ON seam: three rotation cycles, granting stars,
  tint/ring, heal printer, controller-supplied HP display climb, blank hold,
  and generic action-menu bounce. Battle outcome, item result, HP endpoints,
  status, current move, RNG, and action selection remain fixture inputs.
- **Evidence:** `ice-punch-grovyle-onix.json` is **1294/1294 exact** at
  oracle frames 1966-3259 / ages 0-1293. The +446 continuation covers the
  full skipped-move handoff, immutable 31→61 display, menu redraw at age 1195,
  and 99-frame settled bounce. Opposite ICE PUNCH **462/462** and FIRE PUNCH
  **225/225** remain exact. Tier-1 pins relative clocks and input immutability.
- **Next:** supervisor choose another bounded Level-50 move/component track.
  THUNDER PUNCH remains unsupported without its own dense evidence.
