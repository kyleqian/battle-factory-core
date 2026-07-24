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

- **State:** **9 exact / 4 partial / 263 unsupported**. FLY remains partial:
  the reusable framebuffer/controller adapter is installed, but ISSUES #34's
  seven affine opening frames and two player-side priority/monbg residuals
  remain open.
- **Did:** added source-derived player-back MURKROW art and a shared,
  side/geometry/phase-relative FLY compositor for charge/strike balls,
  visibility, hitsplat/shake, both healthbox orientations, immutable HP
  display, move/result printers, and controller cleanup. No mechanics changed.
- **Evidence:** portable opponent charge oracle **47-197** is **144/144**
  excluding only frames **59-65** under ISSUES #34; opponent strike
  **485-732** is **248/248**. Player charge **47-193** has the same seven-frame
  exclusion plus a stable **24-pixel** opponent-priority residual at
  `x177-181/y79-86`; player strike **384-440** has only that residual, then
  retains an unresolved target monbg/controller composition from frame **441**
  through **627**. Canonical charge/strike remain **206/206 + 256/256**;
  SAND ATTACK and AERIAL ACE regress **190/190 + 93/93**.
- **Next:** derive the player-target `monbg ANIM_DEF_PARTNER` BG/OBJ priority
  composition and the 24-pixel opponent field-priority exposure generally,
  then rerun both player dense windows. Preserve ISSUES #34 and partial status.
