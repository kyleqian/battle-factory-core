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

- **State:** **4 exact / 9 partial / 263 unsupported**. ICE PUNCH remains
  partial: both opposite-side frozen-cube lifecycles and their intervening
  controller displays are exact, but the later controller handoff remains.
- **Did:** added the source-extracted four-subsprite FrozenIceCube compositor
  and its side-parametric callback reducer: 1→9 alpha fade, two independently
  delayed 13/14/15 palette-rotation cycles, 8→0 fade, sprite destruction, and
  blend teardown. The same component drives the status-applied and
  frozen-solid-skip spawns from controller-supplied relative clocks.
- **Evidence:** `ice-punch-grovyle-onix.json` is now **848/848 exact** at
  Scene-ON oracle frames 1966-2813 / ages 0-847. The +438 continuation covers
  both complete cube tasks, “ONIX was frozen solid!” and “ONIX is frozen
  solid!”, FRZ healthbox installation, `gCurrentMove` clear, and the settled
  frozen-text tail. Existing ICE PUNCH player-side **462/462** and FIRE PUNCH
  **225/225** remain exact. Tier-1 pins source geometry, alpha/palette clocks,
  both spawn clocks, destruction, and immutable controller inputs.
- **Next:** resume at oracle frame **2814 / age 848**, where the frozen-solid
  hold clears and the next controller presentation begins. Complete that
  skipped-move handoff before exact promotion. Do not claim THUNDER PUNCH
  without its own dense evidence.
