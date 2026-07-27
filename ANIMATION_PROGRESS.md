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

## Knock Off opposite orientation closed; promoted to exact (2026-07-26)

**Verdict:** `MOVE_KNOCK_OFF` promotes **partial → exact**. Its complete
move-owned Scene-ON body is source component/RAM-exact and framebuffer-exact
through the shared seam in both required orientations, each reproduced twice:
player-back PLUSLE → opponent-front ONIX is **59/59** (oracle 70-128), and
opponent-front PLUSLE → player-back ONIX is **59/59** (74-132). Census:
**24/276 exact, 3 partial**.

**Source/geometry:** the complete legal opposite mechanicLab fixture places
SHUPPET in opponent battle RAM and ONIX in player battle RAM, while the source
route's already-loaded chrome truthfully remains opponent-front PLUSLE and
player-back ONIX. HorizontalLunge, ShakeMonInPlace, SlideMonToOffset, and
SlideMonToOriginalPos required no new timing or species variant. The only new
display dependency is source-declared: `AnimKnockOffStrike` starts affine
program 1 when the target is player-side (`xScale=-256`, `rotation=+4`) and
applies literal argv[0] with `x -= -16` instead of the opponent target's
`x += -16`. PLUSLE's 40×48/yOffset-14 front source uses corner `(144,22)`;
ONIX reuses the established player-back corner `(40,48)`. All selection is by
battler side/species geometry—no oracle frame, turn, damage, RNG, or facility
branch.

**Evidence:** new legal fixture
`mechanic-knock-off-opponent-shuppet-player-onix.json`, portable fixture
`knock-off-opponent-onix-player-plusle.json`, generalized
`knockOffPortable.ts`, source-extracted PLUSLE front art, and focused Tier-1
asset/geometry/seam tests. Fresh acceptance: KNOCK_OFF **59/59 component +
framebuffer ×2 in both orientations**. BIND regression: **45/45 component +
framebuffer ×2 in both orientations**. `MOVE_SUPER_FANG` stays unsupported:
its full body additionally needs `gSuperFangSpriteTemplate`,
`AnimTask_BlendMonInAndOut`, palette blend, and independent dense evidence.
`MOVE_SECRET_POWER` stays unsupported: the Factory building branch dispatches
to `Move_STRENGTH`, while other environments dispatch to distinct bodies.
Shared reducers promote neither sibling. Implementation commit: `a6df4ee`.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.

## Psychic-family opposite orientation closed: CONFUSION/PSYCHIC promoted to exact; FUTURE_SIGHT stays exact (2026-07-26)

**Verdict:** opponent-front KADABRA attacking player-back ONIX is exact through
the shared Scene-ON seam for all three family moves. `MOVE_CONFUSION` and
`MOVE_PSYCHIC` promote `partial` → **`exact`**; `MOVE_FUTURE_SIGHT` remains
**`exact`**. Census: **23/276 exact, 3 partial**.

**Source/geometry:** all move tasks and psychic-background branches are
side-agnostic. The actual new dependencies were KADABRA's battle
`anim_front.png` (frame 0 genuinely differs from generic `front.png`), front
coords **56×56 / yOffset 5** (corner `(144,13)`, animation center `(176,45)`),
frame program **0×12, 1×45, 0×15**, and `ANIM_GROW_VIBRATE`. That family ends
through `ResetSpriteAfterAnim`, leaving identity affine and zero `x2/y2`;
ONIX is now player-back, so its opponent-front idle residual does not apply.
The runtime asset stays under `src/animation/assets/`; shared generated
catalogs and boundary ratchets are unchanged.

**Implementation/evidence:** the three `battleScene.ts` cases select
KADABRA front/back and ONIX back/front solely by battler side; no timing,
absolute-frame, damage, RNG, turn, or facility branch changed. Complete legal
mechanicLab party fixtures stage the opposite orientation. Fresh results,
each reproduced twice: CONFUSION opponent **140/140** (frames 85-224),
PSYCHIC opponent **140/140** (83-222), FUTURE_SIGHT opponent **114/114**
(81-194). Existing player orientations reproduced twice at **140/140,
140/140, 114/114**. Regression gates twice in both orientations: GROWTH
**63/63 component + framebuffer**, BIND **45/45 component + framebuffer**.

**Verification:** Tier-1 asset/geometry/side tests added; **227 test files /
3041 tests** and production build green. Implementation commit:
`abc5474 feat(animation): close psychic opposite orientation`.
