# Animation coverage

## ANIM_TAG_DUCK / MOVE_DIZZY_PUNCH source-and-seam checkpoint; remains unsupported (2026-07-28)

**Verdict:** `MOVE_DIZZY_PUNCH` remains unsupported; coverage stays **59
exact / 1 partial / 216 unsupported**. Fresh complete legal set-145
SPINDA/ONIX Scene-ON scenarios pin the move-owned body at frames **90-158**
player-back and **94-162** opponent-front. The source-relative reducer and
typed seam now port both horizontal lunges, both target ShakeMon2 tasks,
both fist and animation-1 IMPACT instances, both literal six-duck waves,
12:8 alpha/target-monbg, side-relative sound identities, and cleanup.
`ANIM_TAG_DUCK`, SPINDA front/back art, HANDS_AND_FEET, and IMPACT regenerate
byte-for-byte.

**Evidence/boundary:** a fresh local-mGBA scout invoked through
`tools/run-mgba-probe.py` captured every `currentMove=146` frame with
software sprites/tasks, hardware OAM/matrices/palettes/registers, audio, and
raw RGB (player digest `d6779742…fa3`, opponent `429cd8b2…07f`). The
committed source audit pins exactly 12 `gDizzyPunchDuckSpriteTemplate`
instances and proves that Emerald's `Move_DIZZY_PUNCH` has **zero**
`gFallingFeatherSpriteTemplate`/`ANIM_TAG_WHITE_FEATHER` commands; those
belong to `Move_FEATHER_DANCE`, so no unsupported feather behavior was
invented.

**Exact remainder/siblings:** commit a dedicated reproducible dense probe
and portable comparator, strengthen every relative-age reducer receipt
against both orientations twice fresh, then add the narrow shared compositor
for SPINDA, fists, animation-1 IMPACT, all ducks, prior-software hardware
transfer, palettes/registers/audio/raw RGB, and **69/69** shared-framebuffer
equality plus the clear tail. `MOVE_TEETER_DANCE` remains unsupported with
its distinct movement task and five fast music-note paths/sounds.
`MOVE_SIGNAL_BEAM` remains unsupported with its distinct red/green orb
stream, sine timer, shakes, pan sweep, and target palette cycle. No engine,
battle state, RNG/controller/facility logic, coverage status, boundary list,
unsupported barrier, or absolute-tick/input-delay/pixel exception changed.

## MOVE_TAIL_GLOW promoted exact; shared framebuffer closed (2026-07-28)

**Verdict:** `MOVE_TAIL_GLOW` is exact. Fresh complete legal set-277
VOLBEAT/SHUCKLE Scene-ON evidence passes all **203/203** move-owned frames and
cleanup at frames **73-275** player-back and **77-279** opponent-front through
source/software, typed seam, registers, hardware OAM/matrices/palettes,
side-relative audio, raw RGB, and the shared framebuffer, twice fresh.
Coverage is now **59 exact / 1 partial / 216 unsupported**.

**Renderer/evidence:** source extraction now byte-pins both VOLBEAT
orientations alongside CIRCLE_OF_LIGHT. The narrow compositor ports the
source-exact BG palette banks, attacker monbg target-2 stack, prior-software
hardware transfer, affine 12:8-alpha orb, field chrome, healthboxes, text, and
cleanup. Dense framebuffer closure also corrected the palette reducer to
Emerald's fixed `deltaY=2` coefficients **0→2→4→2→0** and the source-derived
player-back corner to `48 + back yOffset(8) = 56`; the separate orb
`Y_PIC_OFFSET` remains 96. Independent receipts remain byte-identical (player
`9ed6c575…7f1`, opponent `2d5b4d2f…84a1`).

**Scope/siblings:** `MOVE_SUPERPOWER` remains unsupported with its distinct
METEOR/FLAT_ROCK/orb/rocks/fireball/BG-shake/four-sound body.
`MOVE_SHOCK_WAVE` remains unsupported with distinct ELECTRIC_ORBS/SPARK/
LIGHTNING and charging/bolt/lightning/shake/palette tasks. Neither has
independent dense acceptance. No battle logic/RNG/controller/facility state,
boundary list, unsupported barrier, or absolute-tick/input-delay/coordinate/
RGB/pixel exception changed.

