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

- **State:** FAINT ATTACK's reusable body and both singles orientations are
  green, but it remains `partial` solely because parked register-visibility
  ISSUE #38 is still open. Coverage stays **1 exact / 11 partial / 264
  unsupported**.
- **Did:** extracted the source/task timings into an explicit immutable
  relative profile and extended the shared Scene-ON seam for BG_DARK, the
  side-respecting `(18,6,1,3)` ellipse, both alpha tasks, animation-1
  hitsplat, and `ShakeMon2`. A synthetic stock-controller stage changes only
  ONIX's loaded move/PP slot and exercises player-back ONIX → opponent-front
  GROVYLE across complete ages **0–220**.
- **Evidence:** portable oracle frames **2344–2564** are **221/221** exact.
  Canonical turn16 rung2a and turn17 rung2 remain **221/221** each; FIRE PUNCH
  portable controls remain **225/225** and **277/277**. Raw oracle RGB stays
  temp-only. The staged stock outcome is 143→129 after the owned body and is
  not calculated or mutated by the presentation seam.
- **Next:** do not reopen or patch ISSUE #38; FAINT ATTACK can become `exact`
  only if a general cycle/register-queue model resolves its single +30
  delayed-control frame. The next independently actionable queue mechanism is
  ROCK SLIDE portability/opposite-side geometry. No absolute tick,
  framebuffer lookup, captured asset, per-frame table, outcome/RNG/turn, or
  facility mutation was added.
