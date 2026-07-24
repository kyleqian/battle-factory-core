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

- **State:** **15 exact / 2 partial / 259 unsupported**. FLAMETHROWER has a
  complete source-relative body in both orientations but remains honestly
  partial for equal-priority flame overlap ordering.
- **Did:** implemented the 22-spawn `gFlamethrowerFlameSpriteTemplate` sine
  beam, shared timer phase, 30-step fixed translation, three-frame sheet loop,
  both `AnimTask_ShakeMon` programs, alpha/monbg epochs, and teardown through
  the relative Scene-ON seam. DRAGON BREATH's reducer/compositor is unchanged.
- **Evidence:** both orientations match every RAM/OAM component frame
  (**126/126 + 126/126**). Complete dense RGB windows are **115/126**
  player-back ONIX → opponent-front MURKROW and **117/126** opponent-front
  ONIX → player-back MURKROW. The 20 residual frames contain only **1–25 px**
  where same-priority flame sprites overlap; all other pixels and epochs match.
- **Next:** derive persistent `sSpriteOrder` slot history for the overlapping
  equal-priority flame OBJs. Do not promote exact from the stateless
  center-y/spawn-index order; generic hit/HP/result/controller tails remain
  independently owned.
