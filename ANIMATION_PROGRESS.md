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

- **State:** FIRE_PUNCH is the first Level 50 move promoted to `exact`.
  Coverage is now **1 exact / 11 partial / 264 unsupported**; FAINT ATTACK is
  first in the remaining queue.
- **Did:** closed canonical turn16 frames **21397–21405** by removing an
  implicit lethal-profile default from the shared faint projection. Those
  nine frames begin at FIRE_PUNCH age 227, where the default had leaked Turn
  17's already-burned faint state into Turn 16 and prematurely replaced the
  opponent healthbox's fixed 32×8 HP slot with BRN (**183 px**, bbox
  `x=20..51,y=30..37`). Faint rendering now consumes the same explicit
  immutable resolution profile as the cast; the nonlethal profile has no
  faint projection.
- **Evidence:** turn16 rungs 3–5 are **236/236**, **155/155**, **175/175**;
  turn17 rungs 4–5 are **200/200**, **113/113**; portable ONIX→GROVYLE is
  **225/225** and GROVYLE→ONIX is **277/277**. All are complete dense
  Scene-ON windows through the shared seam with both singles orientations,
  non-burn, burn, already-burned, nonlethal, and lethal outcomes represented.
- **Next:** work FAINT ATTACK's canonical-clock extraction and opposite-side
  portability without reopening parked register-visibility ISSUE #38.
  No outcome/RNG/facility state, absolute tick, framebuffer lookup, captured
  oracle asset, or per-frame table was added.
