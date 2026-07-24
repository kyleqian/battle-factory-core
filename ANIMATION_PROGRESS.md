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
  its complete opponent-front charge and strike bodies are exact, while the
  opposite orientation and controller resolution/cleanup tail remain open.
- **Did:** extracted SPOINK's source front art and installed BOUNCE's shared
  Scene-ON framebuffer path: source-relative affine balls, attacker visibility,
  monbg-owned target y2, ball/hitsplat OAM order, semitransparent backdrop,
  source-composed healthboxes, and controller-owned move-used text.
- **Evidence:** committed legal zero-PP-Up SPOINK→ONIX dense fixtures match
  charge **345-368 = 24/24** and strike **881-904 = 24/24**, with zero
  exclusions and zero differing pixels. All four FLY portable windows remain
  green (**144/144 + 248/248 + 140/140 + 244/244**, with only ISSUES #34's
  already-declared seven charge exclusions). PP remains `[5,5,5,5]→
  [5,5,5,4]` with `ppUps:[0,0,0,0]`; stock HP remains **117→114**.
- **Next:** stage the legal opposite-side SPOINK case, extract only its required
  back art, and prove both bodies plus the complete controller resolution and
  cleanup tail before exact promotion. Preserve all FLY windows and ISSUES #34.
