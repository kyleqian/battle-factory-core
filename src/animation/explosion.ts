import { selfDestructAtAge, type SelfDestructExplosion, type SelfDestructSide } from "./selfDestruct.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type ExplosionBackgroundBlend =
  | Readonly<{ kind: "none"; coefficient: 0 }>
  | Readonly<{ kind: "red"; coefficient: 8 }>
  | Readonly<{ kind: "black"; coefficient: 8 }>
  | Readonly<{ kind: "white"; coefficient: number }>;

export interface ExplosionState {
  readonly explosions: readonly SelfDestructExplosion[];
  readonly battlerX2: number;
  readonly backgroundBlend: ExplosionBackgroundBlend;
  readonly active: boolean;
}

/** Complete first move-owned body, first explosion through final BG restore. */
export const EXPLOSION_BODY_LAST_AGE = 211;

/**
 * `complex_palette_blend(F_PAL_BG, 8, 9, RGB(26,8,8), 8, BLACK, 8)`.
 * The initializer is displayed for eight frames; each of the nine callback
 * writes is then displayed for nine frames before the source cleanup.
 */
export function explosionBackgroundBlendAtAge(age: number): ExplosionBackgroundBlend {
  if (age < 0 || age >= 90) {
    if (age >= 93 && age <= 150) return { kind: "white", coefficient: 16 };
    if (age >= 151 && age <= 210) {
      return {
        kind: "white",
        coefficient: 15 - Math.floor((age - 151) / 4),
      };
    }
    return { kind: "none", coefficient: 0 };
  }
  if (age < 8) return { kind: "red", coefficient: 8 };
  const callbackWrite = Math.min(9, 1 + Math.floor((age - 8) / 9));
  return callbackWrite % 2 === 1
    ? { kind: "black", coefficient: 8 }
    : { kind: "red", coefficient: 8 };
}

/**
 * Source-shaped `Move_EXPLOSION` body.
 *
 * Age zero is the first software-OAM `gExplosionSpriteTemplate` instance
 * and the first displayed complex-background blend. The ten sprites are
 * the literal two `Explosion1` calls; the later white hold/fade is retained
 * through its final restored frame.
 */
export function explosionAtAge(
  age: number,
  attackerSide: SelfDestructSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
): ExplosionState {
  const shared = selfDestructAtAge(age, attackerSide, attackerCenter);
  return {
    explosions: shared.explosions,
    battlerX2: shakeMon2OffsetAtTick(8, 0, 40, 1, age + 1).x2,
    backgroundBlend: explosionBackgroundBlendAtAge(age),
    active: age >= 0 && age <= EXPLOSION_BODY_LAST_AGE,
  };
}
