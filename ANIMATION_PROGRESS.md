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

- **State:** **4 exact / 9 partial / 263 unsupported**. ICE PUNCH remains
  partial pending an evidence-backed opposite-side/geometry audit.
- **Did:** added a generic presentation-relative controller display profile.
  At age 363 it atomically reveals the action menu, then re-anchors the shared
  source/RAM-proved `DoBounceEffect` sine reducer; HP, status, outcome, RNG,
  action selection, and turn state remain immutable external inputs.
- **Evidence:** `ice-punch-onix-grovyle.json` is **462/462 exact** at oracle
  frames 2339-2800 / ages 0-461, contiguous through the complete player-back
  move/resolution window, blank hold, action-menu reveal, and a 99-frame
  settled bounce window including healthbox `y2=2`. FIRE PUNCH portable **225/225**
  remains exact.
- **Next:** audit ICE PUNCH's opposite attacker side/geometry with its own
  dense Scene-ON evidence before exact promotion. Do not claim THUNDER PUNCH
  without its own dense evidence.
