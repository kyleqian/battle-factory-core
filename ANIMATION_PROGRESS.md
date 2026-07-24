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

- **State:** **4 exact / 8 partial / 264 unsupported**. The source graph covers
  all **354** moves through **935** reusable components and **3,190**
  dependency edges.
- **Did:** added generated dependency/leverage reporting and three initial
  overlapping tracks: elemental punch, white feather, and fast contact.
  Removed parked FAINT ATTACK from the active move queue; its partial evidence
  and ISSUE #38 remainder remain intact.
- **Evidence:** graph regeneration is byte-for-byte tested. ENDEAVOR portable
  **141/141** and canonical **237/237** remain exact; DOUBLE TEAM, FIRE PUNCH,
  ROCK SLIDE, and FAINT ATTACK remain **230/230**, **225/225**, **175/175**,
  and **221/221**.
- **Next:** start the `elemental-punch` track: reuse exact FIRE PUNCH as the
  chassis, stage ICE/THUNDER overlays, and report component reuse plus
  independent move windows. Do not reopen FAINT ATTACK ISSUE #38.
