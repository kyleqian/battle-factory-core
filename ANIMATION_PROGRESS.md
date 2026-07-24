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
  legal two-turn portability and source-relative state are proven, but the
  portable framebuffer adapter and ISSUES #34's seven affine opening frames
  remain open.
- **Did:** staged zero-PP-Up Level-50 MURKROW→ONIX in both orientations and
  installed a phase-relative, side-parameterized charge/strike reducer behind
  the shared Scene-ON seam. It derives charge lifetime from attacker center,
  strike travel/reappearance from source Q8.8 geometry, and exposes shared
  hitsplat/shake timing without owning mechanics or controller outcomes.
- **Evidence:** opponent FLY halves **39-197 + 473-732**; player FLY halves
  **39-193 + 372-627**. RAM/OAM pins opponent charge `(176,51), y2=-81`,
  player charge `(72,97), y2=-113`, opponent strike matrix
  `{142,212,-212,142}`, and player strike `{86,-241,241,86}`. Canonical
  pixel evidence remains charge **206/206** (with issue #34 exclusion) and
  strike **256/256**; SAND ATTACK regresses **190/190**. No new portable
  pixel claim.
- **Next:** extract player-back MURKROW presentation art, install the
  orientation-parametric framebuffer/healthbox/controller adapter, and dense
  compare both complete practical windows. Keep FLY partial and preserve
  ISSUES #34 until a general PPU coverage rule closes it.
