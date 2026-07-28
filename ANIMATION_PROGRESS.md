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

## SCARY_FACE presentation-assets checkpoint; remains partial (2026-07-27)

**State:** Coverage remains **51 exact / 4 partial / 221 unsupported**.
`MOVE_SCARY_FACE` still has its complete **190/190** software/typed proof in
both orientations; the session wound down at the next independently green
checkpoint before any renderer claim.

**Did:** merged `master` through `d0c04f8`, then landed `d9e447c`. The new
source extractor and byte-for-byte test pin legal set-133 RHYHORN back/front
art, the Scary Face BG image and both side tilemaps, and EYE_SPARKLE; exact
SHUCKLE art remains reused. Supervisor verification passed **3754/3754**
tests with the role variable removed for the launcher-profile test, the
production build, and an independent extractor/cmp run.

**Next:** add the narrow Scary Face compositor and extend its portable proof
to hardware OAM/palette/register transfer, live audio, raw RGB, and shared
framebuffer **190/190** in both orientations twice fresh. Keep GLARE, THUNDER,
and TRI ATTACK unsupported until each has complete dense evidence.

**Notes:** no renderer, engine wiring, coverage status, boundary ratchet, or
main-program file changed in this increment. No animation deferral is open.
**For the main program:** the new launcher-profile test inherits
`POKEBENCH_ROLE=supervisor|worker` and makes raw in-session `npm test` fail
four probes with exit 3; `env -u POKEBENCH_ROLE npm test` is fully green.
The freshness checker also resolves a nested animation worktree's run root as
the harness root; the actual Scene-ON service was current against
`POKEBENCH_HARNESS_ROOT`.

## MOVE_SCARY_FACE promoted partial; complete software/typed seam (2026-07-27)

**Verdict:** `MOVE_SCARY_FACE` is partial. Legal set-133 RHYHORN versus
constrained SHUCKLE passes the complete move-owned source/software/typed seam
**190/190** in both orientations, twice fresh, with no excluded body frames
and a clean boundary before generic speed-stat presentation. Coverage is
**51 exact / 4 partial / 221 unsupported**.

**Proof:** the reducer and fresh mGBA probe cover both invisible palette
controllers; side-selected BG1 tilemap/image/palette identity and the complete
`AnimTask_ScaryFace` 0→14→0 schedule; both side-mirrored EyeSparkle sprites
and all 0/4/8/4/0 cells; all three source audio restart boundaries; target
offsets; software task/sprite state; teardown; and the typed Scene-ON seam.
A real stock-ROM quirk is now explicit: the script literal is
`ShakeTargetInPattern(20,1,FALSE,pattern0)`, but the task rereads shared
`gBattleAnimArgs` after the following palette command overwrites it, so legal
execution uses offset 3/pattern1. Both the literal and every observed runtime
offset are pinned. GLARE, THUNDER, and TRI ATTACK remain unsupported.

**Exact remainder:** hardware OAM/palette/register transfer, live audio state,
raw RGB, and shared-framebuffer equality. No renderer or engine file was
touched.

## MOVE_CHARM promoted exact; magenta-heart compositor closed (2026-07-27)

**Verdict:** `MOVE_CHARM` is exact. Complete legal Scene-ON parties retain the
real challenge-0 Level-50 set-187 MINUN carrier against slower constrained
SHUCKLE. Both orientations match **93/93** complete move-owned source,
typed-seam, software/hardware-OAM, matrix, palette, audio, raw-RGB, and shared
framebuffer frames twice fresh, with no excluded body frames.

**Renderer/boundary:** the narrow compositor reuses exact SPARK MINUN/SHUCKLE
field assets and generated MAGENTA_HEART art. It ports the source ordering and
the observed split display latch (effect OAM one frame; battler task two),
affine pivot, all three hearts, field/chrome/text, and complete task/OAM/
palette/audio teardown. Four clear frames are proved after the 93-frame body;
the later generic stat-stage task begins only afterward and remains excluded.
SPARK stays exact at **115/115 + 2/2 cleanup** in both orientations twice fresh.

**Scope/siblings:** COVET retains its target ShakeMon2/Dizzy Punch remainder;
FAKE TEARS and TICKLE retain different task arguments and distinct bodies.
None is promoted. Coverage is **51 exact / 3 partial / 222 unsupported**.

## MOVE_SPARK promoted exact; shared framebuffer closed (2026-07-27)

**Verdict:** `MOVE_SPARK` is exact. Both legal set-187 MINUN orientations
match **115/115** complete source-component, typed-seam, raw-RGB, and shared
framebuffer body frames plus **2/2** cleanup frames, reproduced twice fresh.
The narrow renderer reuses the literal source-tagged ENCORE MINUN,
SELF_DESTRUCT SHUCKLE, generated SPARK_2, and DYNAMIC PUNCH IMPACT art; it
ports source OAM ordering/matrices/flips, explicit allocator tie state, the
one-display palette/effect transfer, HorizontalLunge, animation-2 impact,
source ShakeMon display latch, field/chrome/text, and ages 115-116 teardown.

