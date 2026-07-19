// Dev-time extractor for the send-out assets flagged missing by the S6
// send-out scout (docs/battle-anim-assets.md): the ball-open PARTICLE BURST
// sheet, the remaining POKEBALL OPEN FRAME(S), and the MATERIALIZE numeric
// tables (affine-emerge scale steps + BALL_POKE's fade-to-true-color RGB).
// All three are reached from `SpriteCB_ReleaseMonFromBall`
// (reference/pokeemerald/src/pokeball.c:750-824), the real send-out path
// for both `SpriteCB_OpponentMonSendOut` and `SpriteCB_PlayerMonSendOut_2`
// (as opposed to `HandleBallAnimEnd`'s sibling capture-throw path) - see the
// doc for the full call chain and oracle-pixel verification.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-anim-assets.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { expand5to8 } from "./gbaColor.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });
mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- (1) particles.png: ball-open particle burst sprite sheet --------------
//
// AnimateBallOpenParticles (battle_anim_throw.c:1577-1590), called from
// SpriteCB_ReleaseMonFromBall (pokeball.c:757) with ballId resolved from the
// battler's actual held ball. For BALL_POKE:
//   tiles:   sBallParticleSpriteSheets[BALL_POKE] = {gBattleAnimSpriteGfx_
//            Particles, 0x100, TAG_PARTICLES_POKEBALL} (battle_anim_throw.c:145)
//            -> gBattleAnimSpriteGfx_Particles = INCGFX_U32("graphics/
//            battle_anims/sprites/particles.png", ...) (src/graphics.c:467).
//            0x100 bytes / 32 bytes-per-4bpp-8x8-tile = 8 tiles, matching
//            particles.png's own 8x64px (1 col x 8 rows of 8x8) dimensions.
//   palette: sBallParticlePalettes[BALL_POKE] = {gBattleAnimSpritePal_
//            CircleImpact, TAG_PARTICLES_POKEBALL} (battle_anim_throw.c:161)
//            -> gBattleAnimSpritePal_CircleImpact = INCGFX_U32("graphics/
//            battle_anims/sprites/circle_impact.png", ".gbapal.lz")
//            (src/graphics.c:470) - a DIFFERENT source PNG supplies the
//            palette than the one supplying the tiles (same asset-vs-palette
//            split extract-battle-interface.ts already documents for
//            ball_display.png/down_arrow_alt.png) - circle_impact.png's own
//            8x8 pixel content is irrelevant here, only its embedded PLTE.
//   oam:     &gOamData_AffineOff_ObjNormal_8x8 (src/data/battle_anim.h:1-13)
//            - shape SPRITE_SHAPE(8x8), size SPRITE_SIZE(8x8), affine off.
//   anim:    sBallParticleAnimNums[BALL_POKE] = 0 -> sAnims_BallParticles[0]
//            = sAnim_RegularBall (battle_anim_throw.c:171-179): tiles
//            0,1,2,0(hFlip),2,1 each held 1 tick, then loops - a fast
//            6-frame "twinkle" cycle.
// Verified byte-exact against oracle pixels: see docs/battle-anim-assets.md
// (tile0 14/14px @ tick 1481, tile1 12/12px @ tick 1482, tile2 12/12px @
// tick 1483, all at screen (172,55)/(172,57) - a single particle's first 3
// animation ticks, before other particles/the emerging mon occlude it).
{
  const tilesImg = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "particles.png"));
  const paletteImg = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "circle_impact.png"));
  const { columns, rows, tiles } = sliceTiles(tilesImg);
  writeJson(join(ASSETS_GEN, "battle-anim-particles.json"), {
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    palette: paletteImg.palette,
    oam: { shape: "8x8", size: "8x8", affine: false },
    // sAnim_RegularBall (battle_anim_throw.c:171-179) - BALL_POKE's particle
    // animation (sBallParticleAnimNums[BALL_POKE] = 0). `tile` indexes this
    // sheet's 8 rows top to bottom; `hFlip` mirrors the tile horizontally.
    regularBallAnim: [
      { tile: 0, duration: 1, hFlip: false },
      { tile: 1, duration: 1, hFlip: false },
      { tile: 2, duration: 1, hFlip: false },
      { tile: 0, duration: 1, hFlip: true },
      { tile: 2, duration: 1, hFlip: false },
      { tile: 1, duration: 1, hFlip: false },
    ],
  });
}

