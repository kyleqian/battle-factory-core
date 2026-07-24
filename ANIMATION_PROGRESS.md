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
  all four portable practical windows are exact, but ISSUES #34's seven
  affine opening frames remain explicitly excluded.
- **Did:** repaired opposite-side FLY with source Q8.8 direction-bit parity,
  `AnimTask_ShakeMon`/`Task_UpdateMonBg` ownership of target `x2`, persistent
  equal-priority OAM ordering, and semitransparent OBJ blending against the
  next eligible BG/backdrop layer. Corrected the staged MURKROW gender from
  its oracle personality; no mechanics or controller outcomes changed.
- **Evidence:** portable opponent charge oracle **47-197** is **144/144**
  excluding only frames **59-65** under ISSUES #34; opponent strike
  **485-732** is **248/248**. Player charge **47-193** is **140/140** after
  the same seven-frame exclusion; the complete player strike/controller
  window **384-627** is **244/244**. Canonical charge/strike remain
  **206/206 + 256/256**;
  SAND ATTACK and AERIAL ACE regress **190/190 + 93/93**.
- **Next:** preserve FLY partial until ISSUES #34's generic seven-frame affine
  sampler remainder is solved; BOUNCE and DIVE still require independent dense
  move evidence.
