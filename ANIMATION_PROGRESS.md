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

- **State:** **17 exact / 1 partial / 258 unsupported**. BLAZE KICK is exact
  for its complete source-owned body in both required orientations.
- **Did:** connected the existing target-relative reducer through the shared
  Scene-ON seam with the source `AFFINE_DOUBLE` spinning-foot program, both
  target-white ramps, the complex whole-field black blend/restore, and one
  persistent source allocation/order lifetime across foot, hitsplat,
  invisible palette owner, and seven FireSpread sprites. The semi-transparent
  hitsplat now samples the actual target-monbg/field target-2 backdrop rather
  than another same-priority OBJ.
- **Evidence:** player frames **399..476** and opponent frames **453..530**
  each match **78/78 component/OAM-order and 78/78 framebuffer frames** at
  relative ages **0..77**, with zero exclusions. FLAMETHROWER remains
  **126/126 RGB+component both** and DRAGON BREATH remains **85/85
  RGB+component both** after fresh dense control runs.
- **Next:** retain FIRE BLAST, EMBER, FIRE SPIN, and DRAGON RAGE as unsupported
  distinct-template siblings until each has independent dense move evidence;
  select the next bounded Level-50 acceptance unit from coverage.
