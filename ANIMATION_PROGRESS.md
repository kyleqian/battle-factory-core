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
  affine opening frames remain explicitly excluded. BOUNCE remains unsupported
  because it has source/RAM evidence but no green pixel window.
- **Did:** staged legal Level-50 SPOINK→ONIX BOUNCE with explicit zero PP Ups;
  added dense probe support for its two sprite templates; and installed a
  source-relative charge/strike reducer behind the shared Scene-ON state seam.
  The framebuffer path rejects BOUNCE explicitly until its compositor exists.
- **Evidence:** dense RAM/OAM pins charge frames **345-368** (24 affine
  states), strike frames **881-904** (24 vertical states), hit-splat
  **890-898**, and vertical shake poses **892-893/896-897/900-901/904**.
  PP is `[5,5,5,5]` before selection and `[5,5,5,4]` after one use with
  `ppUps:[0,0,0,0]`; stock HP resolves **117→114**. FLY focused regressions,
  Tier-1, and build remain green.
- **Next:** extract SPOINK front/back presentation assets and healthboxes,
  implement BOUNCE's monbg/alpha/backdrop/OAM composition in both orientations,
  then dense-compare complete charge/strike/controller windows before assigning
  any move status. Preserve all FLY windows and ISSUES #34 exclusions.
