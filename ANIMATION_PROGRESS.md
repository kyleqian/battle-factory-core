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

- **State:** **13 exact / 1 partial / 262 unsupported**. BIND is exact for its
  complete move-owned body in both source-required battle orientations.
- **Did:** generalized the live BIND compositor across player-back and
  opponent-front attackers without changing its relative reducer. The new
  legal zero-PP-Up opponent-front ONIX→player-back MURKROW frames **436–480**
  / relative ages **0–44** match source task/OAM state **45/45** and live RGB
  **45/45**. The existing player-back orientation remains **45/45 + 45/45**.
- **Evidence:** `tools/compare/bindPortable.ts` now selects attacker/target RAM
  records by side and reruns both unthinned v5 Mechanics Lab probes. Tier-1
  pins the full signed-rounding-asymmetric opponent sway, back-target geometry
  and affine peak, plus input immutability. Source inspection finds no further
  BIND side/species branch after the explicit attacker amplitude negation.
- **Next:** select the next bounded Level-50 move/component track. Generic hit,
  HP/result/status/controller tails and `General_TurnTrap` residual tendrils
  remain separate presentation ownership and do not reopen BIND.