**Controls/scope:** ENCORE remains **215/215** and DYNAMIC PUNCH **75/75**
component plus framebuffer exact in both orientations. The optional full
BOUNCE paralysis-window comparator is not a usable exact control at current
branch baseline (**87/450**, failures begin before its status component);
the SPARK change leaves `statusAnimation.ts` byte-untouched and its focused
tests green. THUNDERBOLT, THUNDER_WAVE, ZAP CANNON, and THUNDER SHOCK remain
unsupported. Coverage is now **50 exact / 3 partial / 223 unsupported**.

## MOVE_SPARK promoted partial; complete source body closed (2026-07-27)

**Verdict:** `MOVE_SPARK` is partial. The legal set-187 MINUN fixtures match
the complete move-owned source windows **115/115** at 79-193 player-back and
83-197 opponent-front, twice fresh, with no excluded frames, plus the minimal
cleanup tail at ages 115-116 **2/2 twice in both orientations**. The relative
reducer and typed `sceneOnPresentation` seam cover literal creation identity,
slot, creation order, subpriority, tile/priority, affine/hidden/flip state and
matrix for all six affine sparks, eight flashing sprites, the invisible
HorizontalLunge controller, impact, and all eight ElectricityEffect sprites.
The comparator also pins the three exact BG/attacker palette ramps and resets,
the exact target 0→6→0 ramp against unfaded/faded/hardware buffers, five full
sound restart/continuity/stop intervals and pans, battler offsets, registers,
one-display hardware OAM order/matrices from reducer-derived prior state, and
asset/task/OAM teardown. The earlier tautological wait claim is removed.
Coverage is now **49/276 exact, 4 partial, 223 unsupported**.

**Remainder:** no render assets or draw case were added and `battleScene.ts`
is untouched. Source-derived MINUN/SHUCKLE/SPARK_2/IMPACT assets, live
composition through the existing renderer, and **115/115 raw-RGB/framebuffer
equality in both orientations twice fresh** remain before exact. THUNDERBOLT,
THUNDER_WAVE, ZAP_CANNON, and THUNDER_SHOCK remain unsupported.

**Repair note:** the opponent-front fixture begins the flashing group with two
extra source callbacks, one initial affine-slot advance, and persistent
same-Y slot ordering. Those are explicit fixture/runtime scheduler/allocation
inputs, not a MINUN or attacker-side rule. The cleanup probe proves age 114's
last hardware arc, age 115's zero effect OAM/tasks/offsets with palettes still
owned, and age 116's palette-tag release; later generic result audio is outside
the tail.

## MOVE_SPARK staging checkpoint; remains unsupported (2026-07-27)

**Verdict:** `MOVE_SPARK` remains unsupported. Both complete legal
Battle-Scene-ON `mechanicLab` parties stage the real challenge-0 Level-50
`FRONTIER_MON_MINUN_1` set **187** (species 354, Docile, HP/Defense EVs,
Salac Berry, source Spark/Charm/Encore/Helping Hand); the active carrier has
four legal SPARK choices and slower SHUCKLE has four TACKLE choices. The
fresh mGBA probe, run through `tools/run-mgba-probe.py`, reaches current move
209 in both orientations: player-back MINUN current-move window **39-263
(225 frames)** / visual body **79-193**, opponent-front MINUN **39-363
(325)** / visual body **83-197**. Both outcomes are status-free. These are
candidate dense windows only—there is no reducer, typed seam, source asset,
OAM/register/audio comparator, renderer, or pixel claim.

**Source boundary/inventory:** `src/battle_factory.c`'s Level-50 challenge-0
range is 110-199; `battle_frontier_mons.h` set 187 is MINUN with SPARK;
`data/battle_anim_scripts.s:1945-1989` owns three attacker color
palette-cycle legs plus their three reset commands, six
`gSparkElectricitySpriteTemplate` particles, eight flashing electricity
sprites, HorizontalLunge, target hit-splat/ShakeMon, three attacker-pan
Thunderbolt2 events, target Hyper Beam, wait gates, and the post-impact
eight-sprite `ElectricityEffect` / target-pan Thunderbolt2
(`:10137`). `src/battle_anim_electric.c:119-220,515-677` defines the affine
spark, flashing/tile-cycle, target electricity callbacks and their
side-relative X/X2/picture-offset-Y geometry. Future evidence must port all
palette, movement/shake, flashing, sound, wait, geometry, lifetime and
teardown details in both orientations; THUNDERBOLT, THUNDER_WAVE, ZAP_CANNON,
and THUNDER_SHOCK remain independently unsupported.

**Evidence:** committed scenarios, semantic mGBA probe, and no-pixel
staging comparator are `mechanic-spark-*.json`, `sparkProbe.py`,
`sparkEvidence.ts`, and `fixtures/spark-*.json`. `ANIM_TAG_SPARK_2` is now a
non-exclusive component track, but no move coverage was promoted. Existing
exact controls and renderer code were untouched.

## Current resumable state (2026-07-27)

Coverage is **49/276 exact, 3 partial, 224 unsupported**. TAUNT is exact at
**125/125 player-back + 125/125 opponent-front** complete source-component,
typed-seam, software/hardware-OAM, affine-matrix, palette/register/audio,
raw-RGB, and shared-seam framebuffer frames, reproduced twice fresh.

## TAUNT promoted exact; thought-bubble/finger display path closed (2026-07-27)