// --- (2) poke.png + open.png: the ball-open frames --------------------------
//
// poke.png (graphics/balls/poke.png, 16x48 = 2x6 tiles) is gBallGfx_Poke's
// source (src/data/graphics/pokeballs.h:1-2), a 3-frame-slot sheet where
// each frame is a 16x16 (2x2 tile) block. Frame 0 (rows 0-1, tile offset 0 -
// the closed ball) is already committed as summary-ball.json for the
// caught-ball icon (extract-summary-screen.ts:174-190) - NOT touched here.
// SpriteCB_ReleaseMonFromBall's `StartSpriteAnim(sprite, 1)` (pokeball.c:755)
// selects sBallAnimSeq1 (pokeball.c:139-144):
//   ANIMCMD_FRAME(4, 5)  - tile offset 4 = rows 2-3 = frame slot 1 ("open")
//   ANIMCMD_FRAME(8, 5)  - tile offset 8 = rows 4-5 = frame slot 2
//   ANIMCMD_END
// Frame slot 2 (rows 4-5) IS all palette-index-0 in poke.png's own raw data -
// but that data is NEVER what's on screen there. `LoadBallGfx`
// (pokeball.c:1308-1332), called once when the ball sprite is created,
// unconditionally DMAs a SEPARATE graphic over that exact VRAM tile range for
// every non-Dive/Timer/Luxury/Premier ball (BALL_POKE included):
// `LZDecompressVram(gOpenPokeballGfx, OBJ_VRAM0 + 0x100 + var*32)` where `var`
// is the ball sprite's own tile-sheet start and `0x100` bytes = 8 tiles = the
// same offset `ANIMCMD_FRAME(8,...)` indexes into. `gOpenPokeballGfx` (pokeballs.h:37)
// is `graphics/balls/open.png` (16x16 = 2x2 tiles, its own file, never
// touched by earlier extraction) - a full round ball (red top / black band /
// white-gray bottom), NOT the "halves separated" look of frame slot 1. This
// was found by direct pixel-classifying the oracle's own diff at renders
// 1485-1490 (docs/battle-scene-notes.md §7.25): every mismatched pixel there
// is exactly `open.png`'s own palette (132,0,0 / 173,0,0 / 214,41,41 /
// 148,148,148 / 66,66,66), which poke.png's genuinely-blank slot 2 cannot
// produce - tracing `ANIMCMD_FRAME(8,...)`'s tile index back through
// `LoadBallGfx` found the runtime overwrite. So the ball sprite's 3 visible
// animation frames are: closed (summary-ball.json, unrelated extractor) ->
// "open" (poke.png rows 2-3, frame slot 1) -> "openFinal" (open.png,
// overwriting poke.png's own slot 2) -> destroyed. The two ball-open PNGs
// share one palette (poke.png's - confirmed by cross-checking open.png's
// indices against it: high opaque-pixel match against the oracle, the
// remaining diff fully explained by mechanism 4's tint compositing on top,
// same "occlusion, not a color bug" shape as §7.21's ball-corner residual).
// Verified byte-exact against oracle pixels: see docs/battle-anim-assets.md
// (frame slot 1, 122/122 non-transparent px exact @ tick 1480, screen
// (168,56) - the single clean tick before particles/the emerging mon start
// overlapping it).
{
  const image = decodeIndexedPng(join(REF, "graphics", "balls", "poke.png"));
  const { columns, rows, tiles } = sliceTiles(image);
  // rows 2-3 = frame slot 1 (tiles index 4-7, "open").
  const openTiles = tiles.slice(4, 8);
  const finalImage = decodeIndexedPng(join(REF, "graphics", "balls", "open.png"));
  const finalTiles = sliceTiles(finalImage).tiles;
  writeJson(join(ASSETS_GEN, "battle-anim-ball-open.json"), {
    frames: ["open", "openFinal"],
    tileset: {
      columns,
      rows: 4,
      tiles: [...openTiles, ...finalTiles].map((t) => [...t.pixels]),
    },
    palette: image.palette,
  });
}

