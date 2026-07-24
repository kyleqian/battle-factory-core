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

- **State:** **6 exact / 7 partial / 263 unsupported**. QUICK ATTACK now has
  a portable complete move-body/controller-command prefix in its established
  opponent-front orientation; it remains partial.
- **Did:** staged legal Level-50 opponent-front PIDGEOTTO→player-back ONIX
  through mechanicLab using `ppUps:[0,0,0,0]`, then generalized
  source-relative elliptical travel, four blended afterimages, impact, and
  shake behind the Scene-ON seam. Tier-1 pins relative clocks, explicit
  geometry, side-respecting travel, and immutable 117→110 controller inputs.
- **Evidence:** `quick-attack-pidgeotto-onix.json` is **71/71 exact** at
  oracle frames 46-116 / ages 7-77, covering the kickoff printer through
  body teardown and opponent animation-controller command release.
  Canonical QUICK ATTACK remains **169/169** and sibling AERIAL ACE
  **93/93**.
- **Next:** extend the portable QUICK ATTACK case past frame 116 through
  generic hit/HP/result/current-move-clear and the next stable controller
  boundary; independently prove player-back attacker geometry before exact.
  Existing FEATHER DANCE, ICE PUNCH, and FIRE PUNCH exact evidence must stay
  green.
