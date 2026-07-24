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

- **State:** **18 exact / 1 partial / 257 unsupported**. THUNDER PUNCH is exact
  for its complete move-owned body in both source-required orientations.
- **Did:** staged legal zero-PP-Up Level-50 ONIX → non-Ground MURKROW with
  source Factory set ids and extracted front/back art. Added the relative
  Thunder Punch seam: black ramp/restore, two inversions, three lightning
  programs, shared fist/two hitsplats/shake, monbg, alpha, and teardown.
- **Evidence:** player-back → opponent-front oracle **401..504** and
  opponent-front → player-back **452..555** are each **104/104 component +
  104/104 RGB exact**. The reverse second-bolt allocation retains the live
  hitsplat ahead for one 14-pixel overlap display, then returns to ordinary
  OAM order. Fresh controls remain exact: FIRE PUNCH **225/225 + 277/277**,
  ICE PUNCH **462/462 + 1294/1294**, BLAZE KICK **78/78 both**,
  FLAMETHROWER **126/126 both**, DRAGON BREATH **85/85 both**.
- **Next:** run `npm run animation:coverage` and resume the next ranked
  Level-50 component track; THUNDER PUNCH has no known move-owned remainder.
