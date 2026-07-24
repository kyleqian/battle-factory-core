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

- **State:** **11 exact / 3 partial / 262 unsupported**. DRAGON_BREATH stays
  partial. Its complete source move-body component is now portable in both
  Level-50 orientations, and a shared-seam framebuffer compositor exists, but
  neither portable move-body framebuffer window is exact.
- **Did:** extended the eleven-spawn reducer with source-relative
  `AnimTask_BlendBattleAnimPal` 0→9→0 palette state, paired-hold
  `AnimTask_ShakeMon2`, and monbg acquisition/release. The dense comparator
  now independently checks faded target palette RAM, x2, invisibility/BG
  ownership, projectiles, and the live framebuffer. Added a presentation-only
  ONIX→MURKROW compositor using explicit geometry/field inputs; no PP, damage,
  paralysis, RNG, controller, turn, or facility state changed.
- **Evidence:** fresh wrapper-validated ON probes match **85/85** dense
  projectile/palette/shake/monbg states in each orientation (ages -2..82).
  The attempted framebuffer composition is honestly incomplete:
  player-back ONIX→opponent-front MURKROW **7/85** (exact frames 395-399 and
  460-461; first residual frame 400 is 8 pixels), opponent-front
  ONIX→player-back MURKROW **0/85** (first residual frame 449 is 1506 pixels).
  Focused tests and build are green.
- **Next:** fix the portable affine ember rasterization/translated clipping
  beginning at player frame 400, then the opposite-side base composition
  (terrain cutoff/front-back sprite and healthbox ordering) already visible at
  frame 449. Retain partial until both move-body framebuffer windows are
  complete. Generic hit, HP drain, paralysis/result printers, command release,
  cleanup, and menu handoff belong to independent presentation tracks and are
  explicitly outside this move's acceptance. DIVE remains unsupported.
