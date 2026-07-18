# Send-out assets: particle burst, ball-open frame, materialize tables

S6 groundwork (extraction-only worktree lane). The S5/S6 send-out scout
flagged three assets as missing for the send-out window (ticks ~1464-1520 of
`tools/compare/traces-groundtruth/battle1-intro.json`'s OPPONENT send-out):
the ball-open particle-burst sprite sheet, the remaining pokeball open
frame(s), and the two numeric tables that drive the "materialize" effect
(mon fades from a flat tint to its true colors while scaling up from tiny).
This doc covers all three: loaders, palette tags, OAM shapes, the real
call chain, and oracle-pixel verification. **No engine code was written** -
this is extraction + evidence only, for whatever engine slice implements the
send-out window next.

Extractor: `tools/extract/extract-battle-anim-assets.ts`. Outputs:
`src/assets/gen/battle-anim-particles.json`,
`src/assets/gen/battle-anim-ball-open.json`,
`src/data/gen/battle-anim-tables.json`. Run with
`node --experimental-strip-types tools/extract/extract-battle-anim-assets.ts`.

All source cites are `reference/pokeemerald/<path>`.

## 0. The real call chain

Every mechanism below fires from the same function,
**`SpriteCB_ReleaseMonFromBall`** (`src/pokeball.c:750-824`) - the sprite
callback the ball sprite is switched to (from `SpriteCB_OpponentMonSendOut`
after its 16-tick delay, `src/pokeball.c:991-1002`, or the player-side
equivalent) once the ball actually opens. This is the real *battle*
send-out path; it is **not** the same as `HandleBallAnimEnd`'s sibling path
(used by the ball-*throw*/capture animation) or `SpriteCB_PokeballReleaseMon`
(the Birch-intro / trade-received variant) - both exist in the same file and
are easy to conflate, but neither runs during an ordinary battle send-out.

```c
static void SpriteCB_ReleaseMonFromBall(struct Sprite *sprite)
{
    ...
    StartSpriteAnim(sprite, 1);                                    // :755 - ball -> "open" anim (§2)
    ballId = ItemIdToBallId(GetBattlerPokeballItemId(battler));
    AnimateBallOpenParticles(sprite->x, sprite->y - 5, 1, 28, ballId); // :757 - particle burst (§1)
    sprite->data[0] = LaunchBallFadeMonTask(TRUE, sprite->sBattler, 14, ballId); // :758 - fade color (§3a)
    sprite->callback = HandleBallAnimEnd;
    ...
    StartSpriteAffineAnim(&gSprites[gBattlerSpriteIds[sprite->sBattler]], BATTLER_AFFINE_EMERGE); // :815 - scale-in (§3b)
    ...
}
```

All three effects start on the *same* tick. Oracle-confirmed: that tick is
**1480** in the groundtruth trace (the ball's last closed-frame tick is
1479; particles/scale-in/fade are all first visible starting 1480-1481 -
see §4).

## 1. Particle burst (`battle-anim-particles.json`)

**Loaders** (BALL_POKE only - every non-special ball reuses the same tiles,
just a different palette *tag* bound to the identical `gBattleAnimSpritePal_
CircleImpact` source, so BALL_POKE's case fully covers the tile data other
balls would also use):

| what | value | source |
|---|---|---|
| tile gfx | `gBattleAnimSpriteGfx_Particles` = `graphics/battle_anims/sprites/particles.png` (8x64px, 1 col x 8 rows of 8x8) | `src/graphics.c:467` |
| tile sheet entry | `sBallParticleSpriteSheets[BALL_POKE] = {gBattleAnimSpriteGfx_Particles, 0x100, TAG_PARTICLES_POKEBALL}` (0x100 bytes / 32B-per-4bpp-tile = 8 tiles) | `src/battle_anim_throw.c:145` |
| palette | `gBattleAnimSpritePal_CircleImpact` = `graphics/battle_anims/sprites/circle_impact.png`'s **embedded palette** (its own 8x8 pixel content is unused - only the PLTE) | `src/graphics.c:470` |
| palette entry | `sBallParticlePalettes[BALL_POKE] = {gBattleAnimSpritePal_CircleImpact, TAG_PARTICLES_POKEBALL}` | `src/battle_anim_throw.c:161` |
| sprite template | `oam=&gOamData_AffineOff_ObjNormal_8x8, anims=sAnims_BallParticles, affineAnims=gDummySpriteAffineAnimTable, callback=SpriteCallbackDummy` | `src/battle_anim_throw.c:261-269` |
| OAM shape | `SPRITE_SHAPE(8x8)`, `SPRITE_SIZE(8x8)`, `ST_OAM_AFFINE_OFF`, 4bpp, priority 2 | `src/data/battle_anim.h:1-13` |
| anim selection | `sBallParticleAnimNums[BALL_POKE] = 0` -> `sAnims_BallParticles[0] = sAnim_RegularBall` | `src/battle_anim_throw.c:171-179, 217-225, 229` |
| spawn/anim task | `sBallParticleAnimationFuncs[BALL_POKE] = PokeBallOpenParticleAnimation` | `src/battle_anim_throw.c:245, 1599-1637` |

`sAnim_RegularBall` (extracted verbatim as `regularBallAnim` in the JSON):
tiles **0, 1, 2, 0(hFlip), 2, 1**, one tick each, then loops (`JUMP(0)`) - a
fast 6-frame "twinkle." This is genuine source data (not derived timing),
safe to extract without implementing the surrounding engine.

**Mechanism, documented but NOT implemented** (for whichever slice wires
this up next): `AnimateBallOpenParticles` (`:1577-1590`) creates a task and
plays `SE_BALL_OPEN`. `PokeBallOpenParticleAnimation` (`:1599-1637`) spawns
one particle sprite per tick for 16 ticks, each at the *same* (x, y) - the
ball's position, offset y-5 - with `data[0] = (tick % 8) * 32` (a GBA angle
in 1/256ths, 8 directions at 45 deg apart, two particles per direction over
the 16 spawn ticks). `PokeBallOpenParticleAnimation_Step2` (`:1651-1657`)
then moves each particle via `Sin(angle, radius)` / `Cos(angle, radius)`
with `radius` incrementing by 2 every tick until it hits 50 (25 ticks),
then destroys the sprite - the classic expanding radial "starburst." None of
this trig/spawn-schedule logic was reimplemented here; only the static tile
sheet, palette, OAM shape, and BALL_POKE's own anim-frame table were
extracted.

