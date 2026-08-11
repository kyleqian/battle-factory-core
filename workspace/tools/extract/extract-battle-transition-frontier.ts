// Dev-time extractor: reads reference/pokeemerald's Battle Frontier transition
// art + parameters for the 12-way random pick B_TRANSITION_GROUP_B_FACTORY
// can select (docs/battle-bringup-notes.md S2 "Battle transition").
//
// GetSpecialBattleTransition(B_TRANSITION_GROUP_B_FACTORY) (src/battle_setup.c:
// 863-909, called from src/battle_tower.c:2099) falls through to
// RANDOM_TRANSITION(sBattleTransitionTable_BattleFrontier) (battle_setup.c:
// 863,885,131-145) - one Random() call picking uniformly among 12 of the 13
// B_TRANSITION_FRONTIER_* ids (include/battle_transition.h:52-64); the 13th,
// B_TRANSITION_FRONTIER_SQUARES_SPIRAL, is Pyramid/Dome-only
// (sBattleTransitionTable_BattlePyramid/_BattleDome, battle_setup.c:147-159)
// and out of scope here. Three visual mechanisms, three asset groups:
//   1. Logo wiggle/wave (Task_FrontierLogoWiggle/_Wave, battle_transition.c:
//      4264,4284) - the Frontier logo bitmap on BG0, HBlank sine-distorted.
//   2. Squares/squares-scroll (Task_FrontierSquares/_Scroll, :4432,4442) -
//      4x4-tile logo-bearing squares checkerboard-fill BG0, or scroll in.
//   3. Circles (battle_transition_frontier.c, all 8 *_IN_SEQ/non-IN_SEQ
//      variants) - 3 sprites (the logo split top/left/right) slide/spiral
//      onto a static "center" BG0 backdrop, then fade.
//
// None of these three PNG->tileset conversions in graphics_file_rules.mk do
// anything beyond raw 8x8 row-major slicing + (for the squares family) file
// concatenation - confirmed from tools/gbagfx/gfx.c:458-469 (a "-num_tiles N"
// arg only *truncates* trailing all-zero tiles, never dedups/reorders) and
// from graphics_file_rules.mk:155-169 (frontier_square_<N>.4bpp == `cat
// frontier_squares_blanktiles.4bpp frontier_squares_<N>.4bpp`, byte for
// byte) - so decodeIndexedPng+sliceTiles on the tracked source PNGs (no raw
// .4bpp binary decoder needed) reproduces the exact ROM tile order. Verified
// per-file below by checking every tilemap's referenced tile indices fall
// inside the corresponding tileset's raw slice.
//
// Not oracle-cross-checked: the transition picked is RNG-dependent (12-way),
// and none of these three mechanisms render pixel-stable output that a
// deterministic oracle trace could target without first reverse-engineering
// the RNG stream to force a specific pick (out of scope for this step,
// flagged as follow-up). Verified instead against reference/pokeemerald's
// source PNGs/binaries directly, as this task's brief allows - every pinned
// value in tests/battleTransitionFrontier.test.ts traces back to a decoded
// source file, not a hand-copied number.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-transition-frontier.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles, type Tile } from "./tiles.ts";
import { parseTilemap, type Tilemap } from "./tilemap.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");
const TRANS_GFX = join(REF, "graphics", "battle_transitions");

mkdirSync(ASSETS_GEN, { recursive: true });
mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

function tilesToJson(tiles: Tile[]): number[][] {
  return tiles.map((t) => [...t.pixels]);
}

function loadTileset(pngPath: string) {
  const img = decodeIndexedPng(pngPath);
  const { columns, rows, tiles } = sliceTiles(img);
  return { image: img, columns, rows, tiles };
}

/** Sanity check: every tilemap entry's tile index must resolve inside tilesetLen raw tiles. */
function assertTilemapInRange(name: string, tilemap: Tilemap, tilesetLen: number): void {
  for (const e of tilemap.entries) {
    if (e.tile >= tilesetLen) {
      throw new Error(`${name}: tilemap references tile ${e.tile}, but tileset only has ${tilesetLen} tiles`);
    }
  }
}

