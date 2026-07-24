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

- **State:** **16 exact / 2 partial / 258 unsupported**. BLAZE KICK has a
  source-derived, two-orientation component checkpoint; it is not exact and
  has no framebuffer acceptance yet.
- **Did:** staged legal zero-PP-Up ONIX → MURKROW BLAZE KICK in both
  orientations and modeled its target-relative 78-frame source body without
  battle-frame branches: monbg/setalpha, ShakeMon2, hitsplat and spinning-foot
  lifetimes, plus all seven shared FireSpread fixed-point translations and
  sheet epochs. The reusable dense probe now identifies the distinct foot and
  FireSpread templates.
- **Evidence:** player frames **399..476** and opponent frames **453..530**
  each match **78/78** component frames at relative ages **0..77**. Full
  framebuffer acceptance is **0/78 both** because no BLAZE KICK compositor is
  wired. Existing FLAMETHROWER remains **126/126 RGB+component both** and
  DRAGON BREATH remains **85/85 RGB+component both**.
- **Next:** connect BLAZE KICK through the shared Scene-ON seam by deriving its
  distinct spinning-foot affine/OAM program, both target white palette ramps,
  whole-field complex black blend, and persistent ordering/composition across
  foot, hitsplat, target monbg copy, and seven FireSpread sprites. Promote
  only after all 78 framebuffer frames match in both orientations.