**Verdict:** `MOVE_TAUNT` is exact. Legal set-184 MURKROW fixtures remain
unchanged in both orientations against constrained SHUCKLE. Complete windows
76-200 player-back and 80-204 opponent-front match **125/125** source,
typed-seam, hardware-transfer/matrix/palette/register/audio, raw-RGB, and
framebuffer frames twice fresh.

**Renderer/evidence:** MURKROW back/front plus THOUGHT_BUBBLE/FINGER_2 art and
palettes regenerate byte-for-byte; the literal existing ANGER asset alone is
reused. The narrow battleScene case ports one-display transfer, runtime
subpriority/Y/slot painter order, field chrome/healthboxes/text, and teardown.
The comparator now pins raw-RGB digests, software slots/subpriorities, reverse
hardware-OAM order, hardware affine matrices, and palette-tag lifetime.

**Controls/scope:** RAZOR LEAF remains **139/139** and SWAGGER **161/161**
source-component plus framebuffer exact in both orientations. No absolute
ticks, screenshots, canonical imports, unsupported barriers, state changes,
or boundary widening were added.

## TAUNT source/hardware body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_TAUNT` is partial. Complete legal Scene-ON parties retain
the real Level-50 set-184 MURKROW carrier in both orientations against slower
constrained SHUCKLE. Complete move-owned windows 76-200 player-back and
80-204 opponent-front match **125/125** source-component plus typed-seam
frames twice fresh, including final software destruction, one-display
hardware OAM, and cleared teardown.

**Source reducer/evidence:** the relative reducer ports
`gThoughtBubbleSpriteTemplate`'s forward/45-frame hold/reverse program,
`gTauntFingerSpriteTemplate`'s side-selected point/wag/lifetime, both literal
target-relative `gAngerMarkSpriteTemplate` argv programs, wait/delay
sequencing, SE_M_METRONOME, both looped SE_M_TAIL_WHIP restarts, both
SE_M_SWAGGER2 restarts/pans, software OAM, affine matrices, hardware OAM,
OBJ palettes, zero blend registers, and teardown. Swagger code is reused
only for the literal anger template semantics; TAUNT acceptance is independent.

**Precise remainder:** raw RGB is **0/125 unattempted**. Reproducibly extract
MURKROW back/front plus THOUGHT_BUBBLE/FINGER_2 art and palettes (ANGER may
reuse its already-extracted literal asset), then add only a narrow TAUNT draw
case in `src/engine/battleScene.ts` for source OAM order, one-display transfer,
field chrome/healthboxes/text, and teardown; require 125/125 both orientations
twice. This worker did not touch `battleScene.ts`. RAZOR LEAF remains 139/139
component + framebuffer exact in both orientations as the fresh control. No
absolute ticks, screenshots, canonical imports, unsupported barriers, battle
state changes, or boundary widening were added.

## TAUNT source-evidence checkpoint; remains unsupported (2026-07-27)

**Verdict:** `MOVE_TAUNT` remains unsupported. Complete legal Scene-ON
mechanicLab parties now stage the real Level-50 set-184 MURKROW carrier
(Quirky; SpDef/Defense/HP EV spread; Lax Incense) against slower constrained
SHUCKLE in both player-back and opponent-front orientations. Schedule IDs
184-189 are valid in the source Level-50 range, all active MURKROW choices
are TAUNT, and both validated runs reach `currentMove: 269` with the complete
party builder enabled.

**Source boundary:** `Move_TAUNT` owns THOUGHT_BUBBLE (45-frame hold then
reverse), FINGER_2's side-dependent animation/lifetime, two target-relative
ANGER instances, Metronome/Tail Whip/Swagger2 sound boundaries, delays and
waits. The existing SWAGGER anger reducer can be reused only for the literal
ANGER template and target argv semantics; it cannot establish the new bubble
or finger body. No reducer, typed seam, probe/comparator, assets, renderer,
or raw-RGB claim is present; the exact dense window remains deliberately
unmeasured. RAZOR LEAF stays **139/139** in both orientations as the required
typed/renderer control.

## RAZOR LEAF promoted exact; leaf/cutter display path closed (2026-07-27)

**Verdict:** `MOVE_RAZOR_LEAF` is exact. Legal challenge-0 parties retain real
set-165 WEEPINBELL in both orientations with every active choice constrained
to RAZOR LEAF and slower SHUCKLE constrained to TACKLE. Complete oracle
windows 91-229 player-back and 95-233 opponent-front match **139/139**
component, typed-seam, hardware-transfer, and raw-RGB frames twice fresh.

**Renderer/evidence:** WEEPINBELL back/front plus LEAF/RAZOR_LEAF art and
palettes regenerate byte-for-byte. The narrow battleScene case ports the
one-display effect OAM latch, target ShakeMon2 latch, source subpriority/Y
ordering including stable exact-Y slot ties, absent-partner singles monbg
no-op, alpha 12/8 register lifetime, field chrome, and cleanup.

**Controls/scope:** DYNAMIC PUNCH remains **75/75**, EXPLOSION **212/212**,
and SELF DESTRUCT **113/113** component plus framebuffer exact in both
orientations. SECRET POWER, MAGICAL LEAF, LEAF BLADE, and TWISTER remain
unsupported. No absolute ticks, screenshots, canonical imports, unsupported
barriers, controller/state changes, or boundary widening were added.

