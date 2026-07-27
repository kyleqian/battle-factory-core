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

## HARDEN promoted to exact; MetallicShine track established (2026-07-27)

**Verdict:** `MOVE_HARDEN` is exact through the shared Scene-ON seam in both
required orientations, each reproduced twice. Player-back and opponent-front
RELICANTH are each **101/101 component/task/RAM/register/hardware-palette/
software+hardware-OAM and framebuffer frames** (oracle 292-392). Census:
**32/276 exact, 3 partial, 241 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage RELICANTH with the
real Level-50 Factory set-259 species, Sassy nature, three-way EV spread, and
Liechi Berry; every active choice is constrained to HARDEN and ONIX to TACKLE.
The source reducer ports all three 128px sweeps at 4px/callback, BG1_X wraps,
BG1 metal-shine gfx/tilemap/palette, invisible attacker copy/OBJ-window mask,
grayscale palette and permanent=FALSE restoration, WIN/DISPCNT/BLDCNT/
BLDALPHA/BG1 attributes, `ClearBattleAnimBg`, and teardown. The dense probe
pins the two-capture initializer, the two-capture clear wait, palette/OAM
display latches, full hardware registers, palette, OAM, VRAM hash, and RGB.
The source loop-sound command was audited; no sound task row survives into
the probe-visible move-owned visual window.

**Sibling audit (no promotions):** STEEL WING still needs its gust pair,
elliptical translation, palette task, slide/return, dual hitsplats, and alpha/
monbg body; IRON TAIL needs permanent=TRUE, lunge/hitsplat/ShakeMon, explicit
palette restore, and alpha/monbg body; METAL CLAW needs two lunges, four claw
slashes, and two Y-shakes; IRON DEFENSE adds its concurrent delay-8/count-2
white-alpha BG blend; POISON TAIL uses permanent=TRUE with custom
RGB(24,6,23), then needs lunge/hitsplat/ShakeMon, restore/alpha/monbg, and
PoisonBubblesEffect. All remain unsupported without independent dense move
acceptance.

**Evidence/controls:** reproducible legal fixtures, asset extractor, dense
probe, portable comparator, and focused Tier-1 reducer tests are committed.
Acceptance is **101/101 ×2 in both orientations**. After the final renderer
change EARTHQUAKE remains **197/197**, ACID **131/131**, and BIND **45/45**,
each in both orientations. Palette/reducer/import-boundary tests remain green;
the boundary did not widen.

## SYNTHESIS promoted to exact; SPARKLE_2 / GrantingStars track established (2026-07-27)

**Verdict:** `MOVE_SYNTHESIS` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back SKIPLOOM is
**130/130 component/task/RAM/palette and framebuffer frames** (oracle
609-738); opponent-front SKIPLOOM is **130/130** (220-349). Census:
**31/276 exact, 3 partial, 242 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage SKIPLOOM, the real
Level-50 Factory set-129 carrier. Stock TACKLE damage creates missing HP; no
transient battle state is injected. The reducer ports the literal delay-2
two-leg attacker `blend_color_cycle` (0→16→0), both
`gGrantingStarsSpriteTemplate` fixed-point/frame-animation bodies from
`GrantingStarsEffect`, the asset unload/delay/load boundary, and the full
already-shared `HealingEffect`. `ANIM_TAG_SPARKLE_2`, SKIPLOOM front/back
chrome, source OAM ordering, palette coefficients, and carrier tile VRAM are
extracted or probed reproducibly.

**Sibling audit (no promotions):** HEAL BELL still needs its bell, twelve
palette-managed music notes, three HealBellRing tasks, the distinct
`gSparklingStarsSpriteTemplate`, and finale; WISH needs gold stars, black-BG
fade/pan, wish star, and delay; REFRESH needs StatusClearedEffect, palette
restore, and thin ring; AROMATHERAPY needs nine flowers, green BG/monbg,
thin ring, and `HealingEffect2`; COSMIC POWER needs its non-attacker palette
fades, cosmic BG pipeline, sound tasks, delay, and two GrantingStars calls.
All remain unsupported pending independent complete dense acceptance.

**Evidence/controls:** legal fixtures, reproducible extractor, dense
task/OAM/palette/RGB probe, portable comparator, and focused Tier-1 tests are
committed. Acceptance is **130/130 ×2 in both orientations**. After the final
renderer change RECOVER remains **169/169**, MILK DRINK **186/186**, and BIND
**45/45**, each in both orientations. The shared blend-color-cycle and
HealingEffect tests and animation import boundary remain green.

## ACID promoted to exact; poison-bubble track established (2026-07-27)

**Verdict:** `MOVE_ACID` is exact through the shared Scene-ON seam in both
required orientations, each reproduced twice. Player-back EKANS is **131/131
component/task/RAM/palette and framebuffer frames** (oracle 76-206);
opponent-front EKANS is **131/131** (80-210). Census: **30/276 exact, 3
partial, 243 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage EKANS, the real
Level-50 Factory set-53 carrier, with all four choices constrained to ACID;
ONIX is constrained to TACKLE. The reducer ports all three literal
`gAcidPoisonBubbleSpriteTemplate` 40-callback arcs, attacker-side mirroring,
animation selection and average target geometry; both literal
`AnimTask_ShakeMon2(target/defender partner,2,0,10,1)` calls (only the target
has a visible singles sprite); the defender-side delay-2 two-leg
`blend_color_cycle`; and all five delayed fixed-point/looping-affine
`gAcidPoisonDropletSpriteTemplate` bodies. The Scene-ON compositor preserves
`monbg`/`clearmonbg`, faded BG+OBJ palette rows, one-frame position/affine
display latches, side-specific battler overlap, and the shared persistent
`sSpriteOrder` reducer's y sort, destruction, and low-slot reuse.

**Sibling audit (no promotions):** TOXIC retains two four-sprite
`ToxicBubbles` waves plus the separate six-sprite `PoisonBubblesEffect`;
SLUDGE needs its sludge projectile, target ShakeMon, delay-1 blend, and
PoisonBubblesEffect; SLUDGE BOMB needs ten projectiles, twelve hit particles,
its distinct ShakeMon2/blend/waitsound body, and PoisonBubblesEffect; POISON
FANG needs the fang sprite, target ShakeMon, four-leg palette cycle, and
PoisonBubblesEffect; POISON TAIL needs metallic shine, lunge, hitsplat,
ShakeMon, alpha/monbg teardown, and PoisonBubblesEffect. All remain
unsupported without independent dense move acceptance.

**Evidence/controls:** legal fixtures, reproducible extractor, dense
task/OAM/hardware-OAM/palette/RGB probe, portable comparator, and focused
Tier-1 tests are committed. Acceptance is **131/131 ×2 in both
orientations**. After the final renderer change WATER GUN remains **111/111**,
SUPERSONIC **51/51**, and BIND **45/45**, both orientations; ShakeMon2 and
the animation import boundary remain green.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.
