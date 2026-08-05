import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  scaleMonAndRestoreAtAge,
  type ScaleMonAndRestoreParameters,
} from "./bind.ts";

export interface WrapEllipseParameters {
  readonly xRadius: number;
  readonly yRadius: number;
  readonly loops: number;
  readonly speed: number;
}

export interface WrapAnimationProfile {
  readonly ellipse: Readonly<WrapEllipseParameters>;
  readonly squeeze: Readonly<ScaleMonAndRestoreParameters>;
  /**
   * The two `BindWrapSqueezeTarget` call bodies are scheduled by the shared
   * `BindWrap` subroutine (probe-measured against the WRAP dense window):
   * the first `AnimTask_ScaleMonAndRestore` step lands one frame after the
   * script's leading elliptical task, and the second lands after the
   * subroutine's 16-frame delay plus the call/return scheduling overhead.
   */
  readonly squeezeStarts: readonly [number, number];
}

export interface WrapAnimationState {
  readonly attackerX2: number;
  readonly attackerY2: number;
  readonly targetAffine: Readonly<{
    readonly active: boolean;
    readonly xScale: number;
    readonly yScale: number;
  }>;
}

export const WRAP_ANIMATION_PROFILE: Readonly<WrapAnimationProfile> =
  Object.freeze({
    ellipse: Object.freeze({
      xRadius: 6,
      yRadius: 4,
      loops: 2,
      speed: 4,
    }),
    squeeze: Object.freeze({
      xDelta: 10,
      yDelta: -5,
      duration: 5,
    }),
    squeezeStarts: Object.freeze([1, 19]) as readonly [number, number],
  });

/**
 * `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER, 6, 4, 2, 4)`.
 *
 * The task's step runs every animation tick from its creation frame; each
 * step advances the phase by `1 << speed = 16` and the loop counter
 * decrements at each full 256-phase wrap. Two loops therefore span steps
 * 0..31, and the step that would wrap the second loop resets the offsets and
 * destroys the task, so the software sprite shows the origin on that final
 * step (`age === 31`). `RespectSide` negates the width for an opponent-front
 * attacker before the signed Q8.8 multiply, mirroring the BIND sway's
 * asymmetric opponent rounding.
 */
export function wrapEllipticalOffsetAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  profile: Readonly<WrapEllipseParameters> = WRAP_ANIMATION_PROFILE.ellipse,
): Readonly<{ x2: number; y2: number }> {
  const wavePeriod = 1 << profile.speed;
  const stepsPerLoop = 256 / wavePeriod;
  const totalSteps = stepsPerLoop * profile.loops;
  if (age < 0 || age >= totalSteps || age === totalSteps - 1) {
    return { x2: 0, y2: 0 };
  }
  const theta = (wavePeriod * age) & 0xff;
  const width = attackerSide === "player" ? profile.xRadius : -profile.xRadius;
  return {
    x2: (GBA_SINE_TABLE_256[theta]! * width) >> 8,
    y2: -((GBA_SINE_TABLE_256[(theta + 64) & 0xff]! * profile.yRadius) >> 8)
      + profile.yRadius,
  };
}

export function wrapAnimationAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  profile: Readonly<WrapAnimationProfile> = WRAP_ANIMATION_PROFILE,
): WrapAnimationState {
  const offset = wrapEllipticalOffsetAtAge(age, attackerSide, profile.ellipse);
  const localSqueezeAge = profile.squeezeStarts
    .map((start) => age - start)
    .find((local) =>
      local >= 0 && local < profile.squeeze.duration * 2 - 1
    );
  return {
    attackerX2: offset.x2,
    attackerY2: offset.y2,
    targetAffine: scaleMonAndRestoreAtAge(
      localSqueezeAge ?? -1,
      profile.squeeze,
    ),
  };
}
