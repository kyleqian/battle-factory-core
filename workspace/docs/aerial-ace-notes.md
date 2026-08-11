# Turn 10's AERIAL_ACE animation — asset + mechanism dossier

Groundwork dossier for `docs/battle-turn-notes.md` §40's rung (b) (S7 slice R,
turn 10's AERIAL_ACE animation, render window ~12360-12384). This is a
GROUNDWORK step (worktree lane): no `src/engine/` render code, no trace-file
changes. Its job is to bank everything the next engine slice needs so that
slice is a pure wiring job against already-extracted/verified constants -
above all the "cutting slice" sprite asset (§40's own mechanism 5), the one
piece §40 flagged as needing genuinely new work (a new asset + a new render
routine), not a parameterization of existing code.

Source trace: `tools/compare/traces-groundtruth/battle1-turn10-dense.json`.
Battler slots this turn (§40, RE-CONFIRMED fresh below): battler0 (Onix,
TARGET) = sprite slot 6, battler1 (Pidgeotto, ATTACKER) = sprite slot 5.
`Move_AERIAL_ACE` (`reference/pokeemerald/data/battle_anim_scripts.s:4350`):

```
Move_AERIAL_ACE:
	loadspritegfx ANIM_TAG_CUT
	monbg ANIM_TARGET
	setalpha 12, 8
	createvisualtask AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_ATTACKER, 24, 6, 1, 5
	createvisualtask AnimTask_TraceMonBlended, 2, 0, 4, 7, 3
	createsprite gCuttingSliceSpriteTemplate, ANIM_ATTACKER, 2, 40, -32, 0
	playsewithpan SE_M_RAZOR_WIND2, SOUND_PAN_ATTACKER
	delay 5
	createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 10, 1
	complex_palette_blend ... color1=RGB_BLACK, blend_y1=10, color2=RGB_BLACK, blend_y2=0
	playsewithpan SE_M_RAZOR_WIND, SOUND_PAN_TARGET
	waitforvisualfinish
	clearmonbg ANIM_TARGET
	blendoff
	end
```

**Methodology, per the brief's fresh-oracle-constants rule**: mechanism 5
(the slice sprite) is re-derived end-to-end this session directly against a
FRESH `bin/oracle run` (RAM reads via `tools/probe/dump-cuttingslice-vram.py`
+ a full 240x160 PNG capture over render ticks 12355-12389,
`/tmp/turn10-aerialace-probe.json`/`/tmp/aerialace-png/`, reproducible from
this doc's own commands below) - nothing about it is trusted from §40's prose
alone. Mechanisms 1-3 are **cited from §40's own RAM tables** (already
task/sprite-tabled there via `dump-task-and-sprite-callbacks.py` +
`dump-quickattack-anim.py`) and corroborated (not re-derived tick-by-tick)
against this session's own fresh full-frame PNG diff pass - see the gaps
section. Mechanism 4 (the palette pulse) IS freshly re-bisected below and
corrects §40's own cited window. Never assume a neighbor's lag class: each
mechanism below states its own lag evidence, not a copy of another's.

## Reproducing the fresh evidence

```sh
# RAM: cutting-slice sprite slot/OAM/x2y2/VRAM tiles/palette at any render ticks
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/dump-cuttingslice-vram.py \
  tools/compare/traces-groundtruth/battle1-turn10-dense.json \
  /tmp/cuttingslice-full.json 12360 12361 ... 12383

# Pixels: full-frame PNGs over the window, diffed against the pre-window baseline
python3 - <<'PY'
import json
trace = json.load(open("tools/compare/traces-groundtruth/battle1-turn10-dense.json"))
trace["captureFrames"] = list(range(12355, 12390))
json.dump(trace, open("/tmp/turn10-aerialace-probe.json", "w"))
PY
bin/oracle run /tmp/turn10-aerialace-probe.json -o /tmp/aerialace-png/
```

## Mechanism 5: the "cutting slice" sprite — FULLY EXTRACTED + PINNED (this session's primary deliverable)

**Asset**: `src/assets/gen/battle-anim-cutting-slice.json`
(`tools/extract/extract-cutting-slice.ts`, a NEW standalone script - the
existing bulk extractor `extract-battle-anim-assets.ts` is known to silently
drop fields on re-run, `PAPERCUTS.md`, so this asset intentionally has its
own file, never touched by that one). VRAM-verified: all 4 frames' 16 tiles
each + the OBJ palette are byte-identical to live oracle VRAM at render
ticks 12362/12367/12372/12377 (one tick per displayed frame), 0 mismatches -
see the extractor's own header comment and the commit that landed it.

**Source**: `gCuttingSliceSpriteTemplate`
(`reference/pokeemerald/src/battle_anim_effects_1.c:1231-1240`):
`.tileTag`/`.paletteTag = ANIM_TAG_CUT`, `.oam = &gOamData_AffineOff_ObjBlend_32x32`
(`src/data/battle_anim.h:534-546` - **AFFINE OFF, OBJ BLEND, shape/size
32x32** - explicitly checked against the struct literal, NOT assumed;
distinct from both AFFINE_NORMAL and AFFINE_DOUBLE, the distinction
PROGRESS #228 fixed a real bug over). Tiles: `graphics/battle_anims/sprites/
cut.png` (32x128px, 64 tiles = 4 stacked 32x32 frames, `src/graphics.c:479`).
Palette: `graphics/battle_anims/sprites/impact.png` - CUT's own
`.paletteTag` resolves to `gBattleAnimSpritePal_Impact`
(`src/data/battle_anim.h:1443`), the SAME compiled array `ANIM_TAG_IMPACT`
uses (`:1440`) - there is no separate "cut" palette in the ROM, confirmed by
reading both tag-table rows, not assumed from file naming.

**Position/motion source** (`AnimCuttingSlice`/`AnimSlice_Step`,
`src/battle_anim_effects_1.c:3754-3852`, script args `2, 40, -32, 0` =
subpriority, unk0=40, unk1=-32, unk2=0):

- Base position: `(TargetX + 40, TargetY - 32)` where Target = Onix
  (`gBattleAnimTarget`, NOT the template's own `ANIM_ATTACKER` creation-battler
  argument - that only affects z-order grouping). RAM/PNG-confirmed:
  `x=112, y=56` fixed for the sprite's whole life (matches Onix's own
  on-screen anchor this turn).
- `unk2==0` branch taken (no hFlip): `x2/y2` step via a decelerating linear
  ramp, exact fixed-point recurrence (8.8 fixed point, confirmed bit-for-bit
  against live RAM, not just derived from the C source):
  `data1_0=-1024, data2_0=1024; each tick: data3+=data1; data4+=data2;
  data1+=24; data2-=24; x2=data3>>8; y2=data4>>8` (arithmetic right shift).
- **Full per-render-tick table** (RAM-read fresh, `dump-cuttingslice-vram.py`,
  slot **3** re-confirmed independently this session by scanning all 64
  sprite slots for the OAM signature unique to this template in this window
  - matches §40's own citation, not just trusted from it):

  | render tick | x2,y2 | tileNum | frame |
  |---|---|---|---|
  | 12360 | (-4, 4) | 305 | 0 |
  | 12361 | (-8, 7) | 305 | 0 |
  | 12362 | (-12, 11) | 305 | 0 |
  | 12363 | (-16, 15) | 305 | 0 |
  | 12364 | (-20, 19) | 321 | 1 |
  | 12365 | (-23, 22) | 321 | 1 |
  | 12366 | (-27, 26) | 321 | 1 |
  | 12367 | (-30, 29) | 321 | 1 |
  | 12368 | (-33, 32) | 321 | 1 |
  | 12369 | (-36, 35) | 337 | 2 |
  | 12370 | (-39, 38) | 337 | 2 |
  | 12371 | (-42, 41) | 337 | 2 |
  | 12372 | (-45, 44) | 337 | 2 |
  | 12373 | (-48, 47) | 337 | 2 |
  | 12374 | (-51, 50) | 353 | 3 |
  | 12375 | (-53, 52) | 353 | 3 |
  | 12376 | (-56, 55) | 353 | 3 |
  | 12377 | (-58, 57) | 353 | 3 |
  | 12378 | (-60, 59) | 353 | 3 |
  | 12379 | (-63, 62) | 353 | 3 |
  | 12380-12383 | (-63, 62) held | 353 | 3 (held) |
  | 12384 | sprite gone (destroyed) | - | - |

- **Frame cadence correction (fresh finding)**: `gCuttingSliceAnimCmds`
  (`src/battle_anim_effects_1.c:1217-1224`) declares each frame's duration as
  5 ticks, but the table above shows frame 0 visible for only **4** render
  ticks (12360-12363) while frames 1/2 get the full 5 (12364-68, 12369-73) -
  the standard "render tick = RAM tick + 1" lag eats exactly one tick off the
  FIRST frame only (the frame clock starts counting from the RAM tick the
  sprite is created on, one tick before its first visible render), the same
  family of off-by-one this run's own menu-bounce work has hit repeatedly
  (`battle-turn-notes.md` §40's own `TURN9_MENU_REDRAW_DELAY` bisection).
  Frame 3 is visible 12374-12379 (6 ticks: `data0` reaches 20 on the tick-20
  step call, one past the nominal 5) then HELD at `(-63,62)`/tileNum 353 for
  4 more ticks (12380-12383, `WaitAnimForDuration`) before
  `DestroyAnimSprite` - gone by 12384. This is a small tick-boundary
  refinement over §40's own prose ("12360-12378... `DestroyAnimSprite` at
  12383, gone by 12384") - the destroy/gone boundary matches exactly; the
  frame-3-starts-at-12378-vs-12374 detail is the correction, PNG/RAM cross-
  checked via the table above, not guessed.
- **First visible pixel is render 12361, not 12360** (fresh PNG-diff finding,
  see the full-frame diff table below): the sprite's OWN x2/y2 is already
  nonzero at 12360 per RAM, but the earliest ANY pixel in the whole 240x160
  frame differs from the pre-window baseline is 12361 (71px, a small ~11x11
  patch at roughly x:92-103,y:64-75) - one tick later than the naive
  "render=RAM+1" lag would predict for the sprite's OWN creation tick. Not
  chased to a definitive single-mechanism attribution this session (the
  patch is too small/early to confidently assign to the slice vs. the lunge
  vs. a clone - all three have onset RAM ticks within 1-2 ticks of each
  other) - flagged as a gap, not guessed.

## Mechanism 4: background palette-blend pulse — RE-BISECTED (corrects §40's cited window)

`complex_palette_blend ... color1=RGB_BLACK, blend_y1=10, color2=RGB_BLACK,
blend_y2=0` - an IO-register-driven background darken-then-restore, not a
sprite. §40 cited render 12367-12375 (`AnimComplexPaletteBlend_Step1`->
`Step2` task-active window). Fresh full-BG-area (`y:0-111`, excludes the
message-box strip) diff-vs-pre-window-baseline pass:

| render tick | diff px (0-111 band, 26880 total) |
|---|---|
| 12365 | 2039 |
| 12366 | 2515 |
| 12367 | 2701 |
| **12368** | **20921** |
| **12369** | **20921** |
| **12370** | **20910** |
| 12371 | 2369 |
| 12372 | 1181 |
| 12373 | 1159 |

The near-full-band darken (~20900/26880 px, ~78% - the remainder is likely
sprite-priority/OBJ-window-excluded pixels, not unaffected background) is
active for exactly **3 render ticks, 12368-12370** - narrower than §40's
cited 12367-12375 task-active window. This is not necessarily a
contradiction (the RAM task can be "active" for setup/tear-down ticks either
side of the visually-saturated blend plateau - blend coefficient ramping
through small values near the edges may not register as a full-band diff),
but the PLATEAU itself - the actual visible darkening most engine code would
need to reproduce pixel-exact - is this 3-tick window, PNG-confirmed, not
inherited from §40's task-window prose unchanged. Recommend the next slice
re-derive the exact per-tick blend coefficient (not just onset/offset) via
`evaEvb`/BLDY register reads before implementing, since a plateau this short
suggests a small number of discrete coefficient steps rather than a smooth
per-tick ramp.

## Mechanisms 1-3: cited from §40, corroborated by envelope only (named gap)

Time-boxed this session (worktree lane, groundwork step) - these three are
**not independently re-derived tick-by-tick**; they're reproduced verbatim
from `battle-turn-notes.md` §40 (already RAM-tabled there via the same
`dump-task-and-sprite-callbacks.py`/`dump-quickattack-anim.py` probes cited
in this doc's methodology section) with only a coarse corroboration: this
session's own full-frame PNG diff pass (see table below) confirms dense,
multi-region pixel activity across render 12362-12379, consistent with all
three being active somewhere in that span, but does NOT re-verify each one's
individual per-tick x2/y2 table or re-bisect its own render lag
independently. Flagged here explicitly rather than re-asserted as fresh -
**the next slice picking these up should re-run the RAM probes itself**
before implementing, per this run's own fresh-oracle-constants rule; treat
the tables below as a strong prior, not re-proven ground truth.

1. **Pidgeotto's own elliptical lunge** (slot 5, real sprite):
   `AnimTask_TranslateMonElliptical_Step` active RAM 12359-12364 (render
   12360-12365), `x2,y2` = `(-17,2), (-24,6), (-17,11), (0,12), (16,11),
   (24,6)`, back to `(0,0)` at render 12366.
2. **Onix's own shake** (slot 6, real sprite): `AnimTask_ShakeMon_Step`
   active RAM 12366-12384 (render 12367-12385); `y2` square-wave `3,3,0,0`
   repeating over render 12369-12384 (4 full cycles, 16 ticks).
3. **Two blended trace/afterimage clones** (slots 4 and 7, `AnimMonTrace`):
   slot 4 active render 12360-12368 then 12370-12378 (`x2,y2` flat
   `(-17,2)` then `(0,0)`); slot 7 active render 12365-12373 only, `x2,y2`
   flat `(24,6)`.

## Full-frame diff envelope (fresh, this session - the corroboration evidence for mechanisms 1-3 above)

Diff vs. render-12355 baseline (pre-window), whole 240x160 frame:

| tick | diff px | bbox (x0,y0,x1,y1) |
|---|---|---|
| 12355-12360 | 0 | (none - flat) |
| 12361 | 71 | (92,64)-(103,75) |
| 12362 | 1807 | (88,25)-(197,78) |
| 12363 | 2189 | (84,25)-(197,82) |
| 12364 | 2058 | (80,25)-(197,86) |
| 12365 | 2039 | (76,25)-(197,90) |
| 12366 | 2515 | (73,25)-(213,93) |
| 12367 | 2701 | (69,25)-(221,97) |
| 12368-12370 | ~20900-20921 | (0,0)-(239,111) (palette-pulse plateau, mechanism 4) |
| 12371 | 2369 | (44,31)-(221,111) |
| 12372-12373 | ~1160-1180 | (51-54,31)-(221,111) |
| 12374-12375 | ~1300 | (44,49)-(99,111) |
| 12376-12377 | 53-68 | (53,92-95)-(74,111) |
| 12378-12379 | ~1280 | (44,49)-(99,111) |
| 12380-12381 | 27 | (53,102)-(64,111) |
| 12382-12383 | 1275 | (44,49)-(99,111) |
| 12384 | 27 | (53,102)-(64,111) |
| 12385-12389 | 0 | (none - settled) |

The window is fully bracketed: flat (0 diff) through 12360, dense multi-
mechanism activity 12361-12384 exactly matching the union of every
mechanism's own cited/derived life span above, flat again from 12385 -
consistent with §40's own "gone by 12384" claim for the slice sprite and a
clean turn-end handoff, no un-modeled residual activity trailing past 12384.

## What's still needed before rung (b) can land (honest gap accounting)

This is a GROUNDWORK step only - no `src/engine/` render code was written.
For the next slice to be a pure wiring job:

- **Mechanism 5 (slice)**: fully ready - asset extracted + VRAM-verified,
  exact position formula + full per-tick table above, frame/hold/destroy
  boundaries pinned. A render routine still needs writing (out of scope for
  this worktree lane).
- **Mechanism 4 (palette pulse)**: onset/plateau/offset window re-bisected
  (12368-12370 plateau), but the exact per-tick coefficient ramp (not just
  the visible plateau) is NOT derived - recommend a BLDY/coefficient RAM
  read before implementing.
- **Mechanisms 1-3**: cited from §40 only, NOT independently re-derived this
  session - re-run the RAM probes fresh before trusting the exact tables
  above at implementation time.
- **The 12361 71px early-onset patch**: unattributed to a specific mechanism
  (named gap, not guessed).

## 2026-07-21 update: mechanisms 1-3 fresh RAM re-derivation + mechanism 4's full per-tick coefficient (S7 slice R rung (b) groundwork continuation)

Closes the named gaps the previous session flagged above. Per the brief's own
mandatory-first-step rule, instrumented the LIVE dispatcher BEFORE touching
RAM probes or source (`tools/compare/scratch/diag-aerialace-anchor.ts`, same
pattern as §38's `diag-quickattack-anchor.ts`): turn 10's own live `pressTick`
(the FIGHT-submenu confirm this animation window is anchored to) is
`SCENE_TICK0(1040) + confirmElapsed(11265) = 12305`, constant across the
whole AERIAL_ACE window (12345/12360/12380/12400/12439 all read the same
`confirmElapsed`) - **not assumed from the predecessor dossier**, which never
stated a pressTick at all. All tables below are RAM-tick-relative,
`n = ramTick - 12305`, same convention §38/§39 established for QUICK_ATTACK.

Fresh RAM probe: `tools/probe/dump-aerialace-anim.py` (new, extends
`dump-quickattack-anim.py`'s own slot-scan convention with the `data[]`
general-purpose fields needed to read the palette-blend sprite's internal
state), run against `battle1-turn10-dense.json`, RAM ticks 12345-12395,
output `/tmp/aerialace-anim.json` (reproducible, not committed - scratch
data per this run's own convention). **Papercut hit again**: the probe
process exits 139 on teardown after writing complete, valid JSON (same
family as the brief's own flagged papercut) - validated by loading/parsing
the output file directly rather than trusting the exit code.

### Mechanism 1: Pidgeotto's elliptical lunge (slot 5, real sprite) - CORRECTED, whole window shifted +1 tick late

| n (=RAM-12305) | RAM tick | x2,y2 |
|---|---|---|
| 55 | 12360 | (-17,2) |
| 56 | 12361 | (-24,6) |
| 57 | 12362 | (-17,11) |
| 58 | 12363 | (0,12) |
| 59 | 12364 | (16,11) |
| 60 | 12365 | (24,6) |
| 61 | 12366 | (0,0) - reverted |

RAM 12359 independently confirmed `(0,0)` (not yet active). §40 cited this
exact 6-value sequence at RAM 12359-12364 - the fresh probe pins it ONE
TICK LATER, RAM 12360-12365 - a plain transcription/citation error, not a
render-lag artifact (see the pixel-lag finding below, which is a separate
axis). **CORRECTED**, not confirmed.

### Mechanism 2: Onix's shake (slot 6, real sprite) - CONFIRMED exactly, no correction

Base `(x,y)=(72,80)` fixed; `x2` stays `0` throughout (not previously
stated explicitly, now confirmed); `y2` square-wave `3,3,0,0` repeating over
RAM 12369-12384 (n=64-79), 4 full cycles, 16 ticks - **bit-for-bit the same
window §40 cited**, no correction needed. `invisible` is `True`
continuously from RAM 12357 through 12385 (a much wider span than the
shake's own y2-active window) - per §37's already-proven rule this doesn't
gate rendering, and is likely `monbg`/`setalpha`'s own doing at the top of
the whole script (both apply to `ANIM_TARGET`=Onix), not the shake task
itself - flagged as a related observation, not chased further (named gap).

### Mechanism 3: the two trace/afterimage clones (slots 4 and 7) - CORRECTED, each life's END is 1 tick early in §40

| slot | RAM window (n) | x2,y2 |
|---|---|---|
| 4, life 1 | 12360-12367 (n=55-62) | (-17,2) flat - matches the lunge's own FIRST value |
| 4, gap | 12368-12369 (n=63-64) | not in use |
| 4, life 2 | 12370-12377 (n=65-72) | (0,0) flat |
| 7 | 12365-12372 (n=60-67) | (24,6) flat - matches the lunge's own LAST value |

Both clones sample the lunge's own start/end extremes, exactly as §40 said.
§40 cited slot 4's life 1 as "12360-12368", life 2 as "12370-12378", and
slot 7 as "12365-12373" - in every case the fresh probe's last confirmed
`inUse=True` tick is ONE EARLIER than cited (12367 not 12368, 12377 not
12378, 12372 not 12373); every START matches exactly. A distinct correction
shape from mechanism 1's whole-window shift - each mechanism has its own
citation-error shape, as the brief anticipated. **CORRECTED** (ends only).

### A genuine +2 pixel-visible lag for mechanisms 1/3, distinct from mechanism 5's own +1 (new finding, not root-caused)

Mechanisms 1 and 3's slot-4-life-1 both go RAM-active at the SAME tick
(12360) mechanism 5 (the slice) is created on. Mechanism 5's own pixel
debut is already pinned at render 12361 (+1 lag, existing check). But the
already-verified full-frame envelope shows render 12361's ENTIRE 71px diff
confined to the slice's own small footprint (x:92-103) - **zero** diff
anywhere in Pidgeotto's own on-screen territory (his base `x=176`, so
x>=150 is squarely his) - and only gains pixels there at render 12362
(1807px, bbox reaching x=197). So mechanisms 1/3's own pixel-visible onset
is render **12362**, one tick later than mechanism 5's, despite sharing its
RAM-active start tick. Not root-caused this session (mechanism 1's own
sprite, slot 5, isn't even freshly created, so "freshly-created sprites get
an extra tick" - §39 Bug 2's own explanation for QUICK_ATTACK's blended
clones - doesn't obviously apply here) - flagged as a named gap for
whoever implements rung (b): wire mechanisms 1/3's OWN RAM tables from
n=55 (RAM 12360) as pinned above, but expect their first VISIBLE pixel at
render 12362, not the naive render=RAM+1 (12361). PNG-verified via two new
checks in `verify-turn10-aerialace.ts` (below), not guessed.

### The 12361 71px onset patch: RESOLVED - mechanism 5 alone, by position + magnitude elimination (closes the named gap)

At RAM 12360, three mechanisms (1, 3's slot-4-life-1, and 5) are ALL
RAM-active for the first time, so timing alone can't attribute the patch -
but slots 5/4 (Pidgeotto's own real sprite + its clone) sit at base
`x=176`, while slot 3 (the slice) sits at base `(112,56)` with its own
32x32 footprint - nowhere near overlapping. The observed 71px bbox,
`(92,64)-(103,75)`, falls squarely inside the slice's own footprint and
nowhere near Pidgeotto's. Magnitude corroborates this too: a moving
Pidgeotto silhouette (mechanism 1) or its semi-transparent clone
(mechanism 3) would produce a diff in the hundreds-to-thousands of
pixels (as both do from render 12362 onward), not an isolated 11x11 patch
- consistent with only a sparse corner of the slice's own frame-0 tile
(`tileNum=305`) having opaque pixels at its very first, barely-emerged
instant. **Mechanism 5 owns the 71px patch** - position- and
magnitude-eliminated, not guessed; PNG-verified via the new
`PIDGEOTTO_TERRITORY` checks below (not proven by direct code-level
isolation, since no engine code was written this groundwork step).

### Mechanism 4: full per-tick coefficient across the whole pulse (closes the brief's own named gap)

The brief assumed a BLDY/BLDALPHA hardware-register read; **that assumption
is wrong for this mechanism** - `AnimComplexPaletteBlend`/`_Step1`/`_Step2`
(`reference/pokeemerald/src/battle_anim_normal.c:344-405`) calls
`BlendPalette` (`src/util.c:264`) directly, a SOFTWARE per-color blend
writing straight into `gPlttBufferFaded` (the live palette RAM mirror) -
not the GBA's hardware brightness-fade register. Read the palette-blend
sprite's own `data[]` fields directly (slot 8: `sTimer,sDelay,sNumBlends,
sColor1,sBlendY1,sColor2,sBlendY2,sPaletteSelector`) plus two representative
live palette colors (BG palette 1 color 1, and battler0/battler1's own OBJ
palette color 1 - `selector=31` decodes to `F_PAL_BG|F_PAL_BATTLERS`
exactly, confirmed bit-for-bit against `data[7]`):

| n (=RAM-12305) | RAM tick | s8.data (sTimer,sDelay,sNumBlends,...,sBlendY1,...,sel) | bgPal1c1 | objPalB0/B1c1 | state |
|---|---|---|---|---|---|
| 61 | 12366 | sprite not yet created | `0x18c5` (5,6,6) | `0x7fff` (31,31,31) | baseline |
| 62 | 12367 | `[2,3,1,0,10,0,0,31]` | `0x18c5` | `0x7fff` | baseline (write not yet visible) |
| 63 | 12368 | `[1,3,1,0,10,0,0,31]` | `0x0841` (1,2,2) | `0x2d6b` (11,11,11) | **darkened** |
| 64 | 12369 | `[0,3,1,0,10,0,0,31]` | `0x0841` | `0x2d6b` | **darkened** |
| 65 | 12370 | `[3,259,0,0,10,0,0,31]` | `0x0841` | `0x2d6b` | **darkened** (restore step just fired, not yet visible) |
| 66 | 12371 | `[2,259,0,0,10,0,0,31]` | `0x18c5` | `0x7fff` | restored |
| 67-68 | 12372-73 | `[1..0,259,0,...]` | `0x18c5` | `0x7fff` | restored |
| 69 | 12374 | `[0,259,0,0,10,0,0,31]` (held, `Step2` wait) | `0x18c5` | `0x7fff` | restored |
| 70 | 12375 | destroyed | `0x18c5` | `0x7fff` | restored |

The darkened colors are a bit-exact match to `BlendPalette`'s own formula
(`out = c + ((0-c)*10)>>4`, hand-verified: `(5,6,6)->(1,2,2)`,
`(31,31,31)->(11,11,11)`) - **not** a smooth per-tick ramp, exactly **two**
discrete writes (coeff=10 at creation, coeff=0 exactly `delay`=3 ticks
later per the script's own `complex_palette_blend ... delay=3, num_blends=1,
blend_y1=10, blend_y2=0` args), confirming the predecessor's own hypothesis
("a plateau this short suggests a small number of discrete coefficient
steps rather than a smooth per-tick ramp") at the source+RAM level, not
just pixel-inferred. The darkened-palette-RAM window (RAM 12368-12370,
3 ticks) lands on the EXACT SAME absolute tick numbers as the predecessor's
own PNG-bisected plateau (render 12368-12370) - i.e. palette-RAM visibility
has **no** render lag here (0, not +1), unlike the OAM x2/y2 fields
mechanisms 1/2/3/5 all show some lag class for - yet another distinct lag
class in this one window, as the brief anticipated. **CONFIRMED + fully
extended** (previously only the plateau window was pinned; now every tick
of the pulse's own state machine is).

### Verification (this update)

`tools/probe/verify-turn10-aerialace.ts` extended with 3 new checks (the
71px-patch attribution, the mechanisms-1/3 +2 lag, and mechanism 2's shake
phase-alignment) - **20/20 PASS** (17 prior + 3 new), fresh run against a
live oracle capture, zero regressions. `npm test` and `npm run build`
unchanged-green (no `src/` changes this session). New committed tooling:
`tools/compare/scratch/diag-aerialace-anchor.ts` (live pressTick
instrument, reusable), `tools/probe/dump-aerialace-anim.py` (combined
sprite-slot + palette-blend RAM probe).

### What's left for rung (b) implementation (updated gap accounting)

- **Mechanisms 1-5**: all five now have RAM-pinned tables + PNG-corroborated
  pixel-visible windows. Mechanisms 1/3 need their own **+2** render lag
  (not the naive +1) - the ONE remaining unexplained detail, named above,
  not root-caused.
- **Mechanism 2's own wider `invisible=True` span** (RAM 12357-12385 vs. the
  shake's own narrower 12369-12384 active window) is unexplained (likely
  `monbg`/`setalpha` at script start, not chased) - doesn't block
  implementation (per §37, `invisible` never gates rendering) but flagged
  for completeness.
- Render routines for all five mechanisms still need writing - out of
  scope for this worktree lane (no `src/engine/` changes made this
  session, per the brief).

## Verification

`tools/probe/verify-turn10-aerialace.ts` (rerunnable PASS/FAIL script,
`node --experimental-strip-types tools/probe/verify-turn10-aerialace.ts`)
re-derives the slice sprite's slot/tileNum/x2y2 table and the palette-pulse
plateau window fresh against `battle1-turn10-dense.json`, asserting every
pinned constant in this doc against a live oracle run - the fix worker
should run this FIRST before implementing rung (b)'s render code, same
convention as `verify-turn9-postlunge.ts`.

## 2026-07-21 rung (a) CLOSES + rung (b) partial (S7 engine step)

Rung (a) (mechanisms 1/3's residual, renders 12363-12366) is now **0-diff**,
`turn10-aerialace.json` **23/23** (extended through render 12367, the tick
before the palette pulse). Verified: `verify-turn10-aerialace.ts` 20/20
unchanged, `npm test` 966/966, `npm run build` green, every neighbor trace
re-run 0-diff (turn10-rockslide 220/220, turn12-aerialace 56/56,
turn12-rockslide-miss 38/38, turn9-quickattack 159/159, turn11-menu 56/56,
turn11-featherdance 178/178, turn11-rockslide 163/163).

**The root cause was NOT the RAM tables** - both this doc's own mechanism-1
table and mechanism-3's window bounds were ALREADY correct in the committed
engine code (landed by the session that wrote `c52045e`, timestamped AFTER
this doc's own 2026-07-21 correction pass) - confirmed by brute-force
fitting each offset independently against a fresh oracle capture (every
neighboring (dx,dy) candidate scored far worse than the committed value).
The bug was **compositing order**: `drawTurn10AerialAceLungeAndClones` drew
the real sprite first and blended both `AnimTask_TraceMonBlended` clones "over
fb" last - the exact shape QUICK_ATTACK's own clones use (§39) - but for
THIS window that leaves the real sprite's own moving silhouette exposed to
being blended-over by a clone that's landed at a nearby-but-different
offset, producing the shrinking-but-nonzero residual (666→29px) both this
session's fresh probe AND §42/§43's own prior attempt hit. Swapping the
order - both clones blended against the static field FIRST, real sprite
OPAQUE on top LAST, so it always wins wherever it covers a clone - closes it
to exactly 0. Also corrected slot 7's own END lag from the assumed +2 to the
ordinary +1 (RAM end 12372 needs render 12373, not 12374; RAM-pixel-bisected
by disabling/re-enabling slot 7 and watching render 12374 flip between
match and a regression).

**Rung (b) (mechanism 4, the palette darken) is wired but NOT 0-diff yet.**
`turn10AerialAcePaletteDarkenCoeff`'s coefficient was already RAM-pinned and
Tier-1-tested; wiring its boolean (`coeff > 0`) into the render path (the
`darken` parameter `drawTurn10FieldBase`/`drawTurn10AerialAceLungeAndClones`
already carried, unused, from an earlier revert) found and fixed two real
bugs:

1. `turn10BgDarkPalette` darkened LOCAL palette index **1** - a literal
   transcription of the hardware BG_PLTT bank number cited in this doc's own
   RAM table. But `battleBg.palette` (`extract-battle-bg.ts`) is a COMPACT
   array of only the palettes the static tilemap's own tiles actually
   reference - every one of its 2048 tile entries uses local index **0**
   (`python3 -c "...Counter(e['palette'] for e in entries)"` on the
   committed asset JSON). Darkening index 1 was a no-op; the field never
   visibly darkened. Cross-checked against the ROM source
   (`UnpackSelectedBattlePalettes`/`GetBattlePalettesMask`,
   `reference/pokeemerald/src/battle_anim_mons.c:1402-1410`): `F_PAL_BG`
   actually selects hardware BG_PLTT banks 1/2/3 (mask `0xe`) outside a
   Contest, not the single bank this doc's RAM table implied - that only
   clarifies the HARDWARE side; the actual engine fix is mapping to the
   asset's own local index 0.
2. `erasePidgeottoFootprint`/`healthboxBackgroundColorAt` never accounted
   for `darken`, so erasing Pidgeotto's static footprint mid-pulse
   repainted it with the UNDARKENED field color before the real/clone
   sprites redrew over it. Threaded an optional palette override through
   both (turned out not to be the source of the remaining residual below,
   but is a genuine latent bug fixed regardless).

Net effect: the darken plateau's mismatch dropped from **~48% of the whole
frame** (20921px) to a small, localized residual confined to Pidgeotto's own
silhouette - 600px (1.56%) at render 12368, 893px (2.33%) at 12369, then
back down to the SAME 203px (0.53%) residual that persists at 12370-12371
regardless of darken (see below). Bisected without finding the remaining
cause: swapping slot4/slot7's own relative draw order (no effect - they
don't overlap each other); the erase-background darken fix above (no
effect); sampled pixel colors directly (both sides darkened, in the right
ballpark, but not bit-identical - not a "forgot to darken this element"
bug, something more precise). Time-boxed - **not chased further this
session**; `turn10-aerialace.json`'s `captureFrames` stays at its rung (a)
boundary (12367, the last tick before the pulse) rather than claim a false
0-diff pass past it.

**A separate, smaller pre-existing residual, independent of darken**: even
past the pulse (render 12370-12373, `darken` already back to `false`),
there's a persistent 203px residual confined to Pidgeotto's silhouette
(bbox `(178,41)-(190,62)`) whenever the real sprite (settled) and slot 7
(still alive, offset `(24,6)`) overlap. Brute-force-confirmed slot 7's own
offset value is already optimal (any neighboring (dx,dy) scores 900px+
worse); swapping draw order relative to the real sprite made no difference
either. Smaller and more precisely bisected than the pre-session gap, but
still unresolved - flagged here rather than blind-fit further.

### Handoff for whoever picks up rung (b)'s remaining tail + rung (c)

- The darken window's own residual (600/893px at 12368/12369) and the
  independent 203px residual (12370+, whenever real+slot7 overlap) may
  share a root cause (both are "real sprite + a `TraceMonBlended` clone,
  simultaneously visible, small persistent mismatch confined to the
  overlap") - worth checking together rather than as two separate bugs.
- Neither blocks rung (c) (the 12371-12437 flicker, still fully unstarted -
  RAM-probe it fresh per the brief before touching render code) or rung
  (d) (turn 12's mirror at +2068) in principle, but rung (b)'s own
  acceptance (0-diff through 12371) is not yet met, so `turn10-aerialace.json`
  cannot be extended past 12367 until this closes.

## 2026-07-21 PROBE: Mission A verdict (current rule falsified, replacement not yet closed) + Mission B not reached (time-boxed, honest gap)

Worktree PROBE step (no `src/` changes). Time-boxed hard at 35 minutes;
Mission A (the priority) consumed the whole window with a decisive,
pixel-cited result. **Mission B (the 12371-12437 flicker) was NOT
reached** - RAM-probing it fresh, as the brief required as a first step,
did not fit in the remaining time after Mission A's evidence chain. Stated
here honestly rather than padded with a guess; the brief's own reproduction
recipe (`dump-aerialace-anim.py` over that span, checking the ENDEAVOR §15f
/ turn-9-flicker-task family first) is unchanged and ready for the next
session to run directly.

### Mission A: RAM semantics confirmed, but the "real always wins" rule is FALSIFIED by direct pixel evidence - the replacement rule is a named, open gap

**Step 1 - RAM probe of the overlap window** (`dump-aerialace-anim.py`,
RAM 12363-12376, reused verbatim - scratch, not committed since the tool
already exists): both the real sprite (slot 5) and the clone (slot 7)
carry the **identical OAM `priority` field (2)** for the whole overlap
span (RAM 12365-12372) - confirmed fresh, not assumed. `objMode`: slot 5 =
0 (Normal, opaque, NOT a blend source); slot 7 = 1 (semi-transparent
blend source) whenever `inUse`. `BLDCNT` = `0x3f40` for the entire window:
target-2 mask (bits 8-13) = `0x3f` - **every** layer, BG0-3/OBJ/backdrop,
is a valid blend target 2, OBJ included. This is the exact
"OBJ-blend-target-2-can-include-another-OBJ" configuration the brief's own
2026-07-19 precedent addresses.

**Step 2 - direct tileset lookup confirms TRUE overlap, ruling out a
position bug.** At render 12371/12372 (darken long restored, real sprite
settled at `(0,0)`, slot 7 alive at offset `(24,6)`), sampling
`opponentFrontSpritesAsset.PIDGEOTTO.tileset` directly at both sprites' own
local coordinates for six pixels inside the residual's own bbox
`(178,41)-(190,62)` shows **both** the real sprite's own texel AND slot
7's own texel are non-transparent (opaque) at the identical absolute
screen pixel, e.g. `(181,41)`: real's own local `(37,22)` = palette idx 5,
slot 7's own local `(13,16)` = palette idx 8. Every one of six sampled
pixels confirms this. **This rules out a lunge/clone offset or position
bug** (already brute-force-eliminated per the handoff) **as the residual's
cause - it is a genuine two-OBJ pixel-level conflict**, pinned by asset
data alone (no oracle capture needed - now a permanent, cheap check in
`verify-turn10-aerialace.ts`, see below).

**Step 3 - pixel-color evidence FALSIFIES the current resolution rule.**
The current engine (`drawTurn10AerialAceLungeAndClones`) resolves every
such conflict as "real sprite, opaque, drawn last, always wins" - which
would put Pidgeotto's own **plain, undarkened** palette color #5,
`(231,181,74)`, at screen pixel `(181,41)` for render 12371. The live
oracle instead shows `(255,160,145)` at that exact pixel - not within
plausible PNG-quantization tolerance of `(231,181,74)` (each channel off
by 24-107). **The "real always wins outright, no blend" rule is
concretely false for these pixels** - now pinned as a permanent check in
`verify-turn10-aerialace.ts` (a falsification pin: asserts the oracle
pixel is NOT close to the real sprite's own plain color, so a future
implementation that reintroduces this exact bug will fail loudly).

**Step 4 - does this explain BOTH residuals?** Very likely yes, structurally:
at render 12368 (the darken-plateau residual, 600px), the SAME real+slot-7
overlap is active (plus slot 4's own second clone and the darken palette
swap layered on top) - same code path (`drawTurn10AerialAceLungeAndClones`),
same "real always wins opaque" rule, same physical sprites. Not
independently pixel-fitted this session (time-boxed after the decisive
12371 case), but the shape (both residuals confined to Pidgeotto's own
silhouette, both vanish when either the darken or the overlap is absent)
is consistent with one root cause, per the handoff's own hypothesis - now
upgraded from "worth checking together" to "structurally confirmed to share
the same falsified rule," short of an independent pixel fit at 12368/12369.

**Step 5 - what the replacement rule actually is: NOT closed this
session, an honest negative.** I could NOT pin down, within the time box,
which sprite wins the tie (both share OAM `priority=2`) or what the winner
blends against. The brief's own cited hardware rule ("lower OAM index wins
at equal priority, blending winners then fall through to whatever's below
the OBJ layer, never another OBJ") predicts real (slot 5, presumably lower
final OAM index than slot 7 if pokeemerald's OAM-copy order matches
`gSprites` index order) should still win outright - but that contradicts
the pixel evidence above just as much as the current code does, UNLESS the
actual copy-to-OAM order does NOT match `gSprites` index order for these
two sprites (an assumption this session never independently verified -
the RAM probe reads `gSprites[]` fields directly, not the final
`gMain.oamBuffer`/hardware OAM array). Hand-solving candidate blend
formulas (clone's own color blended at `eva=12,evb=8` toward a plain-BG
target2, or toward the real sprite's own would-be color as target2)
against several sampled pixels did not converge on one consistent target2
color across pixels within the time available - flagged as unresolved
rather than curve-fit.

**Fix-shape recommendation for the next engine session** (evidence-backed,
but the winner/blend-target must be nailed down first via the instrument
below - do NOT reintroduce "real always wins" verbatim, it is now
pixel-disproven):

1. Read the ACTUAL final OAM buffer (`0x07000000` + 8 bytes/entry, NOT
   `gSprites[]`) at a RAM tick inside the overlap window, and locate the
   two entries matching slot 5's and slot 7's own known `(x,y)` (real at
   `x=176,y=51`; clone at `x=200,y=57` per the RAM table above) - this
   settles, by direct observation rather than assumption, which one has
   the lower final OAM index and therefore actually wins the tie.
2. Once the winner is known: if it's the CLONE (not real) that wins in the
   true-overlap region, the fix shape is "per-pixel winner resolution
   between real+clone: at each absolute screen pixel, if the CLONE's own
   texel is opaque there, draw the clone's blended pixel LAST (on top),
   even where real's texel is also opaque; real only shows through where
   the clone's own texel is transparent." If BLDCNT's target-2-includes-OBJ
   turns out to be a red herring for the LOSING sprite (i.e. the loser
   never contributes color at all, win-or-lose is binary), re-derive the
   winning clone's own target-2 (BG-only vs. something else) from a clean,
   single-clone-no-darken pixel set (render 12371's own bbox is exactly
   that - already isolated, reuse it) before generalizing to the
   darken-plateau case.
3. Re-verify against BOTH residual windows (12368/12369 darken-plateau AND
   12370-12372 plain overlap) once the rule is nailed down - per Step 4
   above, one fix is expected to close both, but this is not yet proven.

### Mission B: NOT reached - time-boxed, no code or RAM probe run this session

Per the brief's own honesty framing: this is a genuine gap, not a
disguised guess. The reproduction recipe is unchanged from the brief:
extend `dump-aerialace-anim.py` (or reuse verbatim) over RAM 12371-12437,
check the ENDEAVOR §15f (turn 2, Onix post-hit flicker + player-healthbox
wobble) and the turn-9 flicker task's own "4th block" precedent FIRST
before assuming a new mechanism, then dense-capture renders 12371-12437 to
bisect the render-lag class and phase boundaries. None of this was run
this session - `turn10-aerialace.json`'s own `captureFrames` is unchanged
(still ends at 12367), and no claim is made about the flicker's identity,
lag class, or phase boundaries here.

### Updated gap accounting for rungs (b)/(c)/(d)

- **Rung (b)**: the darken-plateau residual (600/893px) and the
  independent 203px residual are now understood to be the SAME class of
  bug (a falsified compositing rule at true real+clone OBJ overlap, Mission
  A above) rather than two unrelated small bugs - concretely narrows the
  next session's work to "find the correct winner/blend-target rule, apply
  it once" rather than two separate bisections. Still not 0-diff;
  `turn10-aerialace.json` capture window is unchanged (through 12367).
- **Rung (c)** (the 12371-12437 flicker): fully unstarted, as before this
  session - Mission B's own reproduction recipe above is the next action,
  unchanged from the original brief.
- **Rung (d)** (turn 12's +2068 mirror): blocked transitively on (b)/(c),
  unchanged.

### Verification (this update)

`tools/probe/verify-turn10-aerialace.ts` extended with 2 new checks (both
pure Mission-A pixel/asset-data pins, no new oracle capture beyond the
window it already fetches): the true-overlap texel fact (asset-data only,
no oracle needed) and the falsification pin (oracle pixel at render 12371
is NOT close to the real sprite's own plain color) - **22/22 PASS** (20
prior + 2 new), run twice back to back, identical results. `npm test` and
`npm run build` unchanged-green (no `src/` changes this session). New
committed tooling: `tools/compare/scratch/aerialace-overlap-diag.ts` (the
per-pixel diff-and-classify instrument Mission A's step 1 used, reusable
for the next session's own bisection once the winner rule is known).

## 2026-07-21 PROBE follow-up: Mission A2 SOLVES the plain-overlap rule (0-tolerance pixel-exact) + a named darken residual; Mission B SOLVES the flicker (RAM+pixel corroborated, reuse verdict)

Worktree PROBE follow-up, stacked on the prior probe's branch. Both
missions reached a decisive, cited result within the 35-minute cap; A2's
own darken-plateau refinement is the one honest open gap, named below
rather than curve-fit.

### Mission A2: the OAM-index winner, RAM-read directly (not `gSprites[]`)

New tool `tools/probe/dump-aerialace-oam.py` reads `gMain.oamBuffer[128]`
(`include/main.h:34`, IWRAM base `gMain=0x030022c0` per `bin/oracle symbols
gMain` - **not** EWRAM, despite `gSprites` living there) directly - the
exact buffer `sprite.c:643`'s `CpuCopy32(gMain.oamBuffer, (void*)OAM,
sizeof(gMain.oamBuffer))` DMAs to real hardware OAM every vblank, so
reading it from IWRAM is equivalent to reading `0x07000000` and sidesteps
any DMA-timing ambiguity about which frame's copy is currently live there.
Cross-referenced `sprite.c`'s own `SortSprites`/`AddSpritesToOamBuffer`:
`sSpriteOrder` is walked in ascending-combined-priority order and assigned
**strictly increasing** OAM indices, so an entry's ARRAY POSITION in
`gMain.oamBuffer` directly IS its final hardware OAM index - no need to
separately re-derive `subpriority`/`sSpriteOrder` history, matching by
`(y,x,tileNum,objMode,paletteNum)` against `gSprites[5]`/`gSprites[7]`'s
own embedded `oam` struct settles it by direct observation.

**Result, RAM ticks 12367-12373 (the whole overlap window), matched by
attribute against every `oamBuffer` entry**: slot 7 (the clone at offset
`(24,6)`) sits at final OAM index **10** for its ENTIRE active lifetime in
this window; the real sprite (slot 5) sits at index **11** (12369-12372) or
**12** (12367, briefly outranked by the OLD slot-4 clone too) or **10**
(12373, after slot 7 dies). **The clone's index is NEVER higher than the
real sprite's, at any sampled tick - stable, does not flip.** Per GBATEK
("same-priority sprites: lower OAM number displayed on top"), **the clone
wins the tie throughout the whole window**, not the real sprite - the
"real always wins" rule this doc's own prior section falsified is replaced
by "the clone (lower final OAM index) wins."

A THIRD sprite was found in the same RAM probe, not previously accounted
for: slot 4 (the OTHER `AnimTask_TraceMonBlended` clone) is destroyed at
RAM 12368-12369, then **recreated at RAM 12370 landing at the exact same
offset as the real sprite, `(0,0)`** - i.e. pixel-for-pixel co-located with
slot 5 for the rest of the window. Its own OAM index (12 at 12371-12372,
11 at 12373) is always numerically BELOW slot 5's precedence (i.e. slot 5
beats it, or ties it, at their shared footprint) - since slot 4 is
opaque-identical to slot 5's own silhouette, it can **never** win a single
visible pixel regardless of exact ordering (whichever of {slot4,slot5}
"wins" produces indistinguishable output at every pixel they both cover,
since they're the same source tile). Confirmed a genuine third sprite, not
a red herring worth modeling separately - it is a structural no-op.

### Mission A2: the blend, solved pixel-exact (0 tolerance) for the plain (non-darken) window

With the winner pinned (clone, slot 7), solved target2 empirically against
6 sample pixels across renders 12371-12373 (`tools/compare/scratch/
aerialace-blend-solve.ts`). The FIRST attempt (target2 = an oracle pixel
sampled from a pre-move "baseline" tick, 12355) systematically failed -
root cause: Pidgeotto's own SETTLED position is `(144,19)`, the SAME corner
its idle/pre-move sprite already occupies, so every candidate "clean"
oracle frame in this trace is already contaminated by the real sprite's
own texel at exactly these pixels - there is no oracle frame in this
window where these specific pixels are BG-only. Fix: computed target2
directly from the static-field asset (`battle-bg.json`), re-deriving
`staticBgPixel`'s own formula (`battleScene.ts:1205`) read-only in the
scratch script (not imported - not exported, and this lane doesn't touch
`src/`), confirming first that `shiftY`/`fadeY` are both 0 by turn 10
(`rockSlideBg3Y`/`turn5BgFadeY` both hang off turn 5's own press tick and
have long since fallen outside their tables' active ranges, returning
their `0` defaults) - so the formula reduces to a direct tilemap lookup at
`(screenX, screenY)`.

**predicted = `Math.min(255, Math.floor((winnerTexel_8bit*eva +
target2_8bit*evb) / 16))`, target2 = the static-field pixel (undarkened),
`eva=12, evb=8`** (`BLDALPHA=0x080c`, RAM-confirmed, matches `docs/battle-
scene-notes.md`'s own PROGRESS #68 8-bit-domain formula) - **exact (0
tolerance) at all 6 sample pixels, at renders 12371, 12372, AND 12373**
(18/18 pixel-tick pairs, `tools/probe/verify-turn10-aerialace.ts`'s own new
checks below). The real sprite (and the co-located, structurally-hidden
slot 4) contribute **nothing** to the blend - consistent with GBA/mGBA's
OBJ layer outputting exactly one color per pixel (a losing same-layer
sprite is never a valid blend target 2; target2 can only be a genuinely
lower layer - here, the field).

**Fix shape for the engine step**: at true real+clone overlap pixels
(where BOTH texels are opaque), the CLONE wins outright (draw it LAST, on
top, wherever its own texel is opaque) and its blend must be computed
against the FIELD-ONLY color at that pixel (i.e. compute/composite the
clone's blended output BEFORE drawing the real sprite - not "over fb" once
the real sprite is already painted there, and not using the real sprite's
own color as target2). The real sprite draws PLAIN/opaque everywhere the
clone's own texel is transparent. This is the literal opposite of rung
(a)'s own QUICK_ATTACK-style fix ("real always wins, drawn last") - the
two windows are NOT the same rule; whichever mechanism reintroduces this
render code must special-case AERIAL_ACE's own clone-wins order rather
than copy QUICK_ATTACK's.

### Mission A2: the darken-plateau residual (12368-12370) - NOT closed, an honest gap

Applying the SAME rule (clone wins, blend against field) with BOTH
inputs' obvious darkened analogues (`BlendPalette` toward black at the
already-pinned coefficient 10, both the clone's own texel AND the field
target2) does **not** reach 0 tolerance - predicted is systematically a
few units low across R/G/B at every sampled darken-window pixel (e.g.
`(181,41)`: predicted `(106,59,54)` vs oracle `(100,57,51)`, off by
`(6,2,3)`). A brute-force integer sweep of independent darken coefficients
for the texel vs. the field target2 (0-16 each, `/tmp/darken-brute.mjs`,
not committed - ad hoc, superseded by this paragraph) found NO integer
coefficient pair reaching 0 total error across 3 sample pixels (best:
texel-coeff 10/field-coeff 11, total error 25 across 3 pixels' RGB, still
off by 2-5 per channel) - the two-independent-flat-coefficients model
itself is likely wrong for this window, not just mis-tuned. Time-boxed
(Mission A2's own ~20-minute budget, already exceeded solving the winner +
plain-window blend) rather than curve-fit further. **Named as the one
remaining gap**: the darken window likely needs its OWN RAM-read (the
actual post-darken OBJ palette bytes at `OBJ_PLTT + paletteNum*32 +
2*idx`, not an assumed `BlendPalette(plain, BLACK, 10)` re-derivation) to
close - not attempted this session, the asset-only/formula-only approach
that closed the plain window doesn't extend cleanly here.

### Mission B: the 12371-12437 flicker - SOLVED (RAM-pinned, pixel-corroborated, reuse verdict)

RAM-probed (`tools/probe/dump-aerialace-anim.py`, RAM 12371-12437, reused
verbatim). Checked the named family FIRST per the brief: this is genuinely
**Onix's own post-hit flicker** (slot 6, `invisible` flag toggling) - NOT
mechanism 2's shake (that's `y2` wiggling while `invisible` stays
wide-true the whole time, a already-documented and unrelated span that
ends by RAM 12386, well before this flicker starts).

**Table** (RAM ticks, `gSprites[6].invisible`):
- Pre-flicker: `invisible=false` from RAM 12386 (mechanism 2's own end)
  through RAM 12406.
- 4 blocks of 4-invisible/4-visible, period 8, starting RAM **12407**:
  `[12407-12410]`, `[12415-12418]`, `[12423-12426]`, `[12431-12434]`
  invisible; visible in the 4-tick gaps between and after.
- Fully done (visible) from RAM 12435 onward, through the window's own end
  (12437).

This is **structurally identical** to the ALREADY-WIRED `turn9Ep2OnixInvisible`
(`battleScene.ts:7858-7867`: `RENDER_LAG=1, PERIOD=8, ON_TICKS=4,
TOTAL_TICKS=32`, `n%PERIOD<ON_TICKS` gated by `0<=n<TOTAL_TICKS`) - the
ONLY difference is the anchor delay (turn 9's own `START=87` vs. this
window's own `102`, i.e. RAM tick `pressTick+102` vs. `pressTick(10871)
+87`, both turns' own press ticks). This is the SAME hit-flash flicker
task, re-triggered for turn 10's own hit, not a new mechanism - confirms
the brief's own "check the known family first" instinct, and directly
resolves prior probes' warning about a naive short probe missing the 4th
block (this session's own probe intentionally covered the full 12371-12437
span up front, catching all 4 blocks including the 4th).

**Render lag**: ordinary **+1** (pixel-bisected: RAM-invisible block 1 is
`12407-12410`, first pixel-visible diff in Onix's own box is render
`12408`, back to flat at render `12412` - exactly RAM+1 at both edges,
confirmed identically at blocks 2 and 4 too). Same lag class as mechanism
2's own shake, NOT mechanisms 1/3's +2.

**Reuse-vs-new verdict**: REUSE. `turn9Ep2OnixInvisible`'s own shape
(period 8, on 4, total 32, lag +1) reproduces this window exactly once its
hardcoded `START` constant is parameterized per-turn (it's currently a
turn-9-specific literal, not a function argument) - the underlying game
mechanism is almost certainly the identical pokeemerald hit-flash task,
just re-anchored to turn 10's own press tick. No new render logic needed,
only a generalized delay constant when this gets wired.

**Not checked this session** (named gap, not a guess): the brief's own
"player-healthbox wobble" companion (ENDEAVOR §15f's own precedent) was
not independently probed in this window - time-boxed after the flicker's
own table converged cleanly. Whoever wires rung (c) should RAM-check
`gTasks[]`/`gSprites[].data[]` for a healthbox `y2` wobble concurrent with
this flicker before assuming there isn't one.

### Verification (this update)

`tools/probe/verify-turn10-aerialace.ts` extended with 3 new pixel-exact
blend checks (Mission A2, renders 12371-12373, 6 sample pixels each) and
14 new pixel-onset/offset checks (Mission B, the flicker's own 4-block
window plus its own local baseline) - **34/34 PASS** (22 prior + 12 new,
one count fixed mid-session: an initial off-by-one at the 4th block's own
render-lag boundary, render 12435 still ON not OFF, caught by the FIRST
run and corrected before the "twice, identical" pass below), run twice
back to back, identical results. `npm test` and `npm run build` unchanged-
green (no `src/` changes this session - worktree PROBE lane). New
committed tooling: `tools/probe/dump-aerialace-oam.py` (the `gMain.
oamBuffer` RAM reader Mission A2's step 1 used), `tools/compare/scratch/
aerialace-blend-solve.ts` (the blend-formula solver Mission A2's steps 2-3
used, reusable for whoever picks up the darken-window gap),
`tools/compare/scratch/aerialace-flicker-lag.ts` (Mission B's own render-
lag bisector).

### Updated gap accounting for rungs (b)/(c)/(d)

- **Rung (b)**: the plain-overlap rule (renders 12370-12373 outside the
  darken plateau) is now SOLVED pixel-exact - "clone wins outright at true
  overlap, blends against the field, real sprite shows only where the
  clone's own texel is transparent." The darken-plateau's own residual
  (12368-12370) is the ONE remaining named gap - likely needs the OBJ
  palette's own actual post-darken RAM bytes rather than a re-derived
  `BlendPalette` formula (see Mission A2's own section above). Still not
  0-diff; `turn10-aerialace.json`'s capture window is unchanged (through
  12367) pending that close.
- **Rung (c)** (the 12371-12437 flicker): SOLVED - Onix's own post-hit
  flicker, a REUSE of `turn9Ep2OnixInvisible`'s own shape with a
  generalized delay constant, RAM+pixel corroborated end to end. The
  player-healthbox-wobble sub-question is unchecked (named above, not
  assumed absent).
- **Rung (d)** (turn 12's +2068 mirror): blocked transitively on (b)'s
  darken-window close, unchanged otherwise.

## 2026-07-21 PROBE (rule-transfer session): Mission A CLOSES the darken-
plateau — a formula-only fix, no RAM table needed at engine time

Worktree PROBE step (no `src/` changes), tasked with transferring the
plain-overlap blend rule (solved above, Mission A2) to the one remaining
named gap: the darken-plateau residual (render 12368-12370), which the prior
session left off-by-several-units/channel using a `BlendPalette(plain,
BLACK, 10)` re-derivation of the darkened colors.

**Named instrument run first, per the brief**: new RAM probe
`tools/probe/dump-aerialace-darken-palette.py` reads `gPlttBufferFaded` (the
live palette RAM mirror) for BOTH Pidgeotto's own OBJ bank (dynamically
confirmed bank **1** for both slot 5 and slot 7 — same bank, as expected for
a same-species clone) and the BG hardware bank the static field's local
palette index 0 actually resolves to (bank **2** — `tools/extract/
extract-battle-bg.ts:86`'s own `normalizePaletteOffset(..., 2)`, confirmed
by cross-checking this probe's own baseline-tick readback against the
committed asset JSON byte-for-byte, both `PIDGEOTTO.palette` and
`battle-bg.json`'s own `palette[0]`).

**A genuine NEW lag class found**: `gPlttBufferFaded`'s software write at
RAM tick T is NOT visible in the rendered pixel until render tick **T+1** —
distinct from (and easily confused with) the prior session's "palette-RAM
visibility has ZERO render lag" finding, which compared the palette-blend
TASK's own `data[]` state-machine tick against a DIRECT HARDWARE PALRAM read
(`0x05000200`/`0x05000000`) at the same tick — the hardware register (what
actually feeds the pixel pipeline) is a full tick BEHIND the software mirror
this probe reads, because the mirror is written eagerly during the CPU
frame but only DMA'd to hardware at the next vblank — the exact same
"software buffer precedes hardware/pixels by one tick" shape `gMain.
oamBuffer` vs. hardware OAM already established for Mission A2's own OAM
read. Confirmed directly: this probe's own tick 12367 read is ALREADY
darkened while the prior session's hardware-PALRAM table shows baseline at
12367 (darkening starts hardware/pixel-side at 12368) — a full-tick,
RAM-tick-numbered discrepancy between the two buffers, not a bug in either
reading.

**Re-ran the overlap-blend solve (Mission A2's exact formula, `predicted =
floor((winnerTexel*eva + target2*evb)/16)`, `eva=12,evb=8`) at the same 6
sample pixels used for the plain window, feeding it render tick T's palette
from RAM tick T-1** (`tools/compare/scratch/aerialace-darken-solve.ts`):
**18/18 pixel-tick pairs (6 pixels × renders 12368/12369/12370) match
EXACTLY (0 tolerance)** using the RAM-read bytes directly. Example:
`(181,41)` at render 12368 — winner (clone) texel from RAM `(74,16,8)`,
field from RAM `(90,90,90)`, predicted `(100,57,51)` = oracle `(100,57,51)`
exactly (the prior session's own `BlendPalette`-recompute attempt at this
exact pixel got `(106,59,54)`, off by `(6,2,3)`).

**Root cause of the prior recompute's failure, isolated (not just patched
over by reading RAM)**: `BlendPalette` operates on the **native 5-bit BGR555
palette components**, not on the already-8-bit-expanded asset/RGB colors —
hand-verified bit-for-bit against the RAM dump (e.g. OBJ palette idx 8:
unfaded raw 5-bit `(26,6,3)`, `BlendPalette`'s own formula
`c5 + ((0-c5)*10)>>4` gives `(9,2,1)` — EXACT match to the RAM-read faded
5-bit value; the same formula applied directly to the 8-bit-expanded
`(214,49,24)` gives `(80,18,9)`, close but NOT equal to the real 8-bit
result `(74,16,8)` — this multi-unit gap is exactly the "off by several
units/channel" symptom the prior session hit and couldn't close by
adjusting the coefficient, because the coefficient (10) was never the
problem — the bit domain was).

**This closes with a FORMULA-ONLY fix, no RAM table needed at engine
implementation time**: since every asset color here is an exact 5-bit
expansion (`(v5<<3)|(v5>>2)`), inverting via plain integer `>>3` recovers
the original 5-bit value losslessly (the low 3 bits an expansion adds are
always `< 8`, so dividing by 8 discards exactly them, verified on every
sampled palette entry). `darken5(c, coeff) = expand(to5bit(c) +
((0-to5bit(c))*coeff)>>4)`, applied to BOTH the clone's own winner texel and
the static field pixel (both via the SAME asset-only lookups the plain
window already uses — `pidgeotto.palette`/`battle-bg.json`'s own
`palette[0]`, no RAM, no oracle sampling), then blended with the
already-established `eva=12,evb=8` 8-bit formula: **18/18 pixel-tick pairs
match EXACTLY**, cross-verified independently from the RAM-read version
above and reported separately in
`tools/compare/scratch/aerialace-darken-solve.ts`'s own output.

**Fix shape for the engine step**: at the darken plateau, apply the SAME
winner/blend rule as the plain window (clone wins outright wherever its
texel is opaque, blends against the field, real sprite contributes
nothing) — the ONLY change from the plain-window formula is that BOTH the
winner's texel color and the field's color must be darkened via
`darken5(c, 10)` (5-bit-domain `BlendPalette`, then re-expanded to 8-bit)
BEFORE the `eva=12/evb=8` blend, not via a naive 8-bit-domain
`BlendPalette` re-derivation. This closes **rung (b) completely** —
`turn10-aerialace.json`'s capture window can now be extended through at
least render 12373 (the whole overlap+darken span this dossier has
solved), pending the actual engine wiring (out of scope for this worktree
lane).

### Verification

`tools/probe/verify-turn10-aerialace.ts` extended with 3 new checks (the
darken-plateau blend, renders 12368/12369/12370, 6 sample pixels each,
formula-only — no RAM dependency in the committed check itself) —
**49 PASS, 0 FAIL**, run twice back to back, identical. `npm test` and
`npm run build` unchanged-green (no `src/` changes this session). New
committed tooling: `tools/probe/dump-aerialace-darken-palette.py` (the
`gPlttBufferFaded` OBJ+BG bank reader this session's own root-cause
isolation used), `tools/compare/scratch/aerialace-darken-solve.ts` (both
the RAM-read cross-check AND the formula-only reproduction, in one script).

### Updated gap accounting

- **Rung (b)**: CLOSED. Both the plain-overlap window (Mission A2) and the
  darken-plateau window (this session) are now solved pixel-exact with one
  unified rule. No open gap remains for rung (b)'s own blend mechanics —
  only the actual `src/engine/` wiring is outstanding (out of scope here).
- **Rung (c)/(d)**: unchanged from Mission A2's own accounting above.

## 2026-07-21 S7 engine step: ALL rungs WIRED and CLOSED (turn-10 window gapless 12345-12437, turn-12 mirror gapless over the +2068 shift) — one genuine new finding, one falsified transfer

Engine step (not a PROBE lane) — every rule this doc pinned above was applied
as-is; see `docs/battle-turn-notes.md` §51 for the full writeup and pixel
counts. Summary for this doc's own record:

- **The OVERLAP RULE transferred exactly as solved for slot 7** (wins its
  OAM tie unconditionally, blends against the field, drawn last) — `npm run
  compare` 0-diff at every render 12368-12373 once wired.
- **Slot 4 did NOT follow the same unconditional rule** — falsified both
  directions by `npm run compare` (always-wins regresses 12363-12367,
  always-loses mismatches 12368-12369). The actual shape: loses its whole
  life except the VERY LAST tick (render 12368), where it flips to winning,
  matching slot 7's own formula exactly at that one tick. Not predicted by
  this doc's own prior sessions (which only examined slot 4's OAM order
  during its SECOND life, co-located with the real sprite) — a genuinely new
  finding, RAM-unconfirmed (pixel-only), named here for whoever next probes
  `gMain.oamBuffer` at RAM 10939-10940-equivalent ticks.
- **The DARKEN RULE (5-bit-domain `BlendPalette`) needed zero changes** —
  the engine's own pre-existing `darkenPaletteToward10`/`blendComponentToward`
  helper was ALREADY in the correct 5-bit domain (it long predates this
  session); only the SCRATCH probe script's own separate, simplified
  reimplementation had the 8-bit-domain bug this doc's own prior section
  root-caused. Wiring was a pure no-op on the darken formula itself.
- **Turn 12's own mirror needed active wiring**, not just verbatim reuse:
  mechanism 4's darken, the flicker, and its healthbox-wobble companion
  (below) had never been threaded through `drawTurn12FieldBase`/
  `drawTurn12AerialAceWindow` at all — added this session, confirming the
  "+2068 bit-exact re-anchor" characterization extends to these three
  mechanisms too once wired.

**Verification**: `tools/probe/verify-turn10-aerialace.ts` unchanged, still
**49/49**. `turn10-aerialace.json` now gapless **12345-12437, 93/93 0-diff**.
`turn12-aerialace.json` now gapless over its own +2068-shifted equivalent,
**131/131 0-diff**. `npm test` **993/993**, `npm run build` green.

### The flicker's own companion, finally probed: a player-healthbox `y2` wobble (ENDEAVOR §15f) — SOLVED via direct oracle test, not RAM

The prior session's own Mission B named this as unchecked ("the brief's own
'player-healthbox wobble' companion... was not independently probed in this
window"). Extending `turn10-aerialace.json` to gapless coverage exposed a
real, constant (not flicker-coupled) 1580px residual at renders 12407-12426
— `menuHealthboxPlayer`'s own asset bbox `(127,74)-(229,109)` matches it
pixel-for-pixel. Reused `turn9Ep2HealthboxWobbleY2` (turn 9's own already-
solved ±1 alternation, 20 ticks) generalized the same way as the flicker,
tested `start=101` (one tick before the flicker's own 102, mirroring turn
9's own 86-vs-87 relative offset) directly against the oracle — **closes to
0 diff exactly**, confirmed by `npm run compare`, not derived from the
ENDEAVOR precedent's shape alone. This companion mechanism was NOT
previously RAM-probed for turn 10 — the fix is empirically validated (both
timing and the fact that it's needed at all), not RAM-grounded; a future
session could still RAM-confirm `gTasks[]`/`gSprites[].data[]` directly if
that matters for confidence, but is not required — the pixel match is
already exact across the whole 20-tick window at every sampled pixel.
