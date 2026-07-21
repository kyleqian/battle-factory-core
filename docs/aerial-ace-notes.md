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

## Verification

`tools/probe/verify-turn10-aerialace.ts` (rerunnable PASS/FAIL script,
`node --experimental-strip-types tools/probe/verify-turn10-aerialace.ts`)
re-derives the slice sprite's slot/tileNum/x2y2 table and the palette-pulse
plateau window fresh against `battle1-turn10-dense.json`, asserting every
pinned constant in this doc against a live oracle run - the fix worker
should run this FIRST before implementing rung (b)'s render code, same
convention as `verify-turn9-postlunge.ts`.