// === 1. Logo wiggle/wave family (B_TRANSITION_FRONTIER_LOGO_WIGGLE/_WAVE) ===
// sFrontierLogo_Palette/_Tileset/_Tilemap (battle_transition.c:329-331) <-
// frontier_logo.png (.gbapal + .4bpp.lz) + frontier_logo.bin (.lz). Loaded
// onto BG0 at BG_PLTT_ID(15) by both FrontierLogoWiggle_Init (:4238-4250)
// and FrontierLogoWave_Init (:4289-4313).
{
  const { image, columns, rows, tiles } = loadTileset(join(TRANS_GFX, "frontier_logo.png"));
  const tilemapBuf = readFileSync(join(TRANS_GFX, "frontier_logo.bin"));
  const tilemap = parseTilemap(tilemapBuf, 32, 32);
  assertTilemapInRange("frontier_logo", tilemap, tiles.length);

  writeJson(join(ASSETS_GEN, "battle-transition-frontier-logo.json"), {
    palette: image.palette,
    tileset: { columns, rows, tiles: tilesToJson(tiles) },
    tilemap,
  });
}

// === 2. Squares family (B_TRANSITION_FRONTIER_SQUARES/_SQUARES_SCROLL) =====
// sFrontierSquares_Palette (battle_transition.c:332) <- frontier_squares_
// blanktiles.png's own .gbapal (loaded to BG_PLTT_ID(15), :4458,4668).
// sFrontierSquares_{FilledBg,EmptyBg,Shrink1,Shrink2}_Tileset (:333-336) <-
// frontier_square_{1,2,3,4}.4bpp.lz, each built by graphics_file_rules.mk:
// 155-169 as `cat frontier_squares_blanktiles.4bpp frontier_squares_<N>.4bpp`
// - reproduced here as blanktiles' 2 tiles followed by squares_<N>'s 16 tiles
// (confirmed: frontier_squares.bin's tilemap only references tiles 2-17,
// i.e. the squares_<N> half - see assertTilemapInRange below).
// sFrontierSquares_Tilemap (:337) <- frontier_squares.bin, the SQUARE_SIZExSQUARE_SIZE
// (4x4 tile) pattern FrontierSquares_Draw/_Scroll copy per square (:4469-4475,
// 4709-4713).
{
  const blank = loadTileset(join(TRANS_GFX, "frontier_squares_blanktiles.png"));
  const variants: Array<["filledBg" | "emptyBg" | "shrink1" | "shrink2", string]> = [
    ["filledBg", "frontier_squares_1.png"],
    ["emptyBg", "frontier_squares_2.png"],
    ["shrink1", "frontier_squares_3.png"],
    ["shrink2", "frontier_squares_4.png"],
  ];
  // Not a single rectangular image once concatenated (blank is 2x1, each
  // squares_<N> is 4x4) - consumers index the flat `tiles` array by tile
  // number the same way the tilemap does, so columns/rows would be
  // misleading here and are omitted (unlike the other, genuinely
  // rectangular tilesets in this file).
  const tilesets: Record<string, { blankTileCount: number; tiles: number[][] }> = {};
  for (const [key, file] of variants) {
    const { tiles } = loadTileset(join(TRANS_GFX, file));
    tilesets[key] = { blankTileCount: blank.tiles.length, tiles: [...tilesToJson(blank.tiles), ...tilesToJson(tiles)] };
  }

  const tilemapBuf = readFileSync(join(TRANS_GFX, "frontier_squares.bin"));
  const tilemap = parseTilemap(tilemapBuf, 4, 4);
  assertTilemapInRange("frontier_squares", tilemap, blank.tiles.length + 16);

  // Layout constants (battle_transition.c:962-966): squares do not fit
  // evenly across DISPLAY_WIDTH=240px, hence the 1-tile margin either side.
  const SQUARE_SIZE = 4; // tiles (32px)
  const MARGIN_SIZE = 1; // tiles (8px)
  const DISPLAY_WIDTH = 240;
  const DISPLAY_HEIGHT = 160;
  const numSquaresPerRow = (DISPLAY_WIDTH - MARGIN_SIZE * 8 * 2) / (SQUARE_SIZE * 8);
  const numSquaresPerCol = DISPLAY_HEIGHT / (SQUARE_SIZE * 8);

  // sFrontierSquaresScroll_Positions (:982-991) - the draw/erase order for
  // B_TRANSITION_FRONTIER_SQUARES_SCROLL (FrontierSquaresScroll_Draw/_Erase,
  // :4703-4752); a fixed 64-entry "shuffled" table, not itself randomized
  // (only the scroll *direction* is, via Random() % 4 below).
  const scrollPositionsMatch =
    /static const u8 sFrontierSquaresScroll_Positions\[\] = \{([^}]*)\};/.exec(
      readFileSync(join(REF, "src", "battle_transition.c"), "utf8"),
    );
  if (!scrollPositionsMatch) throw new Error("sFrontierSquaresScroll_Positions not found");
  const scrollPositions = scrollPositionsMatch[1]!
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);
  if (scrollPositions.length !== 64) {
    throw new Error(`sFrontierSquaresScroll_Positions: expected 64 entries, got ${scrollPositions.length}`);
  }

  writeJson(join(ASSETS_GEN, "battle-transition-frontier-squares.json"), {
    palette: blank.image.palette,
    tileset: tilesets,
    tilemap,
    layout: {
      squareSizeTiles: SQUARE_SIZE,
      marginSizeTiles: MARGIN_SIZE,
      numSquaresPerRow,
      numSquaresPerCol,
      numSquares: numSquaresPerRow * numSquaresPerCol,
    },
    scrollPositions,
  });
}

