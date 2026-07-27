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

## Current resumable state (2026-07-27)

Coverage is **36/276 exact, 4 partial, 236 unsupported**. SING has a
source-derived 12-note/path/palette-index/pan reducer and portable dense
component evidence across its first complete move-animation script block:
**245/245 player-back + 248/248 opponent-front**, each reproduced twice fresh.
It remains partial because extracted art, affine hardware OAM, rainbow
allocation/free, monbg/clearmonbg and shared-seam RGB/framebuffer closure are
not yet implemented. Resume that precisely bounded remainder; do not promote
the four audited siblings without their own complete dense evidence.
Animation-main is green at this checkpoint.

## SING partial evidence checkpoint; ANIM_TAG_MUSIC_NOTES track established (2026-07-27)

**Verdict:** `MOVE_SING` is partial, not exact. Complete legal Scene-ON
mechanicLab parties stage AZURILL from real Factory set 1 in both player-back
and opponent-front orientations, with all four active choices constrained to
SING and ONIX constrained to TACKLE. The portable comparator matches note/task
state for the complete first move-animation script block at **245/245
player-back** (oracle 213-457; notes 220-362) and **248/248 opponent-front**
(oracle 215-462; notes 222-367), each reproduced twice fresh. The dense probe
also captures registers, battler priority, full OBJ palettes, raw OAM and RGB,
but those fields are evidence inputs rather than claimed matches.

**Source reducer:** all twelve `gWavyMusicNotesSpriteTemplate` spawn ages,
animation indices/vFlip, signed fixed-point paths, sine y2 values, four
cycling rainbow palette indices, repeating affine scale program, and
side-relative `panse` task boundaries are ported and Tier-1 pinned. No absolute
battle ticks, screenshots, coordinate/RGB fitting, exclusions, comparator
weakening, engine imports, or unsupported barriers were added.

**Precisely bounded remainder:** reproducibly extract MUSIC_NOTES art; compare
hardware affine matrices and palette allocation/free/latches; port the
`monbg ANIM_DEF_PARTNER` clone/priority/OAM and `clearmonbg` cleanup lifecycle;
then wire SING through `sceneOnPresentation`/`battleScene` and close raw RGB
plus shared-seam framebuffer in both orientations. Re-run ENCORE and BIND as
exact controls. Until all of that closes, SING remains partial.

**Sibling audit (all unsupported):** BELLY DRUM has six alternating purple-hand
hits, six ShakeMon tasks, six slow flying-note arcs and attacker-pan sounds;
TEETER DANCE has its movement task, five fast flying-note paths/sounds and
DUCK asset; FAKE TEARS has a distinct SMALL_BUBBLES blend,
RockMonBackAndForth, looped tail-whip audio and eight thought-bubble/music-note
tear sprites; GRASS WHISTLE fixes all twelve notes to palette index 1/no
cycling and wraps them in whole-BG green blend/restore with its own pan sweep.
None has independent complete dense evidence, so none is promoted.

## DRAGON CLAW promoted to exact; PlaySE1WithPanning track established (2026-07-27)

**Verdict:** `MOVE_DRAGON_CLAW` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back and
opponent-front ALTARIA are each **137/137 strengthened component and
framebuffer frames** (oracle 82-218 and 86-222). Census: **35/276 exact,
3 partial, 238 unsupported**.

**Source/probe:** legal challenge-0 mechanicLab contexts use complete parties
around real Level-50 Factory `FRONTIER_MON_ALTARIA_1` set 412 and constrain
stock choices without transient state. Supervisor-requested evidence now
checks the target `gSpriteCoordOffsetY`, both forward/reverse palette-task
boundaries and coefficients, faded plus hardware attacker palettes, transient
SE1 song/pan restarts, sprite callbacks/lifetimes, and allocation uniqueness
in addition to the existing FireSpin/claw/attacker reducer. That stronger pass
found and fixed the reverse task's true age-93 start and the target shake's
local-age-10 restore.

**Renderer:** `battleScene.ts` now draws the extracted ALTARIA/Onix field,
hardware-latched attacker palette, task-driven ShakeMon plus both lunge phases,
all FireSpin and claw sprites, target global-Y shake, text/healthboxes, and
cleanup. Effect composition ports `SortSprites`: equal-priority sprites order
by final OAM Y (including y2), then source creation order. No absolute battle
ticks, screenshots, exclusions, or new unsupported barriers were added.

**Sibling audit (no promotions):** SKY ATTACK retains both two-turn
charge/strike branches and sky/bird/fade/impact body; RETURN retains every
friendship-power branch and its dips/lunges/hitsplats/shakes; FLATTER retains
spotlight/hardware fades, dips, 38 confetti sprites, and attacker/target sound
events; LUSTER PURGE retains psychic/white BG transitions, circle/particle
blends, six RNG hitsplats/sounds, target shake, and restore; COSMIC POWER
retains non-attacker blends, cosmic BG slide/restore, two granting stars, and
distinct centered/attacker-pan sounds. All remain unsupported.

