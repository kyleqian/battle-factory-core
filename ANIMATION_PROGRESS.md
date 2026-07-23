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
- **Did:** the relative Scene-ON adapter's existing player-side FIRE_PUNCH
  stage remains **225/225 exact** for **ONIX (back) → GROVYLE (front)**
  (frames 2313–2537 / ages 0–224). The new opponent route in
  `stage-fire-punch-portable-on.py` stages only GROVYLE's stock AI-selected
  slot 3 (`DOUBLE_TEAM→FIRE_PUNCH`) at tick 1886; two fresh Scene-ON probes
  were byte-identical. It pins **GROVYLE (front) → ONIX (back)** geometry
  (corners `(144,12)/(40,48)`, animation centers `(176,44)/(72,88)`), epoch
  frame 2081, and its stock-controller outcome: PP 15→14 at 2080, ONIX
  117→96 at 2130, burn status1 0→16 at 2223, controller release 2358. The
  dense 2081–2357 fixture is committed; RGB remains temporary-only.
- **Next:** wire that committed GROVYLE→ONIX fixture through the existing
  generic relative adapter and run its complete dense comparison. Do not claim
  FIRE_PUNCH `exact` unless it is green; its large ONIX target geometry and
  target-side compositing are a real evidence variant.
- **Boundary:** FIRE_PUNCH remains `partial`: the player-back portable
  comparison is complete, but the opposite-side **app** comparison is not yet
  run. Canonical controls remain turn16-rung3 **227/236** (known
  21397–21405 residual) and turn17-rung4 **200/200**. This probe does not
  alter runtime/compositor, battle logic, RNG, damage, turn order, or facility
  state.
