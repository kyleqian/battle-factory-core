import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type PinMissileSide = "player" | "opponent";

export interface PinMissileSprite {
  readonly kind: "missile" | "impact";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
  readonly animation: 0 | 2;
  readonly oamSlot: 3 | 4;
  readonly matrixNum: 0 | 3;
  readonly callback: "arc" | "destroy" | "affine" | "destroy-affine";
}

export interface PinMissileSoundEvent {
  readonly age: number;
  readonly song: "SE_M_JUMP_KICK" | "SE_M_HORN_ATTACK";
  readonly pan: number;
}

export interface PinMissileEffect {
  readonly attackerSide: PinMissileSide;
  readonly active: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetMonbg: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sprites: readonly PinMissileSprite[];
  readonly shakeTaskActive: boolean;
  readonly soundEvents: readonly PinMissileSoundEvent[];
}

const MISSILES = [
  { age: 10, targetX: -8, targetY: -8, wave: -32, slot: 3, matrixNum: 0 },
  { age: 27, targetX: 8, targetY: 8, wave: -40, slot: 4, matrixNum: 3 },
  { age: 44, targetX: 0, targetY: 0, wave: -32, slot: 3, matrixNum: 0 },
] as const;

const IMPACTS = [
  { age: 33, x: -8, y: -8, slot: 3, matrixNum: 0 },
  { age: 50, x: 8, y: 8, slot: 4, matrixNum: 3 },
  { age: 66, x: 0, y: 0, slot: 3, matrixNum: 0 },
] as const;

function signedLinearOffset(distance: number, callbacks: number): number {
  let delta = Math.trunc((Math.abs(distance) * 256) / 20);
  delta = distance < 0 ? delta | 1 : delta & ~1;
  const offset = Math.floor((delta * Math.min(callbacks, 20)) / 256);
  return distance < 0 ? -offset : offset;
}

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

function arcOffset(
  dx: number,
  dy: number,
  wave: number,
  callbacks: number,
): Readonly<{ x2: number; y2: number }> {
  const n = Math.min(callbacks, 20);
  const phase = Math.floor((n * Math.floor(0x8000 / 20)) / 256);
  return {
    x2: signedLinearOffset(dx, n),
    y2: signedLinearOffset(dy, n) + gbaSin(phase, wave),
  };
}

function biosArcTan(value: number): number {
  const mulShift = (left: number, right: number, shift: number) =>
    Math.imul(left, right) >> shift;
  const squared = -(Math.imul(value, value) >> 14);
  let coefficient = mulShift(0xa9, squared, 14) + 0x390;
  coefficient = mulShift(coefficient, squared, 14) + 0x91c;
  coefficient = mulShift(coefficient, squared, 14) + 0xfb6;
  coefficient = mulShift(coefficient, squared, 14) + 0x16aa;
  coefficient = mulShift(coefficient, squared, 14) + 0x2081;
  coefficient = mulShift(coefficient, squared, 14) + 0x3651;
  coefficient = mulShift(coefficient, squared, 14) + 0xa2f9;
  return Math.imul(value, coefficient) >> 16;
}

/** Exact integer transcription of GBA BIOS SWI 0x0a. */
function biosArcTan2(x: number, y: number): number {
  if (y === 0) return x < 0 ? 0x8000 : 0;
  if (x === 0) return y < 0 ? 0xc000 : 0x4000;
  const scaledX = x << 14;
  const scaledY = y << 14;
  const divide = (numerator: number, denominator: number) =>
    Math.trunc(numerator / denominator);
  if (y >= 0) {
    if (x >= 0) {
      return x >= y
        ? biosArcTan(divide(scaledY, x))
        : 0x4000 - biosArcTan(divide(scaledX, y));
    }
    return -x < y
      ? 0x4000 - biosArcTan(divide(scaledX, y))
      : 0x8000 + biosArcTan(divide(scaledY, x));
  }
  if (x <= 0) {
    return -x > -y
      ? 0x8000 + biosArcTan(divide(scaledY, x))
      : 0xc000 - biosArcTan(divide(scaledX, y));
  }
  return x < -y
    ? 0xc000 - biosArcTan(divide(scaledX, y))
    : 0x10000 + biosArcTan(divide(scaledY, x));
}

