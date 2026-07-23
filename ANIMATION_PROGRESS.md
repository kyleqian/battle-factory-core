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
- **Did:** `tools/probe/stage-fire-punch-portable-on.py` establishes the
  smallest reproducible ON-profile stage: at settled action-menu tick 1886 it
  changes only `gBattleMons[0].moves[0]/pp[0]`, then lets the stock controller
  execute FIRE PUNCH. Two fresh mGBA runs are byte-identical and pin synthetic
  **ONIX (back) → GROVYLE (front)** ownership (`gCurrentMove=7` by 2312, PP
  15→14 by 2336, target HP 143→112 by 2520). Evidence and exact scope:
  `docs/fire-punch-portable-staging-probe.md`.
- **Next:** add a relative Scene-ON presentation stage that consumes explicit
  attacker/target geometry and a FIRE_PUNCH resolution profile, then compare a
  complete dense ONIX→GROVYLE window. Do not couple it to the RAM patch or
  absolute battle ticks.
- **Boundary:** `appTrace.ts` currently stages only Scene-OFF
  `stageBattleTurn`, so the oracle construction has no honest app compare yet;
  FIRE_PUNCH remains `partial`. Canonical regression at this checkpoint:
  turn16-rung3 227/236 (21397–21405 residual), turn17-rung4 200/200.
