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

- **State:** **12 exact / 2 partial / 262 unsupported**. BIND remains partial;
  its legal Scene-ON actual-hit evidence is now staged without conflating it
  with the old player-back ONIX miss.
- **Did:** committed zero-PP-Up ONIX→MURKROW Mechanics Lab BIND plus a relative
  fixture. Wrapper-validated dense RAM evidence identifies the source-owned
  body at frames **382–426** (first sway pixel at 385), generic hit handoff at
  429, HP 142→137 at 471, trapped state `0xc000` at 476, and independent
  residual trap activity only after `MOVE_NONE` from 590/610.
- **Evidence:** `Move_BIND` is source sway + two target scale calls; the tendril
  sprites are `General_TurnTrap`/`Status_BindWrap`, so neither generic tails nor
  residual wrapping belongs in BIND move-body acceptance. The scenario and
  fixture are portable, relative, and unthinned; no engine code was added.
- **Next:** implement and densely compare this 45-frame source body through the
  shared seam, then determine whether source-side geometry needs the opposite
  orientation. Keep hit/HP/result/controller and residual lifecycle in their
  independent tracks.