## RAZOR LEAF source-component body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_RAZOR_LEAF` is partial. Corrected challenge-0 mechanicLab
parties use only legal set IDs 165-170 in the 110-199 source range. Species 70
WEEPINBELL is the real set-165 carrier in both orientations, all active choices
are RAZOR LEAF, and slower SHUCKLE is constrained to TACKLE. Complete windows
91-229 player-back and 95-233 opponent-front match **139/139** twice fresh.

**Source reducer/evidence:** all ten literal leaf callbacks, both
`gRazorLeafCutterSpriteTemplate` instances (including `target_both=TRUE`
singles behavior), target ShakeMon2 plus the immediately-aborted absent-partner
task, monbg/alpha, three sound programs, software/hardware OAM, palette and
register transfers, typed seam, and teardown are dense-equal. DYNAMIC PUNCH
remains **75/75 component + framebuffer** exact in both orientations.

**Precise remainder:** raw RGB is **0/139 unattempted**. Extract WEEPINBELL
back/front and LEAF/RAZOR_LEAF art/palettes reproducibly; wire only the
battleScene animation draw path; prove BG copy/alpha, source OAM ordering,
palette/register latches, field chrome, cleanup, and 139/139 raw RGB twice.
SECRET POWER, MAGICAL LEAF, LEAF BLADE, and TWISTER remain unsupported. No
`battleScene.ts` edit, absolute ticks, screenshots, canonical imports,
unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **47/276 exact, 3 partial, 226 unsupported**. DYNAMIC PUNCH was
exact through the shared Scene-ON seam at **75/75 player-back + 75/75
opponent-front** component, typed-seam, hardware-transfer, and raw-RGB frames,
reproduced twice fresh.

## DYNAMIC PUNCH promoted exact; monbg impact display path closed (2026-07-27)

**Verdict:** `MOVE_DYNAMIC_PUNCH` is exact. Legal mechanicLab parties stage
HITMONCHAN from real Level-50 Factory set 339 (species 107) in both
orientations, constrain all choices to DYNAMIC PUNCH, and use slower SHUCKLE
with TACKLE. Complete oracle frames 101-175 player-back and 105-179
opponent-front match **75/75** source components, typed seam, hardware OAM/
palette checks, and raw RGB, twice from fresh snapshots.

**Renderer/evidence:** HITMONCHAN back/front plus fist/hitsplat art is
reproducibly extracted and byte-for-byte tested. The narrow battleScene case
ports the one-display target offset and effect-OAM transfer, target monbg copy
as hitsplat alpha target-2, opaque fist/explosions, source explosion ordering,
field chrome, and cleanup. Fixture HP now records the source-true pre-damage
95/95 SHUCKLE display; damage remains outside this move-owned window.

**Commands/controls:** `node --experimental-strip-types
tools/compare/dynamicPunchPortable.ts <fixture>` → 75/75 component+seam and
75/75 framebuffer for both fixtures twice; `explosionPortable.ts` → 212/212
both orientations; `selfDestructPortable.ts` → 113/113 both orientations.
No absolute ticks, screenshots, coordinate/RGB fitting, canonical imports,
unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **46/276 exact, 4 partial, 226 unsupported**. DYNAMIC PUNCH was
partial at 75/75 source-component + typed-seam frames in both orientations,
with shared-seam raw RGB still unwired at 0/75.

## DYNAMIC PUNCH component body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_DYNAMIC_PUNCH` is partial. Legal mechanicLab parties stage
HITMONCHAN from real Level-50 Factory set 339 (Emerald source species constant
107) in both orientations, constrain all four choices to DYNAMIC PUNCH, and
use slower SHUCKLE with TACKLE. Dense component plus typed-seam evidence is
**75/75** at oracle 101-175 player-back and 105-179 opponent-front, twice fresh.

**Source reducer/evidence:** the independent reducer ports target monbg and
alpha 12/8, the fist duration/target picture-offset position, animation-0
hitsplat and affine identity, `ShakeMon(5,0,7,1)`, the five literal
target-relative explosion instances, `ShakeMon2(5,0,28,1)`, target-pan sound
boundaries, and teardown. Literal `gExplosionSpriteTemplate` identity reuses
the existing exact explosion reducer only where its argv/offset program agrees.
PRESENT was audited and remains unsupported: its moving bag and conditional
damage/heal branches require independent dense evidence.

**Precise remainder:** extract HITMONCHAN/fist/hitsplat art; wire only the
animation drawing path through battleScene; prove software/hardware OAM,
palette/matrix/register latches, audio, cleanup, and raw RGB at 75/75 in both
orientations twice. Until then framebuffer exact is **0/75**, not exact.
EXPLOSION remains **212/212** and SELF DESTRUCT **113/113** component plus
framebuffer exact in both orientations. No absolute ticks, screenshots,
coordinate/RGB fitting, canonical imports, unsupported barriers, or boundary
widening were added.

## Previous current state (2026-07-27)

Coverage is **46/276 exact, 3 partial, 227 unsupported**. EXPLOSION is exact
through the shared Scene-ON seam at **212/212 player-back + 212/212
opponent-front** complete-body component, typed relative-seam, and raw-RGB
framebuffer frames, reproduced twice fresh. SELF DESTRUCT remains **113/113**
and DRAGON BREATH **85/85** component + framebuffer exact in both orientations
as fresh explosion/OAM/ShakeMon2/palette regression controls.

