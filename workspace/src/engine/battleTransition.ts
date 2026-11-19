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
// CIRCLES_CROSS (id 35, docs/brain-transition-wiring-design.md slice S1)
// reuses the same Circles_Init/WaitForLogoCirclesAnim/FadeInCenterLogoCircle
// state machine (sFrontierCirclesCross_Funcs, :131-138) with its own
// CirclesCross_CreateSprites geometry (:459-467) - see CROSS_CIRCLE_SPECS.
// Lands UNWIRED this slice: frontierTransitionRenderKind maps transitionId
// 35 to "circlesCross" for callers that already carry a real presentation,
// but no production path sets transitionPresentation to id 35 yet (brain
// rooms' own opponentSetupExtraRngSteps gap, see the design doc's Rung 3) -
// wiring is slice S3.
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
import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import { pickFrontierTransition } from "./opponentGen.ts";

import circlesAsset from "../assets/gen/battle-transition-frontier-circles.json" with { type: "json" };
import logoAsset from "../assets/gen/battle-transition-frontier-logo.json" with { type: "json" };
import transitionsAsset from "../data/gen/battle-transitions-frontier.json" with { type: "json" };

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

interface LogoAsset {
  palette: RgbColor[];
  tileset: CircleTileset;
  tilemap: CenterBgAsset["tilemap"];
}

interface TransitionMetaEntry {
  id: number;
  name: string;
  family: string;
}

const logo = logoAsset as LogoAsset;
const transitionMeta = transitionsAsset as { table: TransitionMetaEntry[] };

export interface FrontierTransitionPresentation {
  readonly tableIndex: number;
  readonly transitionId: number;
  readonly transitionName: string;
  readonly family: string;
  readonly raw: number;
}

/**
 * Source owner for `GetSpecialBattleTransition(B_TRANSITION_GROUP_B_FACTORY)`:
 * consume its one gameplay-RNG draw once, then retain an immutable render
 * receipt. Rendering accepts only the receipt and can never advance RNG.
 */
export function selectFrontierTransition(rngValue: number): {
  readonly rngValue: number;
  readonly presentation: FrontierTransitionPresentation;
} {
  const selected = pickFrontierTransition(rngValue);
  const entry = transitionMeta.table[selected.tableIndex]!;
  return {
    rngValue: selected.rngValue,
    presentation: Object.freeze({
      tableIndex: selected.tableIndex,
      transitionId: selected.transitionId,
      transitionName: entry.name,
      family: entry.family,
      raw: selected.raw,
    }),
  };
}

/**
 * Non-drawing constructor for a known table row -- for callers that already
 * have an oracle-proven table index in hand (docs/brain-transition-wiring-
 * design.md §S0's RAM-verified `gRngValue` cross-check) and need the same
 * `FrontierTransitionPresentation` shape `selectFrontierTransition` returns,
 * without a live `Random()` draw of their own. Compare-tooling's staged
 * brain-room fixtures are the intended caller: their own pinned dev-time RNG
 * seed does not reproduce the oracle battle-lab fixture's real seed (no
 * app-side seed-mapping function exists yet, §2's own open gap), so replaying
 * `selectFrontierTransition` there would draw the WRONG family for a real,
 * already-identified fixture -- this lets them carry the proven family
 * directly instead, the same "hand-derived from oracle evidence" idiom
 * `speechAcceptedFast` already uses (battleRoom.ts). `raw` has no real
 * `Random()` output behind it here (nothing downstream reads it --
 * `frontierTransitionRenderKind` dispatches on `transitionId` alone).
 */
export function frontierTransitionPresentationForTableIndex(
  tableIndex: number,
): FrontierTransitionPresentation {
  const entry = transitionMeta.table[tableIndex];
  if (entry === undefined) {
    throw new Error(`tableIndex ${tableIndex} is out of range for the frontier transition table`);
  }
  return Object.freeze({
    tableIndex,
    transitionId: entry.id,
    transitionName: entry.name,
    family: entry.family,
    raw: entry.id,
  });
}

