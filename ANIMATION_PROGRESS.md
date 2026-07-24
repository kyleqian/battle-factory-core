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

## Required next increment: anim-script interpreter spike (2026-07-24, user-directed)

Before more hand-fitted move modules, run **one bounded spike** and let its
result decide the lane's implementation unit.

**Why.** The lane is at 18 exact of 276. The sixteen moves with their own
module average **~220 lines each** of hand-derived age constants
(`firePunch.ts` opens with 20 magic `*_AGE` values, a hardcoded
`FIRE_PUNCH_AFTER_BURN_RNG_VALUE = 2012156700`, and two `TURN17_*` constants
inside a nominally portable module). At that unit cost the remaining 258 moves
are **~57,000 lines**, and `sceneOnPresentation.ts` grows a static import block
per move. Separately, `src/data/gen/battle-move-anim-scripts.json` — the
extracted anim command stream — **is not consumed by any `src/` module.** This
is the same situation the battle-script IR decision already resolved for rules
("moves select scripts; they do not each define a bespoke control path"),
applied to animation.

**The spike.** Build a minimal interpreter over the committed anim scripts plus
a direct port of the sprite callbacks for **one** already-`exact` move, and
check it against that move's existing dense evidence at its recorded count.
`MOVE_FEATHER_DANCE` is the recommended subject: its source callbacks
(`battle_anim_flying.c` `AnimFallingFeather` / `_Step`, ~50 lines) are
deterministic with no `Random()`, and its current module is a recorded-table
replay (ISSUES #40), so a success retires real debt rather than duplicating
work.

**This is falsifiable and either outcome is a result.** If the interpreter
reproduces the move, the lane's implementation unit becomes
script + ported callback, and hand-fitted timelines become the exception
requiring justification. If it cannot, record precisely which source construct
resists mechanical translation — that finding is worth more than another
hand-fitted move, and hand-fitting continues with the reason on record.

Move acceptance, dense oracle evidence, and both ledgers are unchanged by this;
only the implementation unit is in question.

## Current handoff

- **State:** **18 exact / 1 partial / 257 unsupported**. THUNDER PUNCH is exact
  for its complete move-owned body in both source-required orientations.
- **Did:** staged legal zero-PP-Up Level-50 ONIX → non-Ground MURKROW with
  source Factory set ids and extracted front/back art. Added the relative
  Thunder Punch seam: black ramp/restore, two inversions, three lightning
  programs, shared fist/two hitsplats/shake, monbg, alpha, and teardown.
- **Evidence:** player-back → opponent-front oracle **401..504** and
  opponent-front → player-back **452..555** are each **104/104 component +
  104/104 RGB exact**. The reverse second-bolt allocation retains the live
  hitsplat ahead for one 14-pixel overlap display, then returns to ordinary
  OAM order. Fresh controls remain exact: FIRE PUNCH **225/225 + 277/277**,
  ICE PUNCH **462/462 + 1294/1294**, BLAZE KICK **78/78 both**,
  FLAMETHROWER **126/126 both**, DRAGON BREATH **85/85 both**.
- **Next:** run `npm run animation:coverage` and resume the next ranked
  Level-50 component track; THUNDER PUNCH has no known move-owned remainder.