## EXPLOSION promoted exact; legal set-495 fixture corrected (2026-07-27)

**Verdict:** `MOVE_EXPLOSION` is exact. Complete legal mechanicLab parties
stage GLALIE from real Level-50 Factory set 495 in both orientations, constrain
all active choices to EXPLOSION, and use slower SHUCKLE with TACKLE. The
strengthened comparator matches **212/212 component + typed seam + raw-RGB
framebuffer** frames at oracle 76-287 player-back and 80-291 opponent-front,
twice fresh.

**Renderer/evidence:** the prior files labeled GLALIE injected internal species
362 (DUSCLOPS); acceptance first corrected them to Emerald's source ID 347,
which also source-shifted kickoff two frames and supplied the real 155 HP and
back/front geometry. GLALIE art is reproducibly extracted; the renderer reuses
the proven explosion/SHUCKLE assets and ports all ten explosion sprites, both
visible battlers' ShakeMon2 latches, nine complex BG red/black alternations,
cleanup gap, white hold, 15→0 fade, source OAM ordering, chrome, and teardown.

**Controls/scope:** SELF DESTRUCT remains **113/113** and DRAGON BREATH
**85/85** component + framebuffer exact in both orientations on fresh runs.
PRESENT remains unsupported pending its moving bag and distinct damage/heal
branches; DYNAMIC PUNCH remains unsupported pending its monbg/alpha/fist/
hitsplat/ShakeMon prelude and target-pan explosion sequence. No absolute ticks,
screenshots, coordinate/RGB fitting, exclusions, unsupported barriers,
canonical imports, or boundary widening were added.

## SELF DESTRUCT promoted to exact; explosion sprite track established (2026-07-27)

**Verdict:** `MOVE_SELF_DESTRUCT` is exact. Complete legal mechanicLab parties
stage SUDOWOODO from real Level-50 Factory set 298 in both orientations,
constrain every active choice to SELF DESTRUCT, and use slower SHUCKLE with
TACKLE. The strengthened comparator matches the complete first move-owned body
at **113/113 player-back** (oracle 82-194) and **113/113 opponent-front**
(86-198), for both source components and the shared-seam raw-RGB framebuffer,
each reproduced twice fresh.

**Source reducer/renderer:** the existing reducer's ten explosion instances,
mirrored offsets, 4/5/5/5 cells, both visible battlers' ShakeMon2, attacker-only
red 0→9→0 palette ramps, ten sound restarts, and teardown now feed a typed
Scene-ON Self Destruct config/view. The compositor renders reproducibly
extracted SUDOWOODO, SHUCKLE, and explosion art with source palette ramps,
the one-display palette/explosion OAM latches, ShakeMon2's neutral first
hardware frame plus two-display latch, source `SortSprites` Y ordering,
audio-neutral field chrome, and complete cleanup.

**Controls/scope:** DRAGON BREATH remains **85/85 component + 85/85
framebuffer** in both orientations on fresh control runs. Damage resolution,
fainting, health-bar loss, controller, turn, RNG, and facility state remain
outside this move-owned body. EXPLOSION, PRESENT, DYNAMIC PUNCH, and all other
siblings remain unsupported. No absolute ticks, screenshots, canonical
imports, unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **44/276 exact, 4 partial, 228 unsupported**. SELF DESTRUCT was an
honest partial checkpoint: its complete first move-owned source-component body
matches the Scene-ON oracle at **113/113 player-back + 113/113 opponent-front**
frames, reproduced twice fresh, but it is not wired through the shared renderer
and has no framebuffer acceptance.

## SELF DESTRUCT source-component body closed; explosion track remains partial (2026-07-27)

**Verdict:** `MOVE_SELF_DESTRUCT` is partial. Complete legal mechanicLab parties
stage SUDOWOODO from the real Level-50 Factory set 298 in both orientations,
constrain every active choice to SELF DESTRUCT, and use slower SHUCKLE with
TACKLE. Dense oracle evidence matches **113/113** source-component frames at
oracle 82-194 player-back and 86-198 opponent-front, twice fresh.

**Source reducer/evidence:** `selfDestructAtAge` ports both literal
`SelfDestructExplode` calls (ten `gExplosionSpriteTemplate` instances), their
mirrored offsets and 4/5/5/5 display-cell program, both visible battlers'
38-toggle `AnimTask_ShakeMon2`, the duplicate forced-attacker task's identical
write, attacker-only red 0→9→0 palette ramps, all ten attacker-pan audio
restarts, and teardown. Assets for the explosion and both set-298 SUDOWOODO
orientations are reproducibly extracted.

**Precise remainder:** no `sceneOnPresentation`/`battleScene` wiring was landed,
so shared-seam raw-RGB framebuffer acceptance is **0/113 attempted**, not exact.
Port the source OAM/display latches and draw extracted SUDOWOODO, SHUCKLE, and
explosions, then require 113/113 in both orientations plus existing exact
ShakeMon2 and palette-blend framebuffer controls. EXPLOSION, PRESENT,
DYNAMIC PUNCH, and all other siblings remain unsupported. No absolute ticks,
screenshots, canonical imports, unsupported barriers, or boundary widening
were added.