export type FrontierCircleTransition = "circlesMeet" | "asymmetricSpiralInSeq" | "circlesCross" | "circlesMeetInSeq";
export type FrontierTransitionRenderKind = FrontierCircleTransition | "logoWave";

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

const LOGO_WAVE_FLICKER_START_TE = 34;
const LOGO_WAVE_FLICKER_END_TE = LOGO_WAVE_FLICKER_START_TE + 48;
const LOGO_WAVE_MAIN_START_TE = 84;
const LOGO_WAVE_FADE_FIRST_MAIN_AGE = 101;

/**
 * The `te` value at which `grayFlickerY`/`logoWaveGrayFlickerY` starts
 * producing a nonzero blend for the given render kind - callers that need to
 * re-derive `te` from a different clock (e.g. `renderBattleRoomState`'s
 * brain-walkup re-basing, docs/noland-brain-intro-gold-ground-truth.md §8″)
 * read this instead of duplicating the per-family constant.
 */
export function frontierTransitionFlickerStartTe(transition: FrontierTransitionRenderKind): number {
  if (transition === "logoWave") return LOGO_WAVE_FLICKER_START_TE;
  return transition === "asymmetricSpiralInSeq" ? ASYMMETRIC_SEQ_FLICKER_START_TE : FLICKER_START_TE;
}

function logoWaveGrayFlickerY(te: number): number {
  if (te < LOGO_WAVE_FLICKER_START_TE || te >= LOGO_WAVE_FLICKER_END_TE) return 0;
  const k = (te - LOGO_WAVE_FLICKER_START_TE) % 16;
  return k <= 7 ? 2 * (k + 1) : 2 * (15 - k);
}

function logoWaveMainAge(te: number): number {
  return te - LOGO_WAVE_MAIN_START_TE;
}

/** BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, RGB_BLACK), BG half. */
function logoWaveBgFadeY(te: number): number {
  const fadeAge = logoWaveMainAge(te) - LOGO_WAVE_FADE_FIRST_MAIN_AGE;
  if (fadeAge < 0) return 0;
  return Math.min(16, 2 * (Math.floor(fadeAge / 2) + 1));
}

/** UpdateNormalPaletteFade's OBJ half is one VBlank behind BG. */
function logoWaveObjFadeY(te: number): number {
  return logoWaveBgFadeY(te - 1);
}

