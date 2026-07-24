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

- **State:** **8 exact / 5 partial / 263 unsupported**. AERIAL ACE is exact
  in both source-required orientations through the shared Scene-ON seam.
- **Did:** installed its independent portable compositor for the signed
  ellipse, per-clone OAM order, target-anchored cutting slice, palette pulse,
  vertical shake, generic hit, immutable 117→108 drain/result, command
  release, and MOVE_NONE cleanup. Opposite-side evidence additionally pins
  the source `(target + 40,-32)` slice anchor and the opponent-front monbg
  reset from settled OAM `x2=+1` to the base corner.
- **Evidence:** opponent-front frames **46-281 = 236/236** exact;
  player-back frames **46-277 = 232/232** exact; canonical AERIAL remains
  **93/93**. Both mechanicLab inputs remain exactly
  `ppUps:[0,0,0,0]`. Regressions: QUICK **219/219 + 214/214**, FEATHER
  **400/400 + 400/400**, FIRE **225/225 + 277/277**, ICE **462/462 +
  1294/1294**.
- **Next:** supervisor may select the next acceptance unit; SAND ATTACK is
  now the first partial move in the ranked queue.
