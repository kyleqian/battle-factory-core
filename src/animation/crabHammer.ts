import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
  type SlideMonBattlerSide,
} from "./slideMon.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

/** RAM-frame count from `Move_CRABHAMMER` entry through inactive cleanup. */
export const CRABHAMMER_FRAME_COUNT = 105;
export const CRABHAMMER_PLAYER_START_FRAME = 212;
export const CRABHAMMER_OPPONENT_START_FRAME = 302;
export const CRABHAMMER_ORIENTATION_FRAME_SHIFT =
  CRABHAMMER_OPPONENT_START_FRAME - CRABHAMMER_PLAYER_START_FRAME;

/** The two asset-loads are observable through `sSpritePaletteTags`. */
export const ICE_CRYSTALS_LOAD_AGE = 1;
export const WATER_IMPACT_LOAD_AGE = 4;
/** `monbg ANIM_DEF_PARTNER` hides the target OBJ while its BG copy remains. */
export const MONBG_AGE = 7;
/** `setalpha 12,8` and the initial WATER_IMPACT hitsplat. */
export const CONTACT_AGE = 10;
/** `complex_palette_blend` and the target slide-to-offset are created together. */
export const OFFSET_SLIDE_AGE = 13;
/** `gSlideMonToOriginalPosSpriteTemplate` starts returning the target. */
export const ORIGINAL_SLIDE_AGE = 32;
/** First eight-bubble-pair / `AnimTask_ShakeMon` creation age. */
export const BUBBLE_FIRST_AGE = 37;
/** `clearmonbg` + `blendoff`; the final source frame is inactive cleanup. */
export const CLEANUP_AGE = 100;

export interface CrabHammerGeometry {
  readonly targetSide: SlideMonBattlerSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  /**
   * Live target OBJ x2 immediately before the slide command.  ONIX front
   * holds +1 in the player-back evidence, while ONIX back holds 0 in the
   * opponent-front evidence.  The slide command replaces this field rather
   * than adding to it, and the return leaves it at 0.
   */
  readonly targetIdleX2: number;
}

export interface CrabHammerBubblePair {
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly subpriority: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data0: number;
  readonly data1: number;
  readonly remaining: number;
}

export interface CrabHammerWaterHitsplat {
  readonly slot: 3;
  readonly subpriority: number;
  readonly x: number;
  readonly y: number;
  readonly matrix: Readonly<{ a: 256; b: 0; c: 0; d: 256 }>;
  readonly callback: "AnimHitSplatBasic" | "DestroyAnimSprite";
}

export interface CrabHammerSlide {
  readonly kind: "to-offset" | "to-original";
  readonly slot: 3 | 5;
  readonly subpriority: number;
  readonly x: number;
  readonly y: number;
}

export interface CrabHammerShakeTask {
  readonly slot: 2;
  readonly xOffset: 0;
  readonly yOffset: 4;
  readonly numTimes: 8;
  readonly frameDelay: 1;
  /** `tick=0` is the source's creation write, not retained in a probe row. */
  readonly tick: number;
}

export interface CrabHammerComplexPaletteBlend {
  readonly slot: 4;
  readonly subpriority: number;
  readonly selector: 31;
  readonly active: boolean;
  /** First write is `RGB(13,21,31),10`; the age-16 write restores neutral. */
  readonly color: 0x7ead | null;
  readonly coefficient: 10 | 0;
}

export interface CrabHammerState {
  readonly active: boolean;
  readonly assetsLoaded: Readonly<{
    readonly iceCrystals: boolean;
    readonly waterImpact: boolean;
  }>;
  readonly targetMonbg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetX2: number;
  readonly targetY2: number;
  readonly waterHitsplat: CrabHammerWaterHitsplat | null;
  readonly slides: readonly CrabHammerSlide[];
  readonly shakeTask: CrabHammerShakeTask | null;
  readonly bubbles: readonly CrabHammerBubblePair[];
  readonly complexPaletteBlend: CrabHammerComplexPaletteBlend | null;
  readonly scriptOffset: number;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
}

