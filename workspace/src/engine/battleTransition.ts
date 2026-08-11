// Frontier circle battle transitions: Battle 1's CIRCLES_MEET (ticks
// 843-1040 of tools/compare/traces-groundtruth/battle1-intro.json) and
// Battle 2's CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ (canonical 32036-32244 - see
// docs/battle2-opening-notes.md). See
// docs/battle-bringup-notes.md "Slice-0 ground truth" §5 for the pixel/RAM
// groundwork this builds on, and its own flagged follow-ups). Renders as a
// pure post-process overlay on top of battleRoom.ts's already-settled scene
// (battleRoomRender.ts's renderBattleRoomEntryScene), keyed entirely by
// `te` - battleRoom.ts's encounter-relative "settled" elapsed counter. No
// new BattleRoomPhase is needed: every stage below is a pure function of
// `te` plus the selected transition kind.
//
// Source: reference/pokeemerald/src/battle_transition.c
// (Task_BattleTransition_Intro / CreateIntroTask(0,0,3,2,2) /
// TransitionIntro_FadeToGray/_FadeFromGray) and
// battle_transition_frontier.c (Task_FrontierCirclesMeet /
// sFrontierCirclesMeet_Funcs: Circles_Init -> CirclesMeet_CreateSprites ->
// WaitForLogoCirclesAnim -> FadeInCenterLogoCircle -> CirclesMeet_End).
// Every constant below was cross-derived from that source AND pixel-
// verified against tools/compare/traces-groundtruth/battle1-transition-
// dense.json's own 206 every-frame PNGs (bin/oracle run, scratch Python,
// not committed) - not hand-copied from the prior groundwork session's own
// (self-flagged-as-empirical) numbers. Two corrections to that groundwork:
//
// 1. **The circle sprites' OAM placement is the standard symmetric
//    center-32/-32 corner** (sCenterToCornerVecTable[square][SPRITE_SIZE(
//    64x64)] = {-32,-32}, sprite.c:139-144 - not a per-piece empirical
//    offset). The prior session's brute-forced per-piece corner vectors
//    (top (-32,-34), left (-34,-30), right (-30,-30)) were fitting the
//    *artwork's own asymmetric non-transparent footprint within its 64x64
//    tile* (a ring segment doesn't fill its tile symmetrically), not the
//    true OAM corner - composing the full 64x64 tile (transparency and
//    all, same center-anchored convention as sprites.ts's `drawSprite`) at
//    the plain symmetric corner reproduces the reference pixels exactly
//    (reverified this slice: 0/38400 mismatches at every sampled tick
//    930-975 before the center-logo blend begins). `drawCircleSprite`
//    below inlines that same placement rather than calling `drawSprite`
//    directly, since it also needs to pre-fade each pixel (module doc's
//    OBJ-lag point) - `drawSprite` has no fade hook.
// 2. **Creation/anchor tick re-derived to trace tick 921** (not the
//    920 the prior groundwork estimated from RAM alone): brute-forcing the
//    anchor against the actual dense-trace pixels (composing the 3 sprites
//    over the pre-transition static frame and diffing against every
//    reference PNG 930-975) finds tick 921 as the unique zero-mismatch
//    value - `CreateSlidingLogoCircleSprite`'s own linear-slide formula
//    (`position(t) = initial + speed * clamp(t-921, 0, 48)`) then
//    reproduces the reference exactly through the meet at tick 969 (48
//    ticks later) and holds there.
//
// Three distinct blend mechanisms, each pixel-verified independently
// (do not conflate them):
// - Gray flicker (`TransitionIntro_FadeToGray/_FadeFromGray`'s
//   `BlendPalettes(PALETTES_ALL, blend, RGB(11,11,11))`) uses util.c's
//   5-bit `BlendPalette` formula - the SAME shape as paletteFade.ts's
//   `blendComponentToBlack` (`faded5 = c5 + ((target5-c5)*y) >> 4`), just
//   with target5=11 instead of 0. Verified exactly against 3 independent
//   pixels (a black void pixel, a floor tile, a player-sprite pixel) across
//   all 3 flicker cycles - no BG/OBJ split (BlendPalettes touches every
//   palette in one call, unlike the alternating-call UpdateNormalPaletteFade
//   paletteFade.ts documents), so a single unlagged `y` applies to the
//   whole frame.
// - The center-logo BLDALPHA ramp (`FadeInCenterLogoCircle`'s
//   `BLDALPHA_BLEND(blnd, 16-blnd)`) empirically matches mGBA's blend
//   output only when computed directly in **8-bit** space (`out8 =
//   floor((c1_8*EVA + c2_8*EVB)/16)`, clamped 255) - NOT the 5-bit-then-
//   reexpand formula the other two mechanisms use. Verified against a
//   ramping pixel (971-986, all 3 channels) to exact byte match; the 5-bit
//   formula is off by up to 2/255 on the same samples. This appears to be
//   an mGBA emulation-layer detail of the real GBA's per-pixel hardware
//   blend, not a palette.c software routine - matched to what the oracle
//   actually renders, per this run's own "match the oracle's actual pixel
//   output" convention.
// - The exit-to-black fade (`CirclesMeet_End`'s implicit
//   `BeginNormalPaletteFade(PALETTES_ALL, -1, 0, 0x10, RGB_BLACK)`) reuses
//   paletteFade.ts's `blendComponentToBlack` (5-bit, same as every other
//   fade in this codebase) but with a **3-per-2-ticks** cadence (not the
//   usual 2-per-2-ticks). The BG/OBJ 1-tick lag paletteFade.ts documents
//   *does* apply here too (re-confirmed, not an exception): a BG0-logo
//   pixel and a plain-scene pixel (both BG) land on y=3,6,9,12,15,16 at
//   ticks 1020/1022/1024/1026/1028/1030, while a circle-sprite-only pixel
//   (OBJ, outside BG0's opaque footprint) lands on the same sequence one
//   tick later (1021/1023/.../1031) - exactly `objY(t) = bgY(t-1)`.
//   `drawCircleSprite` applies this lag directly (pre-fades the sprite's
//   own palette); everything else in `applyBattleTransitionOverlay` uses
//   the unlagged sequence.

