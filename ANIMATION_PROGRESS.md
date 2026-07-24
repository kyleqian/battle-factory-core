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

- **State:** **14 exact / 2 partial / 260 unsupported**. EXTREME SPEED is an
  honest two-orientation partial; its earlier complete-affine windows remain
  exact, while complete-window evidence is now retained and failing.
- **Did:** corrected the source impact reducer to accumulate all three
  displacement pulses before its 24-step edge return, and added pure
  source-relative reducers/composition for the 24 speed-dust spawns and
  fourteen-toggle attacker reappearance. Extended both fixtures through
  restore/script cleanup age 354; no absolute battle clock was added.
- **Evidence:** the preserved prefixes remain **46/46 + 46/46 RGB**. Complete
  move-owned attempts are opponent-front **156/303** (frames 91–393) and
  player-back **150/303** (frames 87–389), honestly non-exact. Focused EXTREME
  SPEED, QUICK ATTACK, AERIAL ACE, and shared-seam tests pin the reducer clocks
  and preserve both exact controls.
- **Next:** implement the three animation-3 edge hitsplats with their live
  alpha/OAM ordering, solve opponent-target `monbg` priority (first opposite
  side mismatch is frame 161), then align dust blink/spawn display epochs and
  reappearance OAM before rerunning both retained 303-frame windows.
