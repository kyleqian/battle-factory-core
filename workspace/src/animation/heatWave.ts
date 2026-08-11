export interface HeatWaveCrescent {
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
  readonly mirrored: boolean;
}

export interface HeatWaveState {
  readonly active: boolean;
  readonly flyingDirtLoaded: boolean;
  readonly particleRedCoefficient: number;
  readonly backgroundLoaded: boolean;
  readonly backgroundRedCoefficient: number;
  readonly backgroundTaskActive: boolean;
  readonly targetTaskActive: boolean;
  readonly visualTaskCount: number;
  readonly bgScroll: Readonly<{ x: number; y: number }>;
  readonly blend: Readonly<{ eva: number; evb: number }>;
  readonly targetX2: number;
  readonly pan: Readonly<{ start: number; end: number; step: number; active: boolean }>;
  readonly crescents: readonly HeatWaveCrescent[];
}

export const HEAT_WAVE_FRAME_COUNT = 168;

const CRESCENTS = [
  { createAge: 25, y: 10, velocityX: 2304, oamSlot: 3 },
  { createAge: 37, y: 90, velocityX: 2048, oamSlot: 4 },
  { createAge: 49, y: 50, velocityX: 2560, oamSlot: 5 },
  { createAge: 61, y: 20, velocityX: 2304, oamSlot: 7 },
  { createAge: 73, y: 70, velocityX: 1984, oamSlot: 3 },
  { createAge: 85, y: 0, velocityX: 2816, oamSlot: 4 },
  { createAge: 97, y: 60, velocityX: 2560, oamSlot: 5 },
] as const;

function wrap9(value: number): number {
  return ((value % 512) + 512) % 512;
}

function blendAtAge(age: number): number {
  if (age < 10) return 0;
  if (age < 139) return Math.min(7, Math.floor((age - 6) / 4));
  return Math.max(0, 7 - Math.floor((age - 135) / 4));
}

function targetX2AtAge(age: number, direction: 1 | -1): number {
  if (age < 12 || age >= 140) return 0;
  let state = 0;
  let timer = 0;
  let phase = 0;
  let stateTimer = 0;
  let base = 0;
  let wobble = 0;
  let result = 0;
  for (let tick = 12; tick <= age; tick += 1) {
    if (state === 0) {
      base += direction * 2;
      if (++timer >= 2) {
        timer = 0;
        phase += 1;
        wobble = phase & 1 ? 2 : -2;
      }
      result = base + wobble;
      if (++stateTimer === 16) {
        stateTimer = 0;
        state = 1;
      }
    } else if (state === 1) {
      if (++timer >= 5) {
        timer = 0;
        phase += 1;
        wobble = phase & 1 ? 2 : -2;
      }
      result = base + wobble;
      if (++stateTimer === 96) {
        stateTimer = 0;
        state = 2;
      }
    } else {
      base -= direction * 2;
      if (++timer >= 2) {
        timer = 0;
        phase += 1;
        wobble = phase & 1 ? 2 : -2;
      }
      result = base + wobble;
      if (++stateTimer === 16) state = 3;
    }
  }
  return result;
}

function crescentAtAge(
  age: number,
  config: typeof CRESCENTS[number],
  spawnIndex: number,
  mirrored: boolean,
): HeatWaveCrescent | null {
  const callbackAge = age - config.createAge;
  if (callbackAge < 1) return null;
  const velocityX = mirrored ? -config.velocityX : config.velocityX;
  const priorX2 = Math.floor((callbackAge - 1) * Math.abs(velocityX) / 256);
  if (priorX2 > 336) return null;
  const x2 = Math.floor(callbackAge * velocityX / 256);
  return {
    spawnIndex,
    oamSlot: config.oamSlot,
    x: mirrored ? 304 : -64,
    y: config.y,
    x2,
    y2: Math.floor(callbackAge * 96 / 256),
    velocityX,
    velocityY: 96,
    fractionalX: callbackAge * velocityX & 0xff,
    fractionalY: callbackAge * 96 & 0xff,
    mirrored,
  };
}

/** Age zero is Move_HEAT_WAVE's first displayed `loadspritegfx` frame. */
export function heatWaveAtAge(age: number, attackerSide: "player" | "opponent"): HeatWaveState {
  const mirrored = attackerSide === "opponent";
  const crescents = CRESCENTS
    .map((config, index) => crescentAtAge(age, config, index, mirrored))
    .filter((sprite): sprite is HeatWaveCrescent => sprite !== null);
  const scrollSteps = Math.max(0, Math.min(158, age - 5));
  const backgroundVisualTask = age >= 6 && age < 166 ? 1 : 0;
  const targetTaskActive = age >= 12 && age < 140;
  const eva = blendAtAge(age);
  return {
    active: age >= 0 && age < 167,
    flyingDirtLoaded: age >= 1 && age < 167,
    particleRedCoefficient: age >= 4 && age < 167 ? 6 : 0,
    backgroundLoaded: age >= 4 && age < 167,
    backgroundRedCoefficient: age >= 6 && age < 167 ? 6 : 0,
    backgroundTaskActive: age >= 4 && age < 166,
    targetTaskActive,
    visualTaskCount: backgroundVisualTask + (targetTaskActive ? 1 : 0) + crescents.length,
    bgScroll: age >= 166
      ? { x: 0, y: 0 }
      : {
          x: wrap9((mirrored ? 6 : -6) * scrollSteps),
          y: wrap9(-scrollSteps),
        },
    blend: {
      eva: age >= 4 && age < 167 ? eva : 0,
      evb: age >= 4 && age < 167 ? 16 - eva : 0,
    },
    targetX2: targetX2AtAge(age, mirrored ? -1 : 1),
    pan: { start: mirrored ? 63 : -64, end: mirrored ? -64 : 63, step: 2, active: age >= 6 && age < 140 },
    crescents,
  };
}
