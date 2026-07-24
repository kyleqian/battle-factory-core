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

- **State:** **7 exact / 6 partial / 263 unsupported**. QUICK ATTACK is exact
  in both orientations; AERIAL ACE remains partial at an honest staged
  portability checkpoint.
- **Did:** added legal Level-50 mechanicLab fixtures with
  `ppUps:[0,0,0,0]` for both AERIAL orientations. Added source-relative
  state behind the shared seam for its signed ellipse, independent TraceMon
  OAM order, cutting slice, complex palette pulse, vertical shake, immutable
  117→108 HP endpoints, result clocks, command release, and MOVE_NONE ages.
- **Evidence:** opponent-front intended complete window is frames **46-281
  (236)**; player-back is **46-277 (232)**. These are staged-not-compared:
  the portable compositor is deliberately absent, so zero portable frames
  are claimed. Canonical AERIAL **93/93** remains exact; QUICK **219/219 +
  214/214**, FEATHER **400/400 + 400/400**, FIRE **225/225 + 277/277**, and
  ICE **462/462 + 1294/1294** require final regression.
- **Next:** install the AERIAL-specific portable compositor and prove every
  frame of both complete windows; do not thin either window or reuse QUICK
  ATTACK's impact/palette/OAM choreography.