## MOVE_TAIL_GLOW complete typed/hardware checkpoint; remains partial (2026-07-28)

**Verdict:** `MOVE_TAIL_GLOW` is partial. Fresh complete legal set-277
VOLBEAT/SHUCKLE Scene-ON evidence passes the entire **203/203** frame asset
load through unload envelope at frames **73-275** player-back and **77-279**
opponent-front through source/software, typed seam, registers, hardware
OAM/matrices/palette transfer, side-relative audio, and raw-RGB receipts,
twice fresh. Coverage is now **58 exact / 2 partial / 216 unsupported**.

**Reusable model/evidence:** the relative-age reducer ports BG
`simple_palette_blend` 0→4→0, attacker monbg, 12/8 alpha, the 18-frame
growth plus six pulse cycles of `gTailGlowOrbSpriteTemplate`, six
side-relative `SE_M_MORNING_SUN` restarts, and cleanup. Source extraction
byte-pins `ANIM_TAG_CIRCLE_OF_LIGHT` and the legal Factory carrier.
Independent outputs are byte-identical (player `9ed6c575…7f1`, opponent
`2d5b4d2f…84a1`).

**Exact remainder/siblings:** exact remains unclaimed because the shared
framebuffer compositor deliberately rejects TAIL GLOW; it still needs
VOLBEAT art, BG palette/monbg composition, affine-alpha circle painting,
field chrome/text, and **203/203** shared-framebuffer equality twice fresh in
both orientations. `MOVE_SUPERPOWER` stays unsupported with its distinct
METEOR/FLAT_ROCK/orb/rocks/fireball/BG-shake/four-sound body.
`MOVE_SHOCK_WAVE` stays unsupported with distinct ELECTRIC_ORBS/SPARK/
LIGHTNING and charging/bolt/lightning/shake/palette tasks. Neither has
independent dense acceptance. No battle logic/RNG/controller/facility state,
boundary list, unsupported barrier, or absolute-tick/input-delay/pixel
exception changed.

## MOVE_TWINEEDLE promoted exact; NEEDLE framebuffer closed (2026-07-28)

**Verdict:** `MOVE_TWINEEDLE` is exact. Fresh complete legal Factory-party
Scene-ON evidence passes the complete move-owned body and cleanup at **37/37**
frames **95-131** player-back and **37/37** frames **99-135** opponent-front
through software/component, typed-seam, hardware-transfer, audio, register,
raw-RGB, and shared-framebuffer checks, reproduced twice fresh. Coverage is now
**58 exact / 1 partial / 217 unsupported**.

**Reusable model/evidence:** the relative-age reducer ports two parallel
linear stingers, opponent-side inversion, two animation-3 IMPACT sprites,
`AnimTask_ShakeMon2(target,2,0,5,1)`, monbg/12:8 alpha, both looped sound
families, and cleanup. Source extraction byte-pins NEEDLE, both template
contracts, and legal set-154 BEEDRILL art. Independent evidence is
byte-identical (player `eb52b2a8…6ec1`, opponent `b7022f73…5771`).

**Renderer/siblings:** the narrow compositor ports prior-software OAM/palette
transfer, target monbg, opaque rotated needles, alpha IMPACT, chrome, and
side-specific battler/stinger subpriority. `MOVE_PIN_MISSILE` stays unsupported
because it uses three arcing missile waves, basic hitsplats, and distinct short
shakes/audio. `MOVE_SPIKE_CANNON` stays unsupported because it adds wind-up/
return tasks, three attacker-relative stingers, three simultaneous hitsplats,
and a distinct longer shake/audio body. Neither has independent dense
acceptance. No battle logic/RNG/controller/facility state, boundary list,
unsupported barrier, or absolute-tick/input-delay/pixel exception changed.

## MOVE_BITE promoted exact; SHARP_TEETH framebuffer closed (2026-07-28)

**Verdict:** `MOVE_BITE` is exact. Fresh complete legal Factory-party
Scene-ON evidence passes the complete move-owned body and cleanup at **26/26**
frames **80-105** player-back and **26/26** frames **84-109** opponent-front.
Coverage is now **57 exact / 1 partial / 218 unsupported**.

