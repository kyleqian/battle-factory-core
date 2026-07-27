export const METALLIC_SHINE_SWEEP_PIXELS = 128;
export const METALLIC_SHINE_STEP_PIXELS = 4;
export const METALLIC_SHINE_SWEEP_CALLBACKS =
  METALLIC_SHINE_SWEEP_PIXELS / METALLIC_SHINE_STEP_PIXELS;
export const METALLIC_SHINE_CLEAR_AGE = METALLIC_SHINE_SWEEP_CALLBACKS * 2;
export const METALLIC_SHINE_END_AGE = METALLIC_SHINE_SWEEP_CALLBACKS * 3;

export interface MetallicShineState {
  readonly active: boolean;
  readonly data10: number;
  readonly data11: number;
  readonly bg1X: number;
  readonly bg1Y: number;
  readonly maskSpriteActive: boolean;
  readonly metalBgLoaded: boolean;
  readonly attackerGrayscale: boolean;
  readonly objWindowEnabled: boolean;
  readonly blendEnabled: boolean;
}

/**
 * Source reducer for `AnimTask_MetallicShine`.
 *
 * `age=0` is the initializer tick. The installed callback first runs at
 * age 1, moves BG1_X by four pixels, wraps every 128 pixels, clears the
 * copied OBJ-window sprite/BG and restores the attacker palette after two
 * sweeps, then tears down the registers/task after the third sweep.
 */
export function metallicShineAtAge(
  age: number,
  attackerX: number,
  attackerY: number,
  permanent = false,
): MetallicShineState {
  const initialX = -attackerX + 96;
  const initialY = -attackerY + 32;
  if (age < 0) {
    return {
      active: false, data10: 0, data11: 0,
      bg1X: 0, bg1Y: 0, maskSpriteActive: false, metalBgLoaded: false,
      attackerGrayscale: false, objWindowEnabled: false, blendEnabled: false,
    };
  }
  const callbacks = Math.min(age, METALLIC_SHINE_END_AGE);
  const data11 = Math.floor(callbacks / METALLIC_SHINE_SWEEP_CALLBACKS);
  const data10 = callbacks === METALLIC_SHINE_END_AGE
    ? 0
    : (callbacks * METALLIC_SHINE_STEP_PIXELS) % METALLIC_SHINE_SWEEP_PIXELS;
  const active = age < METALLIC_SHINE_END_AGE;
  const metalVisible = age < METALLIC_SHINE_CLEAR_AGE;
  return {
    active,
    data10,
    data11,
    bg1X: initialX - data10,
    bg1Y: initialY,
    maskSpriteActive: metalVisible,
    metalBgLoaded: metalVisible,
    attackerGrayscale: age < METALLIC_SHINE_CLEAR_AGE || permanent,
    objWindowEnabled: active,
    blendEnabled: active,
  };
}