import { blendComponentToBlack } from "./paletteFade.ts";
import type { RgbColor } from "./bg.ts";

import circlesAsset from "../assets/gen/battle-transition-frontier-circles.json" with { type: "json" };

interface CircleTileset {
  columns: number;
  rows: number;
  tiles: number[][];
}
interface CenterBgAsset {
  palette: RgbColor[];
  tileset: CircleTileset;
  tilemap: {
    width: number;
    height: number;
    entries: Array<{ tile: number; hFlip: boolean; vFlip: boolean; palette: number }>;
  };
}
interface CirclesAsset {
  centerBg: CenterBgAsset;
  circleSprites: { palette: RgbColor[]; top: CircleTileset; left: CircleTileset; right: CircleTileset };
}

const circles = circlesAsset as CirclesAsset;
const circlePalette = circles.circleSprites.palette;
const centerBg = circles.centerBg;

export type FrontierCircleTransition = "circlesMeet" | "asymmetricSpiralInSeq";

/** te (settled-phase elapsed) at which the corresponding trace tick (843+te) begins - named per the phase they gate. */
const FLICKER_START_TE = 28; // trace tick 871
const FLICKER_END_TE = 76; // trace tick 919 (exclusive) - 3x16-tick cycles
const CIRCLE_ANCHOR_TE = 921 - 843; // trace tick 921 (see module doc point 2)
const CIRCLE_SLIDE_TICKS = 48;
const BLEND_START_TE = 970 - 843; // trace tick 970 - tBlend leaves 0
const EXIT_FADE_START_TE = 1020 - 843; // trace tick 1020 - first faded frame
const ASYMMETRIC_SEQ_FLICKER_START_TE = 25;
const ASYMMETRIC_SEQ_FLICKER_END_TE = 73;
const ASYMMETRIC_SEQ_BLEND_START_TE = 140;
const ASYMMETRIC_SEQ_EXIT_FADE_START_TE = 190;

/** TransitionIntro_FadeToGray/_FadeFromGray's shared gray target, RGB(11,11,11) (battle_transition.c:1121 CreateIntroTask(0,0,3,2,2)). */
const GRAY_TARGET5 = 11;

