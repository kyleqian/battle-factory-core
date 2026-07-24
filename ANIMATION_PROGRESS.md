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

- **State:** **11 exact / 3 partial / 262 unsupported**. DRAGON_BREATH stays
  partial: its projectile/OAM component is now portable in both legal
  orientations, but complete portable framebuffer/controller windows and the
  three pre-existing canonical action-menu bounce exclusions remain open.
- **Did:** replaced canonical displacement with source-shaped attacker/target
  coordinates, fixed-point duration, eleven-spawn cadence, target-relative
  subpriority/monbg metadata, and attacker-side sprite/affine selection. Added
  two zero-PP-Up Level-50 Mechanics Lab stages plus a relative Scene-ON
  component adapter and dense comparator. No PP, outcome, damage, status, RNG,
  controller, turn, or facility policy changed.
- **Evidence:** fresh wrapper-validated ON probes and the shared seam match
  **61/61** dense projectile/OAM states for player-back ONIX→opponent-front
  MURKROW and **61/61** for opponent-front ONIX→player-back MURKROW. Canonical
  projectile/full windows remain **61/61 + 237/237**; FLY controls remain
  **213/213 + 256/256**. Focused tests/build are green.
- **Next:** build the portable full-scene DRAGON_BREATH compositor (target
  blend/shake, battler/healthbox/text/controller handoff) and densely compare
  both complete Mechanics Lab windows. Retain partial until those and the
  three menu-bounce exclusions are closed or explicitly accepted. DIVE
  remains unsupported.
