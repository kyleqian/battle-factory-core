/** Pure source-age reducer for Emerald's MOVE_STOCKPILE presentation. */

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

export const STOCKPILE_FIRST_INACTIVE_AGE = 98;
export const STOCKPILE_ORB_BIRTH_AGES = Array.from(
  { length: 16 },
  (_, index) => 4 + index * 3,
);

const ORB_OFFSETS = [
  [55, 55], [-55, -55], [0, 55], [0, -55],
  [55, -34], [55, 34], [-55, -34], [-55, 34],
] as const;

export interface StockpileAnimationProfile {
  /** Live lowest-free sprite slots available to the five concurrent orbs. */
  readonly orbSlotPool: readonly [number, number, number, number, number];
  /** Live lowest-free affine matrices available to the same orbs. */
  readonly orbMatrixPool: readonly [number, number, number, number, number];
  /** Relative persistent `sSpriteOrder` immediately before the first birth. */
  readonly spriteOrderSeed: readonly [number, number, number, number, number];
  readonly attackerSubpriority: number;
}

export interface StockpileOrb {
  readonly index: number;
  readonly slot: number;
  readonly matrixNum: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly matrix: readonly [number, 0, 0, number];
  readonly callback: "AnimTranslateLinear_WithFollowup" | "DestroySpriteAndMatrix";
  readonly data: readonly [number, number, number, number, number, 0, 26445, 2058];
}

export interface StockpileState {
  readonly age: number;
  readonly active: boolean;
  readonly scriptActive: boolean;
  readonly sourceOffset: number | null;
  readonly sourceWait: number;
  readonly attackerMatrix: readonly [number, 0, 0, number];
  readonly attackerY2: number;
  readonly attackerPaletteY: number;
  readonly orbs: readonly StockpileOrb[];
  readonly orbPainterOrder: readonly number[];
  readonly resources: Readonly<{ loaded: boolean; paletteTransferred: boolean }>;
  readonly visualTaskCount: number;
  readonly sound: Readonly<{ song: "SE_M_MEGA_KICK"; pan: number }> | null;
}

function sourceOffsetAtAge(age: number): number | null {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  for (let index = 0; index < 16; index += 1) {
    const birth = STOCKPILE_ORB_BIRTH_AGES[index]!;
    const offset = 77 + (index % 8) * 15;
    if (age === birth) return offset;
    if (age === birth + 1 || age === birth + 2) return offset;
  }
  if (age >= 52 && age <= 78) return 43;
  if (age >= 79 && age <= STOCKPILE_FIRST_INACTIVE_AGE) return 61;
  return null;
}

function sourceWaitAtAge(age: number): number {
  if (age === 1 || age === 4 || age >= 52) return 1;
  return STOCKPILE_ORB_BIRTH_AGES.includes(age) ? 1 : 0;
}

function deformMatrixAtAge(age: number): readonly [number, 0, 0, number] {
  const local = age >= 41 && age <= 76 ? age - 41 : age >= 4 && age <= 39 ? age - 4 : -1;
  if (local < 0) return [256, 0, 0, 256];
  if (local < 12) return [264 + local * 8, 0, 0, 248 - local * 8];
  if (local < 24) {
    const step = local - 11;
    return [352 - step * 16, 0, 0, 160 + step * 16];
  }
  const step = local - 23;
  return [160 + step * 8, 0, 0, 352 - step * 8];
}

function affineYOffset(matrixD: number, pictureYOffset: number): number {
  const pictureHeight = 64 - pictureYOffset * 2;
  const scaledHeight = Math.trunc((pictureHeight << 8) / matrixD);
  return Math.trunc((pictureHeight - scaledHeight) / 2);
}

function paletteYAtAge(age: number): number {
  if (age < 14) return 0;
  if (age <= 73) return Math.min(12, 2 * (Math.floor((age - 14) / 10) + 1));
  if (age <= 80) return 12;
  if (age <= 91) return Math.max(0, 12 - 2 * (Math.floor((age - 81) / 2) + 1));
  return 0;
}

function signedDelta(offset: number): number {
  const magnitude = Math.trunc(Math.abs(offset) * 256 / 13);
  return offset > 0 ? magnitude | 1 : magnitude & ~1;
}