// === 3. Circles family (all 8 B_TRANSITION_FRONTIER_CIRCLES_* variants) ====
// sLogoCenter_Gfx/_Tilemap (battle_transition_frontier.c:48-49) <-
// frontier_logo_center.png (.4bpp.lz, "-num_tiles 43 -Wnum_tiles" - only
// truncates 2 trailing all-zero tiles per the gbagfx note above, confirmed:
// the tilemap's max tile index is 42) + frontier_logo_center.bin (.lz).
// Loaded onto BG0 by LoadLogoGfx (:222-232), the static backdrop the 3
// circle sprites converge onto.
// sLogoCircles_Gfx/sLogo_Pal (:50-51) <- frontier_logo_circles.png (.4bpp.lz
// + its own .gbapal) - a 64x192px sheet, 3 stacked 64x64 (8x8-tile) pieces:
// top (tiles 0-63), left (64-127), right (128-191), per
// sAnim_LogoCircle_{Top,Left,Right}'s ANIMCMD_FRAME offsets (:86-102) and
// sOamData_LogoCircles' SPRITE_SIZE(64x64) (:56-71).
{
  const center = loadTileset(join(TRANS_GFX, "frontier_logo_center.png"));
  const centerMapBuf = readFileSync(join(TRANS_GFX, "frontier_logo_center.bin"));
  const centerTilemap = parseTilemap(centerMapBuf, 32, 32);
  assertTilemapInRange("frontier_logo_center", centerTilemap, center.tiles.length);

  const circles = loadTileset(join(TRANS_GFX, "frontier_logo_circles.png"));
  if (circles.tiles.length !== 192) {
    throw new Error(`frontier_logo_circles.png: expected 192 tiles (3x 64x64 pieces), got ${circles.tiles.length}`);
  }
  const piece = (start: number) => ({
    columns: 8,
    rows: 8,
    tiles: tilesToJson(circles.tiles.slice(start, start + 64)),
  });

  writeJson(join(ASSETS_GEN, "battle-transition-frontier-circles.json"), {
    centerBg: {
      palette: center.image.palette,
      tileset: { columns: center.columns, rows: center.rows, tiles: tilesToJson(center.tiles) },
      tilemap: centerTilemap,
    },
    circleSprites: {
      palette: circles.image.palette,
      top: piece(0),
      left: piece(64),
      right: piece(128),
    },
  });
}

