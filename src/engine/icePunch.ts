// Source-composed ICE_PUNCH presentation clocks. Ages are relative to the
// first displayed `Move_ICE_PUNCH` script frame, never a battle tick.

export const ICE_PUNCH_OVERLAY_FIRST_AGE = 16;
export const ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE = 35;

export interface IcePunchOverlayState {
  readonly backgroundBlackCoeff: 0 | 2 | 4 | 6 | 7;
  readonly targetIceCoeff: number;
}

/**
 * The two source palette tasks become visible on the same three displayed
 * VBlanks. `simple_palette_blend` advances the BG ramp by two while
 * `AnimTask_BlendBattleAnimPal` advances the target ramp by one.
 */
export function icePunchOverlayState(age: number): IcePunchOverlayState {
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE) {
    return { backgroundBlackCoeff: 0, targetIceCoeff: 0 };
  }
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE + 3) {
    return { backgroundBlackCoeff: 2, targetIceCoeff: 0 };
  }
  if (age < ICE_PUNCH_OVERLAY_FIRST_AGE + 6) {
    return { backgroundBlackCoeff: 4, targetIceCoeff: 1 };
  }
  return {
    backgroundBlackCoeff:
      age < ICE_PUNCH_OVERLAY_FIRST_AGE + 9 ? 6 : 7,
    targetIceCoeff: Math.min(
      9,
      2 + Math.floor((age - (ICE_PUNCH_OVERLAY_FIRST_AGE + 6)) / 3),
    ),
  };
}
