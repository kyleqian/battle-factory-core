import {
  razorLeafCutterFromLocalAge,
  razorLeafParticleFromLocalAge,
  type RazorLeafCutter,
  type RazorLeafParticle,
  type RazorLeafSide,
} from "./razorLeaf.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const MAGICAL_LEAF_PLAYER_START_FRAME = 77;
export const MAGICAL_LEAF_OPPONENT_START_FRAME = 81;
export const MAGICAL_LEAF_ORIENTATION_FRAME_SHIFT = 4;
export const MAGICAL_LEAF_FRAME_COUNT = 182;
export const MAGICAL_LEAF_FIRST_PARTICLE_AGE = 16;
export const MAGICAL_LEAF_CUTTER_AGE = 114;
export const MAGICAL_LEAF_CONTACT_AGE = 146;
export const MAGICAL_LEAF_SETARG_AGE = 168;
export const MAGICAL_LEAF_CLEANUP_AGE = 169;
export const MAGICAL_LEAF_FIRST_INACTIVE_AGE = 181;

export const MAGICAL_LEAF_DISPLAY_LAG = {
  particleSprite: 1,
  cutterSprite: 1,
  hitsplatSprite: 1,
  cycleMagicalLeafPalette: 1,
  shakeMon2: 1,
  monbg: "ram-only",
  setalpha: "ram-only",
  setarg: "ram-only",
  clearmonbgAndBlendoff: "ram-only",
} as const;

export const MAGICAL_LEAF_PALETTE_SCOPE = {
  leaf: { start: 368, length: 16 },
  razorLeaf: { start: 384, length: 16 },
} as const;

export const MAGICAL_LEAF_BLEND_COLORS = [
  0x001f, // RGB_RED
  0x027f, // RGB(31, 19, 0)
  0x03ff, // RGB_YELLOW
  0x03e0, // RGB_GREEN
  0x7dc5, // RGB(5, 14, 31)
  0x7d56, // RGB(22, 10, 31)
  0x7eb6, // RGB(22, 21, 31)
] as const;

const PARTICLE_ARGS = [
  [-3, -2, 10], [-1, -1, 15], [-4, -4, 7], [3, -3, 11], [-1, -6, 8],
  [2, -1, 12], [-3, -4, 13], [4, -5, 7], [2, -6, 11], [-3, -5, 8],
] as const;
const PARTICLE_SLOTS = [3, 4, 5, 7, 9, 10, 11, 12, 13, 14] as const;

export interface MagicalLeafParticle extends RazorLeafParticle {
  readonly oamSlot: number;
  readonly subpriority: number;
}

export interface MagicalLeafCutter extends RazorLeafCutter {
  readonly oamSlot: 3 | 5;
  readonly subpriority: number;
}

export interface MagicalLeafHitsplat {
  readonly index: 0 | 1;
  readonly oamSlot: 4 | 7;
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly animation: 2;
  readonly subpriority: number;
}

export interface MagicalLeafPaletteCycle {
  readonly taskSlot: 2;
  readonly age: number;
  readonly coefficient: number;
  readonly colorIndex: number;
  readonly color: number;
  readonly scopes: typeof MAGICAL_LEAF_PALETTE_SCOPE;
}

export type MagicalLeafSound =
  | "SE_M_POISON_POWDER"
  | "SE_M_RAZOR_WIND2"
  | "SE_M_RAZOR_WIND";

export interface MagicalLeafState {
  readonly active: boolean;
  readonly assetsLoaded: Readonly<{ leaf: boolean; razorLeaf: boolean; impact: boolean }>;
  readonly targetMonbg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly arg7: 0 | -1;
  readonly paletteCycle: MagicalLeafPaletteCycle | null;
  readonly particles: readonly MagicalLeafParticle[];
  readonly cutters: readonly MagicalLeafCutter[];
  readonly hitsplats: readonly MagicalLeafHitsplat[];
  readonly targetX2: number;
  readonly shakeTask: Readonly<{ slot: 0; tick: number }> | null;
  readonly soundRestart: MagicalLeafSound | null;
  readonly soundPan: number | null;
}

export interface MagicalLeafGeometry {
  readonly attackerSide: RazorLeafSide;
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly targetIdleX2: number;
}

function paletteCycleAtAge(age: number): MagicalLeafPaletteCycle | null {
  if (age < MAGICAL_LEAF_FIRST_PARTICLE_AGE || age >= MAGICAL_LEAF_SETARG_AGE) {
    return null;
  }
  const taskAge = age - MAGICAL_LEAF_FIRST_PARTICLE_AGE;
  const coefficient = taskAge % 17;
  const colorIndex = Math.floor(taskAge / 17) % MAGICAL_LEAF_BLEND_COLORS.length;
  return {
    taskSlot: 2,
    age: taskAge,
    coefficient,
    colorIndex,
    color: MAGICAL_LEAF_BLEND_COLORS[colorIndex]!,
    scopes: MAGICAL_LEAF_PALETTE_SCOPE,
  };
}

