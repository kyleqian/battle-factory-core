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

- **State:** **9 exact / 5 partial / 262 unsupported**. BOUNCE remains partial
  only for its source-required successful-paralysis status-animation/message
  variant; both no-status orientations now have complete controller tails.
  FLY remains partial only for ISSUES #34's seven affine opening frames.
- **Did:** generalized BOUNCE's immutable controller profile for hit reaction,
  HP drain, effectiveness result, current-move/text cleanup, and optional
  action-menu reveal. Closed source `AnimTask_ShakeMon`'s final two pulses,
  monbg target-base reset/release, and the side-dependent four-frame controller
  lag without changing damage, accuracy, paralysis, PP, RNG, turn order, or
  battle state.
- **Evidence:** opponent-front is charge **24/24** plus contiguous strike/
  controller/menu **881-1179 = 299/299**; player-back is charge **24/24** plus
  contiguous strike/controller handoff **777-973 = 197/197**. Zero exclusions
  and zero differing pixels. All four FLY windows remain green
  (**144/144 + 248/248 + 140/140 + 244/244**). Legal seed `0x27182818`
  independently stages the open paralysis variant: status commits at frame
  **1063**, status animation/controller command 27 runs **1064-1148**,
  `gCurrentMove` clears at **1225**, and menu setup begins at **1230**.
- **Next:** extract/reuse `ANIM_TAG_SPARK_2` plus `ElectricityEffect` and
  `AnimTask_ShakeMon2`, then dense-close the legal `0x27182818` paralysis
  tail through its message, PAR healthbox, command release, MOVE_NONE, and
  stable menu. Preserve both no-status windows, all four FLY windows, and
  ISSUES #34.
