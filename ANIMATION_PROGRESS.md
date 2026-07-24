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
- **Did:** closed ICE PUNCH's complete move-script body through its reusable
  source-composed teardown. The profile-driven reducer pins
  `BeginNormalPaletteFade`'s alternating BG/OBJ callbacks (7→5→3→1→0),
  `clearmonbg`/`blendoff`, restored target OBJ visibility, and the sound-gated
  `end`; Tier-1 retains the prior spiral and complete short-crystal clocks.
- **Evidence:** `ice-punch-onix-grovyle.json` is **187/187 exact** at oracle
  frames 2339-2525 / ages 0-186, including all 23 previously open teardown
  frames. FIRE PUNCH portable **225/225** remains exact.
- **Next:** continue ICE PUNCH only at generic hit/damage presentation from
  2526 and audit any evidence-required geometry/orientation variant before
  exact promotion. Do not claim THUNDER PUNCH without its own dense evidence.
