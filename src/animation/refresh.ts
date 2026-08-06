import {
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  grantingStarFrameAtLocalAge,
  SYNTHESIS_GRANTING_STAR_DURATION,
} from "./synthesis.ts";

/**
 * Complete source-relative `Move_REFRESH` visual body
 * (`reference/pokeemerald/data/battle_anim_scripts.s:8472-8484`),
 * composed purely from already-exact sibling components:
 *
 *   1. `AnimTask_StatusClearedEffect` / `StartMonScrollingBgMask` cure-bubbles
 *      BG1 mask (the AROMATHERAPY `statusMaskAtAge` body: numFadeSteps=10,
 *      fadeStepDelay=2, duration=30, scrollSpeed=0x1A0).
 *   2. `GrantingStarsEffect` — two `gGrantingStarsSpriteTemplate` stars (the
 *      SYNTHESIS/WISH granting-star body, star frame `(local+1)/7%8`).
 *   3. `simple_palette_blend selector=F_PAL_BG | F_PAL_BATTLERS, delay=3,
 *      initial_blend_y=10, target_blend_y=0, color=RGB(12,24,30)` — a
 *      `BeginNormalPaletteFade` that fades the BG banks 1-3 and the attacking
 *      battler's OBJ palette toward RGB(12,24,30).
 *   4. `gThinRingExpandingSpriteTemplate` — the MILK_DRINK expanding ring
 *      (`32 + min(local,29)*16` scale, `0x10000/scale` matrix).
 *
 * Age 0 is the first frame of the move script body (the probe window's first
 * frame). The mask displays at ages 9..99, the two stars at 101..171, and the
 * blend + ring at 173..203; all windows and strides below are RAM/display
 * measured against the dense Scene-ON probe (`tools/compare/refreshProbe.py`).
 */

export const REFRESH_FRAME_COUNT = 209;
export const REFRESH_MASK_START_AGE = 9;
export const REFRESH_MASK_LAST_AGE = 99;
/** Source `createsprite`+`delay 8` spans ten displayed callbacks (same interpreter cadence as SYNTHESIS). */
export const REFRESH_GRANTING_STAR_STARTS = [101, 111] as const;
export const REFRESH_GRANTING_STAR_ARGS = Object.freeze([
  Object.freeze({ x: -15, y: 0 }),
  Object.freeze({ x: 12, y: -5 }),
] as const);
/** First displayed `BeginNormalPaletteFade` coefficient step (10 -> 0). */
export const REFRESH_BLEND_START_AGE = 173;
export const REFRESH_RING_START_AGE = 173;
export const REFRESH_RING_LAST_AGE = 203;

export interface RefreshMask {
  readonly active: boolean;
  readonly scrollY: number;
  readonly eva: number;
  readonly evb: number;
}

export interface RefreshGrantingStar {
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
}

export interface RefreshRing {
  readonly x: number;
  readonly y: number;
  readonly matrixScale: number;
}

export interface RefreshState {
  readonly active: boolean;
  readonly visualTaskCount: number;
  readonly mask: RefreshMask;
  readonly stars: readonly RefreshGrantingStar[];
  /** `gPlttBufferFaded` BG banks 1-3 coefficient (displayed). */
  readonly bgBlendCoeff: number;
  /** `gPlttBufferFaded` attacking battler OBJ bank coefficient (displayed one frame behind the BG banks). */
  readonly attackerBlendCoeff: number;
  readonly ring: RefreshRing | null;
}

/**
 * `StartMonScrollingBgMask`'s displayed fade/scroll state (identical shape
 * and cadence to AROMATHERAPY's `statusMaskAtAge`): the task is live from
 * age 7 (the `AnimTask_StatusClearedEffect` setup callbacks), the fade-in
 * ramps one step every three displayed callbacks to 10, holds 30, then
 * ramps back down every three. Displayed `gBattle_BG1_Y` scrolls
 * `floor(callbacks*0x1A0/0x100)` and stalls on the final display frame
 * before the task is destroyed.
 */
function refreshMaskAtAge(age: number): RefreshMask {
  if (age < 7 || age > REFRESH_MASK_LAST_AGE) {
    return { active: false, scrollY: 0, eva: 0, evb: 16 };
  }
  const callbacks = Math.max(0, age - 8);
  const scrollY = age >= 99 ? 146 : Math.floor(callbacks * 0x1a0 / 0x100);
  let eva = 0;
  if (callbacks <= 30) {
    eva = Math.min(10, Math.floor(callbacks / 3));
  } else if (callbacks <= 60) {
    eva = 10;
  } else {
    eva = Math.max(0, 10 - Math.floor((callbacks - 60) / 3));
  }
  return { active: true, scrollY, eva, evb: 16 - eva };
}

function refreshGrantingStarsAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): readonly RefreshGrantingStar[] {
  const stars: RefreshGrantingStar[] = [];
  for (let index = 0; index < REFRESH_GRANTING_STAR_STARTS.length; index += 1) {
    const local = age - REFRESH_GRANTING_STAR_STARTS[index]!;
    const frame = grantingStarFrameAtLocalAge(local);
    if (frame === null) continue;
    const args = REFRESH_GRANTING_STAR_ARGS[index]!;
    const callbacks = Math.min(local + 1, SYNTHESIS_GRANTING_STAR_DURATION);
    stars.push({
      spawnIndex: index,
      oamSlot: 3 + index,
      x: center.x + (side === "player" ? args.x : -args.x)
        + linearTranslationOffsetAfterCallbacks(
          0, callbacks, SYNTHESIS_GRANTING_STAR_DURATION,
        ),
      y: center.y + args.y + linearTranslationOffsetAfterCallbacks(
        32, callbacks, SYNTHESIS_GRANTING_STAR_DURATION,
      ),
      frame,
    });
  }
  return stars;
}

/**
 * Displayed `BeginNormalPaletteFade` coefficient (delay=3, 10 -> 0 by 2).
 * The BG banks fade in five-frame steps starting at `REFRESH_BLEND_START_AGE`
 * (10 for 173-176, 8 for 177-181, ...); the attacking battler's OBJ palette
 * shares the 10-at-173 start but shifts its five-frame decrement boundaries
 * one frame later (10 for 173-177, 8 for 178-182, ...) because
 * `UpdateNormalPaletteFade` alternates BG/OBJ processing across calls.
 */
export function refreshBlendCoeffAtAge(
  age: number,
  target: "bg" | "attacker",
): number {
  if (target === "bg") {
    if (age < REFRESH_BLEND_START_AGE || age > REFRESH_BLEND_START_AGE + 23) {
      return 0;
    }
    return 10 - 2 * Math.floor((age - REFRESH_BLEND_START_AGE + 1) / 5);
  }
  if (age < REFRESH_BLEND_START_AGE || age > REFRESH_BLEND_START_AGE + 24) {
    return 0;
  }
  return 10 - 2 * Math.floor((age - REFRESH_BLEND_START_AGE) / 5);
}

/**
 * The DISPLAYED `BeginNormalPaletteFade` coefficient: the `gPlttBufferFaded`
 * write latches into the hardware palette one frame later, except that the
 * blend sprite's creation call copies the whole palette (BG banks included)
 * immediately, so the BG banks display coeff 10 already at
 * `REFRESH_BLEND_START_AGE`. The attacking battler's OBJ bank is skipped on
 * that first call (`UpdateNormalPaletteFade` alternates BG/OBJ), so it shows
 * 0 at the creation age and otherwise trails one frame like the BG.
 */
export function refreshDisplayedBlendCoeffAtAge(
  age: number,
  target: "bg" | "attacker",
): number {
  if (target === "bg") {
    if (age < REFRESH_BLEND_START_AGE || age > REFRESH_BLEND_START_AGE + 24) {
      return 0;
    }
    return 10 - 2 * Math.floor((age - REFRESH_BLEND_START_AGE) / 5);
  }
  if (
    age < REFRESH_BLEND_START_AGE + 1
    || age > REFRESH_BLEND_START_AGE + 25
  ) {
    return 0;
  }
  return 10 - 2 * Math.floor((age - REFRESH_BLEND_START_AGE - 1) / 5);
}

/** `gThinRingExpandingSpriteTemplate` at the attacker's animation center (MILK_DRINK ring formula). */
function refreshRingAtAge(
  age: number,
  center: Readonly<{ x: number; y: number }>,
): RefreshRing | null {
  const local = age - REFRESH_RING_START_AGE;
  if (local < 0 || local > REFRESH_RING_LAST_AGE - REFRESH_RING_START_AGE) {
    return null;
  }
  const sourceScale = 32 + Math.min(local, 29) * 16;
  return {
    x: center.x,
    y: center.y,
    matrixScale: Math.floor(0x10000 / sourceScale),
  };
}

/** Complete source-relative Move_REFRESH body through first inactive cleanup. */
export function refreshAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): RefreshState {
  const mask = refreshMaskAtAge(age);
  const stars = refreshGrantingStarsAtAge(age, side, center);
  const ring = refreshRingAtAge(age, center);
  const star1Active = age >= REFRESH_GRANTING_STAR_STARTS[0]
    && age <= REFRESH_GRANTING_STAR_STARTS[0]! + SYNTHESIS_GRANTING_STAR_DURATION;
  const star2Active = age >= REFRESH_GRANTING_STAR_STARTS[1]
    && age <= REFRESH_GRANTING_STAR_STARTS[1]! + SYNTHESIS_GRANTING_STAR_DURATION;
  const blendSpriteActive = age >= REFRESH_BLEND_START_AGE
    && age <= REFRESH_RING_LAST_AGE;
  return {
    active: age >= 0 && age < REFRESH_FRAME_COUNT - 1,
    // The blend sprite and the ring sprite each count as a live visual entity.
    visualTaskCount: Number(mask.active)
      + Number(star1Active) + Number(star2Active)
      + 2 * Number(blendSpriteActive),
    mask,
    stars,
    bgBlendCoeff: refreshBlendCoeffAtAge(age, "bg"),
    attackerBlendCoeff: refreshBlendCoeffAtAge(age, "attacker"),
    ring,
  };
}