// --- (3) materialize numeric tables -----------------------------------------
//
// (a) gBallOpenFadeColors[BALL_POKE] (battle_anim_throw.c:371-374) = RGB(31,
//     22, 30) - a 5-bit-per-channel GBA color constant (RGB() is the
//     standard `(r) | (g << 5) | (b << 10)` macro, values already 0-31, NOT
//     8-bit reference art needing gbaColor.ts's to5Bit()). LaunchBallFadeMonTask
//     (battle_anim_throw.c, invoked from SpriteCB_ReleaseMonFromBall:758)
//     BlendPalette()s the mon's palette toward this color at coefficient 16
//     (fully blended - the mon renders as a flat silhouette of this color)
//     then ramps the coefficient back down to 0 (true colors) as it emerges.
// (b) sAffineAnim_Battler_Emerge (src/data.c:144-149), reached via
//     BATTLER_AFFINE_EMERGE (src/data.c:201) from
//     StartSpriteAffineAnim(mon, BATTLER_AFFINE_EMERGE)
//     (pokeball.c:815, same SpriteCB_ReleaseMonFromBall as (a) - all three
//     mechanisms fire off that single real-battle send-out callback, ~60
//     ticks after ball creation). Two
//     AFFINEANIMCMD_FRAME steps in the sprite engine's RELATIVE-accumulator
//     format (src/sprite.c:1275-1287 ApplyAffineAnimFrame /
//     ApplyAffineAnimFrameRelativeAndUpdateMatrix; neutral accumulator value
//     0x100=256 set by AffineAnimStateStartAnim, sprite.c:1258-1267; final
//     OAM matrix scale = 0x10000 / accumulator, sprite.c:1300-1303
//     ConvertScaleParam - so BIGGER accumulator = BIGGER apparent sprite):
//       step 0: duration 0 -> applied ONCE, ABSOLUTE (ApplyAffineAnimFrame's
//               duration-0 branch calls ApplyAffineAnimFrameAbsolute, not
//               the relative add) - accumulator jumps straight to 0x28 (40),
//               ~15.6% of neutral size (the mon's first visible instant as
//               emergence starts).
//       step 1: duration 12 -> +0x12 (18) added to the accumulator once per
//               tick for 12 ticks: 40 + 12*18 = 256 = neutral (full size)
//               exactly on the 12th tick, then ANIMCMD_END holds it there.
// Verified against oracle pixels: see docs/battle-anim-assets.md.
//   (a) gBallOpenFadeColors[BALL_POKE] expands (via gbaColor.ts's
//       expand5to8, the same 5->8-bit convention as the oracle's own mGBA
//       framebuffer) to RGB8 (255,181,247) - found as an EXACT pixel match
//       (hundreds to 1600+ px per frame) on the mon sprite across ticks
//       1485-1499 of the groundtruth send-out window.
//   (b) the emerging silhouette's pixel width grows from 15px (tick 1481)
//       to a 62px plateau, and the growth window is EXACTLY 12 ticks
//       (1481-1492 inclusive, matching step 1's duration=12 verbatim) before
//       flattening - width is flat 62px for every following tick sampled
//       (1492-1499).
{
  const ballPokeFadeGba5 = { r: 31, g: 22, b: 30 };
  writeJson(join(DATA_GEN, "battle-anim-tables.json"), {
    ballOpenFadeColor: {
      ball: "BALL_POKE",
      source: "src/battle_anim_throw.c:371-374 (gBallOpenFadeColors[BALL_POKE])",
      gba5: ballPokeFadeGba5,
      rgb8: {
        r: expand5to8(ballPokeFadeGba5.r),
        g: expand5to8(ballPokeFadeGba5.g),
        b: expand5to8(ballPokeFadeGba5.b),
      },
    },
    affineEmerge: {
      source: "src/data.c:144-149 (sAffineAnim_Battler_Emerge), selector BATTLER_AFFINE_EMERGE (src/data.c:201)",
      neutralScale: 256,
      // xScale/yScale/rotation/duration mirror AFFINEANIMCMD_FRAME's raw
      // fields (include/sprite.h:91-95, 130-131). duration 0 = apply once,
      // absolute; duration N = add once per tick for N ticks (relative).
      steps: [
        { xScale: 0x28, yScale: 0x28, rotation: 0, duration: 0 },
        { xScale: 0x12, yScale: 0x12, rotation: 0, duration: 12 },
      ],
    },
  });
}

console.log("extraction complete");
