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

Move acceptance covers the move-owned animation body and its evidence-required
geometry variants. Generic hit reactions, HP/result presentation, statuses,
held-item use, and controller/menu handoffs are reusable presentation
components with independent coverage; they neither block nor promote a move
animation. A status caused by a move is not part of that move's animation.

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

- **State:** **17 exact / 1 partial / 258 unsupported**. THUNDER PUNCH remains
  honestly unsupported; this is a source/component checkpoint, not promotion.
- **Did:** extracted the distinct five-frame `ANIM_TAG_LIGHTNING` sheet and
  added a target-relative reducer for all three `gLightningSpriteTemplate`
  spawns. The portable probe now records live lightning slot/subpriority,
  position, tile, and palette state without changing damage/RNG/controller
  ownership. Shared Fire/Ice fist, hitsplat, and shake code is unchanged.
- **Evidence:** the player-back ONIX → opponent-front GROVYLE stock-ROM stage
  pins lightning displays at frames **2400..2433**: births **2400/2403/2406**,
  centers **(176,-4)/(176,28)/(176,60)**, five source tile frames, and
  independent **28-frame** OAM lifetimes; reducer vs live component state is
  **34/34 frames, 0 component mismatches**. The opposite GROVYLE → ONIX stage
  correctly produces no meaningful animation body because Electric is
  ineffective against Ground; therefore dense component/RGB acceptance is
  **0/0**, not claimed. RGB mismatch count is **N/A (0 frames compared)**
  because THUNDER PUNCH is not wired into the framebuffer seam. Focused
  Fire/Ice/Thunder controls are **32/32** green.
- **Next:** stage a genuinely legal non-Ground Level-50 opponent for the
  player-side target (with extracted front/back art), then connect this reducer
  plus source black-palette ramp, two whole-screen inversions, shared
  fist/hitsplat/shake, monbg, and teardown through the Scene-ON seam. Densely
  compare the complete meaningful body in both orientations; keep unsupported
  until both component and RGB counts are exact.