## 2. Ball open frame(s) (`battle-anim-ball-open.json`)

`graphics/balls/poke.png` (16x48px = 2x6 tiles) is `gBallGfx_Poke`'s source
(`src/data/graphics/pokeballs.h:1-2` - tiles AND palette both come from this
one PNG, unlike §1's split-source particles). It's laid out as **3 frame
slots** of 16x16px (2x2 tiles) each:

- **slot 0** (rows 0-1, tile offset 0): the closed ball. Already committed
  as `summary-ball.json` for the caught-ball icon
  (`tools/extract/extract-summary-screen.ts:174-190`) - **not touched by
  this extractor.**
- **slot 1** (rows 2-3, tile offset 4): the "open" frame - the two ball
  halves visibly separated, dark interior, white highlight. Newly extracted
  here.
- **slot 2** (rows 4-5, tile offset 8): **entirely blank** - every one of
  its 128 source pixels is palette index 0. Verified by direct pixel scan
  of the source PNG (0 non-zero indices across all 4 tiles). Extracted
  anyway, as an explicit empty frame, rather than silently omitted.

`gBallSpriteTemplates[BALL_POKE]` uses `oam = &sBallOamData` (`SPRITE_SHAPE
(16x16)`, `SPRITE_SIZE(16x16)`, `ST_OAM_AFFINE_DOUBLE`, 4bpp, priority 2 -
`src/pokeball.c:92-104, 205-216`) and `anims = sBallAnimSequences`
(`:153-163`). `SpriteCB_ReleaseMonFromBall`'s `StartSpriteAnim(sprite, 1)`
(`:755`) selects `sBallAnimSeq1` (`:139-144`):

```c
static const union AnimCmd sBallAnimSeq1[] = {
    ANIMCMD_FRAME(4, 5),   // slot 1 ("open"), held 5 ticks
    ANIMCMD_FRAME(8, 5),   // slot 2 (blank), held 5 ticks
    ANIMCMD_END,           // holds blank thereafter
};
```

So the ball visibly opens for 5 ticks, then goes blank for 5 more before
`HandleBallAnimEnd` (`:842-869`) marks it `invisible` and eventually
destroys the sprite once both it and the mon's affine-emerge animation have
ended.

## 3. Materialize numeric tables (`battle-anim-tables.json`)

### 3a. `ballOpenFadeColor` - the flat-tint fade color

```c
const u16 gBallOpenFadeColors[] = {
    [BALL_POKE] = RGB(31, 22, 30),   // src/battle_anim_throw.c:372
    ...
};
```

`RGB()` is the standard GBA macro over already-5-bit channel values (not
8-bit reference-art needing `gbaColor.ts`'s `to5Bit()` inverse - this constant
*is* the 5-bit value already). `LaunchBallFadeMonTask` (invoked at
`src/pokeball.c:758`) `BlendPalette()`s the mon's whole palette toward this
color, starting at coefficient 16 (fully blended - the mon renders as a flat
silhouette of this one color) and ramping the coefficient back down to 0
(true colors restored) as the mon emerges (`BlendPalette` call sites:
`src/battle_anim_throw.c:2045, 2050, 2066, 2094`).

Extracted `rgb8` value: `expand5to8(31,22,30)` = **(255, 181, 247)**, via
`gbaColor.ts`'s `expand5to8` - the same 5->8-bit convention the oracle's own
mGBA framebuffer uses (ROADMAP.md Domain notes, "Color pipeline").

### 3b. `affineEmerge` - the scale-in step table

```c
static const union AffineAnimCmd sAffineAnim_Battler_Emerge[] = {   // src/data.c:144-149
    AFFINEANIMCMD_FRAME(0x28, 0x28, 0, 0),
    AFFINEANIMCMD_FRAME(0x12, 0x12, 0, 12),
    AFFINEANIMCMD_END,
};
```

Selected via `BATTLER_AFFINE_EMERGE` (`src/data.c:201`) by
`StartSpriteAffineAnim(mon, BATTLER_AFFINE_EMERGE)` at `src/pokeball.c:815`
(same `SpriteCB_ReleaseMonFromBall` as everything else in this doc).

**Format** (documented for the future engine slice, not implemented here -
`src/sprite.c`): each `AFFINEANIMCMD_FRAME(xScale, yScale, rotation,
duration)` drives a per-matrix running accumulator, reset to a neutral
**0x100 (256)** when the anim starts (`AffineAnimStateStartAnim`,
`src/sprite.c:1260-1269`). The final OAM matrix scale is
`0x10000 / accumulator` (`ConvertScaleParam`, `src/sprite.c:1316-1319`) - so
a **bigger** accumulator means a **bigger** apparent sprite (inverse
relationship, since the matrix value is a source-per-screen-pixel step).
`duration == 0` means "apply once, **absolute**" (overwrite the
accumulator outright - `ApplyAffineAnimFrame`'s duration-0 branch calls
`ApplyAffineAnimFrameAbsolute`, `src/sprite.c:1330-1345`); `duration == N > 0`
means "add once per tick, **relative**, for N ticks"
(`ApplyAffineAnimFrameRelativeAndUpdateMatrix`, `src/sprite.c:1302-1314`).

So `sAffineAnim_Battler_Emerge` reads as: **tick 0** - accumulator jumps
straight to `0x28` (40, ~15.6% of neutral = the mon's first visible instant,
already tiny) - then **12 more ticks** - `+0x12` (18) each tick, reaching
`40 + 12*18 = 256` (exactly neutral) on the 12th, then holding there
(`ANIMCMD_END`). A pure grow-from-tiny-to-full-size ramp over 13 total ticks
(1 absolute + 12 relative).

## 4. Verification

Probe trace: `tools/compare/traces-groundtruth/battle1-intro.json`'s
`segments` (unchanged) replayed with `captureFrames` densified to every tick
1460-1524 (scratch trace, not committed - `bin/oracle run` against the
existing groundtruth's own segments reproduces the identical send-out
deterministically). All screen coordinates below are oracle-capture pixel
coordinates (240x160), found by brute-force offset search for the extracted
tile+palette bitmap's minimum-error position within a coarse window - **not**
a placement formula (battler/OAM screen-position math is out of scope for
this extraction-only step; that's the future engine slice's job).

**Ball open frame (§2), using the actual committed `battle-anim-ball-open.json`:**
- slot 0 (closed, already `summary-ball.json`, re-checked here for
  continuity): **112/112 non-transparent px exact**, screen (168,56),
  ticks 1478-1479 (both frames identical, sha-stable).
- slot 1 (open, newly extracted): **122/122 non-transparent px exact**,
  screen (168,56), tick **1480 only** - the single clean tick before
  particles/the emerging mon start overlapping that region (by 1481 the
  error jumps from 0 to thousands as particle/mon pixels intrude; slot 1's
  own *content* is still byte-correct, just occluded from 1481 on).
- slot 2 (blank): unverifiable by pixel diff (0 non-transparent px by
  construction - confirmed instead by direct source-PNG index scan, see §2).

**Particle burst (§1), using the actual committed `battle-anim-particles.json`:**
one particle sprite's first three animation ticks, tracked before other
particles/the mon occlude it:
- tile 0: **14/14 px exact**, screen (172,55), tick 1481.
- tile 1: **12/12 px exact**, screen (172,55), tick 1482.
- tile 2: **12/12 px exact**, screen (172,57), tick 1483.
- Total: **38/38 px exact** across the 3 ticks. (Only one of the ~16
  simultaneously-spawning particles was isolated this way; a full-scene
  particle-field verification is NOT-REACHED - see below.)

**Materialize fade color (§3a):** scanned a 90x80 region for exact RGB
(255, 181, 247) matches across ticks 1481-1499:

| tick | exact px | tick | exact px |
|---|---|---|---|
| 1485 | 386 | 1492 | 1604 |
| 1486 | 507 | 1495 | 1612 |
| 1488 | 775 | 1498 | 1586 |
| 1490 | 1152 | 1499 | 1605 |

Growing then plateauing around ~1600px from tick 1492 on (matches §3b's
scale-in completing at that same tick - the mon's apparent area stops
growing once the affine-emerge anim ends, while the fade coefficient is
still separately ramping down toward true color over further ticks past
1499, out of this window). Zero mismatches anywhere in the scanned region
at every sampled tick - every "exact" count above is a true, not
approximate, RGB match.

**Materialize affine-emerge table (§3b):** cross-checked via the exact-color
pixel silhouette's bounding-box width (a discrete, source-independent
signal for the scale-in *timing*, since directly reproducing the OAM
matrix math is out of scope here):

