/** Pure source-relative presentation reducer for Emerald's MOVE_HIDDEN_POWER. */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { scaleMonAndRestoreAtAge } from "./bind.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
  type SpriteOrderKey,
  type SpriteOrderState,
} from "./spriteOrder.ts";

export const HIDDEN_POWER_FIRST_INACTIVE_AGE = 179;
export const HIDDEN_POWER_ORBIT_AGE = 64;
export const HIDDEN_POWER_SCATTER_AGE = 118;
export const HIDDEN_POWER_RED_ORB_TAG = 10217;

const ORBIT_PHASES = [0, 42, 84, 126, 168, 210] as const;
const SCATTER_PHASES = [0, 32, 64, 96, 128, 160, 192, 224] as const;

export interface HiddenPowerProfile {
  readonly attackerSubpriority: number;
  readonly targetSubpriority: number;
  /** The fourteen live allocator slots available to the two sprite batches. */
  readonly allocationSlots: readonly number[];
  /** Their persistent source `sSpriteOrder` immediately before age 64. */
  readonly spriteOrderSeed: readonly number[];
  readonly orbitMatrixNums: readonly number[];
  readonly scatterMatrixNums: readonly number[];
  /** Initial CreateSprite y before the eighth command's deferred callback. */
  readonly uninitializedScatterY: number;
  /** Live personality used only by the stock Unown battle-pic form selector. */
  readonly attackerPersonality: number;
  readonly animationRngSeed: number;
}

export interface HiddenPowerOrb {
  readonly kind: "orbit" | "scatter";
  readonly index: number;
  readonly owner: number;
  readonly slot: number;
  readonly initialized: boolean;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: readonly [number, 0, 0, number];
  readonly data: readonly number[];
}

export interface HiddenPowerState {
  readonly age: number;
  readonly active: boolean;
  readonly scriptActive: boolean;
  readonly sourceOffset: number | null;
  readonly sourceWait: number;
  readonly animArg7: 0 | -1;
  readonly resourcesLoaded: boolean;
  readonly attackerScale: Readonly<{ active: boolean; value: number }>;
  readonly blend: Readonly<{ active: boolean; coefficient: number; colorBgr555: 20479 }>;
  readonly orbs: readonly HiddenPowerOrb[];
  /** Component owners, back-to-front, after the persistent source sort. */
  readonly painterOrder: readonly number[];
  readonly animationRng: number;
  readonly unownFormIndex: number;
  readonly audio: readonly Readonly<{
    age: number;
    song: "TAKE_DOWN" | "REVERSAL" | "REFLECT";
    pan: "attacker";
  }>[];
}

const sin = (phase: number, amplitude: number): number =>
  (GBA_SINE_TABLE_256[phase & 0xff]! * amplitude) >> 8;
const cos = (phase: number, amplitude: number): number =>
  sin(phase + 64, amplitude);

function sourceAtAge(age: number): readonly [number | null, number] {
  if (age < 0 || age > HIDDEN_POWER_FIRST_INACTIVE_AGE) return [null, 0];
  if (age === 0) return [0, 0];
  if (age === 1) return [3, 1];
  if (age <= 3) return [3, 0];
  if (age <= 25) return [24, 1];
  if (age <= 55) return [27, 56 - age];
  if (age <= 57) return [27, 0];
  if (age <= 61) return [46, 62 - age];
  if (age <= 63) return [46, 0];
  if (age <= 116) return [135, 116 - age];
  if (age === 117) return [135, 0];
  return [232, age === 118 ? 0 : 1];
}

function scaleAtAge(age: number): Readonly<{ active: boolean; value: number }> {
  for (const [start, initializerOnly] of [[4, false], [64, false], [118, true]] as const) {
    const local = age - start;
    if (local < 0 || local > 21) continue;
    if (initializerOnly && local === 0) return { active: true, value: 256 };
    const reduced = scaleMonAndRestoreAtAge(local - Number(initializerOnly), {
      xDelta: -7,
      yDelta: -7,
      duration: 11,
    });
    if (reduced.active) return { active: true, value: reduced.xScale };
  }
  return { active: false, value: 256 };
}

function blendCoefficient(age: number): number {
  if (age < 62 || age > 177) return 0;
  if (age <= 117) return Math.min(12, Math.floor((age - 57) / 5));
  if (age <= 122) return 12;
  return 12 - Math.floor((age - 118) / 5);
}

