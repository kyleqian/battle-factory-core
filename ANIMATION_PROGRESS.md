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

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.
