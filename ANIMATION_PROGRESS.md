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

- **State:** **15 exact / 1 partial / 260 unsupported**. EXTREME SPEED is exact
  in both source-selected attacker orientations through its complete retained
  move-owned source window.
- **Did:** implemented all three animation-3 mon-edge hitsplats with frozen
  source geometry, reciprocal affine matrix, live 12:8 alpha, and OAM ordering;
  corrected opponent-target `monbg` displacement by preserving pret's unsigned
  +6/-6 pulses; aligned BATTLER_COORD dust geometry, final-frame destruction,
  both blink/hold epochs, fourteen-toggle reappearance, and restore display
  latches. All clocks remain component-relative.
- **Evidence:** opponent-front ARCANINE → player-back DUGTRIO is **303/303 RGB**
  (frames 91–393, animation ages 52–354); player-back ARCANINE →
  opponent-front DUGTRIO is **303/303 RGB** (frames 87–389, animation ages
  52–354 after the four-frame printer offset). QUICK ATTACK remains
  **219/219 + 214/214** and AERIAL ACE **236/236 + 232/232**. Focused tests pin
  the shared reducer/display epochs; comparator diagnostics now retain the
  first mismatch images and bounds when a regression occurs.
- **Next:** return to the supervisor; EXTREME SPEED has no known move-owned
  remainder. Generic hit/HP/result/status/controller tails remain independently
  owned and were not promoted by this move evidence.
