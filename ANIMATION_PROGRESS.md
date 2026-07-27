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

## EARTHQUAKE promoted to exact; HorizontalShake / complex BG-palette track established (2026-07-27)

**Verdict:** `MOVE_EARTHQUAKE` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back DUGTRIO is
**197/197 task/RAM/palette and framebuffer frames** (oracle 80-276);
opponent-front DUGTRIO is **197/197** (84-280). Census: **29/276 exact, 3
partial, 244 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage DUGTRIO, the real
Level-50 Factory set-372 carrier, with all four choices constrained to
EARTHQUAKE; ONIX is constrained to TACKLE. The reducer ports the simultaneous
`AnimTask_HorizontalShake(platforms,10,50)` and
`AnimTask_HorizontalShake(all battlers,10,50)` tasks, including the source
two-tick scheduler, 13-to-0 decay, BG3_X, every visible battler x2, and the
front-sprite residue retained before the first shake write. Both BG-only
`complex_palette_blend(delay=3,count=1,black14,white14)` commands are pinned
at source-scheduled ages 13 and 31 against palette-sprite data and all 256
faded BG palette entries. The framebuffer seam separately models BG3/palette
at a one-frame display latch and battler OAM at two frames.

**Sibling audit (no promotions):** all six Level-50 HorizontalShake moves
were inspected. FISSURE retains target-only shake plus dirt plumes and the
fissure BG pipeline; SKY ATTACK has two-turn charge/strike, attacker-only
(2,16) shakes, bird/projectile/hitsplat bodies; MAGNITUDE has power-derived
intensity and two sequential shake pairs; ERUPTION has distinct (8,60)
shakes plus its eruption body; LUSTER PURGE has target-only (5,14) shake plus
psychic BG/orb/sparkle/palette bodies. The 21 Level-50
`complex_palette_blend` graph siblings were audited in
`ANIMATION_COVERAGE.json`: already-exact KNOCK OFF, BLAZE KICK, and AERIAL
ACE retain independent evidence; every named unsupported sibling has a
distinct incomplete body and remains unsupported. Source additionally shows
SKULL BASH's same literal BG pulse on a component-graph edge not currently
attributed to its Level-50 root.

**Evidence/controls:** legal fixtures, reproducible dense probe, portable
comparator, and focused Tier-1 tests are committed. Acceptance is **197/197
×2 in both orientations**. WATER GUN remains **111/111**, SUPERSONIC
**51/51**, and BIND **45/45**, both orientations, after the final renderer
change. The animation import boundary did not widen.

## WATER GUN promoted to exact; small-bubbles / water-impact track established (2026-07-26)

**Verdict:** `MOVE_WATER_GUN` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back HORSEA is
**111/111 component/RAM and framebuffer frames** (oracle 83-193);
opponent-front HORSEA is **111/111** (87-197). Census: **28/276 exact, 3
partial, 245 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage HORSEA, the real
Level-50 Factory set-60 carrier, with all four choices constrained to WATER
GUN; ONIX is constrained to TACKLE. The reducer covers
`ANIM_TAG_SMALL_BUBBLES`, `ANIM_TAG_WATER_IMPACT`, the projectile's complete
40-callback horizontal arc, hitsplat affine program 2, all three delayed
fixed-point/looping-affine droplets,
`splitbgprio/monbg/setalpha/blendoff/clearmonbg`, and only the literal
`AnimTask_ShakeMon2(target,1,0,8,1)` tuple. The compositor models the target
as `monbg` BG2—the water OBJ's real alpha target—while the attacker stays an
OBJ; source OAM slot ordering puts the hitsplat in front of the first droplet.

**Sibling audit (no promotions):** SMALL_BUBBLES: BUBBLE BEAM needs 18 large
projectiles, SwayMon, and its short bubble effect; SECRET POWER dispatches to
environment-specific complete scripts; DIVE needs both two-turn splash/spray
halves and RisingWaterHitEffect; MIST BALL needs its translating ball,
shake/palette tasks, and fog BG pipeline; FAKE TEARS needs BlendParticle,
RockMonBackAndForth, and eight tear sprites; WATER PULSE needs five bubbles,
three rings, shake, and BG blend. WATER_IMPACT: HYDRO PUMP needs paired orb
beams, sine timer, shakes, and repeated hitsplats; CRABHAMMER needs palette
blend, slide/return, shake, and eight bubble pairs; WATER SPOUT needs its
glowy-orb launch/rain tasks. All remain unsupported pending independent dense
evidence.

**Evidence/controls:** legal fixtures, reproducible extractor, dense RAM/RGB
probe, portable comparator, and focused Tier-1 tests are committed. Acceptance
is **111/111 ×2 in both orientations**. BIND remains **45/45** and SUPERSONIC
**51/51**, both orientations, after final renderer changes; ShakeMon2 and the
animation import boundary remain green.

**Verification:** **234 test files / 3141 tests green**; production build
green; coverage self-check reports **28/276 exact, 3 partial, 245
unsupported**.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.
