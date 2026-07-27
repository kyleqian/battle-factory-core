export const EARTHQUAKE_SHAKE_INTENSITY = 10;
export const EARTHQUAKE_SHAKE_MAX_TIME = 50;
// The script interpreter's delay scheduler lands the commands 13 and 31
// display ticks after the simultaneous shake-task creation tick.
export const EARTHQUAKE_PALETTE_START_AGES = [13, 31] as const;

export interface HorizontalShakeState {
  readonly active: boolean;
  readonly taskState: 0 | 1 | 2;
  readonly delay: number;
  readonly timer: number;
  readonly horizontalOffset: number;
  readonly platformX: number;
  readonly battlerX2: number;
}

/**
 * `AnimTask_HorizontalShake` and its task-scheduler cadence. `age=0` is the
 * script interpreter's `createvisualtask` tick: the initializer runs then,
 * and the installed task callback first runs at age 1.
 */
export function horizontalShakeAtAge(
  age: number,
  intensity: number,
  maxTime: number,
  initialPlatformX = 0,
): HorizontalShakeState {
  const initialOffset = intensity + 3;
  if (age < 0) {
    return {
      active: false, taskState: 0, delay: 0, timer: 0,
      horizontalOffset: initialOffset,
      platformX: initialPlatformX, battlerX2: 0,
    };
  }

  let taskState: 0 | 1 | 2 = 0;
  let delay = 0;
  let timer = 0;
  let horizontalOffset = initialOffset;
  let platformX = initialPlatformX;
  let battlerX2 = 0;
  let active = true;
  for (let callbackAge = 1; callbackAge <= age && active; callbackAge += 1) {
    if (taskState === 2) {
      platformX = initialPlatformX;
      battlerX2 = 0;
      active = false;
      break;
    }
    delay += 1;
    if (delay <= 1) continue;
    delay = 0;
    platformX = initialPlatformX
      + ((timer & 1) === 0 ? horizontalOffset : -horizontalOffset);
    battlerX2 = horizontalOffset === 0
      ? 0
      : (timer & 1) === 0
        ? Math.floor((horizontalOffset + 1) / 2)
        : (-Math.floor(horizontalOffset / 2) || 0);
    timer += 1;
    if (
      (taskState === 0 && timer === maxTime)
      || (taskState === 1 && timer === 4)
    ) {
      timer = 0;
      horizontalOffset -= 1;
      taskState = 1;
      if (horizontalOffset === 0) taskState = 2;
    }
  }
  return {
    active, taskState, delay, timer, horizontalOffset, platformX, battlerX2,
  };
}

export interface ComplexPaletteBlendState {
  readonly active: boolean;
  readonly timer: number;
  readonly remainingBlends: number;
  readonly color: "black" | "white" | null;
  readonly coefficient: number;
}

/** Earthquake's literal BG-only `complex_palette_blend` pulse. */
export function earthquakePaletteAtAge(age: number): ComplexPaletteBlendState {
  for (const startAge of EARTHQUAKE_PALETTE_START_AGES) {
    const local = age - startAge;
    if (local < 0 || local > 7) continue;
    if (local <= 2) {
      return {
        active: true, timer: 2 - local, remainingBlends: 1,
        color: "black", coefficient: 14,
      };
    }
    return {
      active: true,
      timer: Math.max(0, 6 - local),
      remainingBlends: 0,
      color: "white",
      coefficient: 14,
    };
  }
  return {
    active: false, timer: 0, remainingBlends: 0,
    color: null, coefficient: 0,
  };
}

export interface EarthquakeAnimationState {
  readonly shake: HorizontalShakeState;
  readonly palette: ComplexPaletteBlendState;
}

/** Complete `Move_EARTHQUAKE` move-owned animation body. */
export function earthquakeAnimationAtAge(age: number): EarthquakeAnimationState {
  return {
    shake: horizontalShakeAtAge(
      age,
      EARTHQUAKE_SHAKE_INTENSITY,
      EARTHQUAKE_SHAKE_MAX_TIME,
    ),
    palette: earthquakePaletteAtAge(age),
  };
}
