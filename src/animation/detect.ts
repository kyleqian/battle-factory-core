/**
 * Source-shaped reducer for MOVE_DETECT.
 *
 * Source:
 * - `data/battle_anim_scripts.s:Move_DETECT` (`.4byte` table entry, id 197)
 * - `battle_anim_status_effects.c:gSpinningSparkleSpriteTemplate` +
 *   `sAnim_SpinningSparkle` (FRAME 0/16/32/48/64, 3 ticks each)
 * - `battle_anim_mons.c:AnimSpinningSparkle` (place once at
 *   `SetSpriteCoordsToAnimAttackerCoords` + arg0 on the player side /
 *   -arg0 on the opponent side, + arg1 y; then wait for the anim end)
 * - `battle_anim_utility_funcs.c:AnimTask_BlendBattleAnimPal` /
 *   `StartBlendAnimSpriteColor` / `AnimTask_BlendSpriteColor_Step2` — the
 *   F_PAL_ATTACKER toward-white ramp (deltaY 1, one step every `data[2]`+1
 *   task ticks)
 * - `battle_anim_normal.c:gSimplePaletteBlendSpriteTemplate` /
 *   `AnimSimplePaletteBlend` -> `BeginNormalPaletteFade` (the F_PAL_BG
 *   toward-black ramp, deltaY 2, one step every `delay` frames, applied on
 *   alternating OBJ/BG passes)
 *
 * Ages are move-relative: age 0 is the move script's first in-bounds frame
 * (frame 64 player-back, frame 68 opponent-front). `bgBlendY` and
 * `attackerPaletteY` are the DISPLAYED coefficients (the software
 * `gPlttBufferFaded`/`gTasks[].data[10]` ramp lags one frame behind the
 * drawn display); `sparkle` is the DISPLAYED sparkle (software spawn age 51
 * paints from age 52, software destroy age 66 clears from age 68);
 * `visualTaskCount` is the software `gAnimVisualTaskCount` truth (the two
 * F_PAL_BG blend sprites, the two F_PAL_ATTACKER tasks, and the sparkle).
 */
export type DetectSide = "player" | "opponent";

export interface DetectSparkle {
  readonly x: number;
  readonly y: number;
  readonly tileOffset: 0 | 16 | 32 | 48 | 64;
  /** Absolute OBJ subpriority (attacker-13: 17 player-back / 27 opponent-front). */
  readonly subpriority: number;
}

export interface DetectState {
  readonly age: number;
  /** Software `gAnimVisualTaskCount` (blend sprites + tasks + sparkle). */
  readonly visualTaskCount: number;
  /** Displayed F_PAL_BG toward-black coefficient. */
  readonly bgBlendY: number;
  /** Displayed F_PAL_ATTACKER toward-white coefficient. */
  readonly attackerPaletteY: number;
  /** Displayed `gSpinningSparkleSpriteTemplate` instance (never moves). */
  readonly sparkle: DetectSparkle | null;
  readonly active: boolean;
}

export const DETECT_WINDOW_FRAMES = 110;
/** Software F_PAL_BG blend sprite lives ages 4-29 (frames 68-93). */
export const DETECT_BLEND_UP_FIRST_AGE = 4;
export const DETECT_BLEND_UP_LAST_AGE = 29;
/** Software F_PAL_ATTACKER up task lives ages 31-48 (frames 95-112). */
export const DETECT_ATTACKER_UP_FIRST_AGE = 31;
export const DETECT_ATTACKER_UP_LAST_AGE = 48;
/** Software sparkle lives ages 51-66 (frames 115-130). */
export const DETECT_SPARKLE_SOFTWARE_FIRST_AGE = 51;
export const DETECT_SPARKLE_SOFTWARE_LAST_AGE = 66;
/** Displayed sparkle: painted age 52 (software +1), cleared age 68. */
export const DETECT_SPARKLE_DISPLAY_FIRST_AGE = 52;
export const DETECT_SPARKLE_DISPLAY_LAST_AGE = 67;
/** Software F_PAL_BG down-blend sprite + F_PAL_ATTACKER down task ages 80+. */
export const DETECT_BLEND_DOWN_FIRST_AGE = 80;
export const DETECT_BLEND_DOWN_LAST_AGE = 105;
export const DETECT_ATTACKER_DOWN_LAST_AGE = 107;

/**
 * Displayed F_PAL_BG toward-black coefficient (`BeginNormalPaletteFade`
 * deltaY 2 schedule, one display behind the software ramp). Displayed values
 * hold 4 frames: 0,2,4,6,8 (ages 0-23), 9 (24-83), then 7,5,3,1,0.
 */
