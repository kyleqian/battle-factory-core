import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export type SonicBoomSide = "player" | "opponent";

export interface SonicBoomSprite {
  readonly kind: "air-wave" | "impact";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
  readonly animation: 0 | 2;
  readonly oamSlot: number;
  readonly callback: "translate" | "destroy" | "affine" | "destroy-affine";
}

export interface SonicBoomSoundEvent {
  readonly age: number;
  readonly song: "SE_M_RAZOR_WIND2";
  readonly pan: number;
}

export interface SonicBoomEffect {
  readonly attackerSide: SonicBoomSide;
  readonly active: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetMonbg: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly shakeTaskActive: boolean;
  readonly battlerDisplayAge: number;
  readonly sprites: readonly SonicBoomSprite[];
  readonly soundEvents: readonly SonicBoomSoundEvent[];
}

const PROJECTILE_START_AGES = [10, 16, 22] as const;

export function sonicBoomProjectileMatrix(
  attackerSide: SonicBoomSide,
): Readonly<{ a: number; b: number; c: number; d: number }> {
  return attackerSide === "player"
    ? { a: 252, b: -43, c: 43, d: 252 }
    : { a: -254, b: 25, c: -25, d: -254 };
}

function projectileAtAge(
  age: number,
  spawnAge: number,
  oamSlot: number,
  attackerSide: SonicBoomSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SonicBoomSprite | null {
  const localAge = age - spawnAge;
  if (localAge < 0 || localAge > 15) return null;
  const side = attackerSide === "player" ? 1 : -1;
  const x = attackerCenter.x + side * 16;
  const y = attackerCenter.y;
  const callbacks = Math.min(localAge + 1, 15);
  return {
    kind: "air-wave",
    x,
    y,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetCenter.x - x, 15),
      callbacks,
      15,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetCenter.y - y, 15),
      callbacks,
      15,
    ),
    matrix: sonicBoomProjectileMatrix(attackerSide),
    animation: 0,
    oamSlot,
    callback: localAge === 15 ? "destroy" : "translate",
  };
}

/**
 * Complete 52-frame source-owned body of `Move_SONIC_BOOM`.
 *
 * Age zero is the first AIR_WAVE load display and age 51 is the first
 * inactive cleanup display. Every transition is relative to that boundary.
 */
export function sonicBoomEffectAtAge(
  age: number,
  attackerSide: SonicBoomSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SonicBoomEffect {
  const sprites: SonicBoomSprite[] = [];
  PROJECTILE_START_AGES.forEach((spawnAge, index) => {
    const sprite = projectileAtAge(
      age,
      spawnAge,
      index + 3,
      attackerSide,
      attackerCenter,
      targetCenter,
    );
    if (sprite) sprites.push(sprite);
  });
  const impactAge = age - 28;
  if (impactAge >= 0 && impactAge <= 9) {
    sprites.unshift({
      kind: "impact",
      x: targetCenter.x,
      y: targetCenter.y,
      x2: 0,
      y2: 0,
      matrix: { a: 372, b: 0, c: 0, d: 372 },
      animation: 2,
      oamSlot: 3,
      callback: impactAge === 9 ? "destroy-affine" : "affine",
    });
  }
  const pan = attackerSide === "player" ? -64 : 63;
  const shakeTaskActive = age >= 28 && age <= 45;
  return {
    attackerSide,
    active: age >= 0 && age <= 50,
    alpha: age >= 10 && age <= 46 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 7 && age <= 46,
    // The task callback's data counter and its battler x2 write straddle the
    // display latch: each frameDelay=1 value is visible for two displays.
    targetOffset: shakeTaskActive
      ? shakeMonOffsetAtTick(
          3,
          0,
          10,
          1,
          Math.floor((age - 30) / 2) * 2,
        )
      : { x2: 0, y2: 0 },
    shakeTaskActive,
    battlerDisplayAge: age - 1,
    sprites,
    soundEvents: PROJECTILE_START_AGES.map((eventAge) => ({
      age: eventAge,
      song: "SE_M_RAZOR_WIND2" as const,
      pan,
    })),
  };
}