function blendComponentToGray(component8: number, y: number): number {
  if (y <= 0) return component8;
  const c5 = component8 >> 3;
  const faded5 = c5 + (((GRAY_TARGET5 - c5) * y) >> 4);
  return (faded5 << 3) | (faded5 >> 2);
}

/**
 * The gray-flicker blend coefficient (0-16) at settled-elapsed `te` - 3
 * mirror-symmetric 16-tick ramps (module doc), 0 outside the flicker
 * window. `tFadeToGrayIncrement`/`tFadeFromGrayIncrement` are both 2
 * (CreateIntroTask(0,0,3,2,2)), `tDelayTimer`=0 so every tick steps once.
 */
export function grayFlickerY(te: number, transition: FrontierCircleTransition = "circlesMeet"): number {
  const start = transition === "asymmetricSpiralInSeq"
    ? ASYMMETRIC_SEQ_FLICKER_START_TE
    : FLICKER_START_TE;
  const end = transition === "asymmetricSpiralInSeq"
    ? ASYMMETRIC_SEQ_FLICKER_END_TE
    : FLICKER_END_TE;
  if (te < start || te >= end) return 0;
  const ft = te - start;
  const k = ft % 16;
  return k <= 7 ? 2 * (k + 1) : 2 * (15 - k);
}

interface CircleSpec {
  init: readonly [number, number];
  speed: readonly [number, number];
}

/** CirclesMeet_CreateSprites (battle_transition_frontier.c:433-437) - target (120,45)/(89,97)/(151,97) is implicit in 48 ticks * speed. */
const CIRCLE_SPECS: Record<"top" | "left" | "right", CircleSpec> = {
  top: { init: [120, -51], speed: [0, 2] },
  left: { init: [-7, 193], speed: [2, -2] },
  right: { init: [247, 193], speed: [-2, -2] },
};

/** Sprite center at settled-elapsed `te` (module doc point 2 - anchor tick 921, linear for 48 ticks then holds at target). */
export function circleCenter(name: "top" | "left" | "right", te: number): { x: number; y: number } {
  const spec = CIRCLE_SPECS[name];
  const k = Math.max(0, Math.min(te - CIRCLE_ANCHOR_TE, CIRCLE_SLIDE_TICKS));
  return { x: spec.init[0] + spec.speed[0] * k, y: spec.init[1] + spec.speed[1] * k };
}

interface SpiralSpec {
  center: readonly [number, number];
  angle: number;
  visibleTe: number;
}

/** CirclesAsymmetricSpiralInSeq_CreateSprites: task timers 0/16/32. */
const ASYMMETRIC_SEQ_SPECS: Record<"top" | "left" | "right", SpiralSpec> = {
  top: { center: [120, 45], angle: 12, visibleTe: 76 },
  left: { center: [89, 97], angle: 252, visibleTe: 92 },
  right: { center: [151, 97], angle: 132, visibleTe: 108 },
};

/**
 * `gSineDegreeTable` is rounded Q4.12 sine except for four source-table
 * entries that are one unit lower (trig.c:326-508). Keeping those literal
 * source exceptions makes Sin2/Cos2 exact without carrying a lookup table.
 */
function sineDegreeQ12(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  const tableAngle = normalized % 180;
  let magnitude = Math.round(Math.sin((tableAngle * Math.PI) / 180) * 4096);
  if (tableAngle === 84 || tableAngle === 88 || tableAngle === 92 || tableAngle === 96) {
    magnitude -= 1;
  }
  return normalized >= 180 ? -magnitude : magnitude;
}

/** Source-exact SpriteCB_LogoCircleSpiral center for a visible sequential sprite. */
export function asymmetricSpiralCircleCenter(
  name: "top" | "left" | "right",
  te: number,
): { x: number; y: number } | null {
  const spec = ASYMMETRIC_SEQ_SPECS[name];
  if (te < spec.visibleTe) return null;
  const age = Math.min(te - spec.visibleTe, 32);
  const radius = 128 - age * 4;
  const angle = spec.angle + age * 4;
  const x2 = Math.floor((sineDegreeQ12(angle) * radius) / 4096);
  const y2 = Math.floor((sineDegreeQ12(angle + 90) * radius) / 4096);
  return { x: spec.center[0] + x2, y: spec.center[1] + y2 };
}