export function detectBgBlendYAtAge(age: number): number {
  if (age < 8) return 0;
  if (age < 12) return 2;
  if (age < 16) return 4;
  if (age < 20) return 6;
  if (age < 24) return 8;
  if (age < 84) return 9;
  if (age < 88) return 7;
  if (age < 92) return 5;
  if (age < 96) return 3;
  if (age < 100) return 1;
  return 0;
}

/**
 * Displayed F_PAL_ATTACKER toward-white coefficient. The software
 * `AnimTask_BlendSpriteColor_Step2` data[10] ramp runs 0..9 up and 9..0
 * down; the displayed ramp is 0,1,2..9 (ages 34-50) then 9..1,0
 * (ages 85-108), each value holding 2 displayed frames.
 */
export function detectAttackerPaletteYAtAge(age: number): number {
  if (age < 34) return 0;
  if (age < 36) return 1;
  if (age < 38) return 2;
  if (age < 40) return 3;
  if (age < 42) return 4;
  if (age < 44) return 5;
  if (age < 46) return 6;
  if (age < 48) return 7;
  if (age < 50) return 8;
  if (age < 85) return 9;
  if (age < 88) return 8;
  if (age < 91) return 7;
  if (age < 94) return 6;
  if (age < 97) return 5;
  if (age < 100) return 4;
  if (age < 103) return 3;
  if (age < 106) return 2;
  if (age < 109) return 1;
  return 0;
}

/**
 * Displayed sparkle anim: the 3-tick `sAnim_SpinningSparkle` frame program
 * (tile offsets 0/16/32/48/64), started one display behind the software
 * spawn (age 52) and holding the last frame through the software destroy
 * +1 (age 67).
 */
export function detectSparkleTileOffsetAtAge(age: number): 0 | 16 | 32 | 48 | 64 {
  if (age < 54) return 0;
  if (age < 57) return 16;
  if (age < 60) return 32;
  if (age < 63) return 48;
  return 64;
}

export function detectSparkleAtAge(
  age: number,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  side: DetectSide,
): DetectSparkle | null {
  if (age < DETECT_SPARKLE_DISPLAY_FIRST_AGE || age > DETECT_SPARKLE_DISPLAY_LAST_AGE) {
    return null;
  }
  return {
    // AnimSpinningSparkle: SetSpriteCoordsToAnimAttackerCoords then arg0 on
    // the player side / -arg0 on the opponent side, then +arg1.
    x: attackerPictureOffset.x + (side === "player" ? 20 : -20),
    y: attackerPictureOffset.y - 20,
    tileOffset: detectSparkleTileOffsetAtAge(age),
    // Absolute OBJ subpriority = attacker's own subpriority (30 player-back
    // / 40 opponent-front) minus 13, so the sparkle always paints in front
    // of both battlers; the back-to-front painter order flips with side.
    subpriority: side === "player" ? 17 : 27,
  };
}

/** Software `gAnimVisualTaskCount` truth (blend sprites + tasks + sparkle). */
export function detectVisualTaskCountAtAge(age: number): number {
  let count = 0;
  if (age >= DETECT_BLEND_UP_FIRST_AGE && age <= DETECT_BLEND_UP_LAST_AGE) count += 1;
  if (age >= DETECT_ATTACKER_UP_FIRST_AGE && age <= DETECT_ATTACKER_UP_LAST_AGE) count += 1;
  if (age >= DETECT_SPARKLE_SOFTWARE_FIRST_AGE && age <= DETECT_SPARKLE_SOFTWARE_LAST_AGE) count += 1;
  if (age >= DETECT_BLEND_DOWN_FIRST_AGE && age <= DETECT_BLEND_DOWN_LAST_AGE) count += 1;
  if (age >= DETECT_BLEND_DOWN_FIRST_AGE && age <= DETECT_ATTACKER_DOWN_LAST_AGE) count += 1;
  return count;
}

export function detectAtAge(
  age: number,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  side: DetectSide,
): DetectState {
  return {
    age,
    visualTaskCount: detectVisualTaskCountAtAge(age),
    bgBlendY: detectBgBlendYAtAge(age),
    attackerPaletteY: detectAttackerPaletteYAtAge(age),
    sparkle: detectSparkleAtAge(age, attackerPictureOffset, side),
    active: age >= 0 && age < DETECT_WINDOW_FRAMES - 1,
  };
}