**Renderer/evidence:** source extraction byte-pins the literal SHARP_TEETH
sheet, palette, and OAM contract plus the legal set-56 MEOWTH carrier sheets;
the narrow shared compositor reuses IMPACT, ONIX, healthbox, window, and chrome
assets. The portable proof pins software state, prior-software-to-hardware
OAM/matrix/palette transfer, registers, side-relative audio, raw RGB, shared
framebuffer equality, and cleanup twice fresh in both orientations. Independent
outputs are byte-identical (player `008f491d…fa6`, opponent
`309e54ed…e52`).

**Scope/controls:** `MOVE_CRUNCH` remains unsupported because it adds BG_DARK
fade/restore and a second distinct diagonal bite/shake pass.
`MOVE_SECRET_POWER` remains unsupported because the Factory building
environment dispatches to `Move_STRENGTH`; only its cave branch reaches
`Move_BITE`. Neither has independent dense acceptance. No battle
logic/RNG/controller/facility state, boundary list, unsupported barrier, or
absolute-tick/input-delay/pixel exception changed.

## MOVE_BITE promoted partial; SHARP_TEETH typed seam checkpoint (2026-07-28)

**Verdict:** `MOVE_BITE` is partial. Fresh complete legal Factory-party
Scene-ON evidence passes the complete **26/26** sharp-teeth-through-cleanup
component window at frames **80-105** player-back and **84-109**
opponent-front. Coverage is now **56 exact / 2 partial / 218 unsupported**.

**Reusable model/evidence:** the relative-age reducer and typed presentation
seam port both `gSharpTeethSpriteTemplate` affine programs, signed 8.8
translation, animation-2 IMPACT, `AnimTask_ShakeMon(target,0,4,7,1)`, monbg,
12/8 alpha, side-relative `SE_M_BITE`, and teardown. The fresh portable probe
passes both orientations; a second independent replay is byte-identical
(player `3ad220d1…5a59`, opponent `db087980…f12`).

**Exact remainder/siblings:** exact remains unclaimed until the shared
framebuffer path draws SHARP_TEETH and proves complete hardware
OAM/matrix/palette/register transfer, audio, raw RGB, and framebuffer equality
twice fresh. `MOVE_CRUNCH` stays unsupported because it adds BG_DARK
fade/restore and a second distinct diagonal bite/shake pass. `MOVE_SECRET_POWER`
stays unsupported because the Factory building environment dispatches to
`Move_STRENGTH`; only its cave branch reaches `Move_BITE`. Neither has its own
complete dense acceptance. No battle state, RNG/controller/facility logic,
boundary list, unsupported barrier, or absolute-tick branch changed.

## MOVE_FAINT_ATTACK typed workload seam checkpoint; remains partial (2026-07-28)

**Verdict:** `MOVE_FAINT_ATTACK` remains the sole partial. Canonical
opponent-front and portable player-back complete bodies are still **221/221**
exact; the portable body reproduced twice fresh with the same probe digest.
The +30 delayed full app control remains **220/221**, differing only at age
150 / frame 21006. Coverage remains **56 exact / 1 partial / 219
unsupported**.

**Reusable model/evidence:** `gpuRegisterQueue.ts` now accepts an ordered,
typed CPU workload for the interval between displayed samples. Its steps
carry only source operation (`CopyBufferedValuesToGpuRegs` or `RunTasks`),
VCOUNT, and already-derived GPU writes; there is no move, animation age,
input delay, absolute frame, or pixel input. `sceneOnPresentation.ts` carries
that interval and prior register state through the shared seam. Fresh
`faintAttackRegisterQueueEvidence.ts` runs the bounded mGBA probe through
`run-mgba-probe.py` and proves both actual intervals twice: canonical VCOUNT
3 queues `0x0d03` and samples `0x0e02`, while the overrun VCOUNT 224 writes
immediately and samples `0x0d03`.

**Exact remainder:** the ordinary battle presentation path does not yet have
a general source-workload scheduler that produces these display-interval
steps. Until it does, it cannot distinguish two logically identical
animation ages without an invalid delay/tick exception. Feed the typed seam
from such a general producer, require delayed **221/221**, then repeat both
complete bodies with component/register/raw-RGB/shared-framebuffer evidence
twice fresh. No boundary list, battle logic/RNG/controller/facility state, or
unsupported barrier changed.

