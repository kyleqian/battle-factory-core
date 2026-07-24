# Animation coverage

Living status for the Battle Scene ON lane. Source scope is generated in
`src/data/gen/factory-animation-inventory.json`; per-move evidence and the
current queue live in `ANIMATION_COVERAGE.json`. Run `npm run
animation:coverage` for counts and the queue.

## Priority and acceptance

1. Level 50 Factory: all **276** reachable, executable moves (`MOVE_NONE`
   empty slots are excluded).
2. Open Level additions: **1** move (`OUTRAGE`), plus a geometry audit of
   **8** exclusive species across **32** sets and **37** overlapping moves.
   Overlapping moves retain Level 50 evidence unless that audit finds a real
   variant dependency.
3. The **77** remaining Emerald moves, after Factory coverage.

The ledger tracks product coverage by move; implementation should group work
by shared scripts, particles, affine transforms, palette effects, and other
reusable primitives. Do not build one absolute-tick timeline per move.

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

- **State:** ENDEAVOR is `exact`; coverage is now **4 exact / 8 partial /
  264 unsupported**. Its complete body, generic-hit, and HP-drain handoff are
  portable across both singles attacker sides and healthbox orientations.
- **Did:** generalized the existing source-timed squish/blend, translated
  droplets/hitsplats, stale-power shake, pic-coordinate y-offset, and live
  healthbox OAM priority behind the relative Scene-ON seam. The portable stock
  controller changes only ONIX's loaded move/PP slot; immutable 143→117 HP is
  presentation input, never a damage or battle-state mutation.
- **Evidence:** portable oracle frames **2345–2485** are **141/141** exact;
  canonical Scene-ON frames **2894–3130** are densely **237/237** exact.
  DOUBLE TEAM, FIRE PUNCH, ROCK SLIDE, FAINT ATTACK, and Battle-2 OFF controls
  remain **230/230**, **225/225**, **175/175**, **221/221**, and **191/191**.
  Raw RGB and the fresh probe JSON are temp-only.
- **Next:** do not reopen FAINT ATTACK ISSUE #38. The next independently
  actionable queue mechanism is FEATHERDANCE portability/opposite-side
  geometry. No absolute tick, framebuffer lookup, captured asset, per-frame
  pixel table, damage/RNG/turn, or facility mutation was added.