**Controls:** AERIAL ACE remains **232/232** player-back and **236/236**
opponent-front, KNOCK OFF **59/59** in both orientations, and BIND **45/45**
in both orientations, all framebuffer-exact.

## ENCORE promoted to exact; GBA OBJ-window compositor established (2026-07-27)

**Verdict:** `MOVE_ENCORE` is exact for the complete move-owned Scene-ON body
in both player-back and opponent-front MINUN orientations. Each is **215/215
strengthened component and framebuffer frames**, reproduced twice. Coverage is
**36/276 exact, 3 partial, 237 unsupported**.

**Source/probe:** complete legal mechanicLab parties use the real challenge-0
Level-50 carrier `FRONTIER_MON_MINUN_1` set 187 (species 354, Docile, HP/DEF
EVs, Salac Berry, SPARK/CHARM/ENCORE/HELPING HAND) and stage a real preceding
move before legally selecting ENCORE. The reducer ports Create/RemoveSpotlight,
both HardwarePaletteFade directions, spotlight affine/sweep, four clapping-hand
sprites, the immediate `SE_M_ENCORE2` PlaySE2WithPanning event at relative age
60 with target pan (+63 player attacker / -63 opponent attacker), the signed
SwayMon body, window/register lifetimes, and teardown. Independent live probes
reproduce the component result. The comparator now additionally checks every
hand's x/y/x2/y2, facing matrix and clap counter; the spotlight's software
position plus hardware OAM affine-double position, matrix number, full signed
PA/PB/PC/PD matrix and one-frame x2 display latch; and WIN0/register latches.
The strengthened comparator also checks the source SwayMon terminal x2 reset,
which distinguishes the opponent-front target's idle one-pixel x2 from the
post-animation zero latch.

**Renderer:** the reusable compositor evaluates OAM in ascending index order
per scanline, charges source-derived regular/affine-double fetch costs against
the GBA OBJ cycle budget, retains the budget-exhausting object, and arbitrates
normal and OBJ-window candidates independently before applying priority/OAM
order. The ENCORE seam supplies healthboxes, battlers, clapping hands, and the
affine-double spotlight in their probed OAM slots, then applies WIN1/OBJWIN
color-effect masks. Focused Tier-1 tests pin ordering, transparent texels,
budget exhaustion, and normal/OBJ-window arbitration. No coordinate fitting,
exclusions, comparator weakening, screenshots, or absolute-tick branches were
introduced.

**Sibling audit/controls:** SKY ATTACK uses `SE_M_SKY_UPPERCUT` at attacker
pan; SUPERPOWER uses `SE_M_EARTHQUAKE` at center; FLATTER shares
`SE_M_ENCORE2` at target pan but has a distinct flatter spotlight/confetti
body; RETURN conditionally schedules repeated `SE_M_TAIL_WHIP` attacker-pan
tasks across power branches; COSMIC POWER uses `SE_M_COSMIC_POWER` centered
and retains its cosmic BG/palette/star body. None is promoted. SHADOW BALL
remains **148/148**, HARDEN **101/101**, and BIND **45/45** in both
orientations.

## SHADOW BALL promoted to exact; LoopSEAdjustPanning track established (2026-07-27)

**Verdict:** `MOVE_SHADOW_BALL` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back and opponent-
front SABLEYE are each **148/148 task/sprite/OAM/matrix/register/palette/raw-
RGB and framebuffer frames** (oracle 256-403 and 260-407). Census: **34/276
exact, 3 partial, 239 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage SABLEYE, the real
Level-50 Factory set-268 carrier, with SHADOW BALL and TACKLE legally
constrained. The reducer ports the BG_GHOST fade/wait/restore pipeline, the
complete five-play/pan LoopSEAdjustPanning schedule, ANIM_TAG_SHADOW_BALL,
gShadowBallSpriteTemplate's continuous affine rotation, all three 16/16/8
AnimShadowBall fixed-point phases, impact boundary, target
AnimTask_ShakeMon2(4,0,8,1), side-specific launch OAM order, and cleanup.

**Sibling audit (no promotions):** ICE BEAM retains its crystal stream,
palette bodies, target shake, ice finale, and alpha/monbg lifecycle; PSYBEAM
retains psychic BG, eleven ring groups, SwayMon, and target palette cycle;
AURORA BEAM retains aurora BG, rotating palette, forty rings, two shakes, and
arg-7 gate; HYPER BEAM retains blackout, attacker/target shakes, flashing
orb palette, 25 orb groups, and target blends; PSYWAVE retains psychic BG,
sine timer, twelve rings, and target palette cycle; TRI ATTACK retains its
triangle, blackout, fire, lightning/inversion, ice, and patterned-shake
bodies. Their distinct sound argv schedules are recorded in
`ANIMATION_COVERAGE.json`; all remain unsupported without independent
complete dense move evidence.

**Evidence/controls:** legal fixtures, reproducible extractor, dense probe,
portable comparator, and focused Tier-1 tests are committed. Acceptance is
**148/148 ×2 in both orientations**. After the final renderer change CALM
MIND remains **101/101**, HARDEN **101/101**, and BIND **45/45**, each in
both orientations. The animation import boundary did not widen.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.