/**
 * These are separate measurements from the committed dense change maps, not
 * a category-wide timing rule. `ram-only` means the RAM command was observed
 * but has no independently observable framebuffer edge in this clean window.
 */
export const CRABHAMMER_DISPLAY_LAG = {
  waterHitsplat: 1,
  slideToOffset: 1,
  slideToOriginal: 1,
  smallBubblePair: 1,
  shakeMon: 1,
  complexPaletteFirstWrite: 1,
  complexPaletteClearWrite: 1,
  monbg: "ram-only",
  setalpha: "ram-only",
  clearmonbgAndBlendoff: "ram-only",
} as const;

const BUBBLE_START_AGES = [37, 43, 49, 55, 61, 67, 73, 79] as const;
const BUBBLE_OFFSETS = [
  { x: 10, y: 10 },
  { x: 20, y: -20 },
  { x: -15, y: 15 },
  { x: 0, y: 0 },
  { x: -10, y: -20 },
  { x: 16, y: -8 },
  { x: 5, y: 8 },
  { x: -16, y: 0 },
] as const;
const BUBBLE_OAM_SLOTS = [3, 4, 5, 7, 3, 4, 5, 7] as const;
const BUBBLE_LIFETIME = 20;

function targetSubpriority(geometry: CrabHammerGeometry, relative: number): number {
  return (geometry.targetSide === "player" ? 36 : 26) + relative;
}

function scriptOffsetAtAge(age: number): number {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 9) return 8;
  if (age <= 12) return 32;
  if (age <= 21) return 70;
  if (age <= 31) return 73;
  if (age <= 36) return 87;
  if (age <= 42) return 128;
  if (age <= 48) return 145;
  if (age <= 54) return 162;
  if (age <= 60) return 179;
  if (age <= 66) return 196;
  if (age <= 72) return 213;
  if (age <= 78) return 230;
  if (age <= 99) return 245;
  return 249;
}

function targetSlideX2(age: number, geometry: CrabHammerGeometry): number {
  if (age >= ORIGINAL_SLIDE_AGE && age < ORIGINAL_SLIDE_AGE + 4) {
    const initialX2 = slideMonToOffsetAtTick({
      battlerSide: geometry.targetSide,
      targetXOffset: -24,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: 4,
    }, 3).x2;
    return slideMonToOriginalPosAtTick({
      currentX2: initialX2,
      currentY2: 0,
      axisSnapMode: 0,
      durationTicks: 4,
    }, age - ORIGINAL_SLIDE_AGE).x2;
  }
  if (age >= OFFSET_SLIDE_AGE && age < ORIGINAL_SLIDE_AGE) {
    return slideMonToOffsetAtTick({
      battlerSide: geometry.targetSide,
      targetXOffset: -24,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: 4,
    }, age - OFFSET_SLIDE_AGE).x2;
  }
  return age < OFFSET_SLIDE_AGE ? geometry.targetIdleX2 : 0;
}

function bubbleAtAge(
  age: number,
  spawnIndex: number,
  geometry: CrabHammerGeometry,
): CrabHammerBubblePair | null {
  const startAge = BUBBLE_START_AGES[spawnIndex]!;
  const localAge = age - startAge;
  if (localAge < 0 || localAge >= BUBBLE_LIFETIME) return null;
  const offset = BUBBLE_OFFSETS[spawnIndex]!;
  const data0 = (11 * (localAge + 1)) & 0xff;
  const data1 = 48 * (localAge + 1);
  return {
    spawnIndex,
    oamSlot: BUBBLE_OAM_SLOTS[spawnIndex]!,
    subpriority: targetSubpriority(geometry, 2),
    x: geometry.targetCenter.x + (geometry.targetSide === "player" ? -offset.x : offset.x),
    y: geometry.targetCenter.y + offset.y,
    x2: Math.floor(GBA_SINE_TABLE_256[data0]! * 4 / 256),
    y2: data1 < 0x100 ? 0 : -(data1 >> 8),
    data0,
    data1,
    remaining: BUBBLE_LIFETIME - localAge - 1,
  };
}

