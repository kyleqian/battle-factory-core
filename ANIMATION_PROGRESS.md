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

- **State:** **10 exact / 4 partial / 262 unsupported**. BOUNCE is exact:
  both no-status orientations and the successful-paralysis path exhaust its
  source-required presentation variants. FLY remains partial only for
  ISSUES #34's seven affine opening frames.
- **Did:** moved the source-relative `Status_Paralysis` visual into generic
  `statusAnimation.ts`: status kind + battler target geometry drive the
  `ANIM_TAG_SPARK_2` asset, eight-spawn `ElectricityEffect`, and parameterized
  `AnimTask_ShakeMon2` framebuffer handoff. BOUNCE now only composes that
  visual from its already-resolved display profile; outcome, messages,
  healthbox status, PP, rules/RNG, and controller progression stay external.
- **Evidence:** seed `0x27182818` strike through stable menu tail,
  **881-1330 = 450/450** exact: commit **1063**, command 27 **1064-1148**,
  `gCurrentMove=0` **1225**, menu setup/reveal **1230/1235**. No-status BOUNCE
  remains **24/24 + 299/299** and **24/24 + 197/197**, all reverified after
  extraction. FLY remains
  **144/144 + 248/248 + 140/140 + 244/244**, with only #34's exclusions.
- **Next:** continue the ranked Level-50 queue. DIVE still needs independent
  dense evidence; do not weaken FLY's bounded ISSUES #34 remainder.
