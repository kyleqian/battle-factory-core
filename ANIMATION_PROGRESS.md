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

- **State:** **12 exact / 2 partial / 262 unsupported**. DRAGON_BREATH is exact
  across its complete move body in both Level-50 orientations through the
  relative shared Scene-ON seam.
- **Did:** repaired the shared framebuffer compositor with two source-relative
  display latches (callback/OAM age -1, `BlendPalette` age -2), side-parametric
  target-relative ember/attacker ordering, and the source back-pic anchor.
  Corrected the staged Murkrow personality-derived gender input. The comparator
  now requires both component and framebuffer exactness to pass.
- **Evidence:** fresh wrapper-validated ON probes match **85/85** dense
  projectile/palette/shake/monbg states **and 85/85 live framebuffers** in each
  orientation: player-back ONIX→opponent-front MURKROW frames 395-479 and
  opponent-front ONIX→player-back MURKROW frames 449-533. Focused **20/20**,
  full Tier-1, build, coverage, ON info, and diff check are green.
- **Next:** keep generic hit, HP drain, paralysis/result printers, command
  release, cleanup, and menu handoff in their independent presentation tracks.
  DIVE and BIND remain unsupported/partial respectively.
