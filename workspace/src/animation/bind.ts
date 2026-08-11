import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export interface SwayMonParameters {
  readonly direction: 0 | 1;
  readonly amplitude: number;
  readonly period: number;
  readonly sways: number;
}

export interface ScaleMonAndRestoreParameters {
  readonly xDelta: number;
  readonly yDelta: number;
  readonly duration: number;
}

export interface BindAnimationProfile {
  readonly sway: Readonly<SwayMonParameters>;
  readonly squeeze: Readonly<ScaleMonAndRestoreParameters>;
  readonly squeezeStarts: readonly [number, number];
}

export interface BindAnimationState {
  readonly attackerX2: number;
  readonly attackerY2: number;
  readonly targetAffine: Readonly<{
    readonly active: boolean;
    readonly xScale: number;
    readonly yScale: number;
  }>;
}

export const BIND_ANIMATION_PROFILE: Readonly<BindAnimationProfile> =
  Object.freeze({
    sway: Object.freeze({
      direction: 0,
      amplitude: 6,
      period: 3328,
      sways: 4,
    }),
    squeeze: Object.freeze({
      xDelta: 10,
      yDelta: -5,
      duration: 5,
    }),
    // The first call runs beside SwayMon; the second follows the script's
    // 16-frame delay and call/return scheduling.
    squeezeStarts: Object.freeze([3, 21]) as readonly [number, number],
  });

/** Source `Sin(index, amplitude)` with the ROM's literal Q8.8 table. */
export function swayMonOffsetAtAge(
  age: number,
  params: Readonly<SwayMonParameters>,
  attackerSide: "player" | "opponent",
): number {
  if (age < 3 || age >= 42) return 0;
  const callback = age - 2;
  const index = ((callback * params.period) >> 8) & 0xff;
  const amplitude = attackerSide === "player"
    ? params.amplitude
    : -params.amplitude;
  return (GBA_SINE_TABLE_256[index]! * amplitude) >> 8;
}

export function scaleMonAndRestoreAtAge(
  age: number,
  params: Readonly<ScaleMonAndRestoreParameters>,
): Readonly<{ active: boolean; xScale: number; yScale: number }> {
  if (age < 0 || age >= params.duration * 2 - 1) {
    return { active: false, xScale: 256, yScale: 256 };
  }
  const step = age < params.duration
    ? age + 1
    : params.duration * 2 - age - 1;
  return {
    active: true,
    xScale: 256 + params.xDelta * step,
    yScale: 256 + params.yDelta * step,
  };
}

export function bindAnimationAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  profile: Readonly<BindAnimationProfile> = BIND_ANIMATION_PROFILE,
): BindAnimationState {
  const localSqueezeAge = profile.squeezeStarts
    .map((start) => age - start)
    .find((local) =>
      local >= 0 && local < profile.squeeze.duration * 2 - 1
    );
  return {
    attackerX2: profile.sway.direction === 0
      ? swayMonOffsetAtAge(age, profile.sway, attackerSide)
      : 0,
    attackerY2: profile.sway.direction === 1
      ? swayMonOffsetAtAge(age, profile.sway, attackerSide)
      : 0,
    targetAffine: scaleMonAndRestoreAtAge(
      localSqueezeAge ?? -1,
      profile.squeeze,
    ),
  };
}
