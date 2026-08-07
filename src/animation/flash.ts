export const FLASH_OBJ_PALETTE_MASK = 0x0003;
export const FLASH_BG_PALETTE_MASK = 0x000e;
export const FLASH_SNAP_COEFFICIENT = 16;
export const FLASH_PHASE0_FRAME_COUNT = 7;
export const FLASH_FIRST_BLEND_COEFFICIENT = 15;
export const FLASH_LAST_BLEND_COEFFICIENT = 0;
export const FLASH_TASK_CREATE_AGE = 1;
export const FLASH_TASK_DESTROY_AGE = 40;

export interface FlashState {
  readonly age: number;
  readonly visualTaskCount: number;
  readonly objPaletteMask: number;
  readonly bgPaletteMask: number;
  /** gPlttBufferFaded blend coefficient this engine age: 16 (snap) down to
   *  0 (normal), or `null` before the task writes or after it is destroyed. */
  readonly fadedCoefficient: number | null;
}

/**
 * Source reducer for the palette RAM (`gPlttBufferFaded`) blend coefficient
 * of the `AnimTask_Flash` task (`battle_anim_utility_funcs.c:649`). `age=0`
 * is the move script's first frame (playsewithpan); the task is created one
 * engine age later. On creation every battle-mon OBJ palette (data[14] =
 * 0x0003, banks 0-1) snaps to RGB_BLACK and the BG palettes (data[15] =
 * 0x000e, banks 1-3) snap to RGB_WHITEALPHA, then phase 0 holds for 7 frames
 * and phase 1 steps the coefficient 16 down to 0 one decrement per 2 frames,
 * blending BG toward 0xFFFF and OBJ toward 0. The blend uses the UNFADED
 * palette as source, so coefficient 0 restores the normal colors; the task
 * is destroyed at age 40 leaving that restored state. A full-snap reads as
 * coefficient 16 because `BlendPalette` toward the target color at 16 equals
 * the target exactly.
 */
export function flashFadedCoefficientAtAge(age: number): number | null {
  if (age < FLASH_TASK_CREATE_AGE) return null;
  if (age < FLASH_TASK_CREATE_AGE + FLASH_PHASE0_FRAME_COUNT + 1) {
    return FLASH_SNAP_COEFFICIENT;
  }
  if (age < FLASH_TASK_DESTROY_AGE) {
    return FLASH_FIRST_BLEND_COEFFICIENT - Math.floor((age - 9) / 2);
  }
  return null;
}

export function flashAtAge(age: number): FlashState {
  return {
    age,
    visualTaskCount:
      age >= FLASH_TASK_CREATE_AGE && age < FLASH_TASK_DESTROY_AGE ? 1 : 0,
    objPaletteMask: FLASH_OBJ_PALETTE_MASK,
    bgPaletteMask: FLASH_BG_PALETTE_MASK,
    fadedCoefficient: flashFadedCoefficientAtAge(age),
  };
}
