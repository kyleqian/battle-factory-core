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

- **State:** **11 exact / 3 partial / 262 unsupported**. FLY and BOUNCE are
  exact across both legal orientations; DIVE still needs independent evidence.
- **Did:** closed FLY's seven-frame canonical charge opening without changing
  its source affine table. Fresh pixel samples show the oracle preserves the
  established opponent terrain layer at `y>=74`; the prior sampler attribution
  was false. `drawSpriteSheetAffineStretch` now accepts the same generic
  optional bottom clip already used by the QUICK_ATTACK/AERIAL_ACE component
  family, and only the canonical layered path supplies it.
- **Evidence:** canonical charge/miss is **213/213** with frames 17781-17787
  restored (**7/7**); portable opponent charge/strike is **151/151 + 248/248**
  and player charge/strike is **147/147 + 244/244**, all with zero exclusions.
  Focused FLY/battle-scene/presentation/BOUNCE/status tests are **304/304**;
  the full suite is **1643/1643**, and build/coverage are green. Fresh BOUNCE
  charge/player-strike controls remain **24/24 + 24/24 + 197/197**; the local
  no-status/paralysis seed probes no longer reproduce their committed semantic
  outcomes (no opponent strike / 117→114 without paralysis), so their existing
  pixel evidence was not weakened or restaged from animation code.
- **Next:** continue the ranked Level-50 queue. DIVE remains unsupported; do
  not alter Battle Lab seed/outcome/PP staging from the animation lane.
