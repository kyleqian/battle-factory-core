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

- **State:** **7 exact / 6 partial / 263 unsupported**. QUICK ATTACK is exact
  in both required attacker-side orientations through the shared Scene-ON
  seam; AERIAL ACE remains the next fast-contact acceptance unit.
- **Did:** replaced the invalid mirrored player travel with the source's
  signed fixed-point ellipse values: `Sin(angle,+24)>>8` yields
  `16/24/16/0/-17/-24`, while the opponent's `-24` amplitude retains
  `-17/-24/-17/0/16/24`. The corrected player offsets also drive the
  TraceMon clone captured at the first travel position. Tier-1 pins both
  asymmetric tables and the monbg→TraceMon→target/impact ordering boundary.
- **Evidence:** contiguous player-back PIDGEOTTO→opponent-front ONIX frames
  **46-259 / ages 7-220 are 214/214 exact**, preserving the independent
  kickoff **41/41** and controller suffix **158/158**, `ppUps:[0,0,0,0]`,
  immutable 117→111 outcome, exact command release, and `MOVE_NONE` cleanup.
  Opponent-front QUICK remains **219/219**. Canonical AERIAL **93/93**;
  FEATHER **400/400 + 400/400**; FIRE **225/225 + 277/277**; ICE
  **462/462 + 1294/1294** all regress exact.
- **Next:** stage AERIAL ACE portability/opposite attacker side without
  assuming QUICK ATTACK's independent cutting-slice/palette choreography.
