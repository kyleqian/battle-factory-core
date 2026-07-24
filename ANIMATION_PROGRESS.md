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
  partial: opposite-side geometry is proved, but its controller resolution
  variant is not yet complete.
- **Did:** made ICE PUNCH field composition side-parametric and source-derived.
  Battler palettes, blink/shake, HP boxes, and used-move text now select by
  side; the seven short hit crystals mirror their source X offsets for a
  player-side target while the inward spiral remains target-relative.
- **Evidence:** new `ice-punch-grovyle-onix.json` is **314/314 exact** at
  Scene-ON oracle frames 1966-2279 / ages 0-313: the complete opposite-side
  move-script body, generic hit/blink/wobble, immutable 117→31 HP drain, and
  five-frame settled hold. Existing ICE PUNCH player-side **462/462** and FIRE
  PUNCH **225/225** remain exact.
- **Next:** densely match the staged opposite-side not-very-effective text,
  successful freeze/status controller path, command teardown, and
  next-controller handoff before exact promotion. Do not claim THUNDER PUNCH
  without its own dense evidence.
