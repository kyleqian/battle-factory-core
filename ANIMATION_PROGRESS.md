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

- **State:** 12 Level 50 moves have strong canonical evidence but remain
  `partial` under the new portability definition; none is yet claimed generic
  `exact`.
- **Did:** the new relative Scene-ON adapter consumes explicit attacker/target
  side, sprite-corner, animation-center geometry, and an immutable FIRE_PUNCH
  resolution profile. The live compositor reuses the shared reducer, particles,
  impact priority, palette blend, battler sheets, healthboxes, and printer.
  `npm run compare:fire-punch-portable` runs the committed synthetic mGBA stage
  into a fresh temp-only RGB directory and is **225/225 exact** (frames
  2313–2537, reducer ages 0–224) for **ONIX (back) → GROVYLE (front)** through
  the completed super-effective printer; no screenshots or oracle pixels are
  committed or consulted at runtime.
- **Next:** audit and stage the opposite-attacker-side FIRE_PUNCH geometry.
  Keep the move `partial` until that evidence-required orientation also has a
  complete dense window through this same adapter.
- **Boundary:** portable ONIX→GROVYLE is complete, not a canonical-only claim.
  FIRE_PUNCH remains `partial` solely because the opposite attacker side is
  unaudited. Canonical regressions remain turn16-rung3 **227/236** (known
  21397–21405 residual) and turn17-rung4 **200/200**. Tier-1 is **1193/1193**.
