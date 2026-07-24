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

- **State:** **6 exact / 7 partial / 263 unsupported**. QUICK ATTACK's required
  player-back orientation is staged and controller-complete, but a bounded
  opposite-side BG/OBJ body overlap keeps the move partial.
- **Did:** staged legal Level-50 player-back PIDGEOTTO→opponent-front ONIX
  through mechanicLab with `ppUps:[0,0,0,0]`; generalized side geometry,
  back/front assets, healthbox orientation, immutable 117→111 display drain,
  result, release, and `gCurrentMove` cleanup. Tier-1 pins geometry, side
  travel, controller-relative clocks, and immutable inputs.
- **Evidence:** opposite prefix frames **46-86 / ages 7-47 are 41/41 exact**;
  the post-body/controller window frames **102-259 / ages 63-220 is 158/158
  exact**, through `MOVE_NONE` at frame 259. The attempted contiguous 46-259
  window is **200/214**; all 14 diffs are frames 87-99 and 101, confined to
  the player `monbg` real sprite, blended trace OBJs, impact/target ordering,
  with frame 100 exact. Established opponent-front QUICK remains **219/219**.
- **Next:** reproduce frames **87-101** from `monbg` BG1 scroll plus
  `AnimTask_TraceMonBlended` player-back OBJ priority/lives, then rerun the
  contiguous 214-frame window before promoting QUICK ATTACK to exact.