function particleAtAge(
  age: number,
  index: number,
  geometry: MagicalLeafGeometry,
): MagicalLeafParticle | null {
  const localAge = age - MAGICAL_LEAF_FIRST_PARTICLE_AGE - index * 4;
  const particle = razorLeafParticleFromLocalAge(
    localAge,
    index,
    geometry.attackerSide,
    geometry.attackerCenter,
  );
  return particle === null ? null : {
    ...particle,
    oamSlot: PARTICLE_SLOTS[index]!,
    subpriority: geometry.attackerSide === "player" ? 28 : 38,
  };
}

function cutterAtAge(
  age: number,
  index: 0 | 1,
  geometry: MagicalLeafGeometry,
): MagicalLeafCutter | null {
  const cutter = razorLeafCutterFromLocalAge(
    age - MAGICAL_LEAF_CUTTER_AGE,
    index,
    geometry.attackerSide,
    geometry.attackerCenter,
    geometry.targetCenter,
    32,
  );
  return cutter === null ? null : {
    ...cutter,
    oamSlot: index === 0 ? 3 : 5,
    subpriority: geometry.attackerSide === "player" ? 37 : 27,
  };
}

function hitsplatsAtAge(
  age: number,
  geometry: MagicalLeafGeometry,
): readonly MagicalLeafHitsplat[] {
  const localAge = age - MAGICAL_LEAF_CONTACT_AGE;
  if (localAge < 0 || localAge >= 10) return [];
  const subpriority = geometry.attackerSide === "player" ? 36 : 26;
  const direction = geometry.attackerSide === "player" ? 1 : -1;
  return [
    { index: 0, oamSlot: 4, age: localAge, x: geometry.targetCenter.x - 10 * direction,
      y: geometry.targetCenter.y - 4, animation: 2, subpriority },
    { index: 1, oamSlot: 7, age: localAge, x: geometry.targetCenter.x + 10 * direction,
      y: geometry.targetCenter.y + 4, animation: 2, subpriority },
  ];
}

function soundAtAge(
  age: number,
  attackerSide: RazorLeafSide,
): Readonly<{ sound: MagicalLeafSound; pan: number }> | null {
  if ([16, 26, 37, 48, 59].includes(age)) {
    return { sound: "SE_M_POISON_POWDER", pan: attackerSide === "player" ? -64 : 63 };
  }
  if (age === MAGICAL_LEAF_CUTTER_AGE) {
    return { sound: "SE_M_RAZOR_WIND2", pan: attackerSide === "player" ? -64 : 63 };
  }
  if (age === MAGICAL_LEAF_CONTACT_AGE) {
    return { sound: "SE_M_RAZOR_WIND", pan: attackerSide === "player" ? 63 : -63 };
  }
  return null;
}

/** Complete source-owned RAM body, including the first inactive cleanup frame. */
export function magicalLeafAtAge(
  age: number,
  geometry: MagicalLeafGeometry,
): MagicalLeafState {
  const shakeAge = age - MAGICAL_LEAF_CONTACT_AGE;
  const shake = shakeAge < 0 || shakeAge >= 14
    ? { x2: 0, y2: 0 }
    : shakeMon2OffsetAtTick(2, 0, 8, 1, shakeAge + 1);
  const sound = soundAtAge(age, geometry.attackerSide);
  return {
    active: age >= 0 && age < MAGICAL_LEAF_FIRST_INACTIVE_AGE,
    assetsLoaded: {
      leaf: age >= 1 && age < MAGICAL_LEAF_FIRST_INACTIVE_AGE,
      razorLeaf: age >= 4 && age < MAGICAL_LEAF_FIRST_INACTIVE_AGE,
      impact: age >= 7 && age < MAGICAL_LEAF_FIRST_INACTIVE_AGE,
    },
    targetMonbg: age >= 10 && age < MAGICAL_LEAF_CLEANUP_AGE,
    alpha: age >= 13 && age < MAGICAL_LEAF_CLEANUP_AGE
      ? { eva: 12, evb: 8 } : null,
    arg7: age >= MAGICAL_LEAF_SETARG_AGE ? -1 : 0,
    paletteCycle: paletteCycleAtAge(age),
    particles: PARTICLE_ARGS.map((_, index) => particleAtAge(age, index, geometry))
      .filter((particle): particle is MagicalLeafParticle => particle !== null),
    cutters: ([0, 1] as const).map((index) => cutterAtAge(age, index, geometry))
      .filter((cutter): cutter is MagicalLeafCutter => cutter !== null),
    hitsplats: hitsplatsAtAge(age, geometry),
    targetX2: shakeAge < 0 ? geometry.targetIdleX2 : shake.x2,
    shakeTask: shakeAge >= 0 && shakeAge < 14
      ? { slot: 0, tick: shakeAge + 1 } : null,
    soundRestart: sound?.sound ?? null,
    soundPan: sound?.pan ?? null,
  };
}