function logoWaveSin(index: number, amplitude: number): number {
  return (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
}

function logoWaveScanlineOffset(mainAge: number, screenY: number): number {
  const n = Math.max(0, mainAge);
  const sinVal = 0x7fff - n * 2560 + (17 * n * (n - 1)) / 2;
  const amplitudeValue = n <= 70 ? 8192 : Math.max(0, 8192 - 384 * (n - 70));
  const amplitude = amplitudeValue >> 8;
  const scanlineSin = sinVal + screenY * 384;
  return logoWaveSin(Math.trunc((((scanlineSin % 0x10000) + 0x10000) % 0x10000) / 256), amplitude);
}

function logoWaveBlend(mainAge: number): { eva: number; evb: number } {
  const updates = Math.floor(Math.max(0, mainAge) / 3) + 1;
  const eva = Math.min(16, updates);
  return { eva, evb: Math.max(0, 16 - Math.max(0, updates - 16)) };
}

function applyLogoWave(fb: Uint8Array, te: number): void {
  const mainAge = logoWaveMainAge(te);
  if (mainAge < 0) return;
  const { eva, evb } = logoWaveBlend(mainAge);
  const fadeY = logoWaveBgFadeY(te);
  const mapWidth = logo.tilemap.width * 8;
  const mapHeight = logo.tilemap.height * 8;
  for (let screenY = 0; screenY < 160; screenY += 1) {
    // HBlank writes REG_BG0VOFS for the following scanline, so scanline y
    // consumes entry y-1; VBlankCB_BattleTransition resets line 0 to cameraY.
    const scrollY = screenY === 0
      ? 0
      : logoWaveScanlineOffset(mainAge, screenY - 1);
    const mapY = ((screenY + scrollY) % mapHeight + mapHeight) % mapHeight;
    const tileRow = Math.floor(mapY / 8);
    const inTileY = mapY % 8;
    for (let screenX = 0; screenX < 240; screenX += 1) {
      const mapX = screenX % mapWidth;
      const entry = logo.tilemap.entries[tileRow * logo.tilemap.width + Math.floor(mapX / 8)];
      if (!entry) continue;
      const tile = logo.tileset.tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - (mapX % 8) : mapX % 8;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const colorIndex = tile[sy * 8 + sx]!;
      if (colorIndex === 0) continue;
      const source = logo.palette[colorIndex];
      if (!source) continue;
      const off = (screenY * 240 + screenX) * 4;
      const sourceR = fadeY === 0 ? source.r : blendComponentToBlack(source.r, fadeY);
      const sourceG = fadeY === 0 ? source.g : blendComponentToBlack(source.g, fadeY);
      const sourceB = fadeY === 0 ? source.b : blendComponentToBlack(source.b, fadeY);
      fb[off] = Math.min(255, Math.floor((sourceR * eva + fb[off]! * evb) / 16));
      fb[off + 1] = Math.min(255, Math.floor((sourceG * eva + fb[off + 1]! * evb) / 16));
      fb[off + 2] = Math.min(255, Math.floor((sourceB * eva + fb[off + 2]! * evb) / 16));
    }
  }
}

export function frontierTransitionRenderKind(
  presentation: FrontierTransitionPresentation | undefined,
  fallback: FrontierCircleTransition,
): FrontierTransitionRenderKind {
  if (presentation?.transitionId === 30) return "logoWave";
  if (presentation?.transitionId === 34) return "circlesMeet";
  if (presentation?.transitionId === 35) return "circlesCross";
  if (presentation?.transitionId === 38) return "circlesMeetInSeq";
  if (presentation?.transitionId === 40) return "asymmetricSpiralInSeq";
  return fallback;
}

/**
 * Source-relative display handoff into `CB2_InitBattleInternal` /
 * `BattleIntroSlide3`. LOGO_WAVE destroys its transition task after the
 * palette fade completes; `Task_BattleStart` observes that completion and
 * installs `CB2_InitBattle` on the following callback, leaving one retained
 * black display callback. The circle routes used by the established anchor
 * have no additional displayed lag at their already-owned room seam.
 */
export function battleIntroSceneAssemblyDisplayLag(
  presentation: FrontierTransitionPresentation | undefined,
): 0 | 1 {
  return presentation?.transitionId === 30 ? 1 : 0;
}

interface CircleSpec {
  init: readonly [number, number];
  speed: readonly [number, number];
  /**
   * `CreateSlidingLogoCircleSprite`'s `delayX`/`delayY` (battle_transition_
   * frontier.c:234): `SpriteCB_LogoCircleSlide` (:267-291) only steps an
   * axis once every `delay+1` calls (`sTimerAxis` counts 0..delay, moves
   * and resets on the match) - NOT a creation-order stagger (that's
   * `createOnTimer`, the *_IN_SEQ families' own mechanism). MEET's three
   * circles are all `(0,0)` (every axis steps every call, the plain rate
   * `circleCenter` originally hardcoded); CROSS's left/right circles use
   * `(0,1)` on Y (half-rate, gated one tick behind X) - see `slideMoves`.
   */
  delay: readonly [number, number];
}

/** CirclesMeet_CreateSprites (battle_transition_frontier.c:433-437) - target (120,45)/(89,97)/(151,97) is implicit in 48 ticks * speed. */
const MEET_CIRCLE_SPECS: Record<"top" | "left" | "right", CircleSpec> = {
  top: { init: [120, -51], speed: [0, 2], delay: [0, 0] },
  left: { init: [-7, 193], speed: [2, -2], delay: [0, 0] },
  right: { init: [247, 193], speed: [-2, -2], delay: [0, 0] },
};

/**
 * CirclesCross_CreateSprites (battle_transition_frontier.c:459-467; params
 * also pre-extracted at src/data/gen/battle-transitions-frontier.json table
 * index 5). Same shared targets (120,45)/(89,97)/(151,97) as MEET - `top`
 * enters from below sliding up, `left`/`right` enter from the horizontal
 * screen edges (already almost on-screen) and cross paths converging on
 * the opposite target, per docs/brain-transition-wiring-design.md §1's
 * silver identification.
 */
const CROSS_CIRCLE_SPECS: Record<"top" | "left" | "right", CircleSpec> = {
  top: { init: [120, 197], speed: [0, -4], delay: [0, 0] },
  left: { init: [241, 59], speed: [-4, 2], delay: [0, 1] },
  right: { init: [-1, 59], speed: [4, 2], delay: [0, 1] },
};

/**
 * Number of `SpriteCB_LogoCircleSlide` calls (relative to `CIRCLE_ANCHOR_TE`)
 * until all three CROSS circles simultaneously reach their shared targets -
 * the CROSS analog of `CIRCLE_SLIDE_TICKS`. Derived (not hand-fit) from
 * CROSS_CIRCLE_SPECS' own geometry: `top` needs 152/4=38 Y-axis moves at
 * delay 0 (steps every call, so 38 calls); `left`/`right` need 152/4=38
 * X-axis moves at delay 0 (38 calls) and, independently, 38/2=19 Y-axis
 * moves at delay 1 (steps every 2nd call, so 19*2=38 calls) - all three
 * circles' both axes land on their target on the exact same 38th call
 * (cross-checked call-by-call against the literal source algorithm, zero
 * divergence through call 45).
 */
const CROSS_SLIDE_TICKS = 38;

/**
 * `WaitForLogoCirclesAnim`/`FadeInCenterLogoCircle` are shared, family-
 * independent code (same `TransitionStateFunc` array entries for every
 * `sFrontierCircles*_Funcs`, battle_transition_frontier.c:122-191) - only
 * the slide's own duration (`CIRCLE_SLIDE_TICKS` vs `CROSS_SLIDE_TICKS`)
 * differs per family. The "+1" (dummy-callback detection lag) and "+50"
 * (`FadeInCenterLogoCircle`'s own fixed tBlend/tFadeTimer run) deltas are
 * therefore the same constants MEET's own BLEND_START_TE/EXIT_FADE_START_TE
 * already encode (127-78-48=1, 177-127=50) - reapplied here against
 * CROSS_SLIDE_TICKS instead of re-derived from scratch.
 */
const CROSS_BLEND_START_TE = CIRCLE_ANCHOR_TE + CROSS_SLIDE_TICKS + 1;
const CROSS_EXIT_FADE_START_TE = CROSS_BLEND_START_TE + 50;

/** `moves(K)` for an axis stepped once every `delay+1` calls (module doc on `CircleSpec.delay`): floor(K/(delay+1)). Delay 0 reduces to K (steps every call). */
function slideMoves(k: number, delay: number): number {
  return Math.floor(k / (delay + 1));
}

/** Sprite center at settled-elapsed `te` (module doc point 2 - anchor tick 921, linear per `slideMoves` until each family's own slide duration, then holds at target). */
export function circleCenter(
  name: "top" | "left" | "right",
  te: number,
  transition: FrontierCircleTransition = "circlesMeet",
): { x: number; y: number } {
  const specs = transition === "circlesCross" ? CROSS_CIRCLE_SPECS : MEET_CIRCLE_SPECS;
  const slideTicks = transition === "circlesCross" ? CROSS_SLIDE_TICKS : CIRCLE_SLIDE_TICKS;
  const spec = specs[name];
  const k = Math.max(0, Math.min(te - CIRCLE_ANCHOR_TE, slideTicks));
  return {
    x: spec.init[0] + spec.speed[0] * slideMoves(k, spec.delay[0]),
    y: spec.init[1] + spec.speed[1] * slideMoves(k, spec.delay[1]),
  };
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

interface SlideInSeqSpec {
  init: readonly [number, number];
  speed: readonly [number, number];
  createOnTimer: number;
}

/**
 * CirclesMeetInSeq_CreateSprites (battle_transition_frontier.c:537-555,
 * params also pre-extracted at transitionMeta.table[8].params.sprites) -
 * same 3 targets as plain CIRCLES_MEET (target implicit in ticks*speed, as
 * CIRCLE_SPECS notes above), doubled per-tick speed, and each circle
 * created on its own task-timer tick (0/16/32 - a real 16-tick stagger,
 * `staggerFrames` in the params JSON) instead of all three at once.
 */
const CIRCLES_MEET_IN_SEQ_SPECS: Record<"top" | "left" | "right", SlideInSeqSpec> = {
  top: { init: [120, -51], speed: [0, 4], createOnTimer: 0 },
  left: { init: [-7, 193], speed: [4, -4], createOnTimer: 16 },
  right: { init: [247, 193], speed: [-4, -4], createOnTimer: 32 },
};

/** Each circle's target-init distance is 96px at 4px/tick (doubled from CIRCLE_SLIDE_TICKS' 2px/tick over 48 ticks). */
const CIRCLES_MEET_IN_SEQ_SLIDE_TICKS = 24;
/**
 * WaitForLogoCirclesAnim (battle_transition_frontier.c:420-426) waits for the LAST circle, created on task timer 32 and sliding 24 ticks:
 * FadeInCenterLogoCircle starts eight ticks later than plain MEET's (whose three circles all start together and slide 48), and the exit fade
 * (BeginNormalPaletteFade after tFadeTimer 31) with it. ROM (Noland, silver, table index 8): the center logo's blend and the fade to black
 * both start eight frames after MEET's constants (docs/parity-mac/noland-room-scenes.md).
 */
const IN_SEQ_BLEND_START_TE = CIRCLE_ANCHOR_TE + CIRCLES_MEET_IN_SEQ_SPECS.right.createOnTimer + CIRCLES_MEET_IN_SEQ_SLIDE_TICKS + 1;
const IN_SEQ_EXIT_FADE_START_TE = IN_SEQ_BLEND_START_TE + (EXIT_FADE_START_TE - BLEND_START_TE);

/**
 * Sprite center at settled-elapsed `te`, gated per circle by its own
 * creation tick (mirrors `asymmetricSpiralCircleCenter`'s `visibleTe` gate
 * above, but for straight-line instead of spiral motion - design doc
 * docs/brain-transition-wiring-design.md §3, S2). Anchored off
 * `CIRCLE_ANCHOR_TE`: `Circles_Init` (the state this family shares
 * verbatim with plain MEET) hands off to its family's `CreateSprites` at
 * the same relative offset regardless of family; MEET's own anchor is the
 * only one pixel-verified so far (module doc point 2) - this reuses it as
 * the best available base absent a dense per-tick trace for this family's
 * own fixture (design doc §1's identification was sparse-eyeballed, not
 * per-tick fit) - S3/S4 tighten this once wired and oracle-comparable.
 */
export function circlesMeetInSeqCircleCenter(
  name: "top" | "left" | "right",
  te: number,
): { x: number; y: number } | null {
  const spec = CIRCLES_MEET_IN_SEQ_SPECS[name];
  const createTe = CIRCLE_ANCHOR_TE + spec.createOnTimer;
  if (te < createTe) return null;
  const k = Math.min(te - createTe, CIRCLES_MEET_IN_SEQ_SLIDE_TICKS);
  return { x: spec.init[0] + spec.speed[0] * k, y: spec.init[1] + spec.speed[1] * k };
}

/** FadeInCenterLogoCircle's BLDALPHA target-1 (BG0) weight, 0-16 (module doc). */
export function centerLogoEva(te: number, transition: FrontierCircleTransition = "circlesMeet"): number {
  const start = transition === "asymmetricSpiralInSeq"
    ? ASYMMETRIC_SEQ_BLEND_START_TE
    : transition === "circlesCross"
    ? CROSS_BLEND_START_TE
    : transition === "circlesMeetInSeq"
    ? IN_SEQ_BLEND_START_TE
    : BLEND_START_TE;
  return Math.max(0, Math.min(te - start, 16));
}

/** The circle families' exit fade start (BeginNormalPaletteFade in FadeInCenterLogoCircle, tFadeTimer 31). */
export function frontierCircleExitFadeStartTe(transition: FrontierCircleTransition): number {
  return transition === "asymmetricSpiralInSeq"
    ? ASYMMETRIC_SEQ_EXIT_FADE_START_TE
    : transition === "circlesCross"
    ? CROSS_EXIT_FADE_START_TE
    : transition === "circlesMeetInSeq"
    ? IN_SEQ_EXIT_FADE_START_TE
    : EXIT_FADE_START_TE;
}

/** CirclesMeet_End's exit-to-black fade coefficient, 0-16 (module doc: 3-per-2-ticks, no BG/OBJ lag). */
export function exitFadeY(te: number, transition: FrontierCircleTransition = "circlesMeet"): number {
  const start = frontierCircleExitFadeStartTe(transition);
  const d = te - start;
  if (d < 0) return 0;
  const step = Math.floor(d / 2) + 1;
  return Math.min(16, 3 * step);
}

export function frontierTransitionBgFadeY(te: number, transition: FrontierTransitionRenderKind): number {
  return transition === "logoWave" ? logoWaveBgFadeY(te) : exitFadeY(te, transition);
}

export function frontierTransitionObjFadeY(te: number, transition: FrontierTransitionRenderKind): number {
  return transition === "logoWave" ? logoWaveObjFadeY(te) : exitFadeY(te - 1, transition);
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
    : transition === "circlesMeetInSeq"
    ? circlesMeetInSeqCircleCenter(name, te)
    : circleCenter(name, te, transition);
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
 * Y-ascending painter order (back to front) for CIRCLES_MEET/CIRCLES_CROSS/
 * CIRCLES_MEET_IN_SEQ - the fixed top/left/right draw order these three
 * families used before S3 (docs/brain-transition-wiring-design.md) only
 * happens to be correct for MEET (and, by the same geometry, MEET_IN_SEQ)
 * because their top circle's Y stays below left/right's Y for the WHOLE
 * slide (init -51..45 vs 193..97, i.e. top < leftRight throughout).
 * CROSS's top circle instead STARTS above left/right in Y (init 197 vs 59)
 * and crosses below them partway through its own 38-tick slide (~k 27-28,
 * derived algebraically from both families' own linear Y formulas) - a
 * real z-order flip a fixed draw order can't reproduce; a dense per-tick
 * silver fixture compare (factory-brain-silver-walkup-speech-flicker-
 * off.json local frames 98-99, right where the circles first begin to
 * visibly overlap) caught exactly this as a ~1px ring-edge mismatch at the
 * top/left and top/right overlap boundaries. Ties (left vs right, which
 * share the same Y formula by mirror-symmetric construction for every one
 * of these three families, so always tie) keep the pre-existing oracle-
 * verified relative order (left drawn before/behind right) via ascending
 * name index - unlike `sequentialCirclePainterOrder`'s own reversed tie
 * convention above, which is specific to that OTHER family's different
 * creation order/task-timer stagger. A circle not yet created
 * (`circlesMeetInSeqCircleCenter`'s own `null` before its `createOnTimer`
 * tick) sorts last; `drawCircleSprite`'s own null-check already no-ops it
 * regardless of position, so this can't reorder anything visible.
 */
function slidingCirclePainterOrder(
  te: number,
  transition: FrontierCircleTransition,
): Array<"top" | "left" | "right"> {
  const names: Array<"top" | "left" | "right"> = ["top", "left", "right"];
  const y = (name: "top" | "left" | "right"): number => {
    if (transition === "circlesMeetInSeq") {
      const center = circlesMeetInSeqCircleCenter(name, te);
      return center === null ? Number.POSITIVE_INFINITY : center.y;
    }
    return circleCenter(name, te, transition).y;
  };
  return names.slice().sort((a, b) => {
    const ay = y(a);
    const by = y(b);
    if (ay !== by) return ay - by;
    return names.indexOf(a) - names.indexOf(b);
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
  transition: FrontierTransitionRenderKind = "circlesMeet",
): void {
  const grayY = transition === "logoWave"
    ? logoWaveGrayFlickerY(te)
    : grayFlickerY(te, transition);
  if (grayY > 0) {
    for (let i = 0; i < fb.length; i += 4) {
      fb[i] = blendComponentToGray(fb[i]!, grayY);
      fb[i + 1] = blendComponentToGray(fb[i + 1]!, grayY);
      fb[i + 2] = blendComponentToGray(fb[i + 2]!, grayY);
    }
  }
  if (transition === "logoWave") {
    applyLogoWave(fb, te);
    return;
  }
  if (transition === "asymmetricSpiralInSeq") {
    for (const name of sequentialCirclePainterOrder(te)) {
      drawCircleSprite(fb, name, te, transition);
    }
  } else if (te > CIRCLE_ANCHOR_TE) {
    // Y-ascending dynamic paint order (`slidingCirclePainterOrder` above) -
    // see that function's own doc for why a fixed top/left/right order is
    // wrong for CROSS partway through its slide.
    //
    // The `te > CIRCLE_ANCHOR_TE` guard (S3, docs/brain-transition-wiring-
    // design.md): `circleCenter` is a pure position FORMULA and, by design
    // (its own pinned tests), still returns each circle's clamped `init`
    // position for te at/before the anchor - this gate is a separate
    // decision, "is a sprite there to draw at all yet." MEET's `init`
    // values are far enough off-screen (verified: originY clips for top;
    // originY clips for left/right) that drawing them at te===
    // CIRCLE_ANCHOR_TE was an invisible no-op - masking that this branch
    // was missing the same "not created yet" gate
    // `circlesMeetInSeqCircleCenter`/`asymmetricSpiralCircleCenter` already
    // encode via their own null return. CROSS's own `init` values are
    // deliberately near-edge (`(241,59)`/`(-1,59)`, design doc §1's own
    // "already almost fully on-screen at the horizontal edges" finding) -
    // the exact real spawn shape the source uses - so the missing gate
    // produced a real, visible bug for CROSS specifically: a chunk of
    // circle sprite pinned at the screen edge well before the real game
    // ever creates it. Strict `>` (not `>=`), not just "not `te<anchor`":
    // dense per-tick oracle evidence for CROSS's own fixture
    // (factory-brain-silver-walkup-speech-flicker-off.json local frames
    // 77-79) shows the real circles are STILL absent at te===
    // CIRCLE_ANCHOR_TE (78) and first visible one tick later, at
    // CIRCLE_ANCHOR_TE+1 (79) - already at their te=79 slid position (k=1
    // via the unmodified `circleCenter` formula), not held an extra tick
    // at init - i.e. creation and first paint are one tick apart, not the
    // same tick. Adding the gate here (not to `circleCenter` itself, which
    // stays a pure formula with its own already-pinned pre-anchor-returns-
    // init tests unmoved) fixes CROSS while being a byte-identical no-op
    // for MEET and every other already-guarded window (MEET is off-screen
    // at both te===anchor and te===anchor+1 alike, so shifting which one
    // is the first *drawn* tick changes zero visible pixels there).
    for (const name of slidingCirclePainterOrder(te, transition)) {
      drawCircleSprite(fb, name, te, transition);
    }
  }
  applyCenterLogoBlend(fb, centerLogoEva(te, transition), exitFadeY(te, transition));
}
