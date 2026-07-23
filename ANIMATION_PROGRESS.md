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

- **State:** FIRE_PUNCH now has complete dense portable evidence on both
  singles orientations, but remains honestly `partial` because its canonical
  turn16 control retains a known nine-frame remainder. Overall Level 50
  coverage is still 0 exact / 12 partial / 264 unsupported.
- **Did:** **GROVYLE (front) → ONIX (back)** is **277/277 exact** for the full
  committed Scene-ON frames 2081–2357 / ages 0–276; the existing
  **ONIX (back) → GROVYLE (front)** case remains **225/225 exact**. The shared
  seam now consumes explicit side geometry, immutable 117→96/burn timing,
  player healthbox ownership, hit blink/wobble, not-very-effective/burn
  printers, and source-derived status animation geometry. The reusable
  right-to-left flame path uses `InitAnimLinearTranslation`'s direction bit
  (`614 | 1 = 615`) and the player BATTLER_COORD base `(72,80)`, distinct
  from its move-animation center `(72,88)`. Battler-0 BRN uses source tile
  `0x1A` / dynamic palette slot 12. Temporary RGB remains outside production.
- **Next:** close or explicitly settle only the canonical turn16 FIRE_PUNCH
  remainder before promoting this move to `exact`: frames 21397–21405 each
  differ by 183 pixels. Do not redo the two portable orientation audits.
- **Boundary:** canonical controls are unchanged: turn16-rung3 **227/236**
  (only 21397–21405, 183px each) and turn17-rung4 **200/200**. Presentation
  consumes outcome/RNG/turn state as immutable inputs; no battle logic,
  facility state, absolute-tick rule, screenshot lookup, or per-frame pixel
  table was added.