function orbAtAge(
  age: number,
  index: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
  profile: Readonly<StockpileAnimationProfile>,
): StockpileOrb | null {
  const local = age - STOCKPILE_ORB_BIRTH_AGES[index]!;
  if (local < 0 || local > 13) return null;
  const [sourceX, sourceY] = ORB_OFFSETS[index % 8]!;
  const xOffset = side === "player" ? sourceX : -sourceX;
  const x = center.x + xOffset;
  const y = center.y + sourceY;
  const dx = signedDelta(xOffset);
  const dy = signedDelta(sourceY);
  const callbacks = Math.min(13, local + 1);
  const xAccum = dx * callbacks;
  const yAccum = dy * callbacks;
  const x2 = dx & 1 ? -(xAccum >> 8) : xAccum >> 8;
  const y2 = dy & 1 ? -(yAccum >> 8) : yAccum >> 8;
  const scale = 320 - 14 * (local + 1);
  const matrix = Math.trunc(65536 / scale);
  return {
    index,
    slot: profile.orbSlotPool[index % 5]!,
    matrixNum: profile.orbMatrixPool[index % 5]!,
    x,
    y,
    x2,
    y2,
    subpriority: profile.attackerSubpriority - 2,
    matrix: [matrix, 0, 0, matrix],
    callback: local === 13 ? "DestroySpriteAndMatrix" : "AnimTranslateLinear_WithFollowup",
    data: [Math.max(0, 12 - local), dx, dy, xAccum, yAccum, 0, 26445, 2058],
  };
}

function orderKey(orb: Readonly<StockpileOrb>): SpriteOrderKey {
  return {
    priority: 2,
    subpriority: orb.subpriority,
    oamY: orb.y + orb.y2 - 8,
    affineMode: "double",
    oamSize: 0,
    oamShape: "square",
  };
}

function painterOrder(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
  profile: Readonly<StockpileAnimationProfile>,
): readonly number[] {
  let state: SpriteOrderState = createSpriteOrderState(profile.orbSlotPool, profile.spriteOrderSeed);
  for (let sourceAge = 4; sourceAge <= age; sourceAge += 1) {
    for (let index = 0; index < 16; index += 1) {
      const birth = STOCKPILE_ORB_BIRTH_AGES[index]!;
      if (sourceAge === birth + 14) state = destroyOrderedSprite(state, index);
      if (sourceAge === birth) {
        state = createOrderedSprite(state, index, orderKey(orbAtAge(sourceAge, index, side, center, profile)!));
      } else if (sourceAge > birth && sourceAge <= birth + 13) {
        state = updateOrderedSprite(state, index, orderKey(orbAtAge(sourceAge, index, side, center, profile)!));
      }
    }
    state = sortSpriteOrder(state);
  }
  return spriteOwnersBackToFront(state);
}

/** Age zero is Move_STOCKPILE's first retained pointer-owned row. */
export function stockpileAtAge(
  age: number,
  side: "player" | "opponent",
  attackerPictureCenter: Readonly<{ x: number; y: number }>,
  attackerPictureYOffset: number,
  profile: Readonly<StockpileAnimationProfile>,
): StockpileState {
  const orbs = Array.from({ length: 16 }, (_, index) =>
    orbAtAge(age, index, side, attackerPictureCenter, profile)).filter((orb): orb is StockpileOrb => orb !== null);
  const attackerMatrix = deformMatrixAtAge(age);
  return {
    age,
    active: age >= 0 && age <= STOCKPILE_FIRST_INACTIVE_AGE,
    scriptActive: age >= 0 && age < STOCKPILE_FIRST_INACTIVE_AGE,
    sourceOffset: sourceOffsetAtAge(age),
    sourceWait: sourceWaitAtAge(age),
    attackerMatrix,
    attackerY2: affineYOffset(attackerMatrix[3], attackerPictureYOffset),
    attackerPaletteY: paletteYAtAge(age),
    orbs,
    orbPainterOrder: painterOrder(age, side, attackerPictureCenter, profile),
    resources: { loaded: age >= 1 && age < 98, paletteTransferred: age >= 2 && age < 98 },
    visualTaskCount: orbs.length + Number(age >= 4 && age <= 77) + Number(age >= 4 && age <= 68)
      + Number(age >= 79 && age <= 96),
    sound: age === 1 ? { song: "SE_M_MEGA_KICK", pan: side === "player" ? -64 : 63 } : null,
  };
}