/** FadeInCenterLogoCircle's BLDALPHA target-1 (BG0) weight, 0-16 (module doc). */
export function centerLogoEva(te: number, transition: FrontierCircleTransition = "circlesMeet"): number {
  const start = transition === "asymmetricSpiralInSeq"
    ? ASYMMETRIC_SEQ_BLEND_START_TE
    : BLEND_START_TE;
  return Math.max(0, Math.min(te - start, 16));
}

/** CirclesMeet_End's exit-to-black fade coefficient, 0-16 (module doc: 3-per-2-ticks, no BG/OBJ lag). */
export function exitFadeY(te: number, transition: FrontierCircleTransition = "circlesMeet"): number {
  const start = transition === "asymmetricSpiralInSeq"
    ? ASYMMETRIC_SEQ_EXIT_FADE_START_TE
    : EXIT_FADE_START_TE;
  const d = te - start;
  if (d < 0) return 0;
  const step = Math.floor(d / 2) + 1;
  return Math.min(16, 3 * step);
}

/**
 * Draws one circle sprite (OBJ layer), pre-faded by the exit-to-black fade
 * at its own 1-tick-lagged coefficient (matches paletteFade.ts's documented
 * general BG/OBJ lag convention - `objFadeY(t) = bgFadeY(t-1)`, re-confirmed
 * for this call site by pixel diff).
 */
function drawCircleSprite(
  fb: Uint8Array,
  name: "top" | "left" | "right",
  te: number,
  transition: FrontierCircleTransition,
): void {
  const center = transition === "asymmetricSpiralInSeq"
    ? asymmetricSpiralCircleCenter(name, te)
    : circleCenter(name, te);
  if (!center) return;
  const fadeY = exitFadeY(te - 1, transition);
  const originX = center.x - 32;
  const originY = center.y - 32;
  const tileset = circles.circleSprites[name];
  for (let ty = 0; ty < 8; ty += 1) {
    for (let tx = 0; tx < 8; tx += 1) {
      const tile = tileset.tiles[ty * tileset.columns + tx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        const sy = originY + ty * 8 + py;
        if (sy < 0 || sy >= 160) continue;
        for (let px = 0; px < 8; px += 1) {
          const sx = originX + tx * 8 + px;
          if (sx < 0 || sx >= 240) continue;
          const idx = tile[py * 8 + px]!;
          if (idx === 0) continue;
          const color = circlePalette[idx];
          if (!color) continue;
          const off = (sy * 240 + sx) * 4;
          fb[off] = blendComponentToBlack(color.r, fadeY);
          fb[off + 1] = blendComponentToBlack(color.g, fadeY);
          fb[off + 2] = blendComponentToBlack(color.b, fadeY);
        }
      }
    }
  }
}

export function sequentialCirclePainterOrder(te: number): Array<"top" | "left" | "right"> {
  const names: Array<"top" | "left" | "right"> = ["top", "left", "right"];
  return names
    .filter((name) => asymmetricSpiralCircleCenter(name, te) !== null)
    .sort((a, b) => {
      const ay = asymmetricSpiralCircleCenter(a, te)!.y - 32;
      const by = asymmetricSpiralCircleCenter(b, te)!.y - 32;
      // SortSprites orders equal-priority sprites by descending signed OAM
      // y into front-to-back hardware order. Canvas painting is the
      // opposite, so draw ascending y (back-to-front).
      if (ay !== by) return ay - by;
      // SortSprites is stable on equal y. Both equalities in this source
      // path are approached with the later-created sprite behind the
      // earlier-created one, so the reverse painter order remains
      // right->left->top on the tie tick.
      return names.indexOf(b) - names.indexOf(a);
    });
}

/**
 * BLDALPHA-blends the assembled center-logo (BG0, `ChangeBgX(0,0,SET)` +
 * `ChangeBgY(0, 0x500, SUB)` = scrollX 0/scrollY -5, empirically confirmed
 * 0/6028 opaque-pixel mismatches against the dense trace at that exact
 * offset) over whatever's already drawn (module doc's 8-bit blend formula),
 * then applies the (unlagged, BG-classified) exit-to-black fade to the
 * blended result in the same pass - equivalent to blending then fading
 * separately (verified against the dense trace both ways) but avoids a
 * second full-frame pass. No-op where the tile is transparent (index 0) -
 * the scene underneath (already exit-faded by the caller's own bgY/objY,
 * see core.ts) shows through unblended, matching BLDCNT's target-1-only
 * semantics.
 */
