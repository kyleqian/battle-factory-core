# Animation coverage — archive

Older dated sections moved out of `ANIMATION_PROGRESS.md` to keep that
file lean (`AGENTS.md`'s ~3-most-recent convention). Git history has the
full record regardless; this file is a read-only reference.

## MOVE_FUTURE_SIGHT rung 5: both mandated residual hypotheses disproven with hard RAM evidence; the named remainder was incomplete — it's actually two separate defects, stays `partial` (2026-07-25)

**Verdict: no fix landed — this is a negative-evidence session, not a fit.**
The step brief's own precedent (MOVE_GROWTH) said its attacker residual was
neither idle-offset nor asset-decode but a framebuffer-display-lag bug; this
session checked both of that precedent's named hypotheses against
KADABRA/FUTURE_SIGHT in mandated order and **disproved both**, then found the
named residual itself was incomplete. **No source file changed this
session** (`git diff --stat src/` is empty) — every check below ran through
disposable scratch scripts, none promoted since none produced a passing fix.

**(a) Lag-pair bisection** (`tools/compare/scratch/future-sight-lag-bisect-
cached.ts`, reusing an already-populated oracle scratch dir so each recheck
is ~1s, no re-invocation): swept `scaleLag`×`tintLag` over `[0,3]×[0,3]`
against the dense fixture. The already-committed `(2,1)` is the **unique
local optimum across the whole grid** (max 75/114 anywhere) and `tintLag`
has **zero effect** on the match count at any `scaleLag` — blend/tint isn't
the active driver of this residual, and no better lag pair exists. Hypothesis
rejected.

**(b) RAM probe** (`tools/compare/scratch/future-sight-matrix-diag.ts`) —
no new Python probe needed: the fixture's own existing probe
(`tools/probe/run-battle-lab-rgb.py`) already records `playerSprite.matrix`/
`x2`/`y2`/`paletteFaded`/`paletteUnfaded` every frame via `gOamMatrices`, so
this session read that data directly. `x2`/`y2` are pinned at 0 every tick
in the window (no idle-anim rest offset), and the OAM affine matrix is
**RAM-exact against `futureSightAttackerEffectAtAge`'s own UNLAGGED
mechanism at every probed tick (114/114)** — the same clean result GROWTH's
own IVYSAUR VRAM probe found. Idle-offset and asset/decode hypotheses both
rejected.

**Residual re-characterized.** `futureSightPortable.ts`'s own mismatch
report only computes a bbox for the *first* diff frame — a per-frame bbox
sweep (`tools/compare/scratch/future-sight-per-frame-bbox.ts`) over the full
39-frame mismatch range found the prior "confined to the attacker box"
description covers only **29/39** frames (116-144: bbox grows 696px→2013px
peak at frame130→41px, tracking the scale animation's own magnitude — a
real, still-unidentified scale-window residual, RAM-proven not idle-offset/
asset). The other **10/39** (147,148,151,152,155,156,159,160,163,164) are a
**different, much larger defect**: a 17230px bbox spanning nearly the whole
upper screen (0,0-239,111), recurring in an exact 2-on/2-off period-4
pattern matching the psychic BG palette ring's own rotation cadence,
confined to the second (`UnsetPsychicBackground`) fade window — not
attacker-sprite-related at all. Tried the obvious next candidate (extend the
already-proven BG-rotation 1-tick display lag to the `REG_BLDY` darken
read) — this made the whole window sharply **worse** (19/114, not 75/114),
ruling that mechanism out too, not blindly kept.

**Coverage:** `MOVE_FUTURE_SIGHT` stays `partial` in `ANIMATION_COVERAGE.json`
— same 75/114, now split into two named defects instead of one
(incompletely-described) residual.

**Evidence.** `npm test` 2451/2451 (unchanged — no engine code touched).
`npm run build` green.

**Next action for a future session:** RAM-probe `BLDCNT`/`BLDY` at register
granularity around the second fade (defect 2 first — 17230px dwarfs
defect 1's at-most-2013px), then return to defect 1's finer per-tick
timing/magnitude; extend to the opponent-attacker orientation (KADABRA front
sprite extraction, side-uniform per the family map) once both are closed;
re-run `futureSightPortable.ts` to confirm `exact`.

**PAPERCUT:** `futureSightPortable.ts` (and its `growthPortable.ts` sibling)
only report the bbox of the *first* mismatched frame in a dense window, not
a per-frame or window-wide bbox — this cost real time this session
(the true defect shape only surfaced via a bespoke scratch script). Worth a
follow-up: have the shared dense-comparator harness report bbox for every
mismatched frame (or at least the widest one), not just the first.

## `blend_color_cycle` group A extended: enumeration priced CONFUSION/PSYCHIC/FUTURE_SIGHT at 2 net-new components each; MOVE_FUTURE_SIGHT ported (cheapest, attacker-only), lands `partial` — BG swap/rotation exact, attacker-sprite residual named (2026-07-25)

**Verdict: real port, not a fit — but a genuine residual remains, same
class as GROWTH's own history.** Enumeration (30-min phase, MANDATORY
ORDER step 1): read the real scripts for all three group-A siblings
(`battle_anim_scripts.s:4716-4767`) against the already-ported set
(`battle-animation-components.json` + a live check of `src/engine/`).
All three tie at exactly 2 net-new substantive components beyond what's
already proven — `SetPsychicBackground`/`UnsetPsychicBackground`'s own
`AnimTask_SetPsychicBackground` (a BG-palette-2 11-entry ring rotation) plus
its `BG_PSYCHIC` asset. `blend_color_cycle` itself, `AnimTask_ShakeMon`
(proven via `MOVE_FLY`), `AnimTask_ShakeMon2` and `AnimTask_
ScaleMonAndRestore` (both proven via `MOVE_GROWTH`/`MOVE_BIND`), and the
whole `monbg`/`clearmonbg`/`fadetobg`/`restorebg`/`waitbgfadein`/
`waitbgfadeout`/`setalpha`/`blendoff`/`setarg` visual-command family are all
already-ported reuse, verified directly against each move's real
`componentIds` in the graph, not assumed. **MOVE_FUTURE_SIGHT picked as the
cheapest to port**: it's an attacker-only self-effect (`blend_color_cycle` +
`ScaleMonAndRestore` on `ANIM_ATTACKER`, the identical shape to already-exact
`MOVE_GROWTH`) with zero target-side task composition — CONFUSION/PSYCHIC
additionally wire `AnimTask_ShakeMon2`(attacker) + `AnimTask_ShakeMon`
(target) simultaneously with the blend, a real composition risk FUTURE_SIGHT
doesn't carry. Factory-legal at Level 50: `FRONTIER_MON_KADABRA_1`
(`SPECIES_KADABRA`, moves include `FUTURE_SIGHT`) vs `FRONTIER_MON_ONIX`
(already this lane's common fixture opponent).

**RAM-probed first** (`tools/probe/dump-future-sight-psychicbg.py` against a
fresh legal `mechanicLab` fixture, player KADABRA/FUTURE_SIGHT vs opponent
ONIX, oracle ticks 60-200), before any render code: `REG_BLDY`'s two
fade-cover ramps around the BG swap are asymmetric (a 4-tick hold on the
way in, a 5-tick hold on the way out — RAM-probed, not assumed symmetric);
the BG palette 2 rotate-right-by-1-every-4-ticks ring was confirmed
byte-exact against the extracted `psychic.png` palette including the
wraparound entry (entry 11's original color correctly lands in entry 1);
the attacker blend/scale pair's own creation tick is age 37 relative to the
fade's own start tick.

**Ported** as `src/engine/futureSight.ts`, Tier-1-pinned (`tests/
futureSight.test.ts`, 8/8, all values checked directly against the RAM
probe's own output). `BG_PSYCHIC` extracted (`tools/extract/
extract-psychic-bg.ts`, same `indexedPng`/tilemap pipeline as
`MOVE_EXTREME_SPEED`'s `BG_HIGHSPEED` — no compression concern, since the
committed source graphics are plain PNG/bin, not the ROM's own LZ-compiled
bytes). KADABRA's battle back sprite extracted (`extract-battle-mon-pics.ts`,
same dimensions/`yOffset` as HAUNTER's, spriteCorner reused). Wired through
the Scene-ON seam (`sceneOnFutureSightView`, `battleScene.ts`'s
`FUTURE_SIGHT` draw case): psychic-BG-vs-default-BG selection, `REG_BLDY`
darken (reusing the SHADOW_PUNCH/EXTREME_SPEED `gpuDarken` pattern), and the
attacker blend/affine path (reusing GROWTH's own `drawSpriteSheetAffineStretch`
tint/affine seam). A 1-tick display lag on the BG-palette-rotation read was
pixel-confirmed and fixed (same framebuffer-lags-RAM-write class as GROWTH/
BLAZE_KICK); GROWTH's own `(scaleLag=2, tintLag=1)` attacker pair was then
tried on this move's identical blend+scale seam and **partially transfers**
(improved the match count, did not fully resolve it — see below), confirming
the step brief's own caution that per-mechanism lag is not automatically
portable.

**Dense comparator** (`tools/compare/futureSightPortable.ts` + `tools/
compare/fixtures/future-sight-player-kadabra-opponent-onix.json`), one
orientation only (player-back KADABRA → opponent-front ONIX; the family
map's own derivation says the OBJ-row/task arithmetic is side-uniform, so
the opposite orientation is expected to need only a KADABRA front-sprite
extraction, not a new mechanism — not yet staged, so marked `partial` per
this step's own orientation rule), 114-frame window (oracle ticks 77-190,
every frame): **framebuffer 75/114**. The BG swap/rotation/fade, target
ONIX, healthboxes, and message printer are pixel-exact for their own
frames. The remaining 39/114 mismatches are confined to KADABRA's own
attacker sprite box (bbox 44,65-100,111) during the blend/scale window —
the same class of species-specific attacker residual GROWTH itself carried
for a full prior session (which turned out to be a display-lag bug, not an
asset/idle-offset issue) before being promoted to exact. Not RAM-probed
further this session (out of this rung's time budget) — named, not chased
blind, per this run's no-blind-fit policy.

**Coverage:** added `MOVE_FUTURE_SIGHT` to `ANIMATION_COVERAGE.json` as
`partial`.

**Evidence.** `npm test` 2451/2451 (2443 + 8 new `futureSight.test.ts`).
`npm run build` green.

**Next action for a future session:** RAM-probe KADABRA's own attacker-box
residual directly (VRAM/OAM dump at a clean pre-move tick and window ticks,
the `dump-growth-ivysaur-vram.py` precedent) to find whether it's a further
display-lag refinement or a genuine asset/idle-anim gap, then extend to a
second orientation (KADABRA front sprite) and re-run `futureSightPortable.ts`
to confirm `exact`. The `blend_color_cycle` family map's own group B-F
sibling clusters (target-flash, longer-flicker, whole-screen, side-selector,
degenerate-snap) remain untouched, parked in the archived family-map entry.

**Housekeeping:** moved the "blend_color_cycle family map" section (this
same family, its argv survey table stays in the archive for future group
B-F reference) to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention); MOVE_GROWTH's own two most recent entries stay
live alongside this one.

**Housekeeping (this session):** moved MOVE_GROWTH's own "promoted to
exact" entry to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention).

## MOVE_GROWTH promoted to `exact`: last named residual (IVYSAUR attacker salt-and-pepper) was a display-lag bug, not species idle offset or asset decode — both dense windows 63/63, twice each (2026-07-25)

**Verdict: real fix, RAM-probe-first as directed — both suspected classes
from the step brief were checked and disproved with hard evidence before
any code changed; the actual cause was a third class the brief didn't
name.** `tools/probe/dump-growth-ivysaur-vram.py` read IVYSAUR's own
attacker-battler OAM (`x2`/`y2`, tileNum, paletteNum) plus the full VRAM
tile bytes and OBJ palette row (faded + unfaded) at a clean pre-move tick
and window ticks, both orientations: `x2`/`y2` are 0 at every tick (no
idle-anim rest offset — also confirmed from source: `speciesIdleAnim.ts`'s
own doc notes IVYSAUR's front `ANIM_V_STRETCH`/back `ANIM_H_SLIDE` families
both explicitly zero out on completion, unlike ONIX's `RAPID_H_HOPS`, so
the "missing from `SPECIES_FRONT_ANIM_FAMILY`" theory named last session
was never going to explain a residual here), and the extracted
tileset+palette are byte-identical to live VRAM/PLTT (all 64 tiles, all 16
colors, at every probed tick) — ruling out an asset/decode bug too.

**The real cause.** `growthAnimationAtAge`'s own mechanism is RAM-exact
against the live OAM matrix with NO lag (unchanged, still true) — but the
CAPTURED FRAMEBUFFER lags the matrix write, the same class of latency
already documented for BLAZE_KICK ("OAM one frame after the reducer,
palette one more VBlank after that"), except inverted: here the affine
SCALE lags the reducer by 2 ticks and the BLEND TINT lags by only 1.
Bisected empirically (all 9 (scaleLag, tintLag) pairs up to 2, both
fixtures) using the real render pipeline, not a reimplementation — (2, 1)
is the only pair landing 63/63 in both. Fixed in `sceneOnGrowthView`
(`src/engine/sceneOnPresentation.ts`) by reading the scale and tint
components at independently lagged ages. Updated `growthPortable.ts`'s own
component check to compare the RAW (unlagged) mechanism against RAM
directly, since that check's job is verifying `growthAnimationAtAge`'s own
math, not the display-lag presentation choice.

**Dense comparator, both orientations, twice each:** component 63/63,
framebuffer 63/63 — reproduced byte-identical on a second independent run
each. **Coverage: `MOVE_GROWTH` promoted to `exact`.**

**Evidence.** `npm test` 2443/2443 (unchanged — no Tier-1 logic touched,
only the presentation seam and a comparator diagnostic). `npm run build`
green.

## `blend_color_cycle` family map: mechanism decoded, all 28 Level-50 argv surveyed, MOVE_GROWTH recommended as the zero-new-mechanism representative (enumeration only, no port) (2026-07-25)

**Verdict: this is a genuinely bounded, cheap family — smaller than its "28
moves, no exact representative" leaderboard ranking suggests.** The core
per-pixel blend math (`BlendPalette`'s 5-bit formula) is **already ported
and oracle-proven** (`src/engine/paletteFade.ts`'s `blendComponentToward`,
proven via the S4 summary-screen/send-out fades). What's genuinely missing
is (a) the `AnimTask_BlendColorCycle` task state machine and (b) wiring the
battle-anim `selector` bitmask to a battler's OBJ-palette row inside the
Scene-ON move seam — both small, well-specified pieces of work. No code
changes this step per the brief (enumeration only); `MOVE_SHADOW_PUNCH` and
`MOVE_DRAGON_RAGE` untouched (parked).

**1. Mechanism.** `blend_color_cycle`/`blend_color_cycleexclude`/
`blend_color_cyclebytag` (`asm/macros/battle_anim_script.inc:566-576`) each
expand to `createvisualtask AnimTask_BlendColorCycle[Exclude|ByTag], priority,
<selector-or-tag>, delay, num_blends, initial_blend_y, target_blend_y, color`.
All three share one shape (`battle_anim_normal.c:447-646`): a `gTasks[]`
struct (`data[0]`=selector/tag, `[1]`=delay, `[2]`=numBlends, `[3]`=
initialBlendY, `[4]`=targetBlendY, `[5]`=color, `[8]`=restoreBlend toggle)
whose loop function polls `!gPaletteFade.active` and, while `numBlends>0`,
alternates direction: `!restoreBlend` blends `initialBlendY→targetBlendY`;
`restoreBlend` blends back `targetBlendY→initialBlendY`; **when
`numBlends==1` the target is force-overridden to 0 regardless of
direction** (this is why "num_blends=2" reads in the doc comment as "flash
to color and back once" — the final leg always lands back at absolute 0,
not `initialBlendY`, unless they're both 0 already). **Two non-obvious
quirks a naive port would miss:** (i) the very *first* call
(`AnimTask_BlendColorCycle`'s setup, not the loop) hardcodes
`startBlendAmount=0`, ignoring `tInitialBlendY` entirely — so a script that
sets `initial_blend_y=3` (e.g. the old MIST_BALL-adjacent call at
`battle_anim_scripts.s:1903`) still starts its first blend from 0, not 3;
(ii) when `num_blends=1`, only ONE `BeginNormalPaletteFade` call ever
happens (the hardcoded-0-start setup call) — the loop with its
numBlends==1 override never runs a second blend, so `initial_blend_y` is
completely unused/decorative for every `num_blends=1` script (e.g.
`MOVE_SPARK`'s and `MOVE_STOCKPILE`'s calls) — it's not a no-op even when
`initial_blend_y==target_blend_y`, it's a real 0→target snap.

**Palette-selector semantics** (`UnpackSelectedBattlePalettes`,
`battle_anim_normal.c:317-327`, dispatching to `GetBattlePalettesMask`,
`battle_anim_mons.c:1402-1453`): a 7-bit selector, bit0=`F_PAL_BG` (BG
palettes 1-3, mask `0xE`), bit1=`F_PAL_ATTACKER`/bit2=`F_PAL_TARGET`/
bit3=`F_PAL_ATK_PARTNER`/bit4=`F_PAL_DEF_PARTNER` (each sets bit
`16+battlerId` of the 32-bit `selectedPalettes` mask, partner bits gated on
`IsBattlerSpriteVisible`), bit5/6 = BG anim palettes 8/9 (Contest-only in
practice). `F_PAL_ATK_SIDE`=attacker|atkPartner, `F_PAL_DEF_SIDE`=
target|defPartner, `F_PAL_BATTLERS`=all four. `blend_color_cyclebytag`
instead resolves ONE OBJ palette row via `IndexOfSpritePaletteTag`;
`blend_color_cycleexclude` builds the inverse of {attacker,target} across
`gBattlersCount` battlers, plus BG (`0xE`) when its `unk0==1`.

**Ties into the already-solved 5-bit rule exactly, no new derivation
needed.** `BeginNormalPaletteFade` (`palette.c:156-200`) stores the mask/
delay/y/targetY/color into the global `gPaletteFade` struct
(`include/palette.h:35-53`, RAM address `0x2037fd4` per
`docs/battle-scene-notes.md`'s own citation, oracle-confirmed reachable
this session via `bin/oracle symbols gPaletteFade`); `UpdateNormalPaletteFade`
(`palette.c:406-485`) is driven every frame and processes the selector's BG
half (bits 0-15, `paletteOffset` starting at 0) and OBJ half (bits 16-31,
`paletteOffset` starting at `OBJ_PLTT_OFFSET`=256) on **alternating calls**
(`objPaletteToggle`), calling `BlendPalette(paletteOffset, 16, gPaletteFade.y,
blendColor)` per selected 16-entry row — the exact same `BlendPalette`
(`util.c:264`) whose 5-bit `faded5 = c5 + (((target5-c5)*y)>>4)` formula
`src/engine/paletteFade.ts` already implements as `blendComponentToward`
(general form, already proven pixel-exact against S4 fades) — **this
family needs zero new per-pixel math**, only the task-level orchestration
above. Timing: `deltaY` defaults to 2 per y-step; a negative `delay`
(several calls in this family use `delay=-31`) instead sets
`deltaY=2+|delay|` and forces `delay=0` — i.e. a near-instant 33-unit jump
per step (used for `MOVE_SPARK`'s flicker sequence, not a gradual fade). The
BG half is gated on `delayCounter` reaching `delay` (a `delay+1`-frame hold
per step); the OBJ half never waits on `delayCounter`, so **OBJ always lags
BG's `y` by exactly one tick** — the identical `objY(t)===bgY(t-1)`
relationship `paletteFade.ts`'s own module doc already derived for the S4
fades, confirmed here to be the *general* `UpdateNormalPaletteFade`
behavior, not something S4-specific. Each battler's OBJ palette row is
`OBJ_PLTT_OFFSET + battlerId*16` directly from the two functions above
(`GetBattlePalettesMask`'s `1<<(battlerId+16)` bit and
`UpdateNormalPaletteFade`'s `paletteOffset += 16` per bit) — arithmetic, not
inferred, so no RAM probe is needed to establish it, only to confirm no
other engine quirk perturbs it for a specific move.

**2. Per-move argv survey (all 28 Level-50 moves, from the real script
text via `blocks`, not memory):**

| Move | selector | delay | numBlends | initial→target | color |
|---|---|---|---|---|---|
| GROWTH | ATTACKER | 0 | 2 | 0→8 | WHITE |
| CONFUSION | ATTACKER | 0 | 2 | 0→8 | WHITE |
| PSYCHIC | ATTACKER | 0 | 2 | 0→8 | (31,23,0) |
| FUTURE_SIGHT | ATTACKER | 0 | 2 | 0→8 | WHITE |
| FOCUS_ENERGY | ATTACKER | 2 | 2 | 0→11 | WHITE |
| ENDURE | ATTACKER | 2 | 2 | 0→11 | RED |
| CURSE | ATTACKER | 4 | 2 | 0→10 | RED |
| SAFEGUARD | ATK_SIDE | 0 | 2 | 0→10 | WHITE |
| SPITE | ATTACKER | 2 | 6 | 0→8 | WHITE |
| RECOVER | ATTACKER | 0 | 6 | 0→11 | (31,31,11) |
| SYNTHESIS | ATTACKER | 2 | 2 | 0→16 | (27,31,18) |
| REVENGE | ATTACKER | 0 | 4 | 2→8 | RED |
| STOCKPILE | ATTACKER | 8 | **1** | (unused)→12 | WHITE |
| HYPNOSIS | TARGET | 2 | 2 | 0→12 | (31,18,31) |
| PSYBEAM | TARGET | 2 | 2 | 0→12 | (31,18,31) |
| SMOG | TARGET | 2 | 2 | 0→12 | (26,0,26) |
| SLUDGE | TARGET | 1 | 2 | 0→12 | (30,0,31) |
| SLUDGE_BOMB | TARGET | 1 | 2 | 0→12 | (30,0,31) |
| NIGHT_SHADE | TARGET | 0 | 2 | 0→13 | BLACK |
| POISON_FANG | TARGET | 0 | 4 | 0→12 | (26,0,26) |
| PSYWAVE | TARGET | 1 | 4 | 0→12 | (31,18,31) |
| ATTRACT | TARGET | 4 | 4 | 0→10 | (31,25,27) |
| SWEET_SCENT | DEF_SIDE | 1 | 5 | 5→13 | (31,21,21) |
| ACID | DEF_SIDE | 2 | 2 | 0→12 | (30,0,31) |
| SOLAR_BEAM | ATTACKER | 1 | 4 | 0→11 | (31,31,11) |
| REVERSAL | BG\|BATTLERS | 3 | 2 | 0→10 | WHITE |
| BATON_PASS | BG\|BATTLERS | 1 | 2 | 0→11 | (31,22,30) |
| SPARK | BG\|ATTACKER, then TARGET (7 calls) | **-31** (×6), then -31 | **1**×6, then 2 | 5→5, 0→0, 5→5, 0→0, 7→7, 0→0, then 0→6 | (31,31,22) |

Groups (batch-check siblings once one member is proven): **(A) self-flash,
`ATTACKER`/`delay=0`/`numBlends=2`/`target=8`** — GROWTH, CONFUSION,
PSYCHIC, FUTURE_SIGHT (near-identical, color the only variable) — the
cheapest cluster. **(B) target-flash, `TARGET`/`numBlends=2`/`target≈12`**
— HYPNOSIS, PSYBEAM, SMOG, SLUDGE, SLUDGE_BOMB, NIGHT_SHADE (6 moves).
**(C) longer flicker, `numBlends=4`** — SOLAR_BEAM, PSYWAVE, ATTRACT,
REVENGE, POISON_FANG. **(D) whole-screen `BG|BATTLERS`** — REVERSAL,
BATON_PASS (drives BG + all 4 battlers' OBJ rows at once — more surface
area, do after (A)). **(E) side selectors** — SAFEGUARD (`ATK_SIDE`),
SWEET_SCENT/ACID (`DEF_SIDE`) — singles-legal (partner bit contributes
nothing without a partner sprite). **(F) `numBlends=1` degenerate snap** —
STOCKPILE, and SPARK's 6 `-31`-delay legs — exercises the "initialBlendY
unused" quirk above; do these only after (A) is proven, as a targeted
quirk check, not a first representative. Every one of the 28 also carries
`monbg`/`clearmonbg`/`fadetobg`/`restorebg`/`waitbgfadein`/`splitbgprio`-family
visual commands already proven exact (`MOVE_EXTREME_SPEED` et al.) or a
per-move task (`AnimTask_ShakeMon2`, `AnimTask_ScaleMonAndRestore`, both
already proven — see below).

**3. Representative recommendation: `MOVE_GROWTH`.** Its script
(`battle_anim_scripts.s:2020-2030`) is `call GrowthEffect` ×2 (self-buff,
no branches) into a 4-line subroutine: `blend_color_cycle` (group A
above), `playsewithpan` (audio, untracked), `createvisualtask
AnimTask_ScaleMonAndRestore, 5, -3, -3, 16, ANIM_ATTACKER, 0`. Cross-checked
against the component graph: `AnimTask_ScaleMonAndRestore` is **already
proven** — `MOVE_BIND` (exact) calls the identical task
(`battle_anim_scripts.s:7126`, ported in `src/engine/bind.ts`) — and the
extractor already resolves the `call`/`return` subroutine shape correctly
(`GrowthEffect` appears as a real block in `MOVE_GROWTH`'s `blocks`, no
decode-extension needed). The only genuinely new mechanism GROWTH needs is
`blend_color_cycle` itself — **zero other unported components**, the
single cheapest move in the whole family (every other move needs at least
one net-new task: `MOVE_NIGHT_SHADE`→`AnimTask_NightShadeClone`,
`MOVE_SPITE`→`AnimTask_SpiteTargetShadow`, both real one-off sprite/shadow
tasks, not wrapper artifacts). **Factory-legal at Level 50:**
`FRONTIER_MON_IVYSAUR_1` (`SPECIES_IVYSAUR`, moves `{PETAL_DANCE, GROWTH,
SWEET_SCENT, FURY_CUTTER}`) and `FRONTIER_MON_SUNFLORA_2` (`{GIGA_DRAIN,
GRASS_WHISTLE, GROWTH, DOUBLE_TEAM}`), both in
`src/data/gen/battle-frontier-mons.json`. Recommend IVYSAUR (a fresh
species this lane hasn't fixtured, unlike ONIX/HAUNTER) paired against an
already-common fixture opponent (ONIX) for wiring consistency with other
`mechanicLab overrides.parties` staged traces.

**Staging fixture shape:** a `mechanicLab overrides.parties` trace, IVYSAUR
(GROWTH first slot) vs a stock opposing mon, single dense window starting
at the move-selection tick through `waitforvisualfinish`/`end`; test both
attacker-side orientations only if the RAM probe (next) shows the
battler→OBJ-row arithmetic isn't already uniform in this engine (it should
be, per the direct-from-source derivation above — no evidence of an
orientation dependency was found this session, so start with one side).

**RAM signals a probe should capture** (the `gPlttBufferFaded`-read
precedent, `docs/battle-scene-notes.md` §7.5-style): per tick, (a)
`gPaletteFade` at `0x2037fd4` — `active`, `y`, `targetY`, `delayCounter`,
`objPaletteToggle`, `deltaY` (bitfield layout in `include/palette.h:35-53`;
`multipurpose1` is a leading `u32`, so the bitfields start at byte offset
4) to nail the BG/OBJ alternation parity directly instead of pixel-inverting
it; (b) `gPlttBufferFaded[256 + attackerBattlerId*16 .. +15]` (IVYSAUR's own
OBJ palette row) across the flash-and-back window, cross-checked against
the group-A argv table above (target_blend_y=8, WHITE) — a clean,
sprite-owned 16-entry row, not a shared/background sample, so no
contamination risk unlike the S4 background-swatch technique. `bin/oracle
--profile battle-scene-on symbols gPaletteFade` confirmed the address
resolves against the live oracle this session.

**4. Decode extension:** not needed. `GrowthEffect`'s `call`/`return` shape
is already correctly resolved by the extractor (verified directly above),
and the argv survey required no other extractor change — this step made
no code changes, per its own enumeration-only scope.

**Not done (explicitly out of scope this step):** no RAM probe run, no
engine code, no `ANIMATION_COVERAGE.json`/fixture changes. `MOVE_SHADOW_PUNCH`
and `MOVE_DRAGON_RAGE` untouched (parked, per this step's brief).

**Evidence.** `npm test` 2222/2222 (unchanged — no logic touched). `npm run
build` green. Enumeration cross-checked against
`src/data/gen/battle-animation-components.json`,
`src/data/gen/battle-frontier-mons.json`, and a live oracle `symbols` call;
all move/component/argv claims above are generated directly from the
committed JSON + real script/source text (scripts in `/tmp`, not
committed — this ledger carries the durable output).

## BG-swap pipeline (restorebg/waitbgfadein/waitbgfadeout): assigned premise dissolved by a real extractor bug, not a port — MOVE_EXTREME_SPEED is already the exact representative; MIST_BALL's fog needs a different, still-open mechanism (2026-07-25)

**Verdict: the step's own goal — "open the top component family with NO
exact representative" — turned out to rest on a tooling bug, not a missing
port. Fixed the bug (real, tested, committed); the family now correctly
shows an exact representative that was always there. No new engine code
lands this step; the corrected enumeration plus a precisely-scoped next
representative (`MOVE_SHADOW_PUNCH`) is the deliverable, matching the step
brief's own STOP THRESHOLD sanction ("a precise map... is itself the
deliverable").**

**The bug.** `tools/extract/extract-battle-animation-components.ts`'s
`controlCommands` set spelled the two conditional-jump opcodes
`"jumretfalse"`/`"jumrettrue"` — missing the `p` — against the real macro
names `jumpretfalse`/`jumprettrue`
(`reference/pokeemerald/asm/macros/battle_anim_script.inc:275-284`). Since
neither string ever matched, `referencedBlocks()` never followed either
branch, so any script block reachable ONLY through one of these two jumps
was silently dropped from that move's `componentIds` — undercounting, not
overcounting, so the leaderboard's "no exact representative" claims were
false positives, not false negatives. 21 real uses of these two opcodes
exist in `battle_anim_scripts.s`. Fixed the typo, re-ran the extractor
(`--out` byte-identical-reproducibility test still green) and the
downstream `extract-level50-move-parameterization.ts` (joins on this
file). **12 moves gained real, previously-hidden components** (935→971
total components, 3190→3269 dependency edges); the pinned summary counts
in `tests/factoryAnimationComponents.test.ts` were updated to match.

**The one that matters: `MOVE_EXTREME_SPEED`.** Its script
(`battle_anim_scripts.s:3392-3434`) branches on
`jumprettrue ExtremeSpeedAgainstPlayer` before reaching `ExtremeSpeedContinue:`
— the label holding `waitbgfadeout`, `createvisualtask
AnimTask_StartSlidingBg`, `waitbgfadein`, and (after the move body) the
exact `restorebg` / `waitbgfadeout` / `setarg` / `waitbgfadein` closing
sequence. All of that was invisible to the graph before this fix.
EXTREME_SPEED is already `exact` in `ANIMATION_COVERAGE.json`, and its own
coverage note already lists "the opening and restore display latches" and
"BG_HIGHSPEED_{PLAYER,OPPONENT} selection" as dense-verified — i.e. this
move's hand-fit `src/engine/extremeSpeed.ts`
(`extremeSpeedBackgroundAtAge`) already implements and pixel-proves the
whole fade-out/BG-load/fade-in/hold/restore-fade-out/restore-fade-in cycle.
The corrected graph now shows `MOVE_EXTREME_SPEED` with **zero** unproven
components among the restorebg family. Re-running
`npm run animation:coverage` confirms the effect directly: `restorebg`,
`waitbgfadein`, `waitbgfadeout`, `fadetobg`, and `setarg` no longer appear
anywhere in the "components without an exact representative" leaderboard
(replaced by an unrelated set: `blend_color_cycle` 28,
`gHorizontalLungeSpriteTemplate` 19, `AnimTask_ShakeMonInPlace` 14,
`ANIM_TAG_BLUE_STAR`/`gHealingBlueStarSpriteTemplate` 11 each,
`UnsetPsychicBackground` 11).

**Real C-source enumeration of the pipeline** (full read of
`reference/pokeemerald/src/battle_anim.c`, this step's own rung-2
requirement, done via research pass before the bug was found — still the
correct map):
- `Cmd_monbg`/`Cmd_clearmonbg` (`battle_anim.c:591-911`,
  `Task_InitUpdateMonBg`/`Task_UpdateMonBg`/`Task_ClearMonBg`) — paints a
  battler sprite onto a BG layer and tracks it per-frame. **Already fully
  proven**, unrelated to this bug (124+ exact-proved moves).
- `Cmd_blendoff` (`:1036-1041`) — zeroes `BLDCNT`/`BLDALPHA` directly, no
  task. Already proven.
- `Cmd_setarg` (`:1055-1071`) — pure script-parser write to
  `gBattleAnimArgs[argId]`, no BG/task interaction.
- `Cmd_fadetobg`/`Cmd_fadetobgfromset`/`Cmd_restorebg`/`Task_FadeToBg`
  (`:1110-1228`) — the real new subsystem. `Task_FadeToBg` is a 4-state
  machine: fade to black via `BeginHardwarePaletteFade(0xE8,0,0,16,0)`
  (state 0) → while `gPaletteFade.active`, wait → load the new BG
  (`LoadMoveBg(bgId)` or, for `restorebg`'s `bgId=-1` sentinel,
  `LoadDefaultBg()`/`DrawMainBattleBackground()` — **`restorebg` does NOT
  snapshot/restore prior state; it recomputes the map's default BG from
  scratch**, state 2) → fade back in (state 2 continued) → wait, then
  destroy the task (state 3). A single flat `sAnimBackgroundFadeState`
  global (0/1/2) is what `Cmd_waitbgfadeout`/`Cmd_waitbgfadein` poll — not
  a per-task counter.
- `Cmd_waitbgfadeout`/`Cmd_waitbgfadein` (`:1230-1254`) — the two poll
  points on that global.
- `Cmd_changebg` (`:1256-1261`) — synchronous BG swap, no fade, no task.
- `gBattleAnimBackgroundTable[]` (`src/data/battle_anim.h:1596-1625`) is a
  flat `{image,palette,tilemap}` LZ77-pointer table keyed by bg-id
  (`BG_GHOST`=2, `BG_HIGHSPEED_OPPONENT`=9, `BG_HIGHSPEED_PLAYER`=10, etc,
  `include/constants/battle_anim.h:330-338`); `Cmd_monbg`/`Cmd_clearmonbg`
  never touch it — the two pipelines are independent and composable.

Independently, this exact hardware-fade ramp shape (1 BLDY unit per tick,
fade out / hold / fade in / later restore-fade-out / restore-fade-in) is
already hand-derived and pixel-pinned **twice**, completely independently:
`extremeSpeed.ts`'s `extremeSpeedBackgroundAtAge` and `faintAttack.ts`'s own
bldy ramp. Both match the same `BeginHardwarePaletteFade` shape. This is
strong cross-evidence that a shared, parametric module (`durationTicks`
fixed at 16 per `BeginHardwarePaletteFade`'s own literal argument, per-move
start-tick probed) would generalize cleanly — **not attempted this step**
(refactoring two already-exact/partial moves' code carried needless
regression risk against this step's remaining time budget; left as a
bounded, low-risk follow-up, not a new derivation).

**This was never actually MIST_BALL's blocker.** Re-read
`Move_MIST_BALL`'s real script (`battle_anim_scripts.s`, printed directly,
not from memory) end to end: it contains no `restorebg`, `monbg`,
`fadetobg`, `clearmonbg`, `waitbgfadein`, or `waitbgfadeout` anywhere.
`AnimTask_MistBallFog` (`battle_anim_ice.c:1097-1170+`) is a **separate**
mechanism — a task that loads its OWN BG1 tile/tilemap/palette trio
(`gWeatherFogHorizontalTiles`/`gBattleAnimFogTilemap`/`gFogPalette`) and
drives `BLDCNT`/`BLDALPHA` through its own 4-phase state machine directly,
never going through `Cmd_fadetobg`/`Task_FadeToBg` at all. The step brief's
framing conflated the two because both are "background" mechanisms in the
loose sense; they share no code. MIST_BALL's real remaining blockers are
unchanged from the archived rung-3 session: `waitforvisualfinish`
sprite-lifetime tracking, `AnimComplexPaletteBlend` (whole-palette-set
blend gated on `gPaletteFade.active`), `AnimTask_MistBallFog`'s own BG1
pipeline (a genuinely new subsystem, untouched by this step), and
generalizing `AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH
instance.

**Named next representative for whoever continues this family** (now a
small, well-bounded task, not a new-subsystem port): `MOVE_SHADOW_PUNCH`.
Its script (`battle_anim_scripts.s:4308-4327`) is fully linear — no
branches, so its extracted component list was already accurate before this
fix — and Factory-legal at Level 50 via `FRONTIER_MON_HAUNTER_1`
(`SPECIES_HAUNTER`, moves `{SHADOW_PUNCH, CONFUSE_RAY, SPITE, GRUDGE}` —
its whole kit sits in this family,
`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1256-1262`).
Post-fix, its only unproven component is `task:AnimTask_AttackerPunchWithTrace`
— every other component (`fadetobg`, `waitbgfadein`, `monbg`, `setalpha`,
`clearmonbg`, `blendoff`, `restorebg`, `create_basic_hitsplat_sprite`,
`create_fist_sprite`, `ANIM_TAG_HANDS_AND_FEET`, `ANIM_TAG_IMPACT`,
`AnimTask_ShakeMon`) is already proven by FIRE_PUNCH/ICE_PUNCH/
THUNDER_PUNCH/EXTREME_SPEED. `AnimTask_AttackerPunchWithTrace`
(`battle_anim_mons.c:2392-2496`) is a sprite-clone "afterimage/trace"
effect (not shake, not palette-flash): attacker slides ±8px out over 5
ticks then back over 5, spawning one blended-palette clone sprite per tick
that self-destructs after 8 ticks, then waits for all clones to expire.
Not ported this step — no RAM probe run, no code written; named here as
the concrete next rung (probe HAUNTER's own battler sprite + the clone
slots via a `mechanicLab overrides.parties` fixture, port the trace effect,
generalize the fade-ramp module out of `extremeSpeed.ts`/`faintAttack.ts`,
wire through the Scene-ON seam, dense window both orientations twice).

**Evidence.** `npm test` 2212/2212 (unchanged count — this step's fix is a
reattribution, not new logic; the one touched test updates a byte-count
pin to the corrected, re-verified extraction). `npm run build` green.

## SHADOW_PUNCH lands `partial` (third session): fixed a cap-kill's broken mid-rework, wired the attacker framebuffer lag, 84/111 + 0/111 across the two orientations — two named in-scope pixel families plus a materially different, unattributed opponent-orientation bug (2026-07-25)

**Verdict: parked, not landed. This was the third and final scheduled session on
this move's dense acceptance; per the step brief a documented resting state is
the required outcome, not a completed pass. The player-attacker orientation is
close (84/111 framebuffer, all component math exact); the opponent-attacker
orientation is not (0/111, plus a real component-level bug) and needs its own
fresh probe next time — do not assume anything found here transfers.**

**Start-of-session state was a broken build**, inherited from the second
cap-killed session's salvaged mid-rework (tip commit `7200300`): `battleScene.ts`'s
SHADOW_PUNCH draw case referenced `attackerView` in the clone/attacker draw
calls but never defined it — `tsc -b` failed with `Cannot find name
'attackerView'` (confirmed by running the build before touching anything).
`npm test` still reported green only because vitest's transform doesn't
type-check and no Tier-1 test exercises this render path.

**Fix.** Defined `attackerView` right after the existing unlagged `view`,
mirroring DRAGON_RAGE's own phase-aware-view precedent
(`battleScene.ts:17033-17063`): `sceneOnShadowPunchView({ ...state, age:
state.age - SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG })`, scoped to only the
attacker/clone draw calls per the constant's own doc comment (already
committed by the prior session with a lag value of 3). `npx tsc -b` clean
after the fix.

**Bisected the lag constant itself before trusting it further.** Since the
comparator's own component check (`view` computed at *raw*, unlagged age)
already matches oracle RAM reads at 111/111 for every dense tick, a nonzero
framebuffer lag was not obviously justified. Swept
`SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG` through 0/1/2/4 against the
player-attacker fixture: all four values produced a byte-identical 84/111 —
lag in this small range has **zero effect** on this fixture's remaining
mismatches (lag=20 does move the count, and only for the worse, confirming
the mechanism works but isn't the active variable here). Kept the
prior session's committed value (3) since it's harmless and its own doc
cites a direct RAM-pixel justification from a narrower comparison this
session didn't re-run; the remaining mismatches below are a different bug
class entirely.

**Ran both dense comparators** (`npx tsx tools/compare/shadowPunchPortable.ts
<fixture>`, both fixtures under `tools/compare/fixtures/shadow-punch-*.json`)
and attributed every remaining mismatch by mismatch-string/bbox before
touching code further (no blind fits attempted).

**Player-attacker orientation (`shadow-punch-player-haunter-opponent-onix.json`):
component 111/111, framebuffer 84/111.** Three disjoint mismatch families,
all named in `ANIMATION_COVERAGE.json`'s new entry with exact px counts and
bboxes:
1. Frames 126-133 (render ages 41-48): attacker/clone punch-trace region
   (bbox ~x41-131,y64-111) — a real color-level bug, not timing (see the
   lag bisection above). Likely a clone paint-order or blend-coefficient
   issue, same class as DRAGON_RAGE's own fire-plume z-order residual —
   next step should be a `gMain.oamBuffer` RAM read of the live clone stack
   (`dump-dragonrage-oam.py`'s own precedent), not another lag guess.
2. Frames 134-147 (render ages 49-62): top-of-screen region reaching
   x177-206,y12-71 — plausibly the hitsplat/fist reused
   `TURN9_HITSPLAT_MATRIX` affine-stretch schedule not matching this move's
   own anchor ages. Not root-caused this session.
3. Frames 191-195 (render ages 106-110): a large near-white region covering
   most of the screen — this is the generic post-move **result/message
   textbox** appearing, an out-of-scope reusable presentation component per
   this lane's own acceptance rule (it neither blocks nor promotes a move).
   The fixture's own `denseWindow.endFrame` (195) should be trimmed to
   exclude this tail next session rather than carried as a required
   remainder.

**Opponent-attacker orientation (`shadow-punch-opponent-haunter-player-onix.json`):
component 95/111, framebuffer 0/111 — materially worse, a different problem.**
Component mismatches are a genuine BLDY-ramp one-tick drift starting ~frame
172 (oracle's own `bldy` decrements one tick ahead of this codebase's table
— an orientation-specific timing bug with zero counterpart on the
player-attacker side, where BLDY matched exactly). Framebuffer is a total
loss: every single dense frame mismatches, dominated by a persistent
~1590px region from frame 89 in the attacker-side bbox x151-201,y14-71
whose fading-gradient signature suggests the player-attacker fixture's own
lag=3 does not transfer to this orientation. Not root-caused this session —
needs its own dedicated RAM-pixel probe rather than reused player-attacker
assumptions; a reasonable first candidate is re-checking the
`x2 -= tBattlerSpriteId` quirk's sign for the opponent-side attacker slot.

**Coverage:** added `MOVE_SHADOW_PUNCH` to `ANIMATION_COVERAGE.json` as
`partial` (19 exact / **3 partial** / 254 unsupported) — a meaningful dense
window (84/111, all component math exact) is green in one orientation, but
both a real in-scope remainder and an unattempted-clean second orientation
remain, so `exact` is not honest. `covered`/`remaining` carry the full
per-family breakdown above with px counts so the next session can resume
a probe cycle without re-deriving it.

**Evidence.** `npm test` 2222/2222 (one pinned coverage-summary count
updated to match the new partial entry). `npm run build` green.

- **State:** **19 exact / 3 partial / 254 unsupported.** (This
  step — SHADOW_PUNCH now has a `partial` entry; DRAGON_RAGE stays
  CLOSED/parked at 149/150 `partial`, not touched this step.)
- **Did:** Third and final scheduled session on `MOVE_SHADOW_PUNCH`'s dense
  acceptance. Found the build broken at session start (the second
  cap-killed session's salvaged mid-rework left `battleScene.ts` referencing
  an undefined `attackerView`) and fixed it by defining the missing
  phase-aware lagged view, mirroring DRAGON_RAGE's own precedent. Bisected
  `SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG` (0/1/2/4) and found it has zero
  effect on the remaining player-attacker mismatches — ruling out timing as
  the cause of that family before investigating further. Ran both dense
  comparators and attributed every remaining mismatch by mismatch-string/
  bbox: player-attacker orientation lands 111/111 component, 84/111
  framebuffer (two in-scope named families + one out-of-scope generic
  message-textbox tail); opponent-attacker orientation is materially worse
  and a different problem (95/111 component — a new BLDY one-tick drift —
  and 0/111 framebuffer), not root-caused this session. Added
  `MOVE_SHADOW_PUNCH` to `ANIMATION_COVERAGE.json` as `partial`.
- **Evidence:** `npm test` 2222/2222, `npm run build` green.
- **Next:** Player-attacker orientation needs a `gMain.oamBuffer` RAM probe
  of the live clone stack (frames 126-133, DRAGON_RAGE fire-plume
  precedent) and a look at the hitsplat/fist affine-stretch schedule
  (frames 134-147); trim the fixture's `denseWindow.endFrame` (195) to
  exclude the out-of-scope message-textbox tail (frames 191-195).
  Opponent-attacker orientation needs its own fresh RAM-pixel probe (do not
  reuse player-attacker fixes) starting from the BLDY one-tick drift and
  the `x2 -= tBattlerSpriteId` sign for the opponent-side attacker slot.
  See `ANIMATION_COVERAGE.json`'s `MOVE_SHADOW_PUNCH.remaining` for the full
  per-family px-count breakdown. MIST_BALL's own remaining blockers are
  unchanged and still open: `waitforvisualfinish` sprite-lifetime tracking,
  `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s own BG1 pipeline (a
  genuinely new subsystem), and generalizing `AnimTask_BlendBattleAnimPal`
  past its one DRAGON_BREATH instance. The `dragon-fire-projectile`
  siblings FIRE_BLAST and FIRE_SPIN also remain open (FIRE_BLAST's own real
  surface is `SoundTask_FireBlast` + `gFireBlastCrossSpriteTemplate`/
  `gFireBlastRingSpriteTemplate` sprites). `blend_color_cycle` (28 Level-50
  moves, the current top no-representative family) is still unenumerated.
- **Housekeeping:** moved the prior "SHADOW_PUNCH RAM-probed and ported"
  dated section to `ANIMATION_PROGRESS-archive.md` (superseded by this
  session's own section) to keep ~3 live (AGENTS.md's convention);
  DRAGON_RAGE's own "rung 6/7" and the BG-swap-pipeline dissolution section
  stay live alongside this one.

## SHADOW_PUNCH: `AnimTask_AttackerPunchWithTrace` RAM-probed and ported (shadowPunch.ts), Scene-ON wiring + dense comparators NOT done this step (2026-07-25)

**Verdict: the move's one unproven component is now a Tier-1-pinned, RAM-
proven port; the render-seam wiring and dense pixel acceptance the step
brief asked for did not fit in this session's remaining budget after the
probe. No coverage entry added — per this lane's own rule, code alone
(even RAM-proven code) never promotes a move's status. Honest partial, not
a blind fit: everything shipped is either read straight from RAM or reused
verbatim from an already-exact-proven sibling.**

**Extractor decode.** `Move_SHADOW_PUNCH` (`battle_anim_scripts.s:4308-
4327`) decoded into `battle-move-anim-scripts.json` (additive; the
byte-identical-reproducibility test and `factoryAnimationComponents.test.ts`
stayed green). Confirmed the script is exactly as the prior session
scoped it: linear, every op except `createvisualtask
AnimTask_AttackerPunchWithTrace` already proven by FIRE_PUNCH/ICE_PUNCH/
THUNDER_PUNCH/EXTREME_SPEED.

**Assets.** HAUNTER front+back sprites added to `extract-battle-mon-pics.ts`
(mirrors the CHARMELEON precedent). `BG_GHOST` (tile/palette/tilemap,
`fadetobg`'s own new bg id — a single tilemap, unlike EXTREME_SPEED's
side-selected pair) extracted fresh (`extract-shadow-punch-assets.ts`).

**RAM probe (`tools/probe/dump-shadowpunch-full.py`), both attacker
orientations** (staged `FRONTIER_MON_HAUNTER_1`-vs-ONIX via `mechanicLab
overrides.parties`, `tools/battle-lab/mechanic-shadow-punch-{haunter-onix,
onix-haunter}.json`). Found the real mechanism precisely, corrected one
citation error along the way (the task is `battle_anim_mons.c:2392-2496`,
not `battle_anim_fight.c` as the prior session's scoping note said —
confirmed directly via `nm` against the pinned elf, not assumed):

- The task slides the attacker's own sprite `x2` out over 5 ticks then back
  over 4 (genuinely asymmetric — the source's own "do same number of traces
  as before" comment doesn't match its actual `tCounter` bookkeeping),
  spawning one darkened(`BlendPalette` coeff 13 toward `RGB_BLACK`) +
  translucent (`CloneBattlerSpriteWithBlend` sets `ST_OAM_OBJ_BLEND`,
  `setalpha 9,8`) afterimage clone per tick — 9 total, each self-destroying
  exactly 8 ticks after its own creation.
- A real vanilla artifact, confirmed on hardware, not a bug: task setup runs
  `gSprites[attacker].x2 -= tBattlerSpriteId` — subtracting the attacker's
  own SPRITE SLOT INDEX (6-8 in the probed fixtures) from `x2` as if it were
  a pixel offset, applied once and never undone. RAM-confirmed directly
  (both orientations) that this offset is baked into every attacker/clone
  position for the task's whole life.
- `tMoveSpeed` is +8 player-side, -8 opponent-side (`GetBattlerSide`);
  `tPriority` is 2 when the attacker's own subpriority is 20 or 40, else 3 —
  RAM-confirmed both ways (player-side battler-0 subpriority 30 → priority
  3; opponent-side battler-0 subpriority 40 → priority 2).
- Derived a closed form for the whole attacker-offset/clone schedule (no
  lookup table needed — verified against every probed tick both
  orientations, see `shadowPunch.ts`'s own module doc for the formula).
- The move's own `fadetobg`/`restorebg` `BLDY` timeline (mechanism already
  exact-proven via MOVE_EXTREME_SPEED — only this move's own timing anchors
  are new) came back clean and RAM-exact except a genuine 3-tick startup
  hold at `bldy=1` on the `restorebg` ramp only (plausibly `Task_FadeToBg`'s
  own state-2 "recompute the default BG from scratch" costing extra setup
  frames) — encoded as a literal per-tick table rather than fit, since the
  window is short and the anomaly doesn't reduce to a clean formula.
- Fist/hitsplat/target-shake anchor ages read directly off RAM; the target
  shake reuses the already-ported `shakeMon.ts` primitive verbatim
  (`AnimTask_ShakeMon, ANIM_TARGET, 3, 0, 6, 1`).

**Port.** `src/engine/shadowPunch.ts` — the attacker-offset/clone closed
form, the BLDY table, and every anchor age above. `tests/shadowPunch.test.ts`
pins the closed form against every RAM-probed tick (ages 0-16) for BOTH
orientations, plus the BLDY table and the priority rule — 6 new tests, all
green.

**NOT done this step — the named remainder.** Wiring `shadowPunch.ts`
through the Scene-ON render seam (`battleScene.ts`'s
`state.config.move === "SHADOW_PUNCH"` dispatch + a `sceneOnShadowPunchView`
projection in `sceneOnPresentation.ts`, mirroring the DRAGON_RAGE/
EXTREME_SPEED precedent — healthbox/message-text draw calls are fully
generic (`composeOpponentHealthbox`/`composePlayerHealthbox` take a plain
`name: string`, no species union to extend) and the translucent-clone draw
call already exists verbatim (`drawSpriteSheetBlendedOverFb`, QUICK_ATTACK's
own precedent) — and the dense pixel comparators (both orientations, twice
each) the step brief requires for any coverage claim. Ran out of session
budget after the RAM-probe-and-port stage; stopping here with a clean,
tested port is the honest outcome rather than rushing the wiring
uncomparatored. `blend_color_cycle`'s stretch enumeration (this step's own
"only if 1-4 land with ≥10 min spare" clause) was not reached either, since
1-4 themselves didn't land.

**Coverage:** no entry added for `MOVE_SHADOW_PUNCH` — no dense pixel
evidence exists yet, so per this lane's own rule ("shared code alone never
promotes coverage") it stays unsupported in `ANIMATION_COVERAGE.json`.

**Evidence.** `npm test` 2218/2218 (2212 + 6 new). `npm run build` green.
Both RAM probes reproducible (`/tmp/shadowpunch-{haunter-onix,onix-haunter}.
json`, not committed — scratch).

## DRAGON_RAGE rungs 1-3: render-age-1 guard fixed, fire-spit sheetFrame off-by-one root-caused from source, fire-plume window disciplined-probed but not resolved — 127/150 → 139/150, stays `partial` (2026-07-25)

**Verdict: two of the three named residuals fixed on hard evidence (one of
them overturning the prior rung's own "rounding question" hypothesis); the
third (fire-plume) got a genuine disciplined probe cycle — colors dumped,
RAM read, two candidate fixes tried and both rejected on evidence — but no
fix survived, so it stays named, not swept. `MOVE_DRAGON_RAGE` stays
`partial`, a strictly smaller remainder than last rung's.**

**Rung 1 — render-age-1 creation-guard artifact, fixed.** Pixel-dumped
frame 90 (render age 1) of the player-attacker dense window directly: the
oracle photo already shows the attacker's `AnimTask_ShakeMon` offset
applied one tick before the lag-2 model's own `renderTick < creationTick`
guard clears — a shifted-tileset color map confirmed the two images agree
everywhere except a small silhouette region matching exactly a 2px
`yOffset` shake state the app predicts as zero. `shakeMonOffsetAtRenderTick`
now special-cases `renderTick === creationTick - 1` to return the raw
`{xOffset,yOffset}` (the RAM-invisible collapsed `sequence[0]` write,
framebuffer-visible for exactly that one transient tick) instead of zero;
every other pre-creation tick is unaffected. Tier-1 pinned
(`tests/dragonRage.test.ts`).

**Rung 2 — fire-spit "rounding" residual, root-caused as a real bug, not a
rounding question.** Per the step brief's own probe-first method,
pixel-dumped the render-age-86-96 diff colors *first*: they were genuine
small-ember fire-ramp colors, but the oracle's true fire-spit silhouette
was consistently LARGER than the app's, correlated with WHICH of the 3
animation frames was active (frame 0 undercounted ~5x, frame 2
overcounted) — a shape signature, not a rounding/timing one, so the step
brief's own "further `drawSpriteSheetAffineRotate` rounding question"
hypothesis is falsified and recorded as eliminated. Source proof
(`reference/pokeemerald/src/battle_anim_dragon.c:126-131`):
`sAnim_DragonRageFire` is `ANIMCMD_FRAME(16,3),(32,3),(48,3),JUMP(0)` —
byte-identical tile offsets to `sAnim_DragonBreathFire_0` (`:47-52`), the
already-pixel-exact DRAGON_BREATH precedent, which `dragonBreath.ts`
already reads with a `+1` tile-row-block shift (RAM's own `animCmdIndex` is
an index into the 3-entry ANIMCMD array, not a tile-row-block number — tile
offsets 16/32/48 are blocks 1/2/3, block 0 belongs to a different animation,
`sAnim_OutrageOverheatFire_0`). `dragonRage.ts`'s own `sheetFrame` formula
was missing that shift, silently picking the wrong, unused-by-this-
animation tile block for frame 0. Fixed the formula and the two Tier-1
assertions that had pinned the old (wrong) `sheetFrame === animCmdIndex`
equality to the source-justified `animCmdIndex + 1`; fire-plume's own
`sheetFrame` is untouched (its own animcmd table legitimately starts at
tile 0, a separate asset). Dense sweep: every render age 86-96 frame now
matches, zero regressions.

**Rung 3 — fire-plume window (render ages 98, 105-114): disciplined-probed,
not resolved, negative results recorded.** Two sub-cases, investigated
independently:

- **Render age 98** (the exact tick both the target `AnimTask_ShakeMon` and
  fire-plume spawn 0 are created): a 1598px mismatch confined exactly to
  ONIX's own sprite box, using ONIX's own grayscale palette — NOT
  plume-palette colors (the step brief's own hypothesis for this family,
  checked directly and not confirmed). RAM-probed the target sprite's full
  state (position, x2/y2, animNum, animCmdIndex, invisible, subpriority,
  matrixNum) across the surrounding ticks: all clean and unchanged, so the
  mismatch isn't explained by any currently-modeled variable. Confirmed
  deterministic (byte-identical mismatch on a second, independent fresh
  oracle run). Not root-caused.
- **Render ages 105-114** (10 frames, 1px each): confirmed via direct pixel
  reconstruction (manually sampling each candidate spawn's own tileset at
  its RAM-read position/frame) to be a real tie-break bug between two
  overlapping same-subpriority fire-plume spawns — but not a single-knob
  fix. Reversing the paint order within each subpriority group fixes the
  105-113 overlap (spawn 0 vs spawn 1) but breaks a *different*,
  previously-clean overlap at render ages 114-118/123 (spawn 1 vs spawn 4) —
  tried, net smaller improvement, reverted, not shipped. A uniform
  fire-plume lag of 0 was also tried (ages 98-144 regress hard, 112/150,
  much worse) and rejected; lag 1 stays committed. The age-114 case further
  shows spawn 1's own rendered sheet frame sits one step behind what the
  uniform 1-tick lag model predicts at its OWN specific frame-boundary
  transition, while the same lag is exactly right for every other
  simultaneously-active spawn — a genuinely compound (z-order tie-break
  *and* a per-spawn frame-transition detail) residual, not a single
  constant to sweep. Isolating it cleanly needs a fixture where individual
  plume spawns don't spatially overlap each other, out of this rung's
  budget.

**Rung 4 — not reached.** Player orientation is 139/150, not the required
150/150, so per the step brief's own gate the opponent-attacker orientation
dense run and CHARMELEON's `ANIM_BACK_AND_LUNGE` front-anim port were not
attempted this step.

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` — `remaining` updated to
139/150 with the narrowed, single-family (fire-plume) residual.

**Evidence.** `npm test` 2209/2209 (2207 + 2 new: the rung-1 transient pin
and the rung-2 `sheetFrame` shift assertions). `npm run build` green. Both
fixes reproduced against a fresh, independent oracle capture (not just the
cached one used to iterate) — 139/150 byte-identical both times.

## Anim-script interpreter spike: SUCCESS (2026-07-24)

**Verdict: the interpreter reproduces the move.** Built a minimal interpreter
over the committed anim command stream (`src/data/gen/battle-move-anim-scripts.json`'s
now-populated `FEATHER_DANCE` entry — previously only `ROCK_SLIDE`/
`DOUBLE_TEAM`, so this spike also had to add the FEATHER_DANCE decode to
`tools/extract/extract-battle-move-anim-assets.ts` before the "committed
stream" claim was actually true) plus a direct port of `AnimFallingFeather`/
`AnimFallingFeather_Step` (`battle_anim_flying.c:572-893`, ~320 source lines
including the four largely-symmetric quadrant cases, ported 1:1 with named
booleans replacing the packed bitfield — not the "~50 lines" estimate, which
undercounted the state-machine switch). `src/engine/featherDance.ts`'s
`makeFeatherSpriteLookup` now runs this simulation instead of replaying
`turn{6,7,8}-feather-sprites-probe.json`; those probe imports are deleted from
production and now live only in `tests/featherDanceInterpreter.test.ts` as
dev-time pinning evidence. **ISSUES #40 retired** (propose deleting its entry;
supervisor folds it).

**Evidence.** All three committed dense comparators rerun at their exact
recorded counts, zero regressions: `turn6-feathers.json` **235/235**,
`turn7-feathers.json` **145/145**, `turn8-feathers.json` **162/162**
(`turn6-featherdance.json` **90/90** and `turn11-featherdance.json`
**178/178** also unchanged). `tests/featherDanceInterpreter.test.ts` checks
every field (centerX/centerY/pa/pb/pc/pd/animNum/priority) at every real RAM
tick across all three probes — **973/973 matched** in each turn (turn6/turn8
each carry a further ~12-87-row tail of a later, unrelated sprite reusing the
same OAM slot after the real feathers self-destroy; the interpreter correctly
excludes it rather than needing a hand-picked `lastRamTick` cutoff). The
simulation's own natural self-destroy tick (from the ported `y >=
destroyThreshold` physics, no external parameter) lands on **exactly**
7557/8591/9637 — the old hand-recorded cutoffs — for all three turns.

**The one genuine derivation, not a curve fit:** the script's `delay 6`
between createsprite groups produces an 8-tick RAM spawn spacing
(0,8,8,16,16,24,24,32 across the 8 feathers), not 6. This falls straight out
of the shared script VM (`reference/pokeemerald/src/battle_anim.c`'s
`RunAnimScriptCommand`/`Cmd_delay`/`WaitAnimFrameCount`): `delay N` costs
`N+2` ticks until the next opcode runs (N decrementing calls + 1 more to
detect zero, then one more tick before `RunAnimScriptCommand` resumes) — a
property of the VM, not of FEATHER_DANCE, verified here and not yet
batch-checked against a second move (that check is the generality claim a
later step would need, per the scope rules below).

Move acceptance and dense oracle evidence are unchanged: FEATHER_DANCE stays
`exact`, same coverage entry, same evidence files plus the new
interpreter/test files (`ANIMATION_COVERAGE.json`). Only the implementation
unit changed — hand-fitted timelines are now the exception requiring
justification, not the default; the interpreter itself has one representative
(FEATHER_DANCE) and is deliberately scoped to the two ops (`delay`,
`createsprite`) that move's script actually uses. Generalizing it to a second
move (proving the `delay`-cost rule and the createsprite-schedule walk
against a different script) is a later step, not this one.

## Interpreter generalization, second-move proof: MOVE_MIST_BALL — STOP AND SPLIT (2026-07-24)

**Verdict: does NOT generalize cheaply. Enumerated the command surface per the
step brief's own rule and stopped before coding, per that rule's explicit
sanction ("that is a successful outcome, not a failure").** This directly
answers the open question the FEATHER_DANCE spike left flagged: FEATHER_DANCE's
success (`delay`/`createsprite` only, no `Random()`, no sub-tasks) does NOT
carry to a script this rich. MIST_BALL is a legitimately harder script, not a
templated repeat.

**What was done.** Extended `tools/extract/extract-battle-move-anim-assets.ts`
with a full decode of `Move_MIST_BALL` (`battle_anim_scripts.s:3955-3973`) into
`battle-move-anim-scripts.json`'s new `MIST_BALL` entry (`callback: null`,
`status` field records the stop) — additive only, every other extractor output
re-verified byte-identical (`git status` after a full re-run showed only the
one JSON file touched). No interpreter/callback port lands this step.

**Command-surface enumeration** (every op read against its real C callback,
not guessed):
- `loadspritegfx ANIM_TAG_SMALL_BUBBLES` / `ANIM_TAG_WHITE_FEATHER` — already-
  supported op; the WHITE_FEATHER load is a red herring (see below).
- `delay`, `playsewithpan`, `end` — already supported / no-op for pixel output.
- `createsprite gMistBallSpriteTemplate, ANIM_TARGET, 0, 0,0,0,0, 30, 0` —
  callback chain `AnimThrowMistBall` → `TranslateAnimSpriteToTargetMonLocation`
  → `StartAnimLinearTranslation` (`battle_anim_ice.c:1090-1095`,
  `battle_anim_mons.c:1546-1568`). **New primitive**: no move to date has a
  generic linear-translation port — `firePunch.ts`'s burn-flame particles hand-
  fit ONE instance's Q8.8 delta constant instead of porting
  `StartAnimLinearTranslation`'s accumulator generically.
- `waitforvisualfinish` — **needs real semantics**. The current interpreter
  (`featherDance.ts`) treats this op as a fixed 0-tick no-op, valid only
  because FEATHER_DANCE's own instance sits after the LAST `createsprite` (a
  script-position coincidence, calibrated around via
  `TURN6_FIRST_VISIBLE_TICK`). MIST_BALL's `waitforvisualfinish` sits in the
  MIDDLE of the script and genuinely gates continuation on the mist-ball
  sprite's own 30-tick lifetime finishing — the interpreter would need actual
  sprite-lifetime tracking to generalize this op at all.
- `createvisualtask AnimTask_ShakeMon, ...` (×2) — algorithmically simple,
  deterministic toggle-and-count state machine
  (`battle_anim_mon_movement.c:87-141`), and the mechanism is already dense-
  oracle-proven via hand-fit tables in `quickAttack.ts`/`fly.ts` — lowest-cost
  item on this list, a real port (not a fresh fit) is straightforward.
- `complex_palette_blend ... selector=F_PAL_BG ...` — this is a **script
  macro** (`asm/macros/battle_anim_script.inc:294-296`), not a raw opcode; it
  expands to `createsprite gComplexPaletteBlendSpriteTemplate, ...`. Its
  callback (`AnimComplexPaletteBlend`/`_Step1`/`_Step2`,
  `battle_anim_normal.c:344-407`) blends the WHOLE selected battle-palette set
  toward a color and back via `BlendPalettes`/`UnpackSelectedBattlePalettes`,
  gated on the unrelated global `gPaletteFade.active` being false between
  steps. **New subsystem** — no ported move touches whole-palette-set blending
  or depends on an external fade-system gate.
- `createvisualtask AnimTask_MistBallFog, 5` — **new subsystem, and the exact
  "background fade pipeline" example the step brief names as a stop trigger.**
  `AnimTask_MistBallFog`/`_Step` (`battle_anim_ice.c:1097-1170+`) loads NEW BG1
  tiles (`gWeatherFogHorizontalTiles`), a NEW tilemap (`gBattleAnimFogTilemap`),
  and a NEW palette (`gFogPalette`) via `LoadBgTiles`/
  `AnimLoadCompressedBgTilemapHandleContest`/`LoadPalette` — none of which any
  extractor in this codebase has ever exercised — then drives `BLDCNT`/
  `BLDALPHA` through a 4-phase state machine (ramp in via a lookup table, hold
  ~80 ticks, ramp out, clear both BG1 and BG2). This is a full background-
  compositing pipeline, categorically different from every sprite/palette
  mechanism ported so far.
- `createvisualtask AnimTask_BlendBattleAnimPal, ...` (×2) — the task itself
  already has ONE hardcoded fitted instance (`battleScene.ts`'s DRAGON_BREATH
  red-fade). MIST_BALL needs it **generalized** into a reusable parametric
  primitive (color/range/step all vary) rather than a second hand-fit —
  moderate cost, not free reuse.

**Tally: 6 substantive new-or-generalize items** (linear translation,
`waitforvisualfinish` real semantics, `AnimTask_ShakeMon` port,
`AnimComplexPaletteBlend`, `AnimTask_MistBallFog`, `AnimTask_BlendBattleAnimPal`
generalization), two of which are genuinely new subsystems — past the step
brief's own ">~4 substantive ops or a genuinely new subsystem" stop threshold.
Per that rule this session stopped after the enumeration + extractor decode,
rather than rushing a partial port.

**The `ANIM_TAG_WHITE_FEATHER` load is a red herring, confirmed by source, not
just inferred from the component graph:** `AnimThrowMistBall` uses
`ANIM_TAG_SMALL_BUBBLES` (`gMistBallSpriteTemplate`); `AnimTask_MistBallFog`
loads its own separate BG asset trio. Nothing in `Move_MIST_BALL`'s script ever
consumes the loaded `ANIM_TAG_WHITE_FEATHER` tile data — it's loaded but dead,
so this move shares NO real sprite/asset component with FEATHER_DANCE despite
the `battle-animation-components.json` dependency-graph edge (`goal` text in
`ANIMATION_COVERAGE.json`'s `white-feather` track updated to record this).

**Remainder for whoever picks this back up** (in cost order): port
`AnimTask_ShakeMon` generically (cheapest, evidence already exists elsewhere);
port the linear-translation primitive and wire `AnimThrowMistBall`; generalize
`AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH instance; give the
interpreter real `waitforvisualfinish` semantics (sprite-lifetime tracking);
only then tackle the two new subsystems (`AnimComplexPaletteBlend`,
`AnimTask_MistBallFog`'s BG pipeline) — each is its own extraction + engine
slice, likely each deserving its own bounded step. No Level-50 staging or dense
oracle window was attempted this step (staging happens after there's something
real to render); MIST_BALL stays unsupported (no `ANIMATION_COVERAGE.json`
entry) rather than `partial`, since zero dense window is green.

## MIST_BALL remainder, rungs 1-2: ShakeMon ported, linear translation ported (2026-07-24)

**Rung 1 — `AnimTask_ShakeMon` (`battle_anim_mon_movement.c:87-141`).** Ported
1:1 as `src/engine/shakeMon.ts` (`shakeMonSequence`/`shakeMonOffsetAtTick`,
parametric `xOffset,yOffset,numTimes,frameDelay`). `quickAttack.ts`'s
`TARGET_SHAKE_AGES` hand-fit set is deleted and replaced by a call through
the port (`quickAttackTargetShakeX2`); both QUICK_ATTACK comparators re-run
at their recorded counts: `quick-attack-pidgeotto-onix.json` **219/219**,
`quick-attack-player-pidgeotto-onix.json` **214/214**.

`fly.ts`'s own `AnimTask_ShakeMon(ANIM_TARGET,6,0,8,1)` instance
(`FlyUnleash`, `battle_anim_scripts.s:6418`) was **not** ported — a genuine
divergence, not fudged. The literal port's own state machine predicts an
isolated leading nonzero tick before settling into 2-tick pairs (any
even `numTimes` with `frameDelay=1` shakes this way: creation tick alone,
then pairs); `fly.ts`'s committed `FLY_SHAKE_AGES = {24,25,28,29,32,33}` is
exactly that pattern's three pairs with the leading isolated tick omitted,
at the best-fit creation-tick alignment (one tick before
`FLY_IMPACT_FIRST_AGE`, i.e. age 21). Swapping the port in at that alignment
was tested directly against the oracle this session and **regresses**
`fly-murkrow-onix-strike.json` from the recorded **248/248** to **247/248**
(one mismatched frame at the extra age-21 tick) — the hand-fit's omission is
correct, the port's naive alignment is not. Reverted; `fly.ts` is
byte-identical to its prior commit. `FLY_SHAKE_AGES` and the divergence
itself are pinned in `tests/shakeMon.test.ts` so the gap is visible without
re-spending the oracle round-trip. Re-confirmed unchanged after revert:
`fly-murkrow-onix-strike.json` **248/248**,
`fly-player-murkrow-onix-strike.json` **244/244**.

`AnimTask_ShakeMon2` (the coverage report's 64-remaining-move leverage item)
is a **different** source task (positive/negative alternation, not on/off
toggling) — this port's helpers do not cover its surface; only the general
"parametric task-state-machine, driven tick-by-tick" shape is reusable as a
template for a future `ShakeMon2` port, not any code from this rung.

**Rung 2 — linear-translation Q8.8 accumulator**
(`InitAnimLinearTranslation`/`AnimTranslateLinear`,
`battle_anim_mons.c:1065-1139`). Ported as
`src/engine/animLinearTranslation.ts` (`linearTranslationDeltaQ8` +
`linearTranslationOffsetAfterCallbacks`), including the direction-in-low-bit
forcing and the freeze-at-`durationTicks` behavior. `firePunch.ts`'s
hardcoded `BURN_FLAME_X_DELTA_FIXED8`/`_LEFT_FIXED8` (614/615) are deleted
and replaced by a call through the port fed the same distance (48px) and
duration (20 ticks) the burn flames' real `AnimBurnFlame` ->
`AnimTravelDiagonally` call site uses. Both FIRE PUNCH portable comparators
re-run at their recorded counts: `fire-punch-onix-grovyle.json` **225/225**,
`fire-punch-grovyle-onix.json` **277/277**.

`fly.ts`'s own private `linearDeltaQ8`/`truncDiv` helpers (the strike ball's
travel) compute the identical formula — cross-checked in
`tests/animLinearTranslation.test.ts` — but were **not** consolidated into
the shared module this step: `fly.ts`'s version never caps accumulated
callbacks at `durationTicks`, and checking whether that matters needs a
fresh oracle round-trip this step's time budget didn't allow. Left as a
documented follow-up rather than risking FLY's `exact` status unverified.

**Rung 3 (stretch — wiring `AnimThrowMistBall` through the new primitive,
RAM-probe trajectory validation) was not attempted; no time remained.**

**Remainder, recomputed in cost order:** (1) resolve the `FLY`
`AnimTask_ShakeMon` alignment — the primitive itself is now proven correct
(one clean representative, QUICK_ATTACK); this is a bounded calibration
task (find the true per-call-site creation-to-display lag), not a
re-derivation; (2) wire `AnimThrowMistBall` through the now-ported
linear-translation primitive + the interpreter's `createsprite` path, RAM-
probe-validated (rung 3 above); (3) generalize `AnimTask_BlendBattleAnimPal`
past its one DRAGON_BREATH instance; (4) give the interpreter real
`waitforvisualfinish` semantics (sprite-lifetime tracking); (5) the two new
subsystems (`AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s BG
pipeline) — each its own bounded step. MIST_BALL stays unsupported.

## FLY `AnimTask_ShakeMon` calibration: RESOLVED, landed on the port (2026-07-24)

**Verdict: outcome (1) from the step brief — a per-call-site creation-
offset parameter reconciles the port with 248/248 + 244/244. `fly.ts` now
calls through `shakeMonOffsetAtTick` directly; `FLY_SHAKE_AGES` is deleted.**

**Root mechanism, pinned by RAM evidence, not a curve fit.** Wrote
`tools/probe/dump-fly-shakemon-tasks.py` (stages via the same
`battle_lab.BattleLab` mechanicLab request the committed strike fixtures
use, so the window is reached in ~1k frames) and dumped `gTasks` (all 16
slots, full struct) plus every in-use sprite's x2/y2 across FlyUnleash's
`create_basic_hitsplat_sprite`/`createvisualtask AnimTask_ShakeMon` window,
for both strike comparators (opponent- and player-attacker).

`RunAnimScriptCommand` is a `do...while (sAnimFramesToWait == 0 &&
gAnimScriptActive)` loop (`battle_anim.c`): `createsprite`,
`createvisualtask`, and `playsewithpan` never set `sAnimFramesToWait`, so
FlyUnleash's hitsplat creation, `AnimTask_ShakeMon` creation, the razor-wind
`playsewithpan`, and `waitforvisualfinish` all execute inside **one** call,
i.e. one RAM tick — confirmed directly (both probes: the hitsplat's new
sprite slot and the ShakeMon task appear in the same tick). But the
ShakeMon task's OWN first-observable RAM state is not a fresh creation: its
`data[1]` (numTimes) already reads one less than `AnimTask_ShakeMon` sets,
and the target sprite's x2 is already 0, not `xOffset`. `CreateTask`
inserts the new task into `gTasks`'s priority-ordered linked list
(`task.c`'s `InsertTask`), and `RunTasks` walks that list via `.next` from
wherever its traversal currently sits. FlyUnleash's call uses task priority
**5**; QUICK_ATTACK's uses priority **2**. Priority 5 lands the freshly
inserted task where `RunTasks`'s *own, already-in-progress* traversal for
that frame reaches it again, so it gets stepped a **second** time before
that frame ever renders — collapsing the port's tick 0 (the creation-time
synchronous self-call, x2 still holds `xOffset`) and tick 1 (the first
regular toggle, back to zero) into one displayed tick. QUICK_ATTACK's
priority 2 does not trigger this (confirmed by its own comparator: tick 0
is directly visible, no reconciliation needed). Every later FLY tick is a
normal 1:1 step (traced through self-destroy in both probes).

The task's own RAM creation tick converts to display age 22
(`FLY_IMPACT_FIRST_AGE`, matching the hitsplat's own first-visible age —
both are created in the same batch and share the codebase's uniform 1-tick
RAM-write-to-displayed-pixel lag) in **both** probes independently. Querying
`shakeMonOffsetAtTick(6, 0, 8, 1, age - FLY_SHAKE_CREATION_AGE + 1)`
(the `+1` skips the collapsed tick 0) reproduces `{24,25,28,29,32,33}` —
the previous hand-fit `FLY_SHAKE_AGES` — exactly.

**Landed:** `src/engine/fly.ts` — `FLY_SHAKE_AGES` deleted, `targetShakeX2`
now calls `shakeMonOffsetAtTick` through the documented
`FLY_SHAKE_CREATION_AGE` constant (guarded so ages before creation stay
zero, since the port's own tick 0 is nonzero and must not leak backward
through the `+1` shift). `tests/shakeMon.test.ts`'s FLY test rewritten from
"documents a divergence" to pin the real mechanism and the exact
reconciliation. New probe `tools/probe/dump-fly-shakemon-tasks.py` (dev-time
only, not shipped).

**Evidence.** `npm test` 2045/2045, `npm run build` green.
`fly-murkrow-onix-strike.json` **248/248**,
`fly-player-murkrow-onix-strike.json` **244/244** (both through the port,
zero mismatched pixels — previously 247/248 when the port was swapped in
naively without this mechanism). Charge-turn fixtures unaffected but
re-run as a sanity check: `fly-murkrow-onix-charge.json` **151/151**,
`fly-player-murkrow-onix-charge.json` **147/147**. QUICK_ATTACK re-run since
its own test in the shared file changed: `quick-attack-pidgeotto-onix.json`
**219/219**, `quick-attack-player-pidgeotto-onix.json` **214/214**.

RUNG B (MIST_BALL rung 3, wiring `AnimThrowMistBall`) was not attempted
this step — RUNG A's RAM-probe investigation and verification used the full
session; no safe margin remained to start a second bounded oracle-facing
change.

## MIST_BALL remainder rung 3: AnimThrowMistBall wired, RAM-probe-validated (2026-07-24)

**Verdict: rung 3 lands clean, first try, zero test-fix iterations — the RAM
evidence matched the ported chain exactly once the real tick semantics were
derived from the probe (not assumed).** `src/engine/mistBall.ts` ports
`AnimThrowMistBall` → `TranslateAnimSpriteToTargetMonLocation` →
`StartAnimLinearTranslation` (`battle_anim_ice.c:1090-1095`,
`battle_anim_mons.c:1546-1568`), driven by the script's own single
`createsprite gMistBallSpriteTemplate, ANIM_TARGET, 0, 0,0,0,0, 30, 0`
(`durationTicks` read directly from `battle-move-anim-scripts.json`'s
`createspriteArgvMapping`, not hand-copied) and the already-ported
`animLinearTranslation.ts` primitive.

**The anim-script interpreter is now a real shared primitive, not a
FEATHER_DANCE-only helper.** `interpretCreateSpriteSchedule` moved out of
`featherDance.ts` into a new `src/engine/animScriptInterpreter.ts`; both
`featherDance.ts` and `mistBall.ts` import the one function. This is the
"interpreter's createsprite path" the step brief names — MIST_BALL's own
schedule is the trivial one-element case (a single createsprite before its
first `delay`), so this generalization step didn't need new interpreter
logic, only extracting the existing one for reuse.

**RAM probe** (`tools/probe/dump-mist-ball-sprite.py` against a new
`tools/battle-lab/mechanic-mist-ball-latias-onix.json` `overrides.parties`
mechanicLab scenario — opponent Latias forced into MIST_BALL on all four
slots, player Onix — staged in ~1k frames). Sprite identified unambiguously
by its `template` pointer (`gSprites+0x14`) matching `gMistBallSpriteTemplate`
(`0x08595c70`, from `bin/oracle symbols`), not by OAM-slot guessing. Full
window captured: absent before creation, in-use ticks 88-119 (32 ticks),
absent after. Committed as dev-time evidence,
`src/data/gen/mist-ball-sprite-probe.json` (38 rows, ticks 85-122).

**The one genuine derivation, from `Cmd_createsprite`'s `CreateSpriteAndAnimate`
call (`sprite.c:591-611`), not assumed from a neighbor mechanism:** the
sprite's creation tick shows `TranslateAnimSpriteToTargetMonLocation`'s
effects (`data[0]=30`, `data[2]`/`data[4]` = target coords, `callback` already
reassigned to `StartAnimLinearTranslation`) already applied, with `x2=y2=0`
(no accumulation yet). This is because `CreateSpriteAndAnimate` calls the
fresh sprite's callback (`AnimThrowMistBall`) *synchronously* at creation
(inside the `createsprite` opcode itself), then that same frame's ordinary
`AnimateSprites()` sweep advances the just-reassigned callback
(`TranslateAnimSpriteToTargetMonLocation`) a *second* time before the frame
renders — two callback steps land on one RAM tick, mirroring in spirit (but
not in cause — this is `CreateSpriteAndAnimate`'s own synchronous call, not
FLY's task-list-traversal double-step) the FLY `AnimTask_ShakeMon` finding
above. `StartAnimLinearTranslation` itself first runs — and self-invokes
`AnimTranslateLinear_WithFollowup` once inline — on the *next* tick. Net
result: `callbacks = tick` (no `+1`/`-1` fixup) maps a probe-relative tick
directly onto `linearTranslationOffsetAfterCallbacks`, landing exactly on
the primitive's own documented "first displayed tick is pre-callback" case.
Verified against **every** real probed tick (32/32), not fitted: the
Tier-1 test (`tests/mistBall.test.ts`) passed on the first run with no
constant-tuning.

**Not attempted (honest scope boundary, per the step's own OUT OF SCOPE
list and stop-and-split remainder):** `mistBall.ts` is a standalone,
RAM-validated module — it is **not** wired into `battleScene.ts`'s move
dispatch, so MIST_BALL gets no `ANIMATION_COVERAGE.json` entry and stays
fully unsupported (shared code alone never promotes coverage). No dense
oracle pixel comparator exists for the ball's flight: rendering it needs
`ANIM_TAG_SMALL_BUBBLES` sprite-sheet extraction and OAM draw wiring that
no extractor in this codebase has exercised yet, a nontrivial slice on its
own, not a quick add inside this step's remaining time. `waitforvisualfinish`
sprite-lifetime semantics, `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s
BG pipeline, and generalizing `AnimTask_BlendBattleAnimPal` past its one
DRAGON_BREATH instance are all still open — MIST_BALL needs every one of
those before it can render at all, let alone reach `partial`/`exact`.

**Evidence.** `npm test` 2125/2125 (up from 2045 — added `tests/mistBall.test.ts`,
no regressions). `npm run build` green. `featherDance.ts`'s own tests
(`tests/featherDance.test.ts`, `tests/featherDanceInterpreter.test.ts`) re-run
unchanged after the `interpretCreateSpriteSchedule` extraction (pure move,
zero behavior change) — no dense oracle comparator touches
`animScriptInterpreter.ts`'s exported surface, so none were re-run.

## `AnimTask_ShakeMon2` ported generically, DRAGON_BREATH + BLAZE_KICK re-driven (2026-07-24)

**Verdict: the port generalizes cleanly across both named representatives,
first try, zero test-fix iterations — both hand-fit shake formulas deleted,
all four comparators re-run at exactly their recorded counts.** This is the
coverage report's top task-level leverage item (64 remaining Level-50 moves
depend on `AnimTask_ShakeMon2`); this step proves the port against its two
named representatives only — no new move gets wired this step.

**Port.** `src/engine/shakeMon2.ts` (`shakeMon2Sequence`/`shakeMon2OffsetAtTick`)
is a 1:1 port of `AnimTask_ShakeMon2`/`AnimTask_ShakeMon2_Step`
(`battle_anim_mon_movement.c:155-238`) — genuinely a different source task
from `shakeMon.ts`'s `AnimTask_ShakeMon` per the prior rung's warning (no code
carried over): offsets alternate between `+offset`/`-offset` (never touching
zero mid-sequence) instead of toggling `offset`/`0`, and the final toggle
forces zero and self-destroys instead of continuing the alternation. One
implementation note: the toggle uses `0 - offset` rather than `-offset` to
avoid emitting `-0` for the `yOffset=0` both call sites pass (numerically
identical to `0` but fails strict/deep equality). Tier-1 tests
(`tests/shakeMon2.test.ts`, 6 tests) pin the alternation pattern directly
(varying `numTimes`/`frameDelay`), that mid-sequence values never land on
zero, boundary behavior before creation/after self-destroy, and both call
sites' exact reconciliation against their pre-existing hand-fit tables.

**Call-site mapping, derived from committed constants, not fitted.** Checked
each site's real source args directly against `battle_anim_scripts.s`:
- DRAGON_BREATH (`:4943`): `createvisualtask AnimTask_ShakeMon2, 2,
  ANIM_TARGET, 2, 0, 21, 1` → `shakeMon2OffsetAtTick(2, 0, 21, 1, tick)`.
- BLAZE_KICK (`:8498`): `createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET,
  3, 0, 14, 1` → `shakeMon2OffsetAtTick(3, 0, 14, 1, tick)`.

Both sites need the same "+1, guard age < creationAge" idiom `fly.ts`'s
`FLY_SHAKE_CREATION_AGE` already established for `AnimTask_ShakeMon`: the
port's own tick 0 (the creation write) is never independently displayed.
For DRAGON_BREATH the creation-age anchor is the pre-existing
`DRAGON_BREATH_SHAKE_FIRST_AGE` (13) constant itself — confirmed against the
*independently* RAM-probed old canonical-path comment in `battleScene.ts`
(`dragonBreathShakeX2`'s own doc: "by the FIRST RAM tick this task's callback
is observed, x2 ALREADY reads the FIRST FLIP's result", i.e. the exact same
collapse), not re-derived from scratch. For BLAZE_KICK the anchor is the
pre-existing `BLAZE_KICK_FIRE_SPREAD_FIRST_AGE` (35) constant: its
`AnimTask_ShakeMon2` creation coincides (zero `delay` between them, same
`RunAnimScriptCommand` pass) with `call FireSpreadEffect`'s own first tick,
so it shares that anchor exactly. Both mappings reproduce their entire
pre-existing hand-fit table exactly (verified in `tests/shakeMon2.test.ts`
before touching either call site) — this is a genuine derivation from
already-committed, already-evidenced constants, not a fresh curve fit.

Both `DRAGON_BREATH_SHAKE_FIRST_AGE`'s formerly-paired `_END_AGE` constant is
deleted: the port's own self-destroy tick now determines the end, not a
second hand-picked literal.

**`dragonBreath.ts`/`blazeKick.ts` re-driven, hand-fit constants deleted.**
`dragonBreath.ts`'s `Math.floor((age-first)/2)%2` formula and
`DRAGON_BREATH_SHAKE_END_AGE` are gone; `blazeKick.ts`'s
`Math.floor(shakeAge/2)%2 ? -3 : 3` formula and its local `shakeAge` are
gone. Both now call `shakeMon2OffsetAtTick` directly.

**Two call sites, NOT this step's scope, left untouched:** `statusAnimation.ts`
(`animTaskShakeMon2AtSourceAge`, the paralysis-shake visual component BOUNCE's
successful-paralysis variant uses) and `faintAttack.ts`
(`AnimTask_ShakeMon2(ANIM_TARGET,2,0,9,1)`) both already have their own
independent hand-fit `AnimTask_ShakeMon2` formulas. The step brief named only
`dragonBreath.ts`/`blazeKick.ts`; retiring those two through the new port is
a natural, bounded follow-up but wasn't attempted here.

**The canonical `turn2-dragonbreath.json`/`turn2-dragonbreath-projectiles.json`/
`turn13-dragonbreath-faint.json` fixtures do NOT feed through `dragonBreath.ts`
at all** — checked directly: they render through `battleScene.ts`'s own
separate, absolute-tick `drawDragonBreathScene`/`dragonBreathShakeX2`
(the frozen "retired Battle 2 march" path, independently RAM-probed via
`tools/probe/dump-dragonbreath-anim.py` when it was written), not the
portable reducer. `battleScene.ts` was not touched this step, so those three
fixtures are provably unaffected and were not re-run.

**Evidence.** `npm test` 2131/2131 (up from 2125 — added `tests/shakeMon2.test.ts`,
6 tests). `npm run build` green. All four re-driven comparators at their
exact recorded counts, zero regressions:
`dragon-breath-player-onix-opponent-murkrow.json` **85/85** component +
**85/85** framebuffer, `dragon-breath-opponent-onix-player-murkrow.json`
**85/85** + **85/85**, `blaze-kick-player-onix-opponent-murkrow.json`
**78/78** + **78/78**, `blaze-kick-opponent-onix-player-murkrow.json`
**78/78** + **78/78** (all match `ANIMATION_COVERAGE.json`'s recorded
counts exactly).

Move acceptance is unchanged: DRAGON_BREATH and BLAZE_KICK both stay `exact`,
same coverage entries, same evidence files plus the two new port/test files.
`ANIMATION_COVERAGE.json`'s move-level text is untouched (its own prose
already describes the shake generically, not as a hand-fit formula) — only
the `elemental-fire` track's implementation detail changed underneath it.

## MOVE_MUD_SLAP dense-evidence acceptance step: already complete, re-verified (2026-07-24)

**Verdict: the assigned step ("bring MOVE_MUD_SLAP to a dense-evidence
acceptance state") was already done — mis-scoped, not blocked.**
`ANIMATION_COVERAGE.json`'s `MOVE_MUD_SLAP` entry has carried `status:
"exact"` with both-orientation dense evidence since commit `c1df4a9`
("animation: prove Mud Slap in both orientations"), an ancestor of this
worktree's own branch point — the work predates this session's step brief
entirely. No source code needed changing, so no code commit was made this
step; this entry exists only to record that the assignment was checked
honestly rather than skipped or rubber-stamped.

**Verification performed, not assumed.** Read `Move_MUD_SLAP`'s script
(`reference/pokeemerald/data/battle_anim_scripts.s:5220-5241`):
`loadspritegfx ANIM_TAG_MUD_SAND`, attacker slide-to-offset/slide-to-original
choreography (shared `gSlideMonToOffsetSpriteTemplate`/
`gSlideMonToOriginalPosSpriteTemplate`, same as SAND_ATTACK), then six
`call MudSlapMud`, each spawning five `gMudSlapMudSpriteTemplate` sprites
(30 total, matching `src/engine/mudSlap.ts`'s own "30 stock
`Random2()`-resolved" doc comment) plus a `delay 2`. Read the callback
(`reference/pokeemerald/src/battle_anim_ground.c`): `gMudSlapMudSpriteTemplate`
is `.oam = &gOamData_AffineOff_ObjNormal_16x16` with `sAnim_MudSlapMud`
(frame 1) and `.callback = AnimDirtScatter` — the identical callback
SAND_ATTACK's `gSandAttackDirtSpriteTemplate` uses at 8x8, confirming
`mudSlap.ts`'s claim that it "shares `AnimDirtScatter` translation semantics
with SAND ATTACK" while modeling its own distinct 16x16/30-sprite/6-wave
geometry — not a guess, matches the actual source.

`npm test` 2147/2147, `npm run build` green (both unchanged from before this
step — no source touched). Re-ran both committed portable comparators fresh
against the live oracle rather than trusting the recorded numbers:
`mud-slap-pidgeotto-onix.json` **51/51** source OAM + **51/51** RGB,
`mud-slap-player-pidgeotto-onix.json` **51/51** + **51/51** — both match
`ANIMATION_COVERAGE.json`'s recorded counts exactly, zero regressions.
SAND_ATTACK's own module/comparators were not touched (out of scope, and
unnecessary since no shared code changed).

## MOVE_EMBER dragon-fire-projectile sibling: two sprite families ported, RAM-probed, dense-evidenced both orientations — `partial` (2026-07-24)

**Verdict: real progress, not yet `exact`.** `Move_EMBER` (`battle_anim_scripts.s:919-937`) is genuinely bounded — no monbg/splitbgprio, no new subsystem, both its sprite families (three `gEmberSpriteTemplate` projectiles via `TranslateAnimSpriteToTargetMonLocation`, three `gEmberFlareSpriteTemplate` hit flares via `AnimEmberFlare`/`AnimTravelDiagonally`, both `battle_anim_fire.c`/`battle_anim_mons.c`) collapse onto the SAME `StartAnimLinearTranslation` Q8.8 accumulator DRAGON_BREATH/FLAMETHROWER/MIST_BALL already established. `src/engine/ember.ts` derives every position/frame/subpriority field from the ported source formulas (`SetAnimSpriteInitialXOffset`'s side-signed offset, `TranslateAnimSpriteToTargetMonLocation`'s/`AnimTravelDiagonally`'s distinct coordinate-type rules, `sAnim_BasicFire`'s 5-frame cycle) — verified against fresh mgba RAM probes in both cast orientations, not fitted to them (100% match, 63/63 component frames, at every real tick in both orientations before any framebuffer work started).

**Two real bugs found via the dense pixel comparator itself, both fixed:**
- The ember/flare draw-order tie-break (equal target-relative subpriority, equal screen Y — three flares can share the same Y) was sorting ascending `spawnIndex`; the RAM-probed `sSpriteOrder` showed the EARLIER-created sprite paints last/frontmost on a Y tie — the same descending-creation-order rule `dragonBreath.ts` already established among its own eleven embers, just not carried over correctly on the first pass.
- The opponent-attacker fixture (`mechanic-ember-opponent-onix-player-murkrow.json`) initially assumed both battlers were at full HP (a fresh single-move battle). The RAM probe showed opponent ONIX's HP is actually 69/117 by the time EMBER's own dense window starts — player MURKROW's own (unforced, rental-set) move resolves first in that turn order and chips ONIX before EMBER acts. This is exactly why DRAGON_BREATH/THUNDER_PUNCH's own sibling fixtures for this same ONIX/MURKROW pair already use 69, not full HP — not a fresh-battle assumption, confirmed directly against my own probe's `opponent.hp` field per frame.

**Results.** Opponent ONIX → player MURKROW: relative ages 0-62 / oracle frames 442-504, **63/63 component AND 63/63 framebuffer**, zero exclusions — fully exact for this orientation. Player ONIX → opponent MURKROW: relative ages 0-62 / oracle frames 388-450, **63/63 component but 61/63 framebuffer** — two frames (389, 395; 3-8px each) are off, and both are exactly the FIRST displayed tick of a newly-spawned ember (ember1's own age 0, ember2's own age 0); every other tick of both embers, all three flares, and the entire opposite orientation (including its own embers' first ticks, which match exactly) are fine. Since the underlying RAM/OAM component state matches 63/63 even on the two bad frames, this reads as a framebuffer-capture-timing nuance isolated to a sprite's own creation tick (mGBA's OAM-build/VBlank-capture ordering may treat a sprite's zeroth tick differently from its continuing ticks), not a position/frame/z-order bug — not chased further this step given the size of the remainder.

**Move acceptance: `partial`, not `exact`**, per the coverage rubric's own rule ("`exact` cannot retain a known remainder"). `ANIMATION_COVERAGE.json`'s new `MOVE_EMBER` entry and the `dragon-fire-projectile` track's goal text both name the remainder explicitly.

**Evidence.** `npm test` 2153/2153 (up from 2147 — added `tests/ember.test.ts`, 6 tests, RAM-probe-pinned both orientations via `src/data/gen/ember-sprite-probe{,-opponent}.json`). `npm run build` green. Fresh live-oracle reruns of the two now-existing EMBER comparators (`tools/compare/emberPortable.ts`) at the counts above, plus both existing FLAMETHROWER (`126/126` both) and DRAGON_BREATH (`85/85` both) comparators re-run fresh after touching the shared `tools/probe/run-battle-lab-rgb.py`/`sceneOnPresentation.ts`/`battleScene.ts` — zero regressions.

## MOVE_EMBER's 2-frame remainder closed: attacker/ember OAM draw order is subpriority-parametric, not fixed — `exact` (2026-07-24)

**Verdict: the remainder was a draw-order bug, not a timing/lag bug — root-caused by RAM+pixel probe, fixed by reusing an existing function, zero curve-fitting.** The prior step's hypothesis (a per-sprite creation-tick render-lag nuance, by analogy to MIST_BALL/FLY) was investigated and falsified: `tools/probe/dump-ember-creation.py` (new, adapted from `run-battle-lab-rgb.py` + `dump-fly-shakemon-tasks.py`, dumps full `gSprites` struct — `data[]`, raw `callback` pointer — plus cropped RGB per frame) shows ember1 (slot 3) is created during oracle-tick 388's processing already carrying its post-`CreateSpriteAndAnimate`-plus-same-frame-`AnimateSprites()` "1-step" state (`x2=3,y2=-1`), exactly what `ember.ts`'s existing formula already predicted at local age 0 — the position/timing model was never wrong (component check was already 63/63). The actual defect: decoding `emberPortable.ts`'s own mismatch string correctly (`oracle!=app`, not `app!=oracle` as the step brief assumed) shows the **app was drawing fire where the real oracle still showed the attacker's own body** — the app had the ember right and was painting it *over* Onix instead of *under* Onix.

**Root mechanism, source-cited.** `Cmd_createsprite`'s subpriority for both ember families is target-relative (`GetBattlerSpriteSubpriority(target) - 2`, `battle_anim.c` around `Cmd_createsprite`), while the attacker's own battler sprite subpriority is fixed by `GetBattlerSpriteSubpriority` (`battle_anim_mons.c:2035-2061`): 30 for `B_POSITION_PLAYER_LEFT`, 40 for `B_POSITION_OPPONENT_LEFT`. `SortSprites` draws the LOWER-subpriority sprite last/on top. For this codebase's fixed ONIX/MURKROW singles pair: player-attacker Onix (30) < ember subpriority (target Murkrow 40 − 2 = 38) → **Onix occludes freshly-spawned embers still overlapping its own silhouette**; opponent-attacker Onix (40) > ember subpriority (target Murkrow 30 − 2 = 28) → **embers occlude Onix**. This exact side-parametric rule is already generalized and exported as `dragonBreathEmbersInFrontOfAttacker` (`dragonBreath.ts`) and already reused by FLAMETHROWER's own draw block (`battleScene.ts` ~14939) — DRAGON_BREATH's own module doc even states it plainly ("Onix is subpriority 30 … `SortSprites` puts Onix at the winning lower OAM index, so its opaque pixels cover compressed embers near the origin"). EMBER's draw block (`battleScene.ts` ~16872) had never been updated to use it — it always drew the attacker sprite before the embers unconditionally, which happens to be correct for the opponent-attacker orientation (why that side was already 63/63) but wrong for the player-attacker orientation, and only *visible* on each ember's first tick or two, since the small fire graphic's actual opaque pixels move clear of Onix's silhouette within 1-2 ticks even though the two sprites' bounding boxes keep overlapping much longer.

**Fix.** `battleScene.ts`'s EMBER draw block now calls `dragonBreathEmbersInFrontOfAttacker(view.attacker.geometry.side)` and conditionally draws the ember/flare loop before or after the attacker sprite, mirroring FLAMETHROWER's own call site exactly (no new function, no per-frame branch, no age/lag change — `ember.ts` itself is untouched). This is a per-orientation constant, not a per-frame special case.

**Results.** Player ONIX → opponent MURKROW: **63/63 component AND 63/63 framebuffer**, zero exclusions (both previously-bad frames 389/395 now exact). Opponent ONIX → player MURKROW: still **63/63 + 63/63** (unchanged, confirmed no regression from the conditional draw order). `MOVE_EMBER` promoted to `exact` in `ANIMATION_COVERAGE.json` — no remainder left in either orientation.

**Evidence.** `npm test` 2153/2153 (unchanged — no engine-logic module touched, so no new Tier-1 test; the fix is a draw-order line reusing an already-tested function). `npm run build` green. Both EMBER comparators re-run fresh at the counts above. Re-ran FLAMETHROWER (`126/126` both) and DRAGON_BREATH (`85/85` both) since `battleScene.ts` was touched — zero regressions. New dev-time evidence: `tools/probe/dump-ember-creation.py` (committed, same convention as `dump-fly-shakemon-tasks.py`/`dump-mist-ball-sprite.py`).


## MOVE_DRAGON_RAGE enumeration: STOP AND SPLIT (2026-07-25)

**Verdict: does NOT generalize cheaply from the existing `dragon-fire-
projectile` family. Enumerated the full command surface per the step
brief's own rule and stopped before writing any render code, per that
rule's explicit sanction ("that is a successful outcome, not a failure").**
DRAGON_RAGE is Level-50 legal (`FRONTIER_MON_CHARMELEON_2`, confirmed in
`factory-animation-inventory.json` before starting), so this is a scope
finding, not a legality block.

**What was done.** Extended `tools/extract/extract-battle-move-anim-assets.ts`
with a full decode of `Move_DRAGON_RAGE` (`battle_anim_scripts.s:5243-5273`)
into `battle-move-anim-scripts.json`'s new `DRAGON_RAGE` entry (`callback:
null`, `status` field records the stop) — additive only, `git status` after
a full re-run showed only that one extractor + its one JSON output changed.
No render/callback code lands this step.

**Command-surface enumeration** (every op read against its real C callback):
- `loadspritegfx ANIM_TAG_SMALL_EMBER` — already extracted
  (`battle-anim-small-ember.json`, DRAGON_BREATH); this move's fire-spit
  sprite uses frames 0/4 of that same sheet (that extraction's own
  `otherFramesNeedsOnly` note already flagged them as DRAGON_RAGE's).
- `loadspritegfx ANIM_TAG_FIRE_PLUME` — **NEW asset, not yet extracted
  anywhere**: `gBattleAnimSpriteGfx_FirePlume` (`fire_plume.png`, 32x160px,
  5 stacked 32x32 frames) paired with `gBattleAnimSpritePal_Fire`
  (a DIFFERENT, also-unextracted source PNG, `fire.png`, supplies only the
  palette — same tile-vs-palette split this codebase's extractor already
  handles elsewhere, just a fresh pair of source files).
- `createvisualtask AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 40, 1` —
  already-ported primitive (`shakeMon.ts`, proven via QUICK_ATTACK/FLY).
  Every prior call site shakes the TARGET; this is the first ATTACKER-side
  use, but the primitive itself is battler-agnostic — cheap render wiring,
  not a new port.
- `createsprite gSlideMonToOffsetSpriteTemplate, ANIM_TARGET, 2, 0, 15, 0, 0, 4`
  — **NEW primitive**: `SlideMonToOffset` → `InitSpriteDataForLinearTranslation`
  + `TranslateSpriteLinearByIdFixedPoint` (`battle_anim_mon_movement.c:537-576`).
  `gBattleAnimArgs[0]=0` selects the ATTACKER's own sprite (the `ANIM_TARGET`
  field only sets the dummy sprite's OAM subpriority, the same
  battler-vs-argv split MIST_BALL's own enumeration already established).
  **Confirmed NOT the same mechanism `mudSandSlide.ts` ports**: that module
  is a hand-fit lookup table for SAND_ATTACK/MUD_SLAP's own createsprite args
  (x=-10, duration 3/4), not a generic port of this accumulator — read both
  side by side: `SlideMonToOffset` writes to a REFERENCED mon sprite via
  `data[5]` with plain-division rounding, while the already-ported
  `animLinearTranslation.ts` (`InitAnimLinearTranslation`) writes to the
  sprite's OWN x2/y2 with direction-in-low-bit rounding — different layout,
  different math.
- `create_dragon_rage_fire_spit_sprite ANIM_TARGET, 2, initial_x=30,
  initial_y=15, target_x=0, target_y=10, duration=10` —
  `gDragonRageFireSpitSpriteTemplate` (`battle_anim_dragon.c:158-167`)
  shares `AnimDragonFireToTarget` → `StartDragonFireTranslation`
  (`:218-274`, comment literally says "For Dragon Breath and Dragon Rage")
  and an identically-shaped 3-frame/3-tick sheet cadence with DRAGON_BREATH's
  own ember, reusing the already-ported Q8.8 accumulator. Two genuinely new
  parts: (1) DRAGON_BREATH's own script always passes all-zero
  initial/target offsets, so `StartDragonFireTranslation`'s side-branch logic
  was never exercised — it has a real quirk, confirmed straight from source:
  the opponent-side branch uses `cmd->initialY` to offset `sprite->x` (not
  `initialX`), an asymmetry DRAGON_RAGE's nonzero args actually exercise;
  (2) its own affine anim (`AFFINEANIMCMD_FRAME(0x64,0x64,127,1)`, one step)
  uses different scale constants and shape than DRAGON_BREATH's own
  two-step ramp — DRAGON_BREATH's `MATRIX_A`/`MATRIX_B` tables are
  RAM-PROBED literals, not a closed-form derivation, so this needs its own
  fresh probe (likely simpler, given the single-step affine anim, but not
  confirmed against real RAM).
- `createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 3, 25, 1` —
  already-ported primitive, same shape as every prior target-shake site.
- `create_dragon_rage_fire_plume_sprite` ×8 (relative_to=ANIM_TARGET every
  time — the callback's ANIM_ATTACKER branch is dead code for this move, a
  red herring like MIST_BALL's unconsumed `ANIM_TAG_WHITE_FEATHER` load) —
  **NEW callback**: `AnimDragonRageFirePlume` (`battle_anim_dragon.c:246-265`)
  is a STATIC-position sprite (no translation/accumulator at all — simpler
  than every other mechanism this track uses): places itself at the target's
  `BATTLER_COORD_X/Y`, applies the already-established side-signed x-offset
  pattern (`ember.ts`'s `sideSignedOffset`) plus a plain y offset, plays a
  5-frame/5-tick-each reveal ONCE (`ANIMCMD_END`, not `JUMP`), then
  self-destroys via `RunStoredCallbackWhenAnimEnds` once `animEnded`
  latches. Per-spawn `subpriority_offset` varies (66 or 2) — a real per-spawn
  detail. Needs its own RAM probe for lifetime/render-lag; none of the
  existing ported sprite families use this "static + one-shot reveal +
  destroy-on-animEnd" shape.
- `createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_TARGET, 66, 0, 0, 4`
  — **NEW primitive** (paired with `SlideMonToOffset` above but a SEPARATE
  C function): `SlideMonToOriginalPos` (`battle_anim_mon_movement.c:478-535`)
  has its own data layout and step function — restores the attacker's
  current x2/y2 back to 0 over 4 ticks, not a fresh two-point interpolation.

**Tally: 4 substantive new items** (`ANIM_TAG_FIRE_PLUME` asset,
`SlideMonToOffset`/`SlideMonToOriginalPos` primitive pair,
`AnimDragonRageFirePlume`'s new static/one-shot/self-destroy mechanism,
`StartDragonFireTranslation`'s side-asymmetric offset quirk plus a fresh
affine probe) — at the step brief's own "~4 substantive ops" stop
threshold, though none individually rises to a "new subsystem" the way
MIST_BALL's `AnimComplexPaletteBlend`/`AnimTask_MistBallFog` did (no new
BG tiles/tilemap, no external fade-gate dependency). Combined with a real
60-minute session cap, landing all four with disciplined RAM-probe-first
evidence (per-mechanism render-lag bisection, both orientations, dense
comparators run twice for determinism) was not achievable without cutting
a corner somewhere. Per the brief's own stop-threshold rule, this session
stopped after the enumeration + additive extractor decode rather than
rushing a partial port.

**Remainder for whoever picks this back up** (in cost order): ~~(1) extract
`ANIM_TAG_FIRE_PLUME` (`fire_plume.png` tiles + `fire.png` palette) — pure
mechanical decode, same shape as every prior asset addition~~ **done, see the
"DRAGON_RAGE enumeration remainder, rungs 1-2" section below**; ~~(2) port
`SlideMonToOffset`/`SlideMonToOriginalPos` as a shared primitive (Tier-1
tests first, no move wiring needed yet — same standalone-port pattern
`shakeMon.ts`/`animLinearTranslation.ts` used)~~ **done, same section
below**; (3) RAM-probe the whole
move body in one battle-lab window (attacker shake → slide-to-offset →
fire-spit → 8 plumes → slide-to-original) to pin every cadence/render-lag
in one pass, the same technique `dump-dragonbreath-anim.py`/
`dump-ember-creation.py` already used; (4) port `AnimDragonRageFirePlume`
and wire `StartDragonFireTranslation`'s offset quirk + fresh affine table;
(5) dense comparators in both orientations, run twice for determinism.
MOVE_DRAGON_RAGE stays unsupported (no `ANIMATION_COVERAGE.json` entry) —
shared code alone never promotes coverage, and zero render code landed
this step.

**Evidence.** `npm test` 2180/2180 (unchanged — no engine module touched,
extractor-only change). `npm run build` green. `git status` after the
extractor re-run showed only `extract-battle-move-anim-assets.ts` and
`battle-move-anim-scripts.json` changed.

## DRAGON_RAGE enumeration remainder, rungs 1-2: FIRE_PLUME extracted, SlideMonToOffset/SlideMonToOriginalPos ported (2026-07-25)

**Rung 1 — `ANIM_TAG_FIRE_PLUME` asset extraction.** Mirrored the DRAGON_BREATH
small_ember block's exact layout: `fire_plume.png` (32x160, 4x20 tiles, 5
stacked 32x32 frames, `gDragonRageFirePlumeSpriteTemplate`'s tile source)
paired with `fire.png`'s own embedded palette (the `ANIM_TAG_FIRE_PLUME`
palette-table entry points at `gBattleAnimSpritePal_Fire`, a separate source
PNG — same tile-vs-palette split `extract-battle-anim-assets.ts`'s
particles.png/circle_impact.png pair already established). Writes
`src/assets/gen/battle-anim-fire-plume.json`; pinned in
`tests/moveAnimAssets.test.ts` mirroring the rocks.png per-asset pattern.
Additive only — `git status` after a full extractor re-run showed only the
new JSON output plus the extractor/test files touched.

**Rung 2 — `SlideMonToOffset`/`SlideMonToOriginalPos` primitive port.**
RAM-probed a real DRAGON_RAGE window first, per the step brief: staged a
Factory-legal CHARMELEON attacker (mirroring FRONTIER_MON_CHARMELEON_2's own
real MOVE_DRAGON_RAGE grant) vs. ONIX via a new `mechanicLab overrides.parties`
fixture (`tools/battle-lab/mechanic-dragon-rage-charmeleon-onix.json`) and a
new probe (`tools/probe/dump-dragonrage-slide.py`, committed evidence
`src/data/gen/dragonrage-slide-probe.json`) that identifies the two dummy
sprites by their own `template` pointer against
`gSlideMonToOffsetSpriteTemplate`/`gSlideMonToOriginalPosSpriteTemplate`'s
real rodata addresses (stable for the sprite's whole lifetime, unlike
`callback` which reassigns itself after the first tick).

Ported both 1:1 as `src/engine/slideMon.ts`
(`slideMonToOffsetAtTick`/`slideMonToOriginalPosAtTick`, plus
`slideMonToOffsetMirroredDeltas` for `SlideMonToOffset`'s own opponent-side
mirror and `*DestroyTick` helpers). Both share
`InitSpriteDataForLinearTranslation`'s plain-truncating-division Q8.8 setup
(confirmed distinct from `animLinearTranslation.ts`'s direction-in-low-bit
variant, per the original enumeration's own finding) but the RAM probe
surfaced **two real divergences between their step functions**, both now
encoded in the port rather than assumed: (1) `SlideMonToOriginalPos_Step`
truncates its accumulator's own contribution to `(s8)` before adding back the
base offset; `TranslateSpriteLinearByIdFixedPoint` (SlideMonToOffset's step)
does not — irrelevant at this move's own ≤15px magnitudes but part of the
real function. (2) Self-destroy timing differs by a full tick: SlideMonToOffset's
finish branch only *reassigns* `sprite->callback` to `DestroyAnimSprite`
(`SetCallbackToStoredInData6`), so the actual destroy fires the FOLLOWING
tick — RAM shows the dummy sprite alive for 5 ticks on a 4-tick duration
(168-172, tick 172 a repeated no-op), gone by 173. SlideMonToOriginalPos_Step
calls `DestroyAnimSprite` directly in its own finish branch, same tick as the
last accumulate — RAM shows exactly 4 ticks alive (235-238), gone by 239.
`tests/slideMon.test.ts` asserts the port reproduces the probed attacker `x2`
at every RAM tick across both windows (168-172 offset-out, 235-238
offset-back) plus both destroy-tick counts, all matching exactly on first
run — no curve-fitting needed once the source's two branch orders were read
correctly. The opponent-side mirror branch (`battlerSide: "opponent"`) is
unit-tested from source only — this attacker was on the player side in the
probed window, so the mirror itself is **not yet independently RAM-verified**
(named remainder, not claimed exact).

**No move wiring.** `AnimDragonRageFirePlume`, the fire-spit sprite's
asymmetric-offset branch, and `StartDragonFireTranslation`'s own fresh affine
probe are untouched — out of this step's scope per the brief.
MOVE_DRAGON_RAGE stays unsupported (no `ANIMATION_COVERAGE.json` entry).

**Evidence.** `npm test` 2190/2190 (2180 + 10 new: 3 fire-plume asset pins,
7 slideMon RAM pins). `npm run build` green.

## DRAGON_RAGE rungs 3-4: whole-move RAM probe, full engine port, interpreter generalized — still unsupported, no dense pixel evidence (2026-07-25)

**Verdict: the move body is fully ported and Tier-1-pinned against real RAM
in both attacker orientations, but zero dense oracle-pixel window was run
this step — per this codebase's own MIST_BALL precedent (a standalone,
Tier-1-pinned, not-yet-wired engine module), DRAGON_RAGE stays *unsupported*
(no `ANIMATION_COVERAGE.json` entry), not `partial`: `partial` requires "a
meaningful dense window is green," and none was attempted.**

**Rung 3 — whole-move RAM probe.** Extended rung 2's slide-only probe into
`tools/probe/dump-dragonrage-full.py`: one pass capturing `gAnimVisualTaskCount`/
`gAnimScriptActive` (ground truth for `waitforvisualfinish`'s own gating),
both `AnimTask_ShakeMon` calls (attacker then target, identified across
their self-reassignment from `AnimTask_ShakeMon` to the static, non-exported
`AnimTask_ShakeMon_Step` — resolved via `nm pokeemerald.elf`, not the map
file), the fire-spit sprite (position + its own single-step affine matrix
via `gOamMatrices`), all 8 fire-plume sprites (creation ticks, `animCmdIndex`
frame stepping, self-destroy), and both slide dummies. Staged BOTH
orientations: the existing CHARMELEON/ONIX fixture plus a new reverse
`tools/battle-lab/mechanic-dragon-rage-onix-charmeleon.json` (ONIX player,
CHARMELEON opponent) — needed to RAM-probe `StartDragonFireTranslation`'s
side-asymmetric offset branch and its own affine constants on the side
DRAGON_BREATH never exercises. Committed as
`src/data/gen/dragonrage-full-probe-{player,opponent}-attacker.json`.

**Rung 4 — port + wire the move body.** Generalized
`animScriptInterpreter.ts` with `interpretAnimSchedule`: the
`waitforvisualfinish` sprite-lifetime tracking the MIST_BALL enumeration
(2026-07-24) flagged as needed to generalize past FEATHER_DANCE's own
script-position coincidence. `Cmd_waitforvisualfinish`
(`battle_anim.c:455-465`) blocks until `gAnimVisualTaskCount == 0` — every
item active since the last wait, not just the most recent — so the
scheduler tracks each creation op's own "gone" tick (per-primitive lifetime
supplied by the caller: `shakeMonSequence(...).length - 2`,
`slideMonTo{Offset,OriginalPos}DestroyTick`, this move's own fire-spit/
fire-plume lifetimes) and resolves each `waitforvisualfinish` as
`max(activeGoneTicks) + 1` — a real, RAM-confirmed 1-tick resolution lag,
not a hand-fit. Verified exactly (all 5 of DRAGON_RAGE's own
`waitforvisualfinish` barriers, both orientations) before being trusted;
`tests/dragonRage.test.ts`'s `dragonRageSchedule` tests pin every predicted
creation tick against the rung-3 probe.

`src/engine/dragonRage.ts` drives the whole move through this scheduler
from the decoded script. Reuses `shakeMon.ts` (first ATTACKER-side
`AnimTask_ShakeMon` call site — same primitive, plus the already-established
priority-5 same-frame-double-step `+1` creation-tick adjustment
`fly.ts` documents) and `slideMon.ts` verbatim. Adds two new mechanisms:

- **Fire-spit sprite** (`StartDragonFireTranslation`): the opponent-side
  branch's `sprite->x -= cmd->initialY` asymmetry (confirmed straight from
  source, not guessed) plus a fresh, RAM-probed single-step affine matrix
  per side — player `(pa,pb,pc,pd) = (-183,-4,4,-183)`, opponent
  `(184,0,0,184)`, both distinct from DRAGON_BREATH's own matrices as
  predicted. The per-tick Q8.8 delta is a RAM-probed literal (constant
  across the sprite's life, `data[1]`/`data[2]`), not closed-form derived
  from either battler's resolved `BATTLER_COORD_X_2`/`Y_PIC_OFFSET` — those
  don't reproduce the literal via `floor(|distance|<<8/duration)` for
  reasons not fully chased down this step (same "RAM-probed literal, not a
  closed form" convention `dragonBreath.ts`'s own `MATRIX_A`/`MATRIX_B`
  tables already use for this callback family). Frame cadence reuses
  `dragonBreath.ts`'s own `((age+1)/3 % 3)` formula verbatim — RAM-confirmed
  identical shape (`sAnim_DragonRageFire` is byte-identical to
  `sAnim_DragonBreathFire_0`, exactly as the enumeration predicted).
- **Fire-plume sprites** (`AnimDragonRageFirePlume`, all 8 spawns): static
  position at the target's own `BATTLER_COORD_X`/`Y` (`targetBattlePosition`
  — solved independently from the fire-spit's own `X_2`/`Y_PIC_OFFSET`
  anchor and confirmed genuinely distinct, not a copy/paste error), offset
  by `SetAnimSpriteInitialXOffset` (side-signed, same `sideSignedOffset`
  shape `ember.ts` established) on X and a plain add on Y. RAM-probed
  26-tick lifetime per spawn, identical across all 8 independently: a
  4/5/5/5/7-tick frame-duration pattern (first frame short one tick — the
  same "creation tick already reflects one step" idiom `slideMon.ts`
  documents; last frame held 2 extra ticks after its own countdown before
  `RunStoredCallbackWhenAnimEnds`'s own deferred-destroy fires).

`tests/dragonRage.test.ts` (11 tests) pins every mechanism against BOTH
committed RAM probes at every probed tick: schedule ticks (all 6 creation
events, both orientations — exact match, validating the interpreter
generalization), attacker/target shake offsets, both slide phases, fire-spit
position/frame/matrix (both sides), and all 8 plume spawns'
position/subpriority/frame across their full 26-tick life (both sides).

**What's NOT done — the real remainder.** `dragonRage.ts` is not wired into
`sceneOnPresentation.ts`'s move-dispatch system (`SceneOnMoveConfig` union,
`createSceneOnMovePresentation`, a `sceneOnDragonRageView` function) — that
system doesn't yet know the CHARMELEON species (a new
`SceneOnPresentationBattler.species` union member + geometry constants,
which this step DID reverse-solve precisely from the RAM probe for both
roles: attacker `X_2/Y_pic` `(72,97)` player-side / `(176,49)` opponent-side;
ONIX-as-target `X_2/Y_pic` `(176,42)` opponent-side / `(72,88)` player-side,
`battlePositionCenter` `(176,40)` / `(72,80)` — see `dragonRage.ts`'s own
geometry constants and doc comments for the derivation). No portable
comparator script (`tools/compare/dragonRagePortable.ts`, mirroring
`emberPortable.ts`) or dense-window RGB probe exists yet, so no oracle-pixel
window has run at all — the acceptance bar this move still needs.
**Remainder, in cost order:** (1) add `CHARMELEON` to
`SceneOnPresentationBattler`'s species union + wire its `spriteCorner`
(not yet solved — only the two coordinate pairs above were needed for this
step's math); (2) add a `SceneOnDragonRageConfig` case + view function to
`sceneOnPresentation.ts` calling straight into `dragonRage.ts`'s exported
functions; (3) a portable comparator + RGB probe script (mirror
`emberPortable.ts`/`tools/probe/run-battle-lab-rgb.py`); (4) dense windows
at full recorded counts, both orientations, each run twice for determinism;
(5) only then promote a coverage entry (`exact` if clean, `partial` with the
remainder named otherwise).

**Evidence.** `npm test` 2201/2201 (2190 + 11 new). `npm run build` green.


## DRAGON_RAGE rung 5: wired through the Scene-ON seam, comparator built, dense run finds a multi-tier capture-lag residual — still unsupported (2026-07-25)

**Verdict: real progress on every ordered remainder item, but no green dense
window — MOVE_DRAGON_RAGE stays *unsupported*, not `partial`, per the
rubric's own "a meaningful dense window is green" bar for `partial`.**

**Rung 5.1 — presentation wiring.** Extended `tools/extract/extract-battle-mon-pics.ts`
with `CHARMELEON` (mechanical species-list addition, same shape as
SPOINK/ARCANINE/DUGTRIO — additive only, `mon-pic-coords.json` was already
complete). Added `CHARMELEON` to `SceneOnPresentationBattler`'s species
union, a `SceneOnDragonRageConfig` + `SceneOnDragonRageView` pair, and
`sceneOnDragonRageView` to `sceneOnPresentation.ts` — driven entirely by
`dragonRageSchedule(0)` plus the already-ported `shakeMonOffsetAtRenderTick`/
`slideMonToOffsetAtTick`/`slideMonToOriginalPosAtTick`/
`dragonRageFireSpitStateAtAge`/`dragonRageFirePlumeStateAtAge` (no turn-keyed
branches, no absolute-tick constants). `battleScene.ts` gained the matching
`DRAGON_RAGE` draw case: attacker/target sprites offset by the composed
shake+slide state, the fire-spit sprite drawn via the existing
`drawSpriteSheetAffineRotate` primitive (already generic enough for a fresh
matrix, no new draw code needed), and the 8 fire-plume sprites split
front/behind the target by their own per-spawn `subpriorityOffset` (2 vs 66)
— the fire-spit-vs-attacker order reuses `dragonBreathEmbersInFrontOfAttacker`
directly, since the fire-spit's own `createsprite` subpriority
(`targetSubpriority - 2`) is the identical shape EMBER's own embers use.

**Rung 5.2 — portable comparator + RGB probe.** `tools/probe/dump-dragonrage-rgb.py`
mirrors `run-battle-lab-rgb.py`'s capture-loop/CLI shape
(`<scenario> <output> <rgb-dir>`) combined with `dump-dragonrage-full.py`'s
own template-pointer sprite/task identification, so it drives exactly like
`emberPortable.ts` drives its own probe.
`tools/compare/dragonRagePortable.ts` checks both a component read (attacker/
target offset, fire-spit position/frame/matrix, fire-plume positions — self-
calibrated against ONIX's own species-specific baseline OAM residual rather
than hardcoding it, since the residual is per-orientation) and full
framebuffer pixels. Both fixtures staged with real RAM-read HP/gender
(`tools/compare/fixtures/dragon-rage-{player,opponent}-charmeleon-*.json`):
CHARMELEON 133/133, ONIX 110/110, both male in both orientations (read
directly from the probe's own `player`/`opponent`/`*Personality` fields, not
assumed).

**A real bug the first comparator run caught immediately, fixed:** the draw
block's healthbox branch had player/opponent backwards, calling ONIX's
hardcoded-117-max-HP helper (`onixPlayerHealthboxContentForState`) for what
is actually a 133-HP CHARMELEON slot in this fixture — `composePlayerHealthbox`
threw immediately (`invalid HP 133/117`), so this was caught before any
pixel comparison ran, not silently wrong. Replaced with fully generic
`composeOpponentHealthbox`/`composePlayerHealthbox` calls keyed off a new
`SceneOnDragonRageFieldProfile` (adds explicit `playerMaxHp`/`opponentMaxHp`
— no existing shared field profile carries them, since every prior move's
fixtures reused one canonical battler's own hardcoded-maxHP helper).

**Dense run: component math is exact, framebuffer capture lag is not
uniform.** At zero capture lag (comparing the view directly against the
probe's own RAM reads, no display-timing adjustment), every mechanism's
position/frame/matrix math matches the oracle's RAM state exactly — this
reconfirms rung 3-4's Tier-1 pinning, now cross-checked against a
second, independently-captured probe. The FRAMEBUFFER (photographed pixel)
comparison is where this rung stops short: probing capture-lag values 0-3
against the cached RGB dump (player-attacker fixture) shows the lag is
**not one uniform constant** the way it is for every other staged move so
far —
- Attacker `AnimTask_ShakeMon`'s own 2-tick toggle pattern needs lag=**2**
  (149/150 frames of the pure-shake window 89-238 match at lag=2, vs.
  48/150 at the codebase's normal lag=1 — checked directly, mismatch
  direction confirmed oracle-vs-app, alternates in lockstep with the
  shake's own 2-tick period, exactly the signature of a one-tick phase
  shift, not a value error).
- The fire-spit sprite's own translation wants lag=**1**: at lag=2 (tuned
  for the shake), frame 175's diff (`108-112,97-98`: oracle shows fire
  colors `255/0/0`/`255/99/16`/`255/198/33`, app shows background) is the
  fire-spit appearing one frame EARLIER in the real oracle than the
  lag=2 model predicts.
- Target `x2` drifts by an unmodeled **-1** starting exactly at the target
  shake's own creation tick (frame 186 onward in the player-attacker
  fixture) and holds through at least frame 193 — `DRAGON_RAGE_TARGET_SHAKE`'s
  own `xOffset` is 0, so the port correctly predicts a constant x2, but
  real RAM shows it stepping down by one right at that tick. Isolated via
  the comparator's own component check (self-calibrated baseline), not
  yet root-caused (candidate: some interaction between the SlideMonToOffset
  dummy sprite's own finish branch, still alive until one tick after its
  4-tick duration per `slideMonToOffsetDestroyTick`, and the target shake
  task's creation in the same window — not confirmed).

This is the same category of finding BLAZE_KICK's own module already
documents (matrix vs. palette writes reaching the framebuffer on different
ticks) — DRAGON_RAGE has five independent mechanisms sharing one move body,
and at least three distinct lag/drift behaviors among them. Properly
resolving this needs its own per-mechanism RAM-vs-photo bisection (the
"disciplined probe cycle" the step brief calls for), which this rung's
remaining time did not allow after building and running the comparator
itself. Per the step brief's own instruction, the code is left at the
codebase's normal lag=1 default (the least speculative choice, matching
every other staged move) rather than blind-fitting lag=2 to only partially
fix the picture — `battleScene.ts`'s `DRAGON_RAGE` case is real, wired,
and buildable, but its framebuffer output does not yet match the oracle.

**Not attempted:** no exhaustive per-mechanism bisection, no opponent-
attacker-orientation framebuffer run (the player-attacker fixture's own
residual already blocks a green window), no coverage entry.

**Remainder, in cost order:** (1) bisect the target x2 drift's own root
cause (likely a short, disciplined RAM probe around ticks 185-194 of the
already-staged fixture); (2) determine whether the shake/fire-spit lag
split is genuinely per-mechanism-type (as BLAZE_KICK's own precedent
suggests) or reveals a modeling bug in one of the two RAM-tick-to-display
mappings; (3) re-run the dense comparator, both orientations, twice each,
once the residuals are resolved; (4) only then promote a coverage entry.

**Evidence.** `npm test` 2201/2201 (unchanged — no new Tier-1 test this
rung; the comparator's own findings are dev-time evidence, not production
logic). `npm run build` green.


## DRAGON_RAGE rung 5 remainder: per-mechanism lag encoded, idle-bob drift root-caused, lands `partial` (2026-07-25)

**Verdict: real, dense-verified progress (44/150 → 86/150 framebuffer frames,
player-attacker orientation) and the -1 drift is genuinely root-caused by RAM
probe, not fitting — but three named residuals remain, so `MOVE_DRAGON_RAGE`
lands `partial`, not `exact`.**

**Rung 1 — per-mechanism lag, encoded as named constants
(`dragonRage.ts`'s `DRAGON_RAGE_FRAMEBUFFER_{SHAKE,SLIDE,FIRE_SPIT,
FIRE_PLUME}_AGE_LAG`, mirroring `dragonBreath.ts`'s own `_OAM_AGE_LAG`/
`_PALETTE_AGE_LAG` split), pinned by `tests/dragonRage.test.ts`.
`battleScene.ts`'s `DRAGON_RAGE` draw case now computes four separately-
lagged views instead of one shared `age - 1`, switching the attacker's own
lag mid-flight at the exact tick it switches mechanism (shake → slide).**
A first box-isolated pixel bisection pass (`tools/compare/scratch/
dragonrage-lag-bisect{,-cached}.ts`, committed) initially suggested
shake=1/slide=0, but that pass ran through `render()` while the OLD
`battleScene.ts` code still had its own hardcoded `age - 1` underneath —
silently double-applying a lag the bisection script wasn't accounting for.
The values actually committed come from a full dense framebuffer sweep run
against the real draw path with that hidden shift removed
(`tools/compare/scratch/dragonrage-dense-cached.ts`, committed, reruns
fast against one cached oracle capture): **shake=2, slide=1, fire-spit=1**
(the last also independently confirmed by direct RAM-to-pixel correlation:
the photographed fire-spit pixels at render age 87 sit at the x2=14 column,
RAM tick 175's value, one tick behind the already-Tier-1-pinned RAM
prediction). Fire-plume lag (1) is inferred by mechanism-class analogy
only — every plume spawn spatially overlaps both the target sprite and a
sibling plume for its whole 26-tick life, so no clean isolation window
exists in this fixture to confirm it independently.

**Rung 2 — the -1 drift, root-caused by RAM probe.** Extended nothing (the
already-committed `dragonrage-full-probe-player-attacker.json` per-tick
dump already had everything needed). The step brief's own candidate
(SlideMonToOffset's dummy sprite staying alive one tick past its duration,
interacting with the target shake task's same-frame creation) is
**REFUTED**: the dummy is alive ticks 168-172 (RAM-confirmed, matching
rung 2's own prior finding); the target shake task is created at tick 186 —
a 13-tick gap, no temporal overlap at all. The REAL mechanism, read
straight from `AnimTask_ShakeMon`'s own source
(`battle_anim_mon_movement.c:98-99`): `gSprites[spriteId].x2 =
gBattleAnimArgs[1]` is an **unconditional absolute set**, not an additive
offset — it directly overwrites whatever x2 the sprite already had. RAM
shows the target sprite (ONIX) carries an unrelated x2=+1 residual from
tick 82 onward (a pre-existing idle-animation artifact, NOT part of
DRAGON_RAGE's own script — this is the SAME already-open, not-yet-source-
attributed idle-bob class `battleScene.ts`'s own materialize-window doc
comment already flags as unresolved for ONIX, see `docs/battle-menu-
notes.md` §4). When `AnimTask_ShakeMon`'s creation code runs at tick 186
(`xOffset=0` for the target shake), it clobbers that residual to exactly 0
— which is what `DRAGON_RAGE_TARGET_SHAKE`'s own model already predicts,
so the model is right FROM tick 186 onward and wrong (by the pre-existing,
out-of-scope residual) for the ~97 ticks before it. Per the step brief's
own instruction, this is named as the strictly-smaller, out-of-scope
residual rather than chased further (porting a generic species idle-bob
subsystem is a new mechanism, explicitly out of this step's scope).

**Rung 3 — dense acceptance: partial, not exact.** One dense framebuffer
run, player-attacker orientation only (time did not allow the opponent
orientation or a second run of either this step): **86/150** frames match
(up from 44/150 at the single global `age - 1` default). Three named
residuals remain, none fully chased down: (1) a single isolated frame
(render age 1) where the shake lag-2 shift pushes
`shakeMonOffsetAtRenderTick`'s own creation guard into zeroing a
legitimate just-post-creation state; (2) the idle-bob residual above,
active for the ~97 ticks before the target shake's own creation; (3) a
smaller residual inside the fire-spit sprite's own active window (render
ages 86-96) that persists at every lag value tried (0, 1, 2 all score
equal or worse than 1) — likely a `drawSpriteSheetAffineRotate` rounding
question, not a timing one, not root-caused this step.

**Not attempted:** opponent-attacker orientation dense run; a second run of
either orientation for determinism; fire-plume's own independent lag
confirmation; the fire-spit residual's own root cause.

**Coverage:** `MOVE_DRAGON_RAGE` promoted to `partial` in
`ANIMATION_COVERAGE.json` (19 exact → unchanged, 1 → 2 partial) — a
meaningful dense window (86/150, more than half) is green with the
remainder named precisely, matching the `partial` rubric.

**Evidence.** `npm test` 2202/2202 (2201 + 1 new: the four lag constants
pinned in `tests/dragonRage.test.ts`). `npm run build` green.

## Idle-motion (species send-out front-anim) subsystem enumerated + ported, DRAGON_RAGE's target -1 drift closed (2026-07-25)

**Verdict: real subsystem, source-attributed and RAM-confirmed, ported
generically and wired into DRAGON_RAGE's target-sprite path only. Dense
framebuffer match improved 86/150 → 127/150 (player-attacker orientation,
verified deterministic on two independent live oracle runs). Three
pre-existing, differently-rooted residuals remain (none newly introduced);
`MOVE_DRAGON_RAGE` stays `partial`.**

**Rung 1 — enumeration + probe.** Per the step brief's own probe-first
rule, RAM-probed ONIX's own battler sprite directly by battler index
(`gBattlerSpriteIds[0]`/`[1]`, `tools/probe/dump-onix-front-idle-anim.py`,
`src/data/gen/onix-front-idle-probe.json`) across the whole
CHARMELEON-vs-ONIX fixture — sidestepping `gBattleAnimAttacker`/
`gBattleAnimTarget`, which are stale/zeroed until `DoMoveAnim` runs
(`battle_anim.c:201-206`); the prior rung's own full-move probe had
silently been reading battler 0 twice for its "target" rows before the
move's own `gAnimScriptActive` flip, not ONIX's real sprite. The clean
probe shows ONIX's sprite (`x2=1, y2=0, animNum=1`) with an active
callback resolving to `SpriteCallbackDummy` (`nm pokeemerald.elf`:
`0x08007428`) from the fixture's very first recorded tick — the
mechanicLab staging harness fast-forwards past the send-out intro before
the trace starts, so no committed window observes the animation
mid-flight, only its already-settled terminal state.

Mapped that callback back to source: `sMonFrontAnimIdsTable[SPECIES_ONIX]
= ANIM_RAPID_H_HOPS` (`pokemon.c:1501`) → `Anim_RapidHorizontalHops`
(`pokemon_animation.c:3567-3599`), triggered once at send-out
(`BattleAnimateFrontSprite`/`DoMonFrontSpriteAnimation`,
`pokemon.c:6803-6856`). It is NOT a continuous idle loop: its own
accumulator (`data[2]`) runs 0→2040 over 86 ticks through a 4-phase
piecewise formula, then permanently freezes `x2`/`y2` at the last active
tick's value and hands off to `WaitAnimEnd` → `SpriteCallbackDummy`
(`:5540-5544`) for the rest of the battle — until an unrelated mechanism
(here, `AnimTask_ShakeMon`'s own unconditional `x2 = gBattleAnimArgs[1]`
absolute set, `battle_anim_mon_movement.c:98-99`) overwrites it.
Hand-derived source arithmetic at the last active accumulator (2040)
gives `x2=1, y2=0` — matching RAM exactly, cross-checked independently of
the terminal-state probe.

**Enumeration answers:** per-species (keyed by `sMonFrontAnimIdsTable`,
opponent/front sprite only — the player's own back sprite uses a
completely separate table/function family, `sSpeciesToBackAnimSet`/
`BACK_ANIM_*`, not explored); plays once, not looped; triggered by
send-out; keeps one accumulator (`data[2]`) plus a terminal `data[6]=0`
reset. Which other committed-fixture species share this family: only
ONIX is currently rendered on the front-sprite side in a dense window;
DRAGON_RAGE's own reverse orientation would need CHARMELEON's own front
entry (`ANIM_BACK_AND_LUNGE`, a different, unexplored multi-phase
function) — named as out-of-scope below, not ported. This connects to
`docs/battle-menu-notes.md` §4's own open item (the settled action-menu's
"idle-bob" flagged unresolved for ONIX): that item is a DIFFERENT
mechanism (`DoBounceEffect`/`SpriteCB_BounceEffect`, a `y2`-only sine
bounce, already fully source+RAM-resolved by a sibling lane's
`docs/battle-menu-idle-notes.md` §1) — the two were conflated under one
"idle-bob" label in prior doc comments, but are unrelated source
functions (one writes only `y2` and loops forever; this one writes
`x2`+`y2` and freezes after 86 ticks). Named here so a future session
doesn't re-chase `DoBounceEffect` for this residual or vice versa.

**Rung 2 — port.** `src/engine/speciesIdleAnim.ts`: a species → front-anim
family table (only `ONIX`/`RAPID_H_HOPS` populated, per the stop-threshold
rule) plus a faithful `rapidHorizontalHopsOffsetAtTick` port (all 4 phases)
and a generic `computeTerminalOffset` driver that runs the port to its own
natural stopping point rather than hardcoding the `{1,0}` result — adding
a second species/family later is a table entry plus its own step function,
not an ONIX-only special case. `tests/speciesIdleAnim.test.ts` (5 tests)
pins hand-derived per-tick values across all 4 phases plus the RAM probe's
own settled state.

**Rung 3 — wired, target-sprite path only.** `sceneOnPresentation.ts`'s
new `dragonRageTargetOffset` applies the species idle offset only when
`animationAge < schedule.targetShakeTick` AND the target is on the
opponent (front-sprite) side; at/after the shake's own creation tick,
`shakeMonOffsetAtRenderTick` alone is authoritative (matching source's
absolute-set clobber). A real bug surfaced wiring this in: the
player-attacker fixture's own `target.spriteCorner.x` was `145` (144 + the
same residual baked directly into the constant — the identical hack
`docs/aerial-ace-portable-staging-probe.md` independently used for
AERIAL_ACE's own opposite-side ONIX target, and the same one
FEATHER_DANCE/QUICK_ATTACK/BOUNCE/FLY's own SHARED ONIX-opponent presets
still use). Adding the offset on top of the already-baked corner
double-counted (146, not 145) and regressed the dense run to 0/150 before
the fixture was corrected back to the generic `144` — caught immediately
by re-running the comparator, not left in. DRAGON_RAGE's own fixture is
NOT shared with any other move's config (confirmed: no other
`sceneOnPresentation.ts` preset references `CHARMELEON`), so this fix is
scoped to DRAGON_RAGE alone; FEATHER_DANCE/QUICK_ATTACK/BOUNCE/FLY's own
shared `145` presets are untouched (their own windows never cross the
residual's reset boundary, so the baked hack still happens to be correct
for them — a real, differently-scoped remainder for whoever eventually
generalizes those, not touched this step).

**Rung 4 — dense re-run.** Player-attacker orientation: **86/150 →
127/150**, reproduced identically on two independent live oracle runs
(deterministic) and A/B-verified against the pre-fix baseline replayed
over the same cached oracle capture (`git checkout` of the prior commit's
two files against the same RGB dir) — zero regressions, only new matches
added. The three remaining named residuals are pre-existing and
unrelated to this rung's own fix (confirmed present in the pre-fix
baseline too): (1) a single-frame boundary artifact at render age 1
(shake lag-2 creation-guard interaction); (2) a fire-spit rounding
residual at render ages 86-96 (not a lag question — lag 0/1/2 all score
equal or worse); (3) newly isolated (previously hidden under the broader
pre-fix mismatch range) at render ages 98 and 105-114, coinciding with
the fire-plume spawns' own creation window — candidate cause is the
fire-plume framebuffer lag, already flagged as inferred-by-analogy rather
than independently confirmed. Per the step brief's own rule, since the
player orientation isn't fully clean, the opponent-attacker orientation
was not attempted this rung (it would also need CHARMELEON's own
`ANIM_BACK_AND_LUNGE` front-anim family ported first).

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` (19 exact / 2 partial
unchanged) — `remaining` updated with the new 127/150 count and the
narrowed residual list.

**Evidence.** `npm test` 2207/2207 (2202 + 5 new). `npm run build` green.
## DRAGON_RAGE rung 6/7: fire-plume z-order fixed via `gMain.oamBuffer` RAM probe (139/150 → 149/150); age-98 ONIX-silhouette anomaly disciplined-probed, both named candidates eliminated, lands `partial` with a single-frame remainder (2026-07-25)

**Verdict: the fire-plume family's tie-break residual (render ages 105-114)
is FIXED on direct hardware evidence, not fitted — the step's own two
sanctioned instruments (RUNG 1's `gMain.oamBuffer` probe, RUNG 2's VRAM/blend
probe) were both applied exactly as specified. RUNG 1 landed a real fix.
RUNG 2's probe cycle completed cleanly but named no fix (both brief
candidates eliminated by hard evidence) — per the step's own PARK RULE,
`MOVE_DRAGON_RAGE` stays `partial`, now with a single remaining frame.**

**Rung 1 — plume-vs-plume z-order ties, FIXED.** Wrote
`tools/probe/dump-dragonrage-oam.py` (ISSUES #32 lineage: the same
`gMain.oamBuffer`-array-position instrument `dump-turn9-clone-oam.py`/
`dump-aerialace-oam.py`/`dump-quickattack-hitsplat-oam.py` already used,
matching each live fire-plume/target sprite's own OAM attrs against the
128-entry composited buffer to find its real final position — lower
position = lower hardware OAM index = drawn on top, this codebase's already-
established `AddSpritesToOamBuffer` convention). Ran it across RAM ticks
183-206 (render ages 94-117) against the committed CHARMELEON-vs-ONIX
fixture. Cross-referencing each RAM slot's `(x,y)` against
`DRAGON_RAGE_FIRE_PLUME_SPAWNS`' own declared offsets gave an exact,
unambiguous spawn-index↔slot mapping for all 7 spawns observed in this
window. The 8 spawns share only 2 distinct subpriorities
(`targetSubpriority ± 2`), so cross-group order was never the problem
(confirmed correct already); the real-hardware order WITHIN each group,
read directly off the buffer at every tick both members of a pair were
alive, resolved to one consistent, source-consistent rule with zero
exceptions: primarily sort by absolute screen Y (higher Y wins, drawn more
in front — the ordinary `SortSprites` same-priority/different-Y tie-break);
ONLY on an exact Y tie (this move's own script has two: spawns 0/4 share
y-offset 0, spawns 2/6 share y-offset 25) does the EARLIER-created spawn
win instead (spawn 0 beats spawn 4 at every tick from RAM 195-206; spawn 2
beats spawn 6 at every tick from RAM 204-206) — matching this codebase's
already-established "ascending creation order survives an exact tie"
convention elsewhere (§7.26/27, `spriteOrder.ts`'s own module doc), NOT the
previously-shipped code's raw script-order paint loop, which was ALSO wrong
for at least one non-tied pair (spawn 3's higher Y should beat spawn 4's,
but script order painted spawn 4 after spawn 3). Per the brief's own
instruction (encode per-instance params for exactly these plume pairs, not
a whole-history `sSpriteOrder` simulation), landed `orderFirePlumesForDraw`
(`dragonRage.ts`) — a plain `(y, then descending spawnIndex)` comparator,
not a persistent scheduler — replacing the naive script-order draw loop in
`battleScene.ts`'s DRAGON_RAGE case. Tier-1 pinned directly against the two
RAM-read tie orderings plus a full-group ordering check (`tests/
dragonRage.test.ts`, 3 new tests). Dense sweep: **139/150 → 149/150** (every
render age 105-114 now clean, zero regressions), reproduced byte-identical
on two independent fresh oracle runs (determinism confirmed).

**Rung 2 — age-98 ONIX-silhouette anomaly, disciplined-probed, no fix
survived.** Extended the same instrument class with a second targeted probe,
`tools/probe/dump-dragonrage-onix-vram.py`, reading ONIX's own OBJ VRAM tile
range (`tileNum=473`, 4bpp, 64 tiles/2048 bytes) and hashing it every tick
from RAM 80 through 190. Both of the step brief's own named candidates were
checked directly and BOTH eliminated:
- **(a) Runtime VRAM overwrite (`LoadBallGfx` precedent):** the VRAM hash is
  completely STABLE and unchanged across the entire target-shake-creation
  window (RAM 186 onward) — the only hash change in the whole probed range
  is one unrelated `tileNum` swap at RAM tick 80→82 (ONIX's send-out
  graphic settling in), long before this move even starts. No overwrite
  occurs anywhere near the residual's own tick. Eliminated.
- **(b) OBJ-over-OBJ blend-to-BG compositing gap (#112 precedent):** the
  existing `dump-dragonrage-oam.py` probe's `BLDCNT`/`BLDALPHA` reads are
  `0x0`/`0x0` (no color special effect enabled at all) at every tick in this
  window, and ONIX's own OAM `affineMode` is `0` (no affine transform, ruling
  out a scale/rotate resampling explanation too) throughout. Eliminated.

With both named mechanisms ruled out, re-examined the mismatch itself
directly (`tools/compare` diff, not committed — scratch): 1598px confined
exactly to ONIX's own sprite bounding box (x149-204, y12-73), every
mismatched color one of ONIX's own known palette shades swapping between
NEARBY screen positions (e.g. `(222,214,214)` at one pixel, `(189,181,181)`
— another real ONIX shade — right next to it and vice versa) — the
signature of a small spatial misregistration of the whole sprite for this
one tick, not a wrong tile or a color-math bug. The target sprite's own
already-modeled state (position, x2/y2, animNum, animCmdIndex, invisible,
subpriority, matrixNum, and now also affineMode) is RAM-confirmed clean and
matches this port's own prediction through the whole window — this is the
SAME finding the prior rung already reached, now extended to rule out the
two remaining named hypotheses too. **No fix shipped**: per this run's own
standing policy (documented no-fix beats a blind fit), this residual needs a
different investigative angle than RAM-state/VRAM/IO-register comparison —
named here, not chased further. Candidate for a future session: a fixture
with less concurrent sprite creation at this exact tick (both the target
shake task AND fire-plume spawn 0 are created simultaneously here), to
separate a genuine engine gap from a possible emulator/hardware sub-frame
ordering effect this per-tick discrete model can't represent at all.
Confirmed deterministic (byte-identical mismatch on a second independent
fresh oracle run).

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` — `remaining` updated to
149/150 (up from 139/150), a single residual (render age 98).

**Evidence.** `npm test` 2212/2212 (2209 + 3 new: `orderFirePlumesForDraw`
pinned against the RAM probe). `npm run build` green. Dense sweep reproduced
byte-identical on two independent fresh oracle runs.

## MOVE_GROWTH rung 3 completed, rung 4 done: scene-wired and dense-compared both orientations, lands `partial` (target exact, attacker residual named) (2026-07-25)

**Verdict: real progress, not a fit.** Completed rung 3 (`GrowthEffect` =
`blend_color_cycle` + `AnimTask_ScaleMonAndRestore`, both RAM-probed to
share one creation tick per call, second call starting exactly 32 ticks
after the first) as `growthAnimationAtAge` (`src/engine/growth.ts`,
`tests/growth.test.ts` 4/4). Extracted IVYSAUR's battle back/front sprites
(CHARMELEON/HAUNTER precedent, `extract-battle-mon-pics.ts`). Wired
`sceneOnGrowthView` + a `battleScene.ts` GROWTH draw case through the
existing `drawSpriteSheetAffineStretch` tint/affine path other moves
already use for palette flashes — `doubled` follows BIND's own precedent
(ANY active affine transform sets `ST_OAM_AFFINE_DOUBLE` on real hardware,
not just over-256 scales).

**Dense comparator (rung 4).** `tools/compare/growthPortable.ts` + two
fixtures, whole 63-frame window per orientation (oracle ticks 211-273,
every frame captured), against the committed `mechanic-growth-*` fixtures.
Component check (attacker affine matrix vs RAM) is **63/63 both
orientations** — the newly-ported mechanism is RAM-exact at every tick,
including age 0's already-nonzero scale. First run surfaced a **full-window
framebuffer loss (0/63)**; pixel-dumped the diff before guessing and found
it traced entirely to the TARGET (ONIX), not the new mechanism — ONIX
(opponent-side front) was missing the already-ported send-out front-sprite
idle residual (`speciesIdleAnim.ts`'s `speciesFrontIdleRestOffset`, the same
"settles at x2=+1" finding DRAGON_RAGE/SHADOW_PUNCH's own dense windows
already required) because GROWTH never runs `AnimTask_ShakeMon` on its
target to overwrite it. Wiring that residual in made the target box
pixel-exact in both orientations.

**Lands `partial`: framebuffer 3/63 both orientations**, reproduced
byte-identical (component and framebuffer counts, bbox, px counts) on two
independent runs each — deterministic. Every remaining mismatch is confined
to IVYSAUR's (the attacker's) own sprite box in both orientations
(player-back: 728px, bbox 48,67-96,111; opponent-front: 585px, bbox
156,28-196,72), a salt-and-pepper pattern on high-detail regions (the
flower bud), not a shift or color swap. Since the affine-matrix component
check is exact at these same frames, the newly-ported blend mechanism isn't
implicated — the pattern matches `speciesIdleAnim.ts`'s own already-named
gap (IVYSAUR isn't yet in `SPECIES_FRONT_ANIM_FAMILY`, and the back-sprite
send-out idle family is explicitly documented there as a separate, unported
mechanism). Not probed/ported this step (a new RAM probe, out of this
rung's time budget) — named, not chased blind, per this run's own
no-blind-fit policy.

**Coverage:** added `MOVE_GROWTH` to `ANIMATION_COVERAGE.json` as `partial`.

**Evidence.** `npm test` 2443/2443 (2439 + 4 new `growth.test.ts`). `npm run
build` green. Both comparators reproduced byte-identical on two independent
runs each.

**Next action for a future session:** RAM-probe IVYSAUR's own send-out
settle offset (both front and back sprite forms — `tools/probe/dump-onix-
front-idle-anim.py` is the direct precedent) and extend
`speciesIdleAnim.ts`'s `SPECIES_FRONT_ANIM_FAMILY`, or add an attacker-side
equivalent of `speciesFrontIdleRestOffset` for the back-sprite family, then
re-run `growthPortable.ts` to confirm `exact`.

**Housekeeping:** moved the superseded "rungs 1-2 done, rung 3 partial"
section (this same move, now complete through rung 4), the "BG-swap
pipeline" dissolution section, and the "SHADOW_PUNCH lands partial (third
session)" section to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention); `blend_color_cycle` family map and DRAGON_RAGE
rung 6/7 stay live alongside this one.