## MOVE_SHADOW_PUNCH promoted exact; stale palette/OAM transfer closed (2026-07-27)

**Verdict:** `MOVE_SHADOW_PUNCH` is exact for both complete move-owned
Scene-ON bodies. Player-back HAUNTER -> opponent-front ONIX is **106/106**
(frames 85-190), and opponent-front HAUNTER -> player-back ONIX is
**105/105** (frames 89-193). Source/software, typed seam, registers, hardware
OAM/matrices/palettes, live audio, raw RGB, and shared framebuffer all match,
twice fresh in both orientations. Coverage is now **56 exact / 1 partial /
219 unsupported**.

**Player repair:** fresh `gMain.oamBuffer`, hardware OAM, matrix, palette, and
raw-RGB evidence found a vanilla palette-lifecycle quirk: the task copies the
attacker only into the allocated slot's faded row, then `BlendPalette` reads
the stale unfaded HP-bar row. The seam now also ports distinct clone creation
and retirement transfer epochs, ninth-clone slot ordering, priority-3
clone/BG2-monbg order, and the move's own 9/8 impact blend and anchors.

**Opponent proof/boundary:** independent evidence corrected HAUNTER's front
anchor to y=9, placed priority-2 clones over the BG1 monbg copy, pinned the
one-callback-shorter restore-BLDY hold, and extracted the 32x8 elevated-enemy
shadow that `SpriteCB_EnemyShadow` reveals after the script clears. The
generic result/message tails begin at player age 106 and opponent age 105,
after `gAnimScriptActive` and visual tasks are clear, so the fixtures stop at
the last clean move-owned frames. No battle logic, RNG, controller/facility
state, boundary list, unsupported barrier, or absolute-tick branch changed.

## MOVE_FAINT_ATTACK register-queue checkpoint; remains partial (2026-07-27)

**Verdict:** `MOVE_FAINT_ATTACK` remains partial. Canonical opponent-front
and portable player-back complete bodies remain **221/221** exact; the
portable orientation reproduced twice fresh with identical probe digest.
The required +30 delayed-control surface reproduced **220/221** twice fresh,
with only age 150 / frame 21006 differing by 789 pixels. Coverage remains
**55 exact / 2 partial / 219 unsupported**.

**Cycle/register evidence:** a new bounded mGBA probe single-steps both
accepted prefixes across ages 148-153 and reproduced byte-identically twice.
Canonical age 150 runs `AnimTask_AttackerFadeFromInvisible_Step` at VCOUNT 3:
`SetGpuReg` changes the software buffer `0x0e02→0x0d03`, queues offset
`0x52`, and leaves hardware at `0x0e02` through the displayed frame before
`CopyBufferedValuesToGpuRegs` transfers it at VCOUNT 166. The +30 run executes
the same task write between displayed frames at VCOUNT 224, so source
`SetGpuReg` writes hardware `0x0d03` immediately and the next compositor
sample exposes it. This distinguishes CPU task order, VBlank visibility, and
frame sampling; the earlier same-task-data observation was correct but too
coarse.

**Reusable checkpoint/remainder:** `gpuRegisterQueue.ts` now ports the general
source buffer, unique waiting-list, VBlank 161-225/forced-blank immediate
write, and VBlank drain rules with focused Tier-1 coverage. It is deliberately
not wired to FAINT ATTACK: the shared seam still needs a general CPU-work/
VCOUNT scheduler to determine whether `RunTasks` lands at VCOUNT 3 or 224.
Next, model that source scheduling boundary from per-frame work and feed its
phase into the register queue; then require delayed **221/221** and rerun both
orientations twice fresh. No absolute-tick, delay-specific, or pixel exception
was added.

## MOVE_DRAGON_RAGE promoted exact; composed-OAM creation boundary closed (2026-07-27)

**Verdict:** `MOVE_DRAGON_RAGE` is exact. Complete legal CHARMELEON/ONIX
Scene-ON windows match **150/150** frames 89-238 player-attacker and
**150/150** frames 93-242 opponent-attacker through source/software, typed
seam, hardware OAM/matrices/palettes/registers, live audio, raw RGB, and the
shared framebuffer in both orientations, reproduced twice fresh. Coverage is
now **55 exact / 2 partial / 219 unsupported**.

