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

- **State:** **9 exact / 5 partial / 262 unsupported**. FLY remains partial:
  all four portable practical windows are exact, but ISSUES #34's seven
  affine opening frames remain explicitly excluded. BOUNCE is now partial:
  both complete charge/strike bodies are exact in both orientations, while
  the complete controller resolution/cleanup tail remains open.
- **Did:** staged legal player-back set-121 SPOINK with seed `0x12345678`,
  extracted only its source back art, and generalized the existing BOUNCE
  compositor for side geometry. The shared reducer now carries the
  source-observed player-target hit-task lag and attacker restoration boundary,
  without changing damage, PP, status, turn order, or controller progression.
- **Evidence:** opponent-front fixtures remain charge **345-368 = 24/24** and
  strike **881-904 = 24/24**. New player-back fixtures match charge
  **261-284 = 24/24** and strike **777-800 = 24/24**. All four have zero
  exclusions and zero differing pixels. All four FLY portable windows remain
  green (**144/144 + 248/248 + 140/140 + 244/244**, with only ISSUES #34's
  declared seven charge exclusions). The player stage proves
  `ppUps:[0,0,0,0]`, PP `[5,5,5,5]→[4,5,5,5]`, and stock HP
  **SPOINK 153→141 / ONIX 117→114**.
- **Next:** prove BOUNCE's complete controller resolution and cleanup tail
  through the same Scene-ON seam before exact promotion. Preserve both
  orientations, all four FLY windows, and ISSUES #34.
