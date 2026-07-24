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

- **State:** **12 exact / 2 partial / 262 unsupported**. BIND remains honestly
  partial: its complete player-back ONIX→opponent-front MURKROW move-owned body
  is exact, but source proves the opposite orientation is required.
- **Did:** implemented reusable, parameterized `AnimTask_SwayMon` and
  `AnimTask_ScaleMonAndRestore` reducers. The legal zero-PP-Up frames
  **382–426** / relative ages **0–44** match dense task state **45/45** and live
  framebuffer **45/45** through the shared Scene-ON seam, including the two
  squeeze calls at ages 3 and 21 and the two-frame task→OAM display lag.
- **Evidence:** `tools/compare/bindPortable.ts` reruns the v5 Mechanics Lab
  probe and compares unthinned RAM matrices/x2 plus RGB. Tier-1 pins source
  parameters, the whole sway timeline, scale/restore timeline, side sign, and
  input immutability. Generic hit from 429, damage/trap commit, and residual
  tendrils remain excluded as independently owned presentation.
- **Next:** stage opponent-front attacker→player-back target and densely prove
  the source's opponent-attacker amplitude negation plus back-sprite affine
  geometry. Only then promote BIND to exact.