function orbitAtAge(
  age: number,
  index: number,
  center: Readonly<{ x: number; y: number }>,
  profile: Readonly<HiddenPowerProfile>,
): HiddenPowerOrb | null {
  if (age < HIDDEN_POWER_ORBIT_AGE || age > HIDDEN_POWER_SCATTER_AGE) return null;
  // The long age-118 script dispatch is retained before the ordinary orbit
  // callback pass, so the six old orbits keep their age-117 source state.
  const local = Math.min(age, 117) - HIDDEN_POWER_ORBIT_AGE;
  let phase: number = ORBIT_PHASES[index]!;
  let radiusX = 0;
  let radiusY = 0;
  let counter = 0;
  let stage: 0 | 1 | 2 = 0;
  let x2 = 0;
  let y2 = 0;
  let subpriority = profile.attackerSubpriority - 1;
  // Creation calls the initializer and callback synchronously; this command
  // batch also precedes the ordinary AnimateSprites pass on its retained row.
  for (let callback = 0; callback <= local + 1; callback += 1) {
    subpriority = phase >= 64 && phase <= 191
      ? profile.attackerSubpriority + 1
      : profile.attackerSubpriority - 1;
    x2 = sin(phase, radiusX >> 8);
    y2 = cos(phase, radiusY >> 8);
    phase = (phase + 9) & 0xff;
    if (stage === 1) {
      radiusX -= 0x400;
      radiusY -= 0x100;
      counter += 1;
      if (counter === 26) stage = 2;
    } else if (stage === 0) {
      radiusX += 0x400;
      radiusY += 0x100;
      counter += 1;
      if (counter === 26) { counter = 0; stage = 1; }
    }
  }
  return {
    kind: "orbit",
    index,
    owner: index,
    slot: profile.allocationSlots[index]!,
    initialized: true,
    x: center.x,
    y: center.y,
    x2,
    y2,
    subpriority,
    matrixNum: profile.orbitMatrixNums[index]!,
    matrix: [512, 0, 0, 512],
    data: [26, phase, radiusX, radiusY, counter, stage, 0, profile.attackerSubpriority],
  };
}

function scatterAtAge(
  age: number,
  index: number,
  center: Readonly<{ x: number; y: number }>,
  uninitializedY: number,
  profile: Readonly<HiddenPowerProfile>,
): HiddenPowerOrb | null {
  if (age < HIDDEN_POWER_SCATTER_AGE) return null;
  const local = age - HIDDEN_POWER_SCATTER_AGE;
  const initialized = local > 0 || index < 7;
  if (!initialized) {
    return {
      kind: "scatter", index, owner: 6 + index,
      slot: profile.allocationSlots[6 + index]!, initialized: false,
      x: center.x, y: uninitializedY, x2: 0, y2: 0,
      subpriority: profile.targetSubpriority - 2,
      matrixNum: profile.scatterMatrixNums[index]!, matrix: [256, 0, 0, 256],
      data: [0, 0, 0, 0, 0, 0, 0, 0],
    };
  }
  const dx = sin(SCATTER_PHASES[index]!, 10);
  const dy = cos(SCATTER_PHASES[index]!, 7);
  const x2 = dx * local;
  const y2 = dy * local;
  const absoluteX = center.x + x2;
  const absoluteY = center.y + y2;
  if (absoluteX > 256 || absoluteX < -16 || absoluteY > 160 || absoluteY < -16) return null;
  const matrixValue = local === 0 ? 512 : Math.floor(0x10000 / (128 + 8 * local));
  return {
    kind: "scatter", index, owner: 6 + index,
    slot: profile.allocationSlots[6 + index]!, initialized: true,
    x: center.x, y: center.y, x2, y2,
    subpriority: profile.targetSubpriority - 2,
    matrixNum: profile.scatterMatrixNums[index]!,
    matrix: [matrixValue, 0, 0, matrixValue],
    data: [dx, dy, 0, 0, 0, 0, 0, 0],
  };
}

function orderKey(orb: Readonly<HiddenPowerOrb>): SpriteOrderKey {
  return {
    priority: 2,
    subpriority: orb.subpriority,
    oamY: orb.y + orb.y2 - (orb.kind === "scatter" ? 16 : 8),
    affineMode: orb.kind === "scatter" ? "double" : "normal",
    oamSize: 1,
    oamShape: "square",
  };
}

