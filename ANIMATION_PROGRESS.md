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

- **State:** **4 exact / 9 partial / 263 unsupported**. The source graph covers
  all **354** moves through **935** reusable components and **3,190**
  dependency edges.
- **Did:** closed ICE PUNCH's small+large inward-crystal component through
  the final large state with a generic selected-OBJ compositor: an OBJ-mode-1
  pixel always samples the pre-OBJ BG/backdrop target 2, never a lower OAM
  object. Source/RAM order remains crystal 28 → hitsplat 27 → fist 26.
  The reducer also retains the final step-29 translation while independently
  advancing the large affine matrix, matching the callback/OAM handoff.
- **Evidence:** `ice-punch-onix-grovyle.json` is **73/73 exact** at oracle
  frames 2339-2411 / ages 0-72, closing the former 153-pixel overlap and the
  final small/large OAM states. FIRE PUNCH portable **225/225** remains exact.
- **Next:** continue ICE PUNCH at 2412 with the post-spiral gap, seven-spawn
  `IceCrystalEffectShort` burst, palette restore, teardown, and generic
  resolution. Do not claim THUNDER PUNCH without its own dense evidence.
