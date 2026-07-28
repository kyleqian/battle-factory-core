/** Source-shaped relative-age reducer for `Move_TAIL_GLOW`. */
export type TailGlowSide = "player" | "opponent";

export interface TailGlowOrb {
  readonly slot: 3;
  readonly x: number;
  readonly y: number;
  readonly matrixScale: number;
}

export interface TailGlowState {
  readonly assetsLoaded: boolean;
  readonly bgBlendY: number;
  readonly alpha: Readonly<{ eva: number; evb: number }> | null;
  readonly monBg: boolean;
  readonly orb: TailGlowOrb | null;
  readonly soundRestart: "SE_M_MORNING_SUN" | null;
  readonly soundPan: -64 | 63 | null;
}

export const TAIL_GLOW_BODY_FRAME_COUNT = 203;
export const TAIL_GLOW_ORB_CREATION_AGE = 21;
export const TAIL_GLOW_ORB_FRAME_COUNT = 116;
export const TAIL_GLOW_SOUND_AGES = [42, 58, 74, 90, 106, 122] as const;

/** Inverse affine matrix coefficient emitted by the GBA OAM scaler. */
export function tailGlowOrbMatrixScale(localAge: number): number | null {
  if (localAge < 0 || localAge >= TAIL_GLOW_ORB_FRAME_COUNT) return null;
  let scale: number;
  if (localAge < 18) {
    scale = 24 + localAge * 8;
  } else if (localAge < 114) {
    const phase = (localAge - 18) & 15;
    scale = phase < 8 ? 155 - phase * 5 : 125 + (phase - 8) * 5;
  } else {
    scale = 160;
  }
  return Math.trunc(0x10000 / scale);
}

function bgBlendYAtAge(age: number): number {
  // `simple_palette_blend` delay 2, 0→4 begins at age 6. The reverse
  // delay-4 controller begins at age 138 and releases the script at age 159.
  if (age < 8) return 0;
  if (age < 11) return 1;
  if (age < 14) return 2;
  if (age < 17) return 3;
  if (age < 143) return 4;
  if (age < 148) return 3;
  if (age < 153) return 2;
  if (age < 158) return 1;
  return 0;
}

export function tailGlowAtAge(
  age: number,
  side: TailGlowSide,
  pictureOffset: Readonly<{ x: number; y: number }>,
): TailGlowState {
  const localAge = age - TAIL_GLOW_ORB_CREATION_AGE;
  const matrixScale = tailGlowOrbMatrixScale(localAge);
  return {
    assetsLoaded: age >= 0 && age < TAIL_GLOW_BODY_FRAME_COUNT,
    bgBlendY: bgBlendYAtAge(age),
    alpha: age >= 6 && age < 139 ? { eva: 12, evb: 8 } : null,
    monBg: age >= 6 && age < 139,
    orb: matrixScale === null ? null : {
      slot: 3,
      x: pictureOffset.x,
      y: pictureOffset.y + 18,
      matrixScale,
    },
    soundRestart: TAIL_GLOW_SOUND_AGES.includes(age as never)
      ? "SE_M_MORNING_SUN"
      : null,
    soundPan: TAIL_GLOW_SOUND_AGES.includes(age as never)
      ? side === "player" ? -64 : 63
      : null,
  };
}