/** `ArcTan2Neg(dx,dy)-0x4000` followed by `ObjAffineSet` at unit scale. */
function tangentMatrix(dx: number, dy: number) {
  const rotation = (-biosArcTan2(dx, dy) - 0x4000) & 0xffff;
  const turn = rotation >>> 8;
  const sin = GBA_SINE_TABLE_256[turn]!;
  const cos = GBA_SINE_TABLE_256[(turn + 64) & 0xff]!;
  return { a: cos, b: sin === 0 ? 0 : -sin, c: sin, d: cos };
}

function missileAtAge(
  age: number,
  entry: typeof MISSILES[number],
  side: PinMissileSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): PinMissileSprite | null {
  const localAge = age - entry.age;
  if (localAge < 0 || localAge > 19) return null;
  const direction = side === "player" ? 1 : -1;
  const x = attackerCenter.x + direction * 20;
  const y = attackerCenter.y - 8;
  const endX = targetCenter.x + direction * entry.targetX;
  const endY = targetCenter.y + entry.targetY;
  // AnimMissileArc_Step preserves data[] after a look-ahead call but leaves
  // that second call's x2/y2 and affine tangent in the sprite itself.
  const current = arcOffset(endX - x, endY - y, entry.wave, localAge + 2);
  const prior = arcOffset(
    endX - x,
    endY - y,
    entry.wave,
    Math.min(localAge + 1, 19),
  );
  return {
    kind: "missile",
    x,
    y,
    ...current,
    matrix: tangentMatrix(current.x2 - prior.x2, current.y2 - prior.y2),
    animation: 0,
    oamSlot: entry.slot,
    matrixNum: entry.matrixNum,
    callback: localAge === 19 ? "destroy" : "arc",
  };
}

/** Complete 93-frame source-pointer body of `Move_PIN_MISSILE`. */
export function pinMissileEffectAtAge(
  age: number,
  attackerSide: PinMissileSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): PinMissileEffect {
  const sprites: PinMissileSprite[] = [];
  for (const entry of MISSILES) {
    const sprite = missileAtAge(
      age, entry, attackerSide, attackerCenter, targetCenter,
    );
    if (sprite) sprites.push(sprite);
  }
  const direction = attackerSide === "player" ? 1 : -1;
  for (const impact of IMPACTS) {
    const localAge = age - impact.age;
    if (localAge < 0 || localAge > 9) continue;
    sprites.push({
      kind: "impact",
      x: targetCenter.x + direction * impact.x,
      y: targetCenter.y + impact.y,
      x2: 0,
      y2: 0,
      matrix: { a: 372, b: 0, c: 0, d: 372 },
      animation: 2,
      oamSlot: impact.slot,
      matrixNum: impact.matrixNum,
      callback: localAge === 9 ? "destroy-affine" : "affine",
    });
  }
  const shakeStart = IMPACTS.find((impact) =>
    age >= impact.age && age <= impact.age + 1
  )?.age;
  const targetX2 = shakeStart === undefined ? 0 : -3;
  const attackerPan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  return {
    attackerSide,
    active: age >= 0 && age <= 91,
    alpha: age >= 10 && age <= 76 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 7 && age <= 79,
    targetOffset: { x2: targetX2, y2: 0 },
    sprites,
    shakeTaskActive: shakeStart !== undefined,
    soundEvents: [
      { age: 10, song: "SE_M_JUMP_KICK", pan: attackerPan },
      { age: 33, song: "SE_M_HORN_ATTACK", pan: targetPan },
      { age: 50, song: "SE_M_HORN_ATTACK", pan: targetPan },
      { age: 66, song: "SE_M_HORN_ATTACK", pan: targetPan },
    ],
  };
}