// === 4. Per-transition metadata: id -> mechanism family + key parameters ===
// sBattleTransitionTable_BattleFrontier (battle_setup.c:131-145), the 12-way
// RANDOM_TRANSITION table for B_TRANSITION_GROUP_B_FACTORY=6
// (include/battle_transition.h:74; RANDOM_TRANSITION macro, battle_setup.c:
// 863: `table[Random() % ARRAY_COUNT(table)]`, one Random() call).
// B_TRANSITION_FRONTIER_* numeric ids computed from the enum at
// include/battle_transition.h:22-66 (0-based, sequential from
// B_TRANSITION_BLUR=0).
{
  const table = [
    {
      id: 29,
      name: "B_TRANSITION_FRONTIER_LOGO_WIGGLE",
      family: "logoWiggle",
      assets: "battle-transition-frontier-logo.json",
      params: {
        // Task_FrontierLogoWiggle (battle_transition.c:4264): a per-scanline
        // HBlank sine distortion via the shared InitPatternWeaveTransition/
        // SetSinWave machinery (:4242,4258) - amplitude/sinIndex are runtime
        // task state, not fixed constants (unlike LOGO_WAVE below).
        mechanism: "SetSinWave(gScanlineEffectRegBuffers[0], 0, tSinIndex, 132, tAmplitude, DISPLAY_HEIGHT) each frame (battle_transition.c:4258)",
      },
    },
    {
      id: 30,
      name: "B_TRANSITION_FRONTIER_LOGO_WAVE",
      family: "logoWave",
      assets: "battle-transition-frontier-logo.json",
      params: {
        // FrontierLogoWave_Init/_Main (battle_transition.c:4289-4394).
        initialAmplitude: 32 << 8, // tAmplitudeVal, :4296
        initialSinVal: 0x7fff, // tSinVal, :4297
        sinSpread: 384, // :4350
        initialSinDecrement: 2560, // tSinDecrement, :4300
        sinDecrementStep: 17, // per-frame decrement of tSinDecrement, :4391
        settleStartFrame: 70, // amplitude starts decaying once tTimer >= 70, :4354
        amplitudeDecayStep: 384, // :4358-4359
        blendUpdatePeriod: 3, // blend advances every tTimer % 3 == 0, :4364
        fadeOutFrame: 101, // BeginNormalPaletteFade fires at tTimer == 101, :4382-4386
      },
    },
    {
      id: 31,
      name: "B_TRANSITION_FRONTIER_SQUARES",
      family: "squares",
      assets: "battle-transition-frontier-squares.json",
      params: {
        // FrontierSquares_Draw (battle_transition.c:4469-4489): fills
        // row-major (MARGIN_SIZE, 0) onward, SQUARE_SIZE tiles at a time.
        fillOrder: "rowMajor",
        shrinkDelayFrames: 10, // tShrinkDelay, :4463
      },
    },
    {
      id: 32,
      name: "B_TRANSITION_FRONTIER_SQUARES_SCROLL",
      family: "squaresScroll",
      assets: "battle-transition-frontier-squares.json",
      params: {
        // FrontierSquaresScroll_Init (battle_transition.c:4659-4701): draws
        // via sFrontierSquaresScroll_Positions (in the squares asset json's
        // scrollPositions) while scrolling BG0 in a direction chosen by a
        // *second*, conditional Random() call - only consumed when this
        // variant is the one the 12-way pick already selected.
        fillOrder: "scrollPositions (see squares asset json)",
        scrollDirectionRoll: "Random() % 4 (battle_transition.c:4679)",
        scrollDirections: [
          { roll: 0, dx: 1, dy: 1, label: "down/right" },
          { roll: 1, dx: -1, dy: -1, label: "up/left" },
          { roll: 2, dx: 1, dy: -1, label: "up/right" },
          { roll: 3, dx: -1, dy: 1, label: "down/left" },
        ],
      },
    },
    ...([
      {
        id: 34,
        name: "B_TRANSITION_FRONTIER_CIRCLES_MEET",
        fn: "CirclesMeet_CreateSprites",
        line: "battle_transition_frontier.c:433-441",
        sprites: [
          { anim: "top", startX: 120, startY: -51, delayX: 0, delayY: 0, speedX: 0, speedY: 2 },
          { anim: "left", startX: -7, startY: 193, delayX: 0, delayY: 0, speedX: 2, speedY: -2 },
          { anim: "right", startX: 247, startY: 193, delayX: 0, delayY: 0, speedX: -2, speedY: -2 },
        ],
      },
      {
        id: 35,
        name: "B_TRANSITION_FRONTIER_CIRCLES_CROSS",
        fn: "CirclesCross_CreateSprites",
        line: "battle_transition_frontier.c:459-467",
        sprites: [
          { anim: "top", startX: 120, startY: 197, delayX: 0, delayY: 0, speedX: 0, speedY: -4 },
          { anim: "left", startX: 241, startY: 59, delayX: 0, delayY: 1, speedX: -4, speedY: 2 },
          { anim: "right", startX: -1, startY: 59, delayX: 0, delayY: 1, speedX: 4, speedY: 2 },
        ],
      },
    ].map((t) => ({
      id: t.id,
      name: t.name,
      family: "circlesSlide",
      assets: "battle-transition-frontier-circles.json",
      params: {
        // CreateSlidingLogoCircleSprite (battle_transition_frontier.c:234-265):
        // each sprite slides toward a fixed target - (120,45) for "top",
        // (89,97) for "left", (151,97) for "right" (:241-251) - stepping by
        // speedX/Y every delayX/Y+1 frames, via SpriteCB_LogoCircleSlide
        // (:267-297).
        targets: { top: { x: 120, y: 45 }, left: { x: 89, y: 97 }, right: { x: 151, y: 97 } },
        createFn: t.fn,
        createFnLine: t.line,
        sprites: t.sprites,
      },
    }))),
    ...([
      {
        id: 36,
        name: "B_TRANSITION_FRONTIER_CIRCLES_ASYMMETRIC_SPIRAL",
        fn: "CirclesAsymmetricSpiral_CreateSprites",
        line: "battle_transition_frontier.c:485-493",
        sprites: [
          { anim: "top", x: 120, y: 45, angle: 12, rotateSpeed: 4, radiusStart: 128, radiusEnd: 0, radiusDelta: -4 },
          { anim: "left", x: 89, y: 97, angle: 252, rotateSpeed: 4, radiusStart: 128, radiusEnd: 0, radiusDelta: -4 },
          { anim: "right", x: 151, y: 97, angle: 132, rotateSpeed: 4, radiusStart: 128, radiusEnd: 0, radiusDelta: -4 },
        ],
      },
      {
        id: 37,
        name: "B_TRANSITION_FRONTIER_CIRCLES_SYMMETRIC_SPIRAL",
        fn: "CirclesSymmetricSpiral_CreateSprites",
        line: "battle_transition_frontier.c:511-519",
        sprites: [
          { anim: "top", x: 120, y: 80, angle: 284, rotateSpeed: 8, radiusStart: 131, radiusEnd: 35, radiusDelta: -3 },
          { anim: "left", x: 120, y: 80, angle: 44, rotateSpeed: 8, radiusStart: 131, radiusEnd: 35, radiusDelta: -3 },
          { anim: "right", x: 121, y: 80, angle: 164, rotateSpeed: 8, radiusStart: 131, radiusEnd: 35, radiusDelta: -3 },
        ],
      },
    ].map((t) => ({
      id: t.id,
      name: t.name,
      family: "circlesSpiral",
      assets: "battle-transition-frontier-circles.json",
      params: {
        // CreateSpiralingLogoCircleSprite (battle_transition_frontier.c:
        // 299-330): x2/y2 offset each frame is
        // (Sin2(angle)*radius)>>12, (Cos2(angle)*radius)>>12 (:334-335);
        // angle += rotateSpeed (mod 360) and radius += radiusDelta each
        // frame until radius == radiusEnd (:337-342).
        createFn: t.fn,
        createFnLine: t.line,
        sprites: t.sprites,
      },
    }))),
    ...([
      {
        id: 38,
        name: "B_TRANSITION_FRONTIER_CIRCLES_MEET_IN_SEQ",
        fn: "CirclesMeetInSeq_CreateSprites",
        line: "battle_transition_frontier.c:537-555",
        base: "circlesSlide",
        sprites: [
          { anim: "top", startX: 120, startY: -51, delayX: 0, delayY: 0, speedX: 0, speedY: 4, createOnTimer: 0 },
          { anim: "left", startX: -7, startY: 193, delayX: 0, delayY: 0, speedX: 4, speedY: -4, createOnTimer: 16 },
          { anim: "right", startX: 247, startY: 193, delayX: 0, delayY: 0, speedX: -4, speedY: -4, createOnTimer: 32 },
        ],
      },
      {
        id: 39,
        name: "B_TRANSITION_FRONTIER_CIRCLES_CROSS_IN_SEQ",
        fn: "CirclesCrossInSeq_CreateSprites",
        line: "battle_transition_frontier.c:573-591",
        base: "circlesSlide",
        sprites: [
          { anim: "top", startX: 120, startY: 197, delayX: 0, delayY: 0, speedX: 0, speedY: -8, createOnTimer: 0 },
          { anim: "left", startX: 241, startY: 78, delayX: 0, delayY: 0, speedX: -8, speedY: 1, createOnTimer: 16 },
          { anim: "right", startX: -1, startY: 78, delayX: 0, delayY: 0, speedX: 8, speedY: 1, createOnTimer: 32 },
        ],
      },
      {
        id: 40,
        name: "B_TRANSITION_FRONTIER_CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ",
        fn: "CirclesAsymmetricSpiralInSeq_CreateSprites",
        line: "battle_transition_frontier.c:609-627",
        base: "circlesSpiral",
        sprites: [
          { anim: "top", x: 120, y: 45, angle: 12, rotateSpeed: 4, radiusStart: 128, radiusEnd: 0, radiusDelta: -4, createOnTimer: 0 },
          { anim: "left", x: 89, y: 97, angle: 252, rotateSpeed: 4, radiusStart: 128, radiusEnd: 0, radiusDelta: -4, createOnTimer: 16 },
          { anim: "right", x: 151, y: 97, angle: 132, rotateSpeed: 4, radiusStart: 128, radiusEnd: 0, radiusDelta: -4, createOnTimer: 32 },
        ],
      },
      {
        id: 41,
        name: "B_TRANSITION_FRONTIER_CIRCLES_SYMMETRIC_SPIRAL_IN_SEQ",
        fn: "CirclesSymmetricSpiralInSeq_CreateSprites",
        line: "battle_transition_frontier.c:645-663",
        base: "circlesSpiral",
        sprites: [
          { anim: "top", x: 120, y: 80, angle: 284, rotateSpeed: 8, radiusStart: 131, radiusEnd: 35, radiusDelta: -3, createOnTimer: 0 },
          { anim: "left", x: 120, y: 80, angle: 44, rotateSpeed: 8, radiusStart: 131, radiusEnd: 35, radiusDelta: -3, createOnTimer: 16 },
          { anim: "right", x: 121, y: 80, angle: 164, rotateSpeed: 8, radiusStart: 131, radiusEnd: 35, radiusDelta: -3, createOnTimer: 32 },
        ],
      },
    ].map((t) => ({
      id: t.id,
      name: t.name,
      family: `${t.base}InSeq`,
      assets: "battle-transition-frontier-circles.json",
      params: {
        // Same per-frame mechanism as the non-InSeq variant of the same
        // base family, but the 3 sprites are created staggered 16 frames
        // apart (createOnTimer, checked against the task's own tTimer) -
        // e.g. CirclesMeetInSeq_CreateSprites (battle_transition_frontier.c:
        // 537-555) - instead of all 3 at once.
        createFn: t.fn,
        createFnLine: t.line,
        staggerFrames: 16,
        sprites: t.sprites,
      },
    }))),
  ];

  if (table.length !== 12) throw new Error(`expected 12 Factory transition table entries, got ${table.length}`);
  const ids = table.map((t) => t.id);
  if (new Set(ids).size !== 12) throw new Error("duplicate transition ids in table");

  writeJson(join(DATA_GEN, "battle-transitions-frontier.json"), {
    selector: {
      groupId: 6, // B_TRANSITION_GROUP_B_FACTORY, include/battle_transition.h:74
      citation: "src/battle_setup.c:863-909 (GetSpecialBattleTransition), src/battle_tower.c:2099 (call site)",
      pick: "RANDOM_TRANSITION(sBattleTransitionTable_BattleFrontier): table[Random() % 12], one Random() call (battle_setup.c:863,885,131-145)",
    },
    table,
  });
}