function orderAtAge(
  age: number,
  center: Readonly<{ x: number; y: number }>,
  uninitializedY: number,
  profile: Readonly<HiddenPowerProfile>,
): readonly number[] {
  let order: SpriteOrderState = createSpriteOrderState(profile.allocationSlots, profile.spriteOrderSeed);
  if (age < HIDDEN_POWER_ORBIT_AGE) return [];
  for (let index = 0; index < 6; index += 1) {
    const orb = orbitAtAge(HIDDEN_POWER_ORBIT_AGE, index, center, profile)!;
    order = createOrderedSprite(order, orb.owner, orderKey(orb));
  }
  order = sortSpriteOrder(order);
  for (let sourceAge = HIDDEN_POWER_ORBIT_AGE + 1; sourceAge <= Math.min(age, 117); sourceAge += 1) {
    for (let index = 0; index < 6; index += 1) {
      const orb = orbitAtAge(sourceAge, index, center, profile)!;
      order = updateOrderedSprite(order, orb.owner, orderKey(orb));
    }
    order = sortSpriteOrder(order);
  }
  if (age >= HIDDEN_POWER_SCATTER_AGE) {
    for (let index = 0; index < 6; index += 1) {
      const orb = orbitAtAge(HIDDEN_POWER_SCATTER_AGE, index, center, profile)!;
      order = updateOrderedSprite(order, orb.owner, orderKey(orb));
    }
    order = sortSpriteOrder(order);
    for (let index = 0; index < 8; index += 1) {
      const orb = scatterAtAge(HIDDEN_POWER_SCATTER_AGE, index, center, uninitializedY, profile)!;
      order = createOrderedSprite(order, orb.owner, orderKey(orb));
    }
  }
  if (age >= 119) {
    for (let index = 0; index < 6; index += 1) order = destroyOrderedSprite(order, index);
    for (let sourceAge = 119; sourceAge <= age; sourceAge += 1) {
      for (let index = 0; index < 8; index += 1) {
        const owner = 6 + index;
        const prior = scatterAtAge(sourceAge - 1, index, center, uninitializedY, profile);
        const orb = scatterAtAge(sourceAge, index, center, uninitializedY, profile);
        if (orb) order = updateOrderedSprite(order, owner, orderKey(orb));
        else if (prior) order = destroyOrderedSprite(order, owner);
      }
      order = sortSpriteOrder(order);
    }
  }
  return spriteOwnersBackToFront(order);
}

function animationRngAtAge(seed: number, age: number): number {
  let value = seed >>> 0;
  for (let tick = 1; tick <= Math.max(0, age); tick += 1) {
    // The eighth scatter command's deferred initializer occupies this one
    // scheduler handoff; both retained orientations independently pin it.
    if (tick === 119) continue;
    value = (Math.imul(value, 1103515245) + 24691) >>> 0;
  }
  return value;
}

/** Stock `GET_UNOWN_LETTER` packed personality-bit selector. */
export function hiddenPowerUnownFormIndex(personality: number): number {
  const value = personality >>> 0;
  return (
    ((value & 0x03000000) >>> 18)
    | ((value & 0x00030000) >>> 12)
    | ((value & 0x00000300) >>> 6)
    | (value & 3)
  ) % 28;
}

/** Age zero is Move_HIDDEN_POWER's first retained pointer-owned row. */
export function hiddenPowerAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  profile: Readonly<HiddenPowerProfile>,
): HiddenPowerState {
  if (profile.allocationSlots.length !== 14 || profile.spriteOrderSeed.length !== 14
    || profile.orbitMatrixNums.length !== 6 || profile.scatterMatrixNums.length !== 8) {
    throw new Error("HIDDEN_POWER requires complete live allocator/order/matrix facts");
  }
  const [sourceOffset, sourceWait] = sourceAtAge(age);
  const orbs = [
    ...ORBIT_PHASES.map((_, index) => orbitAtAge(age, index, attackerCenter, profile)),
    ...SCATTER_PHASES.map((_, index) => scatterAtAge(age, index, attackerCenter, profile.uninitializedScatterY, profile)),
  ].filter((orb): orb is HiddenPowerOrb => orb !== null);
  const coefficient = blendCoefficient(age);
  return {
    age,
    active: age >= 0 && age < HIDDEN_POWER_FIRST_INACTIVE_AGE,
    scriptActive: age >= 0 && age < HIDDEN_POWER_FIRST_INACTIVE_AGE,
    sourceOffset,
    sourceWait,
    animArg7: age >= HIDDEN_POWER_SCATTER_AGE ? -1 : 0,
    resourcesLoaded: age >= 1 && age <= 178,
    attackerScale: scaleAtAge(age),
    blend: { active: age >= 58 && age <= 177, coefficient, colorBgr555: 20479 },
    orbs,
    painterOrder: orderAtAge(age, attackerCenter, profile.uninitializedScatterY, profile),
    animationRng: animationRngAtAge(profile.animationRngSeed, age),
    unownFormIndex: hiddenPowerUnownFormIndex(profile.attackerPersonality),
    audio: [
      ...(age === 4 ? [{ age, song: "TAKE_DOWN" as const, pan: "attacker" as const }] : []),
      ...(age === 64 ? [{ age, song: "REVERSAL" as const, pan: "attacker" as const }] : []),
      ...(age === 118 ? [{ age, song: "REFLECT" as const, pan: "attacker" as const }] : []),
    ],
  };
}
