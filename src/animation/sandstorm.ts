export interface FlyingSandCrescent {
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly fractionalX: number;
  readonly fractionalY: number;
}

export interface SandstormState {
  readonly active: boolean;
  readonly flyingDirtLoaded: boolean;
  readonly backgroundLoaded: boolean;
  readonly backgroundTaskActive: boolean;
  readonly visualTaskCount: number;
  readonly bgScroll: Readonly<{ x: number; y: number }>;
  readonly blend: Readonly<{ eva: number; evb: number }>;
  readonly crescents: readonly FlyingSandCrescent[];
}

export const SANDSTORM_FRAME_COUNT = 168;

const CRESCENTS = [
  { createAge: 23, y: 10, velocityX: 2304, oamSlot: 3 },
  { createAge: 35, y: 90, velocityX: 2048, oamSlot: 4 },
  { createAge: 47, y: 50, velocityX: 2560, oamSlot: 5 },
  { createAge: 59, y: 20, velocityX: 2304, oamSlot: 7 },
  { createAge: 71, y: 70, velocityX: 1984, oamSlot: 3 },
  { createAge: 83, y: 0, velocityX: 2816, oamSlot: 4 },
  { createAge: 95, y: 60, velocityX: 2560, oamSlot: 5 },
] as const;

function wrap9(value: number): number {
  return ((value % 512) + 512) % 512;
}

function blendAtAge(age: number): number {
  if (age < 10) return 0;
  if (age < 139) return Math.min(7, Math.floor((age - 6) / 4));
  return Math.max(0, 7 - Math.floor((age - 135) / 4));
}

function crescentAtAge(
  age: number,
  config: typeof CRESCENTS[number],
  spawnIndex: number,
): FlyingSandCrescent | null {
  const callbackAge = age - config.createAge;
  if (callbackAge < 1) return null;
  const priorX2 = Math.floor(
    (callbackAge - 1) * config.velocityX / 256,
  );
  if (priorX2 > 336) return null;
  const x2 = Math.floor(callbackAge * config.velocityX / 256);
  const y2 = Math.floor(callbackAge * 96 / 256);
  return {
    spawnIndex,
    oamSlot: config.oamSlot,
    x: -64,
    y: config.y,
    x2,
    y2,
    velocityX: config.velocityX,
    velocityY: 96,
    fractionalX: callbackAge * config.velocityX & 0xff,
    fractionalY: callbackAge * 96 & 0xff,
  };
}

/** Age zero is Move_SANDSTORM's first displayed `loadspritegfx` frame. */
export function sandstormAtAge(age: number): SandstormState {
  const crescents = CRESCENTS
    .map((config, index) => crescentAtAge(age, config, index))
    .filter((sprite): sprite is FlyingSandCrescent => sprite !== null);
  const scrollSteps = Math.max(0, Math.min(158, age - 6));
  const backgroundVisualTask = age >= 6 && age < 166 ? 1 : 0;
  const eva = blendAtAge(age);
  return {
    active: age >= 0 && age < 167,
    flyingDirtLoaded: age >= 1 && age < 167,
    backgroundLoaded: age >= 4 && age < 167,
    backgroundTaskActive: age >= 4 && age < 166,
    visualTaskCount: backgroundVisualTask + crescents.length,
    bgScroll: age >= 167
      ? { x: 0, y: 0 }
      : { x: wrap9(-6 * scrollSteps), y: wrap9(-scrollSteps) },
    blend: {
      eva: age >= 4 && age < 167 ? eva : 0,
      evb: age >= 4 && age < 167 ? 16 - eva : 0,
    },
    crescents,
  };
}
