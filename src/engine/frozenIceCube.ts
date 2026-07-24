export interface FrozenIceCubeState {
  /** Task-relative callback age; zero is the CreateSprite/setup pass. */
  readonly taskAge: number;
  /** OBJ alpha coefficient (BLDALPHA EVA); zero makes the cube invisible. */
  readonly eva: number;
  readonly evb: number;
  /** Number of left rotations applied to palette entries 13..15. */
  readonly paletteRotation: number;
  readonly spriteAlive: boolean;
  readonly blendEnabled: boolean;
}

export const FROZEN_ICE_CUBE_FADE_IN_CALLBACKS = 10;
export const FROZEN_ICE_CUBE_INITIAL_HOLD_CALLBACKS = 14;
export const FROZEN_ICE_CUBE_PALETTE_ROTATION_PERIOD = 3;
export const FROZEN_ICE_CUBE_PALETTE_ROTATIONS = 6;
export const FROZEN_ICE_CUBE_ROTATIONS_PER_CYCLE = 3;
export const FROZEN_ICE_CUBE_FADE_OUT_CALLBACKS = 10;
export const FROZEN_ICE_CUBE_DESTROY_DELAY = 37;
export const FROZEN_ICE_CUBE_TASK_END_DELAY = 39;

/**
 * Source-exact callback reducer for `AnimTask_FrozenIceCube`.
 *
 * `taskAge=0` is the creation pass (BLDALPHA 0/16). Each later integer is
 * one task callback. The palette phase deliberately models C's post-
 * increment `data[1]++ > 13`, then rotates entries 13..15 every third pass.
 */
export function frozenIceCubeState(taskAge: number): FrozenIceCubeState {
  if (!Number.isInteger(taskAge)) {
    throw new Error("FrozenIceCube task age must be an integer");
  }
  if (taskAge < 0) {
    return {
      taskAge,
      eva: 0,
      evb: 16,
      paletteRotation: 0,
      spriteAlive: false,
      blendEnabled: false,
    };
  }

  // Step1: callbacks 1..9 write 1/15 through 9/7. Callback 10 switches
  // functions without touching BLDALPHA, retaining 9/7.
  if (taskAge <= FROZEN_ICE_CUBE_FADE_IN_CALLBACKS) {
    const eva = Math.min(9, taskAge);
    return {
      taskAge,
      eva,
      evb: 16 - eva,
      paletteRotation: 0,
      spriteAlive: true,
      blendEnabled: true,
    };
  }

  const step2Age = taskAge - FROZEN_ICE_CUBE_FADE_IN_CALLBACKS;
  const cycleCallbacks =
    FROZEN_ICE_CUBE_INITIAL_HOLD_CALLBACKS
    + FROZEN_ICE_CUBE_PALETTE_ROTATION_PERIOD
      * FROZEN_ICE_CUBE_ROTATIONS_PER_CYCLE;
  const completedCycles = Math.min(1, Math.floor((step2Age - 1) / cycleCallbacks));
  const cycleAge = step2Age - completedCycles * cycleCallbacks;
  const rotations = Math.min(
    FROZEN_ICE_CUBE_PALETTE_ROTATIONS,
    completedCycles * FROZEN_ICE_CUBE_ROTATIONS_PER_CYCLE
      + Math.max(
        0,
        Math.floor(
          (cycleAge - FROZEN_ICE_CUBE_INITIAL_HOLD_CALLBACKS)
            / FROZEN_ICE_CUBE_PALETTE_ROTATION_PERIOD,
        ),
      ),
  );
  const step2Callbacks = cycleCallbacks * 2;
  if (step2Age <= step2Callbacks) {
    return {
      taskAge,
      eva: 9,
      evb: 7,
      paletteRotation: rotations,
      spriteAlive: true,
      blendEnabled: true,
    };
  }

  const step3Age = step2Age - step2Callbacks;
  // Step3 callbacks 1..9 write 8/8 through 0/16. Callback 10 only changes
  // function and retains 0/16.
  if (step3Age <= FROZEN_ICE_CUBE_FADE_OUT_CALLBACKS) {
    const eva = Math.max(0, 9 - step3Age);
    return {
      taskAge,
      eva,
      evb: 16 - eva,
      paletteRotation: rotations,
      spriteAlive: true,
      blendEnabled: true,
    };
  }

  const step4Age = step3Age - FROZEN_ICE_CUBE_FADE_OUT_CALLBACKS;
  return {
    taskAge,
    eva: 0,
    evb: 16,
    paletteRotation: rotations,
    spriteAlive: step4Age < FROZEN_ICE_CUBE_DESTROY_DELAY,
    blendEnabled: step4Age < FROZEN_ICE_CUBE_TASK_END_DELAY,
  };
}

export function frozenIceCubeAnchor(
  targetAnimationCenter: Readonly<{ x: number; y: number }>,
): Readonly<{ x: number; y: number }> {
  return {
    x: targetAnimationCenter.x - 32,
    y: targetAnimationCenter.y - 36,
  };
}