/**
 * Source-relative RAM truth for the whole `Move_CRABHAMMER` body.  This is
 * intentionally only the presentation seam: it never reads damage, turn
 * order, RNG, or facility state.
 */
export function crabHammerAtAge(
  age: number,
  geometry: CrabHammerGeometry,
): CrabHammerState {
  const bubbles = BUBBLE_START_AGES.flatMap((_, index) => {
    const bubble = bubbleAtAge(age, index, geometry);
    return bubble ? [bubble] : [];
  });
  const shakeTask = age >= BUBBLE_FIRST_AGE && age <= 50
    ? {
        slot: 2 as const,
        xOffset: 0 as const,
        yOffset: 4 as const,
        numTimes: 8 as const,
        frameDelay: 1 as const,
        tick: age - (BUBBLE_FIRST_AGE - 1),
      }
    : null;
  const targetY2 = shakeTask
    ? shakeMonOffsetAtTick(
        shakeTask.xOffset,
        shakeTask.yOffset,
        shakeTask.numTimes,
        shakeTask.frameDelay,
        shakeTask.tick,
      ).y2
    : 0;
  const waterHitsplat = age >= CONTACT_AGE && age <= 18
    ? {
        slot: 3 as const,
        subpriority: targetSubpriority(geometry, 0),
        x: geometry.targetCenter.x,
        y: geometry.targetCenter.y,
        matrix: { a: 256 as const, b: 0 as const, c: 0 as const, d: 256 as const },
        callback: age === 18 ? "DestroyAnimSprite" as const : "AnimHitSplatBasic" as const,
      }
    : null;
  const slides: CrabHammerSlide[] = [];
  if (age >= OFFSET_SLIDE_AGE && age <= 17) {
    slides.push({
      kind: "to-offset",
      slot: 5,
      subpriority: targetSubpriority(geometry, 2),
      x: geometry.targetCenter.x,
      y: geometry.targetCenter.y,
    });
  }
  if (age >= ORIGINAL_SLIDE_AGE && age <= 35) {
    slides.push({
      kind: "to-original",
      slot: 3,
      subpriority: targetSubpriority(geometry, 2),
      x: geometry.targetCenter.x,
      y: geometry.targetCenter.y,
    });
  }
  const complexPaletteBlend = age >= OFFSET_SLIDE_AGE && age <= 20
    ? {
        slot: 4 as const,
        subpriority: targetSubpriority(geometry, 2),
        selector: 31 as const,
        active: true,
        color: age <= 15 ? 0x7ead as const : null,
        coefficient: age <= 15 ? 10 as const : 0 as const,
      }
    : null;
  return {
    active: age >= 0 && age < CRABHAMMER_FRAME_COUNT - 1,
    assetsLoaded: {
      iceCrystals: age >= ICE_CRYSTALS_LOAD_AGE && age < CRABHAMMER_FRAME_COUNT - 1,
      waterImpact: age >= WATER_IMPACT_LOAD_AGE && age < CRABHAMMER_FRAME_COUNT - 1,
    },
    targetMonbg: age >= MONBG_AGE && age < CLEANUP_AGE,
    alpha: age >= CONTACT_AGE && age < CLEANUP_AGE ? { eva: 12, evb: 8 } : null,
    targetX2: targetSlideX2(age, geometry),
    targetY2,
    waterHitsplat,
    slides,
    shakeTask,
    bubbles,
    complexPaletteBlend,
    scriptOffset: scriptOffsetAtAge(age),
    visualTaskCount: bubbles.length + Number(shakeTask !== null) + Number(waterHitsplat !== null)
      + slides.length + Number(complexPaletteBlend !== null),
    soundTaskCount: age >= BUBBLE_FIRST_AGE && age <= 77 ? 1 : 0,
  };
}
