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

- **State:** ROCK SLIDE is `exact`; coverage is now **2 exact / 10 partial /
  264 unsupported**. Its complete unique Scene-ON body is portable across
  both singles orientations and retains the canonical Scene-ON and staged
  Battle-2 OFF controls.
- **Did:** replaced canonical press/target coupling with an explicit immutable
  relative profile and geometry seam. Rock origin comes from the target's
  source `BATTLER_COORD_X/Y + (0,14)`; BG3 shake, 20 source-script rocks,
  stable OAM order, target shake, healthbox wobble, blink, battler sheets, and
  printer ownership all consume local age/config. A stock-controller stage
  changes only GROVYLE's loaded AI move/PP slot and exercises opponent-front
  GROVYLE → player-back ONIX at ages **0–174**.
- **Evidence:** portable oracle frames **1967–2141** are **175/175** exact.
  Canonical Scene-ON ROCK SLIDE remains **256/256** and staged Battle-2 OFF
  remains **191/191**; FIRE PUNCH controls remain **225/225** and **277/277**,
  and portable FAINT ATTACK remains **221/221**. Raw RGB is temp-only. The
  staged stock outcome is 117→109 after the owned body and is never calculated
  or mutated by the presentation seam.
- **Next:** do not reopen FAINT ATTACK ISSUE #38. The next independently
  actionable queue mechanism is DOUBLE TEAM portability/opposite-side
  geometry. No absolute tick, framebuffer lookup, captured asset, per-frame
  table, outcome/RNG/turn, or facility mutation was added.
