// Source-composed THUNDER_PUNCH presentation. Ages are relative to the first
// displayed `monbg ANIM_TARGET` frame, never a battle or trace tick.

export const THUNDER_PUNCH_HIT_FIRST_AGE = 42;
export const THUNDER_PUNCH_LIGHTNING_FIRST_AGES = [48, 51, 54] as const;
export const THUNDER_PUNCH_LIGHTNING_Y_OFFSETS = [-48, -16, 16] as const;
export const THUNDER_PUNCH_LIGHTNING_FRAME_DURATIONS = [5, 5, 8, 5, 5] as const;
export const THUNDER_PUNCH_LIGHTNING_DISPLAY_TICKS = 28;
export const THUNDER_PUNCH_MOVE_BODY_LAST_AGE = 103;

export interface ThunderPunchPaletteState {
  readonly backgroundBlackCoeff: number;
  readonly inverted: boolean;
}

/** Source delay-2 black ramp, two inversions, and delay-2 restoration. */
export function thunderPunchPaletteAtAge(age: number): ThunderPunchPaletteState {
  const backgroundBlackCoeff =
    age < 6 ? 0
    : age < 34 ? Math.min(16, 2 + Math.floor((age - 6) / 4) * 2)
    : age < 67 ? 16
    : age < 95 ? Math.max(0, 14 - Math.floor((age - 67) / 4) * 2)
    : 0;
  return {
    backgroundBlackCoeff,
    inverted: age >= 45 && age < 57,
  };
}

export function thunderPunchTargetShakeY2(age: number): number {
  const localAge = age - 63;
  if (localAge < 0 || localAge >= 28) return 0;
  return Math.floor(localAge / 2) % 2 === 0 ? 3 : 0;
}

export function thunderPunchFirstHitsplatVisible(age: number): boolean {
  return age >= THUNDER_PUNCH_HIT_FIRST_AGE && age < THUNDER_PUNCH_HIT_FIRST_AGE + 10;
}

export function thunderPunchFistVisible(age: number): boolean {
  return age >= THUNDER_PUNCH_HIT_FIRST_AGE && age < THUNDER_PUNCH_HIT_FIRST_AGE + 9;
}

export function thunderPunchSecondHitsplatVisible(age: number): boolean {
  return age >= 61 && age < 71;
}

export interface ThunderPunchLightning {
  readonly sourceSlot: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly frame: 0 | 1 | 2 | 3 | 4;
}

/**
 * Three `gLightningSpriteTemplate` instances from Move_THUNDER_PUNCH.
 *
 * The first displayed frame follows the creation callback, and the final
 * destroyed callback leaves the already-latched last frame in OAM for one
 * display. This produces the RAM/oracle-pinned 28-frame display lifetime.
 */
export function thunderPunchLightningAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly ThunderPunchLightning[] {
  return THUNDER_PUNCH_LIGHTNING_FIRST_AGES.flatMap((firstAge, sourceSlot) => {
    const localAge = age - firstAge;
    if (localAge < 0 || localAge >= THUNDER_PUNCH_LIGHTNING_DISPLAY_TICKS) {
      return [];
    }
    // The first source frame is visible for four displays after the
    // create-callback handoff; subsequent frames retain their AnimCmd spans,
    // and the destroyed sprite's last OAM image supplies the final display.
    const frame =
      localAge < 4 ? 0
      : localAge < 9 ? 1
      : localAge < 17 ? 2
      : localAge < 22 ? 3
      : 4;
    return [{
      sourceSlot,
      centerX: targetCenter.x,
      centerY: targetCenter.y + THUNDER_PUNCH_LIGHTNING_Y_OFFSETS[sourceSlot]!,
      frame,
    }];
  });
}
