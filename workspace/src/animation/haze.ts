export const HAZE_BLEND_AMOUNTS = [
  0, 1, 2, 2, 2, 2, 3, 4, 4, 4, 5, 6, 6, 6, 6, 7, 8, 8, 8, 9,
] as const;

export interface HazeState {
  readonly sourceAge: number;
  readonly active: boolean;
  readonly taskActive: boolean;
  readonly bg1X: number;
  readonly fogEva: number;
  readonly fogEvb: number;
  readonly battlerBlackCoeff: number;
  readonly soundActive: boolean;
}

/** Pure source-relative port of Move_HAZE and its scrolling-fog task. */
export function hazeAtAge(sourceAge: number): HazeState {
  let fogEva = 0;
  if (sourceAge >= 7 && sourceAge < 79) {
    fogEva = HAZE_BLEND_AMOUNTS[Math.min(19, Math.floor((sourceAge - 3) / 4))]!;
  } else if (sourceAge >= 79 && sourceAge < 164) {
    fogEva = 9;
  } else if (sourceAge >= 164 && sourceAge < 197) {
    fogEva = Math.max(0, 9 - Math.floor((sourceAge - 160) / 4));
  }
  let battlerBlackCoeff = 0;
  if (sourceAge >= 39 && sourceAge < 84) {
    battlerBlackCoeff = Math.min(16, Math.floor((sourceAge - 39) / 3) + 1);
  } else if (sourceAge >= 84 && sourceAge < 129) {
    battlerBlackCoeff = 16;
  } else if (sourceAge >= 129 && sourceAge < 160) {
    battlerBlackCoeff = Math.max(0, 15 - Math.floor((sourceAge - 129) / 2));
  }
  const scrolling = sourceAge >= 4 && sourceAge < 198;
  return {
    sourceAge,
    active: sourceAge >= 0 && sourceAge < 201,
    taskActive: sourceAge >= 1 && sourceAge < 200,
    // BG1HOFS is written before the following callback updates the logical
    // accumulator, so it trails gBattle_BG1_X by one source pass.
    bg1X: scrolling ? -(sourceAge - 3) : sourceAge >= 198 && sourceAge < 201 ? -194 : 0,
    fogEva,
    fogEvb: 16 - fogEva,
    battlerBlackCoeff,
    soundActive: sourceAge >= 1 && sourceAge < 30,
  };
}