**Residual repair/evidence:** the lone player render-age-98 mismatch was a
display-transfer ordering gap. At RAM tick 186, target `AnimTask_ShakeMon`'s
absolute creation write replaces ONIX's settled `(x2=1,y2=0)` with `(0,3)`;
the strengthened `gMain.oamBuffer` probe sees composed OAM `(x=144,y=13)`
while the synchronously stepped live fields have already collapsed to
`(0,0)`. The seam now keeps live `targetOffset` distinct from
`displayedTargetOffset`, and the draw path consumes the composed value only
at that source boundary. The portable proof also corrects its typed
sheet-block comparison, pins prior-software-to-hardware OAM/matrix/palette
transfer, `DISPCNT`/zero blend state, both sound headers and side-specific
pans, raw-RGB digests, and every shared output frame.

**Orientations/controls/siblings:** opponent-attacker geometry was staged and
proved independently; its target-side `loopsewithpan` clamps the player pan
to **-63**, distinct from the player-attacker one-shot's **-64**.
`MOVE_DRAGON_BREATH` remains **85/85**, `MOVE_FLAMETHROWER` **126/126**,
`MOVE_BLAZE_KICK` **78/78**, and `MOVE_EMBER` **63/63** in both orientations
after the repair. `MOVE_FIRE_BLAST` and `MOVE_FIRE_SPIN` remain unsupported:
their audited templates/bodies are distinct and still lack complete dense
acceptance. No battle logic, RNG, controller, outcome, facility state,
boundary list, unsupported barrier, or canonical-recording import changed.

## MOVE_REFLECT promoted exact; blue-light-wall compositor closed (2026-07-27)

**Verdict:** `MOVE_REFLECT` is exact. The complete legal MINUN/SHUCKLE
Scene-ON envelopes match **208/208** frames 39-246 player-back and **211/211**
frames 39-249 opponent-front through source/software, typed seam, hardware
OAM/palette/register transfer, live audio, raw RGB, and the shared framebuffer
in both orientations, reproduced twice fresh. Coverage is now **54 exact / 3
partial / 219 unsupported**.

**Renderer/evidence:** the narrow compositor ports GreenLightWall with the
blue rotated OBJ palette, all three SPARKLE_4 lifecycles/cells and lower-OAM
overlap order, side-relative wall geometry, 0→13→0 alpha, opponent battler
BG-copy/OBJ visibility composition, one-display effect OAM/palette transfer,
field chrome, side-specific menu/used-move/result text, audio header/pan, and
clean teardown. The strengthened probe pins hardware OAM, hardware/faded/
unfaded palettes and tags, registers, raw-RGB digests, and every shared output
frame.

**Correction/controls/siblings:** dense framebuffer work caught that the
existing partial fixtures mislabeled species 354 as SHUPPET and carried
estimated 126-HP geometry; their typed contents now correctly describe the
actual legal **MINUN 167 HP / SHUCKLE 127 HP** parties and genders (legacy
filenames retained). Exact CHARM remains **93/93 body + 4/4 clear** in both
orientations twice fresh. Independent source audit keeps `MOVE_BRICK_BREAK`
unsupported because its normal and separate gBrickBreakWall/shard branches are
distinct, and `MOVE_CRUSH_CLAW` unsupported because it loads the tag but uses
lunge/shake/four claw slashes without instantiating the wall. No battle logic,
RNG, controller, outcome, facility state, boundary list, unsupported barrier,
or canonical-recording import changed.

## MOVE_REFLECT promoted partial; complete software/typed seam (2026-07-27)

**Verdict:** `MOVE_REFLECT` is partial. Legal complete-party SHUPPET/SHUCKLE
fixtures match the complete Scene-ON `currentMove=REFLECT` envelopes
**208/208** at frames 39-246 player-back and **211/211** at frames 39-249
opponent-front through the source-relative reducer and typed presentation
seam. Coverage is **53 exact / 4 partial / 219 unsupported**.

**Proof:** wall creation is relative age zero at oracle frame 72 player-back
and 76 opponent-front. Fresh local-mGBA evidence invoked only through
`tools/run-mgba-probe.py` proves the side-relative wall geometry, all three
SPARKLE_4 lifecycles/cells, allocator slot reuse, 16 palette rotations,
0→13→0 alpha, opponent visibility, sound-task lifetime, and clean wall and
blend teardown over every frame. Focused reducer, asset, seam, and boundary
tests pass.