function applyCenterLogoBlend(fb: Uint8Array, eva: number, exitY: number): void {
  if (eva <= 0) return;
  const evb = 16 - eva;
  const tilesPerRow = centerBg.tilemap.width;
  for (let screenY = 0; screenY < 160; screenY += 1) {
    const mapY = screenY - 5;
    const tileRow = Math.floor(mapY / 8);
    const inTileY = ((mapY % 8) + 8) % 8;
    for (let screenX = 0; screenX < 240; screenX += 1) {
      const tileCol = Math.floor(screenX / 8);
      const inTileX = screenX % 8;
      const entry = centerBg.tilemap.entries[tileRow * tilesPerRow + tileCol];
      if (!entry) continue;
      const tile = centerBg.tileset.tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const idx = tile[sy * 8 + sx]!;
      if (idx === 0) continue;
      const c1 = centerBg.palette[idx];
      if (!c1) continue;
      const off = (screenY * 240 + screenX) * 4;
      const blendedR = Math.min(255, Math.floor((c1.r * eva + fb[off]! * evb) / 16));
      const blendedG = Math.min(255, Math.floor((c1.g * eva + fb[off + 1]! * evb) / 16));
      const blendedB = Math.min(255, Math.floor((c1.b * eva + fb[off + 2]! * evb) / 16));
      // blendComponentToBlack has no y<=0 fast path (paletteFade.ts) - it
      // re-quantizes through 5-bit space unconditionally, which would
      // introduce rounding drift on this already-8-bit-blended value even
      // at y=0. Skip it outright when there's no exit fade yet.
      if (exitY > 0) {
        fb[off] = blendComponentToBlack(blendedR, exitY);
        fb[off + 1] = blendComponentToBlack(blendedG, exitY);
        fb[off + 2] = blendComponentToBlack(blendedB, exitY);
      } else {
        fb[off] = blendedR;
        fb[off + 1] = blendedG;
        fb[off + 2] = blendedB;
      }
    }
  }
}

/**
 * Applies the whole CIRCLES_MEET transition overlay on top of an already-
 * rendered settled battle-room scene, keyed by `te` (battleRoom.ts's
 * "settled" phase's own `elapsed`, 0 = trace tick 843). Ticks 0-27 (843-
 * 870) are a no-op (static hold - see battleRoomRender.ts's own render for
 * that baseline). Holds solid black indefinitely past te=187 (trace tick
 * 1030) - the next slice (scene assembly, out of scope here) takes over
 * from there.
 *
 * The base scene's own exit-to-black fade (room tiles + NPCs, once
 * `te >= EXIT_FADE_START_TE`) is NOT applied here - the caller (core.ts)
 * passes `exitFadeY(te)`/`exitFadeY(te-1)` as `renderBattleRoomEntryScene`'s
 * own bgFadeY/objFadeY params, reusing that function's existing per-layer
 * fade support instead of a redundant post-process pass here.
 */
export function applyBattleTransitionOverlay(
  fb: Uint8Array,
  te: number,
  transition: FrontierCircleTransition = "circlesMeet",
): void {
  const grayY = grayFlickerY(te, transition);
  if (grayY > 0) {
    for (let i = 0; i < fb.length; i += 4) {
      fb[i] = blendComponentToGray(fb[i]!, grayY);
      fb[i + 1] = blendComponentToGray(fb[i + 1]!, grayY);
      fb[i + 2] = blendComponentToGray(fb[i + 2]!, grayY);
    }
  }
  if (transition === "asymmetricSpiralInSeq") {
    for (const name of sequentialCirclePainterOrder(te)) {
      drawCircleSprite(fb, name, te, transition);
    }
  } else {
    // Preserve the already oracle-pinned CIRCLES_MEET compositor verbatim.
    drawCircleSprite(fb, "top", te, transition);
    drawCircleSprite(fb, "left", te, transition);
    drawCircleSprite(fb, "right", te, transition);
  }
  applyCenterLogoBlend(fb, centerLogoEva(te, transition), exitFadeY(te, transition));
}
