import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export const DRAGON_CLAW_BODY_FIRST_FRAME = 82;
export const DRAGON_CLAW_END_AGE = 136;

export interface DragonClawGeometry {
  readonly attackerSide: "player" | "opponent";
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface DragonClawFireSpin {
  readonly spawnAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly remaining: number;
  readonly angle: number;
  readonly animationFrame: number;
}

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
  readonly soundEvents: readonly DragonClawSoundEvent[];
}

interface FireSpawn {
  readonly age: number;
  readonly y: number;
  readonly velocityY: number;
  readonly duration: number;
  readonly angleStep: number;
  readonly amplitude: number;
}

const FIRE_PATTERN = [
  { y: 28, velocityY: 528, duration: 30, angleStep: 13, amplitude: 50 },
  { y: 32, velocityY: 480, duration: 20, angleStep: 16, amplitude: -46 },
  { y: 33, velocityY: 576, duration: 20, angleStep: 8, amplitude: 42 },
  { y: 31, velocityY: 400, duration: 25, angleStep: 11, amplitude: -42 },
  { y: 28, velocityY: 512, duration: 25, angleStep: 16, amplitude: 46 },
  { y: 33, velocityY: 464, duration: 30, angleStep: 15, amplitude: -50 },
] as const;

// Script-interpreter `delay 2` advances four captured frames in this
// controller window. These ages are therefore derived from the command
// sequence, not fitted from sprite coordinates.
const FIRE_SPAWNS: readonly FireSpawn[] = [
  ...[1, 25, 49, 77].flatMap((base) =>
    FIRE_PATTERN.map((entry, index) => ({ age: base + index * 4, ...entry }))),
  { age: 53, ...FIRE_PATTERN[1] },
  { age: 57, ...FIRE_PATTERN[2] },
  { age: 61, ...FIRE_PATTERN[3] },
  { age: 65, ...FIRE_PATTERN[4] },
  { age: 69, ...FIRE_PATTERN[5] },
  { age: 73, ...FIRE_PATTERN[0] },
];

const sin = (angle: number, amplitude: number): number =>
  Math.trunc(Math.sin((angle & 0xff) * Math.PI / 128) * amplitude);

export function dragonClawFireSpinAtAge(
  age: number,
  geometry: DragonClawGeometry,
): readonly DragonClawFireSpin[] {
  return FIRE_SPAWNS.flatMap((spawn) => {
    const callback = age - spawn.age + 1;
    if (callback <= 0 || callback > spawn.duration + 1) return [];
    return [{
      spawnAge: spawn.age,
      x: geometry.attackerCenter.x,
      y: geometry.attackerCenter.y + spawn.y,
      x2: sin((callback - 1) * spawn.angleStep, spawn.amplitude),
      y2: -((callback * spawn.velocityY) >> 8),
      remaining: spawn.duration - callback,
      angle: (callback * spawn.angleStep) & 0xff,
      animationFrame: Math.floor((callback - 1) / 2) % 5,
    }];
  });
}

export function dragonClawSlashesAtAge(
  age: number,
  geometry: DragonClawGeometry,
): readonly DragonClawSlash[] {
  const groups = [
    { age: 53, x: -10, animation: 0 as const },
    { age: 73, x: 10, animation: 1 as const },
  ];
  return groups.flatMap((group) => {
    const local = age - group.age;
    if (local < 0 || local >= 20) return [];
    const animationFrame = Math.floor(local / 4);
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
  for (const spawn of [53, 73]) {
    const local = age - spawn;
    if (local < 0 || local > 10) continue;
    // `shake_mon_or_platform -4,1,10,SHAKE_MON_Y`: the invisible helper
    // negates velocity at init and alternates the global coordinate offset.
    return local === 0 ? 0 : Math.floor((local + 1) / 2) % 2 ? 4 : 0;
  }
  return 0;
}

export function dragonClawAtAge(
  age: number,
  geometry: DragonClawGeometry,
): DragonClawState {
  const firstLunge = horizontalLungeX2AtTick(
    6, 4, geometry.attackerSide, age - 49,
  );
  const secondLunge = horizontalLungeX2AtTick(
    6, 4, geometry.attackerSide, age - 69,
  );
  return {
    attackerOffset: age >= 1 && age <= 29
      ? shakeMonOffsetAtTick(0, 2, 15, 1, age - 1)
      : { x2: firstLunge + secondLunge, y2: 0 },
    targetGlobalY: targetShakeY(age),
    fireSpin: dragonClawFireSpinAtAge(age, geometry),
    slashes: dragonClawSlashesAtAge(age, geometry),
    blendDirection: age >= 1 && age < 49
      ? "forward" : age >= 101 && age <= DRAGON_CLAW_END_AGE
        ? "reverse" : null,
    soundEvents: [53, 73].includes(age)
      ? [{
          age,
          song: "SE_M_RAZOR_WIND",
          pan: geometry.attackerSide === "player" ? 63 : -63,
        }]
      : [],
  };
}