| tick | width (px) | tick | width (px) |
|---|---|---|---|
| 1481 | 15 | 1489 | 49 |
| 1483 | 23 | 1491 | 57 |
| 1485 | 31 | **1492** | **62 (plateau starts)** |
| 1487 | 41 | 1499 | 62 (unchanged) |

Width grows monotonically for **exactly 12 ticks** (1481 through 1492
inclusive) and is flat at every sampled tick from 1492-1499 - matching
`sAffineAnim_Battler_Emerge`'s `duration=12` step verbatim (growth starts
the tick after the tick-0 absolute jump, i.e. 1480+1=1481, and completes
12 ticks later at 1492). This confirms the table's *duration* field against
real behavior; it does not independently confirm the exact `0x28`/`0x12`
magnitudes beyond "starts small, ends at exactly neutral 12 ticks later,"
since recovering the true OAM matrix scale from a rasterized, palette-blended
silhouette's pixel width is not itself byte-exact - flagged honestly as the
one number in this doc verified by *timing* rather than *pixel* exactness.

## What remains unverified / explicitly out of scope

- Ball/particle/mon **screen placement formulas** (`GetBattlerSpriteCoord`,
  the mon sprite's own base position) - not derived or encoded; the (168,56)
  / (172,55) coordinates above are just where the pixel-diff search happened
  to land for this one send-out instance, not a general formula.
- The particle system's **spawn schedule and radial Sin/Cos motion**
  (`PokeBallOpenParticleAnimation`/`_Step1`/`_Step2`) - documented in §1 but
  not implemented or exhaustively pixel-verified across all ~16 particles;
  only one particle's first 3 ticks were isolated cleanly.
- The **BlendPalette coefficient ramp schedule** (`LaunchBallFadeMonTask`'s
  own task, not read here) - only the target color constant was extracted
  and confirmed as a real oracle pixel value, not the ramp's tick-by-tick
  coefficient curve.
- Non-`BALL_POKE` balls' particle anim variants (`sAnim_MasterBall` etc.) -
  out of scope; every Factory rental is sent out in `BALL_POKE`
  (`extract-summary-screen.ts:174-183`'s same reasoning applies here).
- `npm test` / `npm run build`: unaffected by this step (new files only, no
  engine wiring) - both stay green (see commit).
