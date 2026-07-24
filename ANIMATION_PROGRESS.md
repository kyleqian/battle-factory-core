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

- **State:** **6 exact / 7 partial / 263 unsupported**. FEATHER DANCE is exact
  in both source-required target-side orientations.
- **Did:** staged legal Level-50 player-back PIDGEOTTO→opponent-front ONIX
  through mechanicLab and generalized the relative Scene-ON feather,
  battler, healthbox, banner, and printer seam. Source plus dense RAM pins
  the +104/−40 target anchor, −1 opponent-target priority, target depth
  cutoff, front/back offsets, and four-frame player-kickoff head start;
  Tier-1 pins both geometries and immutable 6→4 controller outcomes.
- **Evidence:** `feather-dance-player-pidgeotto-onix.json` is **400/400
  exact** at oracle frames 46-445 / ages 7-406, alongside the original
  `feather-dance-pidgeotto-onix.json` **400/400**. ICE PUNCH remains
  **1294/1294 + 462/462** and FIRE PUNCH **225/225**.
- **Next:** supervisor choose the next Level-50 partial/unsupported move.
  MIST BALL only shares the loaded white-feather asset; its distinct
  projectile remains independently unsupported.
