/**
 * Source-shaped reducer for MOVE_DISABLE.
 *
 * Source:
 * - `data/battle_anim_scripts.s:Move_DISABLE` (0x082d3a67 through
 *   `Move_RECOVER` at 0x082d3a95)
 * - `battle_anim_effects_2.c:AnimTask_GrowAndGrayscale` /
 *   `AnimTask_GrowAndGrayscale_Step` (0x081045b0 / 0x08104614)
 * - `battle_anim_status_effects.c:gSpinningSparkleSpriteTemplate` /
 *   `sAnim_SpinningSparkle`
 * - `battle_anim_mons.c:AnimSpinningSparkle` for the side-relative
 *   `ANIM_ATTACKER` (+24/-24, -16) placement.
 *
 * Ages are source-relative: age 0 is the first frame whose interpreter
 * pointer lies in `Move_DISABLE`.  The reducer deliberately preserves RAM
 * truth.  Scene-ON's renderer applies the measured one-frame OAM/palette
 * scanout latch for the sparkle and `ST_OAM_OBJ_BLEND` scale task.
 */

export type DisableSide = "player" | "opponent";

export interface DisableSparkle {
  readonly x: number;
  readonly y: number;
  readonly tileOffset: 0 | 16 | 32 | 48 | 64;
  /** attacker subpriority - 13: 17 player-back / 27 opponent-front. */
  readonly subpriority: number;
}

export interface DisableTargetScale {
  /** `SetSpriteRotScale(spriteId, 0xD0, 0xD0, 0)`. */
  readonly xScale: number;
  readonly yScale: number;
  /** `PrepareBattlerSpriteForRotScale(..., ST_OAM_OBJ_BLEND)`. */
  readonly objBlend: boolean;
  readonly grayscale: boolean;
  readonly doubled: boolean;
}

export interface DisableState {
  readonly age: number;
  /** `monbg ANIM_TARGET` / `clearmonbg ANIM_TARGET` own this interval. */
  readonly targetInMonBg: boolean;
  /** `Task_InitUpdateMonBg` hides the live target until the grow task unhides it. */
  readonly targetObjHidden: boolean;
  /** `setalpha 8, 8` / `blendoff`; null after source cleanup. */
  readonly alpha: Readonly<{ eva: 8; evb: 8 }> | null;
  /** Software `gSpinningSparkleSpriteTemplate` truth. */
  readonly sparkle: DisableSparkle | null;
  /** Software `AnimTask_GrowAndGrayscale` OAM/palette truth. */
  readonly targetScale: DisableTargetScale | null;
  /**
   * Measured OBJ scanout truth.  The task's RAM reset lands before OAM's
   * final scale scanout, while the palette restore has already landed, so
   * the final display tick is scaled-but-original-color.
   */
  readonly displayedTargetScale: DisableTargetScale | null;
  readonly visualTaskCount: number;
  /** `loopsewithpan SE_M_BIND, ..., 15, 4` task lifecycle. */
  readonly soundTaskCount: number;
  /** First inactive interpreter cleanup row is age 112. */
  readonly active: boolean;
}

export const DISABLE_WINDOW_FRAMES = 113;
export const DISABLE_MONBG_FIRST_AGE = 4;
export const DISABLE_MONBG_LAST_AGE = 110;
export const DISABLE_ALPHA_FIRST_AGE = 7;
export const DISABLE_ALPHA_LAST_AGE = 107;
export const DISABLE_SPARKLE_FIRST_AGE = 7;
export const DISABLE_SPARKLE_LAST_AGE = 22;
export const DISABLE_GROW_FIRST_AGE = 24;
export const DISABLE_GROW_LAST_AGE = 103;
export const DISABLE_BIND_SOUND_FIRST_AGE = 24;
export const DISABLE_BIND_SOUND_LAST_AGE = 70;

/** `sAnim_SpinningSparkle`: five 3-frame tile ranges, 0..64. */
export function disableSparkleTileOffsetAtAge(age: number): 0 | 16 | 32 | 48 | 64 {
  const local = age - DISABLE_SPARKLE_FIRST_AGE;
  if (local < 2) return 0;
  if (local < 5) return 16;
  if (local < 8) return 32;
  if (local < 11) return 48;
  return 64;
}

export function disableSparkleAtAge(
  age: number,
  attackerAnimationCenter: Readonly<{ x: number; y: number }>,
  side: DisableSide,
): DisableSparkle | null {
  if (age < DISABLE_SPARKLE_FIRST_AGE || age > DISABLE_SPARKLE_LAST_AGE) return null;
  return {
    // `AnimSpinningSparkle` reverses arg0 only for the opponent-side attacker.
    x: attackerAnimationCenter.x + (side === "player" ? 24 : -24),
    // `SetSpriteCoordsToAnimAttackerCoords` uses the player-back picture
    // coordinate (animation center + 8 px for Drowzee) but the opponent
    // front picture coordinate directly.  Thus the same `arg1=-16` lands at
    // y=85 from player center 93 and y=31 from opponent center 47.
    y: attackerAnimationCenter.y + (side === "player" ? -8 : -16),
    tileOffset: disableSparkleTileOffsetAtAge(age),
    subpriority: side === "player" ? 17 : 27,
  };
}

/**
 * OAM/matrix/palette scanout for the grow task.  RAM starts the task at 24;
 * hardware first paints it at 25.  Its final gray frame is 104, followed by
 * the source's distinctive age-105 scaled/original-palette tail before the
 * neutral OAM state reaches the framebuffer at 106.
 */
export function disableDisplayedTargetScaleAtAge(age: number): DisableTargetScale | null {
  if (age >= DISABLE_GROW_FIRST_AGE + 1 && age <= DISABLE_GROW_LAST_AGE + 1) {
    return { xScale: 0xd0, yScale: 0xd0, objBlend: true, grayscale: true, doubled: true };
  }
  if (age === DISABLE_GROW_LAST_AGE + 2) {
    return { xScale: 0xd0, yScale: 0xd0, objBlend: true, grayscale: false, doubled: true };
  }
  return null;
}

export function disableAtAge(
  age: number,
  attackerAnimationCenter: Readonly<{ x: number; y: number }>,
  side: DisableSide,
): DisableState {
  const grows = age >= DISABLE_GROW_FIRST_AGE && age <= DISABLE_GROW_LAST_AGE;
  return {
    age,
    targetInMonBg: age >= DISABLE_MONBG_FIRST_AGE && age <= DISABLE_MONBG_LAST_AGE,
    targetObjHidden: age >= DISABLE_MONBG_FIRST_AGE && age < DISABLE_GROW_FIRST_AGE,
    alpha: age >= DISABLE_ALPHA_FIRST_AGE && age <= DISABLE_ALPHA_LAST_AGE
      ? { eva: 8, evb: 8 }
      : null,
    sparkle: disableSparkleAtAge(age, attackerAnimationCenter, side),
    targetScale: grows
      ? { xScale: 0xd0, yScale: 0xd0, objBlend: true, grayscale: true, doubled: true }
      : null,
    displayedTargetScale: disableDisplayedTargetScaleAtAge(age),
    visualTaskCount: Number(age >= DISABLE_SPARKLE_FIRST_AGE && age <= DISABLE_SPARKLE_LAST_AGE)
      + Number(grows),
    soundTaskCount: Number(
      age >= DISABLE_BIND_SOUND_FIRST_AGE && age <= DISABLE_BIND_SOUND_LAST_AGE,
    ),
    active: age >= 0 && age < DISABLE_WINDOW_FRAMES - 1,
  };
}