**Exact remainder/siblings:** the shared framebuffer path intentionally
rejects REFLECT until a narrow compositor ports the one-display hardware OAM
and palette transfer, rotated BLUE_LIGHT_WALL OBJ palette, SPARKLE_4 painter
order, opponent battler BG/visibility composition, and field chrome/text.
Thus no framebuffer frame is claimed yet; exact requires complete raw-RGB
equality in both orientations twice fresh. `MOVE_BRICK_BREAK` and
`MOVE_CRUSH_CLAW` remain unsupported because their audited bodies are
independent. No damage, RNG, controller, outcome, facility state, boundary
ratchet, or unsupported-barrier change.

## BLUE_LIGHT_WALL / MOVE_REFLECT evidence-and-assets checkpoint (2026-07-27)

**Verdict:** Coverage stays **53 exact / 3 partial / 220 unsupported**.
`MOVE_REFLECT`, `MOVE_BRICK_BREAK`, and `MOVE_CRUSH_CLAW` remain unsupported;
this is source/hardware evidence and reproducible asset extraction only, not a
renderer or framebuffer acceptance claim.

**Evidence:** complete legal Level-50 parties constrain SHUPPET to REFLECT and
SHUCKLE to TACKLE in both orientations. Fresh Scene-ON mGBA probes capture
the full `currentMove=REFLECT` envelope at frames **39-246** player-back and
**39-249** opponent-front, including raw RGB, software allocator/task state,
template geometry/order, hardware OAM/matrices, palette tags/buffers, and
blend registers. The move-owned effect body starts with the wall at **72/75**,
then the three SPARKLE_4 sprites; source identifies alpha/audio lifecycle and
the `waitforvisualfinish`/`delay 1` cleanup boundary for the next renderer.

**Assets/siblings:** `extractReflectAssets.ts` byte-pins BLUE_LIGHT_WALL as
the GreenLightWall sheet with its blue palette, and SPARKLE_4 with its distinct
Sparkle3 palette. Brick Break's `choosetwoturnanim` has independently distinct
normal and gBrickBreakWall/shard shattered-wall bodies; Crush Claw merely loads
the wall and instead runs lunge/shake/four claw slashes. Focused tests pass;
no engine, state, controller, or boundary-ratchet changes.

## MOVE_ABSORB promoted exact; drain compositor closed (2026-07-27)

**Verdict:** `MOVE_ABSORB` is exact. Legal set-131 LOMBRE versus constrained
ONIX matches the complete move-owned frames **223-417 (195/195)** through the
source/software reducer, typed seam, hardware OAM/matrices/order, tagged
palette transfers, registers/monbg, live audio, raw RGB, and shared
framebuffer in both orientations, reproduced twice fresh. Coverage is now
**53 exact / 3 partial / 220 unsupported**.

**Renderer/evidence:** the narrow compositor reuses source-extracted LOMBRE,
ONIX, ORBS, IMPACT, and BLUE_STAR assets and ports the green hardware-bank
ramp, split priority/alpha, semi-transparent hitsplat and eight absorption
arcs, one-display effect and ShakeMon latches, HealingEffect stars, field
chrome, and teardown. The strengthened probe pins stock `sSpriteOrder`
transfer, affine matrices, palette tags/buffers, task counts, BG1/blend
registers, and all three sound intervals. Framebuffer evidence corrects the
player-back ONIX art corner to `(40,48)` and pins the legal in-window profiles
as LOMBRE **152/167 HP** and ONIX **110/110 HP**.

**Controls/scope:** RECOVER remains **169/169** and SYNTHESIS **130/130**
framebuffer-exact in both orientations after the change. MEGA_DRAIN,
DREAM_EATER, and GIGA_DRAIN remain unsupported with their audited distinct
orb counts/arguments, blend strengths, impact/background/fire bodies, and
audio. Full Tier-1 is green at **3762/3762** and the production build passes.
No boundary-list, unsupported-barrier, canonical-import, battle-state, RNG,
controller, outcome, or facility-state change.

## ABSORB presentation-assets checkpoint; remains partial (2026-07-27)

