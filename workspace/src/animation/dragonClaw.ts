import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import {
  fireSpinVortexSpritesAtAge,
  type FireSpinVortexSprite,
} from "./fireSpin.ts";

export const DRAGON_CLAW_BODY_FIRST_FRAME = 82;
export const DRAGON_CLAW_END_AGE = 136;

export interface DragonClawGeometry {
  readonly attackerSide: "player" | "opponent";
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export type DragonClawFireSpin = FireSpinVortexSprite;

export interface DragonClawSlash {
  readonly spawnAge: number;
  readonly x: number;
  readonly y: number;
  readonly animation: 0 | 1;
  readonly animationFrame: number;
}

export interface DragonClawSoundEvent {
  readonly age: number;
  readonly song: "SE_M_RAZOR_WIND";
  readonly pan: number;
}

export interface DragonClawState {
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetGlobalY: number;
  readonly fireSpin: readonly DragonClawFireSpin[];
  readonly slashes: readonly DragonClawSlash[];
  readonly blendDirection: "forward" | "reverse" | null;
  readonly fadedPaletteCoefficient: number;
  readonly hardwarePaletteCoefficient: number;
  readonly soundEvents: readonly DragonClawSoundEvent[];
}

export function dragonClawFireSpinAtAge(
  age: number,
  geometry: DragonClawGeometry,
): readonly DragonClawFireSpin[] {
  return fireSpinVortexSpritesAtAge(
    age,
    geometry.attackerCenter,
    [1, 25, 49, 73],
  );
}

export function dragonClawSlashesAtAge(
  age: number,
  geometry: DragonClawGeometry,
): readonly DragonClawSlash[] {
  const groups = [
    { age: 53, x: -10, animation: 0 as const },
    { age: 69, x: 10, animation: 1 as const },
  ];
  return groups.flatMap((group) => {
    const local = age - group.age;
    if (local < 0 || local > 20) return [];
    const animationFrame = Math.min(4, Math.floor((local + 1) / 4));
    return [-10, 10].map((y) => ({
      spawnAge: group.age,
      x: geometry.targetCenter.x + group.x,
      y: geometry.targetCenter.y + y,
      animation: group.animation,
      animationFrame,
    }));
  });
}

function targetShakeY(age: number): number {
  for (const spawn of [53, 69]) {
    const local = age - spawn;
    if (local < 0 || local >= 10) continue;
    // `shake_mon_or_platform -4,1,10,SHAKE_MON_Y`: the invisible helper
    // negates velocity at init and alternates the global coordinate offset.
    return local === 0 ? 0 : Math.floor((local + 1) / 2) % 2 ? 4 : 0;
  }
  return 0;
}

/**
 * `AnimTask_BlendBattleAnimPal(..., delay=4, from, to, color)` applies the
 * initial coefficient immediately, then advances it after each fifth task
 * callback. The reverse task is created at age 93. `gPlttBufferFaded` is
 * updated by the task in the current callback, while palette RAM is copied
 * on the following display latch.
 */
export function dragonClawFadedPaletteCoefficient(age: number): number {
  if (age < 9) return 0;
  if (age < 44) return Math.floor((age - 4) / 5);
  if (age < 101) return 8;
  return Math.max(0, 8 - Math.floor((age - 96) / 5));
}

/**
 * `AnimTask_ShakeMon` is task-driven rather than sprite-callback-driven.
 * Its first callback is run during script setup, producing one early OAM
 * pulse; after that, the normal two-frame cadence is latched one display
 * epoch after the task state observed by the dense probe.
 */
export function dragonClawDisplayedAttackerShakeY(age: number): number {
  if (age === 2) return 2;
  if (age < 5 || age > 30) return 0;
  return Math.floor((age - 5) / 2) % 2 === 0 ? 2 : 0;
}

export function dragonClawAtAge(
  age: number,
  geometry: DragonClawGeometry,
): DragonClawState {
  const firstLunge = horizontalLungeX2AtTick(
    6, 4, geometry.attackerSide, age - 48,
  );
  const secondLunge = horizontalLungeX2AtTick(
    6, 4, geometry.attackerSide, age - 64,
  );
  return {
    attackerOffset: age >= 3 && age <= 30
      ? {
          x2: 0,
          y2: Math.floor((age - 3) / 2) % 2 === 0 ? 2 : 0,
        }
      : { x2: firstLunge + secondLunge, y2: 0 },
    targetGlobalY: targetShakeY(age),
    fireSpin: dragonClawFireSpinAtAge(age, geometry),
    slashes: dragonClawSlashesAtAge(age, geometry),
    blendDirection: age >= 1 && age < 44
      ? "forward" : age >= 93 && age < DRAGON_CLAW_END_AGE
        ? "reverse" : null,
    fadedPaletteCoefficient: dragonClawFadedPaletteCoefficient(age),
    hardwarePaletteCoefficient: dragonClawFadedPaletteCoefficient(age - 1),
    soundEvents: [53, 69].includes(age)
      ? [{
          age,
          song: "SE_M_RAZOR_WIND",
          pan: geometry.attackerSide === "player" ? 63 : -63,
        }]
      : [],
  };
}
