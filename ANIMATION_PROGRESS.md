# Animation coverage

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

> **Layout (since 2026-07-26, PROGRESS entry 480):** animation-lane modules
> live in `src/animation/` and their tests in `tests/animation/` — no longer
> mixed into `src/engine/`. `tests/animation/animationBoundaryRatchet.test.ts`
> pins the import boundary (animation→engine: `battleMenu`/`bg`/`rng` only;
> engine→animation: `battleScene.ts`+`core.ts` only; kernel/AI imports
> forbidden). Comparators stay in `tools/compare/`. Path citations in this
> file and the coverage JSON are updated; `ANIMATION_PROGRESS-archive.md`
> keeps historical `src/engine/` paths as written.

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

## SUPERSONIC promoted to exact; splitbgprio_foes / sonic-ring track established (2026-07-26)

**Verdict:** `MOVE_SUPERSONIC` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. The player-back route is
**51/51 component/RAM and framebuffer frames** (oracle 80-130); the
opponent-front route is **51/51** (84-134). Census: **27/276 exact, 3
partial, 246 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage LOUDRED, the real
Level-50 Factory set-144 carrier, with all four active choices constrained to
SUPERSONIC; ONIX is constrained to TACKLE. The reducer covers all six literal
`SupersonicRing` calls at the source scheduler's four-display-tick cadence,
`ANIM_TAG_GOLD_RING`, `gSupersonicRingSpriteTemplate`'s growing affine program,
the complete 30-tick `TranslateAnimSpriteToTargetMonLocation` fixed-point
body, `splitbgprio_foes`, `monbg`/`setalpha`/`blendoff`/`clearmonbg`, and the
already-proven literal `AnimTask_ShakeMon2(attacker,2,0,8,1)` tuple. The
mechanicLab RAM override truthfully retains the route's already-loaded DUSTOX
chrome, as Knock Off's established seam precedent does; semantic carrier and
presentation chrome are explicit separate fixture inputs.

**Display dependencies:** rings are normal (not semi-transparent) OBJ despite
the script's alpha command. Position/affine OAM transfers one VBlank after
component RAM. Same-subpriority ring overlap inherits the route's persistent
side-specific `sSpriteOrder`; selection is by attacker side, never oracle
frame. Both complete orientations pin this variant.

**Sibling audit (no promotions):** METAL SOUND needs its large metal-wave
template/pan body; ABSORB its eight sine drain orbs, hitsplat/shake, and green
blend; MEGA DRAIN its paired 16-orb stronger-green body; DREAM EATER its
psychic background, target scale/shakes, and 24 orbs; FLAME WHEEL its outward
fire spiral, lunge/return, fire spread, and BlendMonInAndOut; GIGA DRAIN its
24-orb/high-green body; WILL-O-WISP its wisp orb/fire templates, panning task,
and both split commands. All remain unsupported without independent complete
dense evidence.

**Evidence/controls:** committed legal fixtures, reproducible extractor,
dense RAM/RGB probe, portable comparator, and focused Tier-1 reducer tests.
Fresh acceptance is **51/51 ×2 in both orientations**. BIND remains **45/45**
in both orientations and ShakeMon2's exact Tier-1 control stays green. The
animation/engine import boundary did not widen.

## MILK DRINK promoted to exact; HealingEffect2 / thin-ring family represented (2026-07-26)

**Verdict:** `MOVE_MILK_DRINK` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice: player-back MILTANK is
**186/186** component/RAM and framebuffer frames (oracle 617-802), and
opponent-front MILTANK is **186/186** (621-806). Census: **26/276 exact, 3
partial, 247 unsupported**.

**Source/probe:** complete legal mechanicLab parties use MILTANK Factory set
411, with all four active choices constrained to MILK DRINK; ONIX is
constrained to TACKLE. Turn 1 stages real stock-engine damage and turn 2
supplies the accepted healing body. The relative reducer covers
`gMilkBottleSpriteTemplate` / `AnimMilkBottle`'s alternating blend, hold,
affine wobble, fall, and blend-out; `ANIM_TAG_MILK_BOTTLE`; affine program 1
and terminal hold for `gThinRingExpandingSpriteTemplate` /
`ANIM_TAG_THIN_RING`; `monbg`/`clearmonbg`; and target-side `HealingEffect2`.
The blue stars reuse RECOVER's shared frame/geometry component only where the
literal args match. RAM evidence additionally pins `clearmonbg`'s two
sprite-animation ticks before the first HealingEffect2 child, and framebuffer
evidence pins bottle OAM at a one-frame latch while its blend registers are
current-frame.