**State:** Coverage remains **52 exact / 4 partial / 220 unsupported**.
`MOVE_ABSORB` retains its complete **195/195** software/typed proof in both
orientations twice fresh; no renderer or framebuffer claim was added.

**Did:** source extraction now byte-pins legal set-131 LOMBRE back/front art
and the literal ORBS, IMPACT, and BLUE_STAR sheets. The three effect sheets
are byte-identical to the exact RECOVER/DYNAMIC_PUNCH source assets; exact
shared ONIX battle-mon art remains reused. The focused asset/boundary tests,
full **3761/3761** Tier-1 suite, and production build pass.

**Next:** refresh the stale shared Scene-ON oracle, then strengthen the probe
for hardware OAM/matrices/order, hardware and tagged palette transfers,
registers, live audio, raw RGB, and shared framebuffer. Port the narrow ABSORB
compositor and prove **195/195** in both orientations twice fresh; rerun exact
RECOVER and SYNTHESIS controls. Keep MEGA_DRAIN, DREAM_EATER, and GIGA_DRAIN
unsupported.

**Notes:** freshness validation correctly stopped new staging because ports
8012/8014 predate `5d97a57`; workers do not restart shared services. No
boundary-ratchet, unsupported-barrier, engine, battle-state, RNG, controller,
or canonical-import change.

## MOVE_ABSORB promoted partial; complete source/software/typed seam (2026-07-27)

**Verdict:** `MOVE_ABSORB` is partial. The legal set-131 LOMBRE Scene-ON
fixtures pass the complete move-owned source/software/typed window
**195/195** at oracle frames 223-417 in both orientations, twice fresh,
including the clear frame. Coverage is **52 exact / 4 partial / 220
unsupported**.

**Proof:** the relative reducer and expanded live probe cover the exact green
BG palette 0/2/4/2/0 ramp and restore, monbg/split priority/alpha lifecycle,
animation-2 hitsplat, ShakeMon latch, all eight literal target-to-attacker
absorption arcs, shared HealingEffect, three sound identities/restarts/pans,
allocator slots/order, and complete teardown. Side/source coordinates are
explicit typed inputs: player LOMBRE uses 72,96; opponent LOMBRE 176,49;
ONIX impact centers are 176,42 front and 72,88 back.

**Remainder/siblings:** exact still requires source presentation assets,
hardware OAM/palette transfer, raw RGB, and the shared framebuffer; no engine
file was touched. MEGA DRAIN, DREAM EATER, and GIGA DRAIN retain their audited
blend/orb/impact/background/fire/audio differences and remain unsupported.
RECOVER and SYNTHESIS remain exact shared-HealingEffect controls.

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

## MOVE_SCARY_FACE promoted exact; complete hardware/pixel closure (2026-07-27)

**Verdict:** `MOVE_SCARY_FACE` is exact. Legal set-133 RHYHORN versus
constrained SHUCKLE matches the complete move-owned windows **190/190** at
79-268 player-back and 83-272 opponent-front through source/software,
typed-seam, hardware OAM/palettes/registers, live audio, raw RGB, and the
shared framebuffer, reproduced twice fresh in both orientations with no body
exclusions. Coverage is **52 exact / 3 partial / 221 unsupported**.

**Renderer/evidence:** the narrow compositor uses the extracted RHYHORN,
SHUCKLE, Scary Face BG/tilemaps, and EYE_SPARKLE assets. It ports the split
hardware palette-transfer cadence, BG1 alpha/register lifecycle, one-display
eye OAM and two-display battler-task latches, source painter order, field
chrome/healthboxes/text, all three live sound intervals, and complete teardown.
The fixture HP profiles now reflect the complete legal parties actually staged
by the ROM (RHYHORN 187, SHUCKLE 127), replacing the partial-era estimates.

**Controls/scope:** CHARM remains **93/93 + 4/4 cleanup** and SPARK
**115/115 + 2/2 cleanup** exact in both orientations twice fresh. The stock
shared-`gBattleAnimArgs` overwrite remains pinned: literal offset1/pattern0 is
executed as runtime offset3/pattern1. GLARE, THUNDER, and TRI ATTACK remain
unsupported pending their own complete evidence. Generic speed-stat
presentation remains outside the move-owned boundary. No boundary-ratchet,
unsupported-barrier, canonical-import, battle-state, RNG, or controller change.

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
