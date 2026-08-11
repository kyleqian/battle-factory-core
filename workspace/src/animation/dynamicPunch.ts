import {
  explosionSpriteAtAge,
  type SelfDestructExplosion,
  type SelfDestructSide,
} from "./selfDestruct.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

/** Age zero is the first software-OAM fist/hitsplat display. */
export const DYNAMIC_PUNCH_EXPLOSION_FIRST_AGE = 19;
export const DYNAMIC_PUNCH_EXPLOSION_INTERVAL = 8;
export const DYNAMIC_PUNCH_BODY_LAST_AGE = 74;

export type DynamicPunchSound =
  | "SE_M_VITAL_THROW2"
  | "SE_M_SELF_DESTRUCT";

export interface DynamicPunchState {
  readonly fistVisible: boolean;
  readonly fistPosition: Readonly<{ x: number; y: number }>;
  readonly hitsplatVisible: boolean;
  readonly hitsplatPosition: Readonly<{ x: number; y: number }>;
  readonly hitsplatMatrix: Readonly<{ a: 256; b: 0; c: 0; d: 256 }> | null;
  readonly targetX2: number;
  readonly targetY2: number;
  readonly explosions: readonly SelfDestructExplosion[];
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly sound: DynamicPunchSound | null;
  readonly active: boolean;
}

/**
 * Source-shaped first `Move_DYNAMIC_PUNCH` animation body.
 *
 * The fist and animation-0 hitsplat use the target's picture-offset center.
 * The five literal explosion instances reuse `gExplosionSpriteTemplate` but
 * select the target and deliberately ignore its picture Y offset (argv 1,1).
 * Damage/confusion, health bars, controllers, RNG, and turns are out of scope.
 */
export function dynamicPunchAtAge(
  age: number,
  attackerSide: SelfDestructSide,
  targetAnimationCenter: Readonly<{ x: number; y: number }>,
  targetBattlePositionCenter: Readonly<{ x: number; y: number }>,
): DynamicPunchState {
  const explosionAge = age - DYNAMIC_PUNCH_EXPLOSION_FIRST_AGE;
  const explosions = Array.from({ length: 5 }, (_, index) =>
    explosionSpriteAtAge(
      explosionAge,
      index,
      attackerSide,
      targetBattlePositionCenter,
      DYNAMIC_PUNCH_EXPLOSION_INTERVAL,
    ),
  ).filter((sprite): sprite is SelfDestructExplosion => sprite !== null);

  const prelude = shakeMonOffsetAtTick(5, 0, 7, 1, age + 1);
  const explosionShake = shakeMon2OffsetAtTick(
    5, 0, 28, 1, explosionAge + 1,
  );
  const targetOffset = age < DYNAMIC_PUNCH_EXPLOSION_FIRST_AGE
    ? prelude
    : explosionShake;
  const explosionSound = explosionAge >= 0
    && explosionAge <= 32
    && explosionAge % DYNAMIC_PUNCH_EXPLOSION_INTERVAL === 0;

  return {
    fistVisible: age >= 0 && age <= 20,
    fistPosition: targetAnimationCenter,
    hitsplatVisible: age >= 0 && age <= 8,
    hitsplatPosition: targetAnimationCenter,
    hitsplatMatrix: age >= 0 && age <= 8
      ? { a: 256, b: 0, c: 0, d: 256 }
      : null,
    targetX2: targetOffset.x2,
    targetY2: targetOffset.y2,
    explosions,
    targetOnMonBg: age >= 0 && age < DYNAMIC_PUNCH_BODY_LAST_AGE,
    alpha: age >= 0 && age < DYNAMIC_PUNCH_BODY_LAST_AGE
      ? { eva: 12, evb: 8 }
      : null,
    sound: age === 0
      ? "SE_M_VITAL_THROW2"
      : explosionSound ? "SE_M_SELF_DESTRUCT" : null,
    active: age >= 0 && age <= DYNAMIC_PUNCH_BODY_LAST_AGE,
  };
}
