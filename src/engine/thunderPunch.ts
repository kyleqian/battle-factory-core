// Source-composed THUNDER_PUNCH lightning component. Ages are relative to
// the first displayed shared fist/hitsplat frame, never a battle tick.

export const THUNDER_PUNCH_LIGHTNING_FIRST_AGES = [6, 9, 12] as const;
export const THUNDER_PUNCH_LIGHTNING_Y_OFFSETS = [-48, -16, 16] as const;
export const THUNDER_PUNCH_LIGHTNING_FRAME_DURATIONS = [5, 5, 8, 5, 5] as const;
export const THUNDER_PUNCH_LIGHTNING_DISPLAY_TICKS = 28;

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
