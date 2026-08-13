import { healingBlueStarsAtAge, type RecoverEffectSprite } from "./recover.ts";
import {
  shakeMon2DisplayedOffsetAtAge,
  shakeMon2OffsetAtTick,
} from "./shakeMon2.ts";

export type SwallowSide = "player" | "opponent";
export type SwallowStockpileCount = 1 | 2 | 3;

export interface SwallowOrb {
  readonly index: number;
  readonly wave: number;
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly velocityQ8: number;
}

export interface SwallowState {
  readonly active: boolean;
  readonly assetsLoaded: Readonly<{ blueOrb: boolean; blueStar: boolean }>;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerMatrix: Readonly<{ a: number; b: 0; c: 0; d: number }>;
  readonly orbs: readonly SwallowOrb[];
  readonly stars: readonly RecoverEffectSprite[];
  readonly visualTaskCount: number;
  readonly sound: Readonly<{
    song: "SE_M_TAKE_DOWN" | "SE_M_SPIT_UP" | "SE_M_ABSORB_2";
    player: "SE1" | "SE2";
    pan: number;
  }> | null;
  readonly battlerDisplayAge: number;
  readonly attackerDisplayedX2: number;
  readonly attackerDisplayedY2: number;
  readonly effectDisplayAge: number;
}

const ORB_X = [0, -24, 16, -16, 24] as const;

function affineMatrixAtAge(age: number): Readonly<{ a: number; b: 0; c: 0; d: number }> {
  if (age < 7 || age > 92) return { a: 256, b: 0, c: 0, d: 256 };
  if (age <= 26) return { a: 256, b: 0, c: 0, d: 256 + (age - 6) * 6 };
  if (age <= 46) return { a: 256, b: 0, c: 0, d: 376 };
  if (age <= 52) {
    const step = age - 46;
    return { a: 256 + step * 7, b: 0, c: 0, d: 376 - step * 30 };
  }
  if (age <= 72) return { a: 298, b: 0, c: 0, d: 196 };
  const step = age - 72;
  return { a: 298 - step * 2, b: 0, c: 0, d: 196 + step * 3 };
}

function trunc(value: number): number {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

function affineYOffset(matrixD: number, pictureYOffset: number): number {
  const pictureHeight = 64 - pictureYOffset * 2;
  const scaledHeight = trunc((pictureHeight << 8) / matrixD);
  return trunc((pictureHeight - scaledHeight) / 2);
}

function orbAtLocalAge(
  localAge: number,
  index: number,
  wave: number,
  side: SwallowSide,
  center: Readonly<{ x: number; y: number }>,
  pictureOffsetY: number,
): SwallowOrb | null {
  if (localAge < 0) return null;
  let y2 = 0;
  let velocityQ8 = 0x900;
  for (let callback = 0; callback <= localAge; callback += 1) {
    y2 -= velocityQ8 >> 8;
    velocityQ8 -= 96;
    if (center.y - 8 + y2 > pictureOffsetY) return null;
  }
  const sourceX = ORB_X[index]!;
  return {
    index: wave * ORB_X.length + index,
    wave,
    x: center.x + (side === "player" ? sourceX : -sourceX),
    y: center.y - 8,
    y2,
    velocityQ8,
  };
}

export function swallowCleanupAge(
  side: SwallowSide,
  stockpiles: SwallowStockpileCount,
): number {
  return (side === "player" ? 162 : 160) + (stockpiles - 1) * 15;
}

/**
 * Pure source-relative Move_SWALLOW presentation. Stockpile count is an
 * immutable caller input; this reducer never heals HP or mutates stockpile.
 */
export function swallowAtAge(
  age: number,
  side: SwallowSide,
  stockpiles: SwallowStockpileCount,
  attackerCenter: Readonly<{ x: number; y: number }>,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  pictureYOffset: number,
): SwallowState {
  const matrix = affineMatrixAtAge(age);
  const firstShake = shakeMon2OffsetAtTick(1, 0, 8, 2, age - 6);
  const secondShake = shakeMon2OffsetAtTick(2, 0, 12, 1, age - 46);
  const shakeX = age >= 47 && age <= 68
    ? secondShake.x2
    : age >= 7 && age <= 28
      ? firstShake.x2
      : 0;
  const orbs: SwallowOrb[] = [];
  for (let wave = 0; wave < stockpiles; wave += 1) {
    for (let index = 0; index < ORB_X.length; index += 1) {
      const orb = orbAtLocalAge(
        age - (47 + wave * 15 + index * 3),
        index,
        wave,
        side,
        attackerCenter,
        attackerPictureOffset.y,
      );
      if (orb) orbs.push(orb);
    }
  }
  const healingStart = (side === "player" ? 109 : 107) + (stockpiles - 1) * 15;
  const stars = healingBlueStarsAtAge(
    age - healingStart,
    side,
    attackerPictureOffset,
  );
  const cleanupAge = swallowCleanupAge(side, stockpiles);
  const deformActive = age >= 7 && age <= 92;
  const firstShakeActive = age >= 7 && age <= 28;
  const secondShakeActive = age >= 47 && age <= 68;
  const pan = side === "player" ? -64 : 63;
  const displayedAffineMatrix = affineMatrixAtAge(age - 2);
  const firstDisplayedShake = shakeMon2DisplayedOffsetAtAge(1, 0, 8, 2, age, 7);
  const secondDisplayedShake = shakeMon2DisplayedOffsetAtAge(2, 0, 12, 1, age, 47);
  return {
    active: age >= 0 && age < cleanupAge,
    assetsLoaded: {
      blueOrb: age >= 1 && age < cleanupAge,
      blueStar: age >= 4 && age < cleanupAge,
    },
    attackerOffset: {
      x2: shakeX,
      y2: affineYOffset(matrix.d, pictureYOffset),
    },
    attackerMatrix: matrix,
    orbs,
    stars,
    visualTaskCount: Number(deformActive) + Number(firstShakeActive)
      + Number(secondShakeActive) + orbs.length + stars.length,
    sound: age === 7
      ? { song: "SE_M_TAKE_DOWN", player: "SE2", pan }
      : age === 47
        ? { song: "SE_M_SPIT_UP", player: "SE1", pan }
        : age === healingStart
          ? { song: "SE_M_ABSORB_2", player: "SE1", pan }
          : null,
    // Affine task writes trail source RAM by two rows. ShakeMon2's creation
    // write is already available to BuildOamBuffer and follows its separately
    // source-derived task display schedule.
    battlerDisplayAge: age - 2,
    attackerDisplayedX2: age >= 8 && age <= 30
      ? firstDisplayedShake.x2
      : age >= 48 && age <= 72
        ? secondDisplayedShake.x2
        : 0,
    // The second ShakeMon2 initializer writes its zero yOffset into the
    // selected OAM row after deform prepared the preceding affine matrix;
    // deform resumes ownership on the following row.
    attackerDisplayedY2: age === 48
      ? 0
      : affineYOffset(displayedAffineMatrix.d, pictureYOffset),
    effectDisplayAge: age - 1,
  };
}