## Previous current state (2026-07-27)

Coverage is **44/276 exact, 3 partial, 229 unsupported**. SWAGGER is exact
through the shared Scene-ON seam at **161/161 player-back + 161/161
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. HYPER FANG remains **107/107** in both orientations as the
sprite/task regression control.

## SWAGGER promoted to exact; anger-mark component track established (2026-07-27)

**Verdict:** `MOVE_SWAGGER` is exact. Complete legal mechanicLab parties stage
RATTATA from real Level-50 Factory set 34 (Docile, Attack/HP, King's Rock) in
both orientations, constrain all four active choices to SWAGGER, and constrain
ONIX to TACKLE. The strengthened comparator matches the complete first
move-animation body at **161/161 player-back** (oracle 76-236) and **161/161
opponent-front** (80-240), each reproduced twice fresh.

**Source reducer/evidence:** `swaggerAtAge` ports GrowAndShrink's 12/24/12
attacker affine program, side/species Y anchoring and two-display hardware
transfer; the breath puff's four frames, player hFlip, signed fixed-point
translation, looping attacker-pan audio and terminal callback; and both
target-relative anger marks' mirrored geometry, affine-normal matrices,
allocation/OAM transfer latches, overlap, target-pan audio, and teardown.

**Renderer/controls:** breath, anger, and both set-34 RATTATA orientations are
reproducibly extracted. The shared seam renders the full body through relative
ages with raw-RGB exact field chrome and cleanup. HYPER FANG remains
**107/107** component and framebuffer exact in both orientations on fresh
control runs. FRUSTRATION, TORMENT, TAUNT, METRONOME, FAKE TEARS, and every
other sibling remain unsupported without independent dense acceptance. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, or import-boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **43/276 exact, 3 partial, 230 unsupported**. HYPER FANG is exact
through the shared Scene-ON seam at **107/107 player-back + 107/107
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. POISON FANG remains **104/104** in both orientations as the
source-identical fang regression control.

## HYPER FANG promoted to exact; contest/target-side selector track established (2026-07-27)

**Verdict:** `MOVE_HYPER_FANG` is exact. Complete legal mechanicLab parties
stage RATICATE from the real Level-50 Factory set 302 in both orientations,
constrain all four active choices to HYPER FANG, and constrain ONIX to TACKLE.
The strengthened comparator matches the complete first animation body at
**107/107 player-back** (oracle 82-188) and **107/107 opponent-front**
(86-192), each reproduced twice fresh.

**Source reducer/evidence:** battle execution honestly takes
`AnimTask_IsContest`'s false result. `AnimTask_IsTargetPlayerSide` is proven
through both results, selecting `BG_IMPACT_OPPONENT` and `BG_IMPACT_PLAYER`.
The reducer ports both hardware fade ramps and target-side tilemaps, reuses
Poison Fang's `gFangSpriteTemplate` only because the source identity is
literal, and independently pins Hyper Fang's `AnimTask_ShakeMon(0,10,10,1)`,
`SE_M_BITE`/`SE_M_LEER` target panning, restore, display latches, and teardown.

**Renderer/controls:** impact/RATICATE assets are reproducibly extracted and
the shared seam renders both target-relative backgrounds, fang, shake, field
chrome, raw RGB, and cleanup from relative animation age. POISON FANG remains
**104/104** component and framebuffer exact in both orientations. Contest
state was not fabricated. MEGA PUNCH, MEGA KICK, SOLAR BEAM, FOCUS PUNCH, and
all other selector siblings remain unsupported without independent complete
dense acceptance. No absolute ticks, screenshots, coordinate/RGB fitting,
unsupported barriers, or import-boundary widening were added.

## Previous current state (2026-07-27)

Coverage is **42/276 exact, 3 partial, 231 unsupported**. POISON TAIL is exact
through the shared Scene-ON seam at **187/187 player-back + 187/187
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. HARDEN remains **101/101** and SLUDGE BOMB remains **160/160**
in both orientations as exact controls.

## POISON TAIL promoted to exact; permanent custom MetallicShine variant closed (2026-07-27)

**Verdict:** `MOVE_POISON_TAIL` is exact. Complete legal mechanicLab parties
stage SEVIPER from real Factory set 239 (Hardy, HP/ATK, Scope Lens), constrain
all four choices to POISON TAIL, and constrain ONIX to TACKLE in both
orientations. The strengthened comparator matches the complete first
move-animation body at **187/187 player-back** (oracle 226-412) and **187/187
opponent-front** (226-412), each reproduced twice fresh.

**Source reducer/evidence:** `poisonTailAtAge` composes the existing exact
MetallicShine, horizontal lunge, ShakeMon, impact, and PoisonBubblesEffect
machinery. Closure pinned the permanent RGB(24,6,23) attacker palette and
one-display hardware transfer, the three shine sweeps/mask/register teardown,
the mirrored lunge and target-relative player-back Y_PIC_OFFSET=88, and the
first bubble's two-display cleanup handoff before the remaining literal
122/132/140/148/156/164 spawn cadence. The shared bubble motion/OAM reducer
remains single-source rather than duplicated.

**Renderer/controls:** `sceneOnPresentation`/`battleScene` render the extracted
SEVIPER orientations, metal mask, impact, poison bubbles, field chrome, custom
palette, monbg/alpha latches, software/hardware OAM and affine transfers, all
SE1 restart boundaries, and final cleanup through the relative seam. HARDEN
is still **101/101** and SLUDGE BOMB **160/160** in both orientations. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, import-boundary widening, or sibling promotions were added.

## Previous current state (2026-07-27)

Coverage is **41/276 exact, 3 partial, 232 unsupported**. SLUDGE BOMB is exact
through the shared Scene-ON seam at **160/160 player-back + 160/160
opponent-front** component and framebuffer frames, reproduced twice fresh.
SLUDGE and TOXIC remain exact controls in both orientations. POISON TAIL
remains unsupported.

## SLUDGE BOMB promoted to exact; delayed sludge-hit track closed (2026-07-27)

**Verdict:** `MOVE_SLUDGE_BOMB` is exact. Complete legal Scene-ON mechanicLab
parties use WEEPINBELL, the real Level-50 Factory set-270 carrier, in both
required orientations with all four choices constrained to SLUDGE BOMB and
ONIX constrained to TACKLE. The strengthened comparator matches the complete
first move-animation script body at **160/160 player-back** (oracle 85-244)
and **160/160 opponent-front** (89-248), each reproduced twice fresh.

**Source reducer/evidence:** all ten calls reuse SLUDGE's exact
`gSludgeProjectileSpriteTemplate` reducer at their five-display-frame cadence.
The move-specific reducer ports `AnimTask_ShakeMon2(3,0,15,1)`, the delay-1
target blend cycle, three batches containing all twelve literal
`gSludgeBombHitParticleSpriteTemplate` fixed-point bodies, `waitsound`, and
the final shared `PoisonBubblesEffect`. Dense evidence checks tasks, software
and hardware OAM, affine allocation/transfer latches, palettes, all ten
`SE_M_BUBBLE3`, three `SE_M_DIG`, and six `SE_M_TOXIC` pan/restart boundaries,
cleanup, raw RGB, and the shared-seam framebuffer.

**Renderer/assets/controls:** poison-bubble art and both set-270 WEEPINBELL
orientations are reproducibly extracted. `sceneOnPresentation`/`battleScene`
render the complete body and source hardware latches through relative ages.
SLUDGE remains **102/102** and TOXIC **219/219** in both orientations. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, or import-boundary widening were added. POISON TAIL remains
unsupported; no sibling was promoted.

## Previous current state (2026-07-27)

Coverage was **40/276 exact, 3 partial, 233 unsupported**. TOXIC is exact
through the shared Scene-ON seam at strengthened **219/219 player-back +
219/219 opponent-front** component and framebuffer frames, reproduced twice
fresh. SLUDGE BOMB and POISON TAIL remain unsupported.

## TOXIC promoted to exact; ToxicBubbles joins poison track (2026-07-27)

**Verdict:** `MOVE_TOXIC` is exact. Complete legal Scene-ON mechanicLab
parties use CLAMPERL, the real Level-50 Factory set-134 carrier, in both
required orientations with all four choices constrained to TOXIC and ONIX
constrained to TACKLE. The strengthened comparator matches the complete first
move-animation script body at **219/219 player-back** (oracle 219-437) and
**219/219 opponent-front** (219-437), each reproduced twice fresh.

**Source reducer/evidence:** both literal four-sprite `ToxicBubbles` calls use
their source 17-display-frame cadence, mirrored target geometry, four-frame
20-callback animation, OAM slot reuse, `AnimSpriteOnMonPos` lifetime, and
eight `SE_M_TOXIC` target-pan restarts. After the source wait and delay, the
final six sprites reuse SLUDGE's exact `PoisonBubblesEffect` reducer unchanged,
including affine terminal clamp and its six additional sound restarts. Dense
evidence checks callbacks, software and hardware OAM, one-frame affine matrix
latches, audio, cleanup, raw RGB, and the shared-seam framebuffer.

**Renderer/assets/controls:** Toxic/poison bubble art and both CLAMPERL
orientations are reproducibly extracted. `sceneOnPresentation`/`battleScene`
render the complete body and cleanup through relative ages. SLUDGE remains
**102/102** and POISON FANG **104/104** in both orientations as exact controls.
No absolute ticks, screenshots, coordinate/RGB fitting, exclusions, new
unsupported barriers, or import-boundary widening were added. SLUDGE BOMB and
POISON TAIL remain unsupported; no sibling was promoted.

## POISON FANG promoted to exact; fang contact joins poison track (2026-07-27)

**Verdict:** `MOVE_POISON_FANG` is exact. Complete legal Scene-ON mechanicLab
parties use ZUBAT, the real Level-50 Factory set-25 carrier, in both required
orientations with all four choices constrained to POISON FANG and ONIX
constrained to TACKLE. The strengthened comparator matches the complete first
move-animation script body at **104/104 player-back** (oracle 83-186) and
**104/104 opponent-front** (87-190), each reproduced twice fresh.

**Source reducer/evidence:** the reducer ports `gFangSpriteTemplate`'s complete
four-frame animation and eight-callback affine-double shrink, target
`AnimTask_ShakeMon(3,0,10,1)` including its script-created first display
latch, the delay-0 four-leg RGB(26,0,26) target palette cycle, and all six
already-proven `PoisonBubblesEffect` spawns. Dense evidence checks sprite
templates, OAM slots and affine matrices, task argv/lifetimes, faded and
hardware palette latches, raw RGB, `SE_M_BITE`, and all six `SE_M_TOXIC`
target-pan restarts.

**Renderer/assets/controls:** fang, poison-bubble, and both ZUBAT orientations
are reproducibly extracted. `sceneOnPresentation`/`battleScene` render the
complete body and cleanup through relative ages. SLUDGE remains **102/102**
and ACID **131/131** in both orientations as exact controls. No absolute
ticks, screenshots, coordinate/RGB fitting, exclusions, new unsupported
barriers, or import-boundary widening were added. TOXIC, SLUDGE BOMB, and
POISON TAIL remain unsupported; no sibling was promoted.

## SLUDGE promoted to exact; PoisonBubblesEffect established (2026-07-27)

**Verdict:** `MOVE_SLUDGE` is exact. Complete legal Scene-ON mechanicLab
parties use GRIMER, the real Level-50 Factory set-110 carrier, in both required
orientations with all four choices constrained to SLUDGE and ONIX constrained
to TACKLE. The strengthened comparator matches the complete sprite/task body
and shared-seam raw-RGB framebuffer at **102/102 player-back** (oracle
218-319) and **102/102 opponent-front** (230-331), each reproduced twice
fresh, including faded/hardware target palette latches and all seven source
sound boundaries.

**Source reducer/evidence:** the reducer ports
`gSludgeProjectileSpriteTemplate`'s 40-callback mirrored horizontal arc,
animation/frame/OAM and looping affine program; target
`AnimTask_ShakeMon(3,0,5,1)` including the animation-script task's extra
same-frame display step; the delay-1 two-leg target blend task shape; and all
six literal `PoisonBubblesEffect` spawns with side-relative x offsets,
eight-frame displayed cadence, rising/sway callbacks, affine terminal clamp,
OAM low-slot reuse, and cleanup. The live comparator caught signed GBA sine
rounding and opponent-side offset mirroring rather than fitting either. The
closure pass additionally pinned the script-created ShakeMon initializer's
first hardware latch and `SortSprites`' side-relative projectile/attacker
overlap order.

The comparator also proves every source-derived coefficient of the complete
RGB(30,0,31) target palette cycle and the hardware palette's one-frame-behind
transfer latch in both orientations. `SE_M_BUBBLE3` attacker-pan plus every
six-frame-script/eight-display-frame `SE_M_TOXIC` restart prove their song
headers, restart flags, and side-relative pan latches.

**Renderer/evidence closure:** poison-bubble projectile/bubble art and both
GRIMER orientations are reproducibly extracted. `sceneOnPresentation` and
`battleScene` render the projectile, target shake and hardware-latched palette
cycle, all six affine bubbles in source OAM order, field/text/healthboxes, and
cleanup. SING remains **245/245 player-back + 248/248 opponent-front** and
ACID remains **131/131** in both orientations as exact controls. No absolute
ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported barriers,
or import-boundary widening were added.

**Sibling audit (all unsupported):** TOXIC still needs its separate toxic
asset and two four-sprite waves; SLUDGE BOMB needs ten projectile calls,
twelve distinct hit particles, its longer ShakeMon2, palette body and
waitsound; POISON FANG needs fang art/sprites, contact shake and four-leg
delay-0 palette cycle; POISON TAIL needs metallic shine, lunge/hitsplat,
shake, alpha/monbg teardown. Shared PoisonBubblesEffect coverage does not
promote any sibling.

## SING promoted to exact; ANIM_TAG_MUSIC_NOTES track established (2026-07-27)

**Verdict:** `MOVE_SING` is exact. Complete legal Scene-ON
mechanicLab parties stage AZURILL from real Factory set 1 in both player-back
and opponent-front orientations, with all four active choices constrained to
SING and ONIX constrained to TACKLE. The strengthened portable comparator
matches the complete first move-animation script block at **245/245
player-back** (oracle 213-457; notes 220-362) and **248/248 opponent-front**
(oracle 215-462; notes 222-367), each reproduced twice fresh, for component
state, affine hardware OAM/matrices, palette latches/allocation, monbg
visibility/cleanup, raw RGB, and the shared-seam framebuffer.

**Source reducer:** all twelve `gWavyMusicNotesSpriteTemplate` spawn ages,
animation indices/vFlip, signed fixed-point paths, sine y2 values, four
cycling rainbow palette indices, repeating affine scale program, and
side-relative `panse` task boundaries are ported and Tier-1 pinned. No absolute
battle ticks, screenshots, coordinate/RGB fitting, exclusions, comparator
weakening, engine imports, or unsupported barriers were added.

**Renderer/evidence closure:** MUSIC_NOTES art, all four source rainbow
palettes, and both AZURILL orientations are reproducibly extracted. The
reducer ports reciprocal affine hardware matrices and side-dependent monbg
cleanup ages. Note composition reuses the shared persistent `sSpriteOrder`
scheduler with the same live-probed allocation seed in both orientations;
this closed the final exact-y overlaps without coordinate or RGB fitting.
`sceneOnPresentation`/`battleScene` render the full body through relative
ages and shared field/OBJ mechanisms. ENCORE and BIND remain exact controls.

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