**Sibling audit (no promotions):** `MOVE_SOFT_BOILED` has a distinct
two-sprite breaking-egg body, attacker shake, palette blend, and two
offset affine-program-0 thin rings before target `HealingEffect2`.
`MOVE_PRESENT` has a common moving item-bag body followed conditionally by
either five explosions or nine green healing particles before target
`HealingEffect2`. Each needs its own complete dense move evidence, with
PRESENT requiring both conditional outcomes.

**Evidence/controls:** committed legal fixtures, reproducible sprite
extractor, dense RAM/RGB probe, portable comparator, and focused Tier-1
tests. Fresh acceptance is **186/186 ×2 in both orientations**. RECOVER
remains **169/169** and BIND **45/45**, both orientations, as regression
controls. Implementation commits: `51206b4`, `e752c6e`.

**Verification:** **232 test files / 3135 tests green**; production build
green; coverage self-check reports **26/276 exact, 3 partial, 247
unsupported**. The animation-owned coverage ratchet advanced by exactly this
one accepted move; the animation/engine import-boundary ratchet did not widen.

## Healing blue-star track established; RECOVER promoted to exact (2026-07-26)

**Verdict:** `MOVE_RECOVER` is the sole promoted acceptance unit. Its complete
move-owned Scene-ON body is source component/RAM-exact and framebuffer-exact
through the shared seam in both required orientations, each reproduced twice:
player-back KADABRA is **169/169** (oracle 611-779), and opponent-front
KADABRA is **169/169** (615-783). Census: **25/276 exact, 3 partial**.

**Source/probe:** complete legal mechanicLab parties use KADABRA, a real
Level-50 Factory RECOVER carrier, with all four choices constrained to
RECOVER; ONIX is legally constrained to TACKLE. Turn 1 stages real damage
through the stock battle engine, and turn 2 supplies the accepted healing
body—no HP injection or transient override. The shared reducer covers all 21
literal `RecoverAbsorbEffect` spawns, `gPowerAbsorptionOrbSpriteTemplate`'s
Q8.8 translation and affine shrink, side-mirrored attacker geometry,
`ANIM_TAG_ORBS`, the six-leg 0↔11 yellow palette cycle,
`monbg/setalpha/blendoff`, and `HealingEffect`'s four
`gHealingBlueStarSpriteTemplate` sprites and complete frame program. The only
shared timing generalization is source-shaped: a non-divisible 11/2 palette
swing needs one clamp-transfer tick beyond an even swing; GROWTH's established
0↔8 durations remain unchanged.

**Sibling audit (no promotions):** ABSORB still needs its 8 sine drain orbs,
hitsplat/shake, and green field blend; MEGA_DRAIN its paired 16-orb stronger
green body; DREAM_EATER its psychic background, target scale/shakes, and
24-orb body; GIGA_DRAIN its 24-orb/high-green body; SOFT_BOILED its breaking
egg, thin rings, shake, and target-side `HealingEffect2`; MILK_DRINK its milk
bottle, thin ring, and `HealingEffect2`; PRESENT both conditional bag/explosion
and green-particle heal branches plus target healing; SYNTHESIS its
`GrantingStarsEffect` and 0→16 attacker blend; MOONLIGHT its blackout, moon,
alpha tasks, and sparkle pipeline; SWALLOW its move-turn-dependent deform,
shakes, and blue-orb multiplicity. All ten remain unsupported pending their
own complete dense evidence.

**Evidence/controls:** fixtures, dense RAM/RGB probe, source asset extractor,
portable comparator, and Tier-1 reducer tests are committed in `2218cc2` and
`a48b361`. Fresh acceptance is **169/169 component + framebuffer ×2 in both
orientations**. GROWTH remains **63/63** and BIND **45/45**, each in both
orientations, as self-target/palette and seam controls. The non-exclusive
`healing-blue-star` track is registered in `ANIMATION_COVERAGE.json`; only
RECOVER has an exact coverage entry.

**Verification:** **231 test files / 3131 tests green**; production build
green; coverage self-check reports **25/276 exact, 3 partial, 248
unsupported**.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.
