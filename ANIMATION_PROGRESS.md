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
  honest two-orientation partial through terminal attacker affine age 96;
  QUICK ATTACK and AERIAL ACE remain exact.
- **Did:** extended EXTREME SPEED through its source affine-double attacker
  stretch behind the shared Scene-ON seam. The pure reducer uses command
  `(96,-13,0,8)` and pret's `SetBattlerSpriteYOffsetFromYScale` formula with
  source Arcanine front/back y-offsets **2/6**, not a fitted geometry table.
- **Evidence:** opponent-front frames **91–135** and player-back frames
  **87–131** are dense and exact at **45/45 + 45/45 RGB**, covering the
  background phases and every visible affine frame through age 96. Both full
  QUICK ATTACK controls remain **219/219 + 214/214** with immutable 117→111
  endpoints. Tier-1 pins affine epochs, matrices, front/back y2, terminal
  visibility, side selection, and immutability.
- **Next:** after EXTREME SPEED age 96, prove the hidden-attacker hold, three
  edge impacts, 24 dust spawns, blink reappearance, restore fade, and script
  cleanup in both complete move-owned windows at 0 RGB diff. Generic hit,
  HP/result/status, and controller tails remain separately owned.
