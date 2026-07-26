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

