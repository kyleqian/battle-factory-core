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
- **Did:** extended ICE PUNCH through the complete generic hit reaction by
  reusing one phase-relative `SpriteCB_HitAnimHealthoxEffect` /
  `DoHitAnimBlinkSpriteEffect` reducer. It pins the 20-display +1/-1
  healthbox wobble, four-frame target blink blocks, and preceding-pass OAM
  latch without changing HP or battle state.
- **Evidence:** `ice-punch-onix-grovyle.json` is **222/222 exact** at oracle
  frames 2339-2560 / ages 0-221, contiguous through the full generic hit
  reaction and stable handoff. FIRE PUNCH portable **225/225** remains exact.
- **Next:** continue ICE PUNCH only at generic HP-drain/message resolution
  from 2561 and audit any evidence-required geometry/orientation variant
  before exact promotion. Do not claim THUNDER PUNCH without its own dense
  evidence.
