/** Pure source-age reducer for Move_TRI_ATTACK's complete presentation body. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { linearTranslationOffsetAfterCallbacks } from "./animLinearTranslation.ts";
import { thunderPunchLightningFrameAtLocalAge } from "./thunderPunch.ts";

export type TriAttackSide = "player" | "opponent";
export interface TriAttackGeometry {
  readonly attackerPositionCenter: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
}
export interface TriAttackProfile {
  readonly triangleSlot: number;
  readonly triangleMatrixId: number;
  readonly fireSlots: readonly number[];
  readonly lightningSlots: readonly number[];
  readonly iceSlots: readonly number[];
  readonly iceMatrixIds: readonly number[];
  readonly paletteSlots: readonly [number, number];
  readonly effectSubpriority: number;
  readonly spriteOrderSeed: readonly number[];
}
export interface TriAttackSprite {
  readonly kind: "triangle" | "fire" | "lightning" | "ice";
  readonly index: number; readonly slot: number; readonly matrixId: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly frame: number; readonly invisible: boolean;
  readonly matrix: readonly [number, number, number, number];
  readonly subpriority: number; readonly sourceCreationAge: number;
}
export interface TriAttackState {
  readonly age: number; readonly active: boolean; readonly attackerSide: TriAttackSide;
  readonly sprites: readonly TriAttackSprite[];
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly backgroundBlackCoefficient: number;
  readonly inverted: boolean;
  readonly panning: readonly [number, number, number];
  readonly resources: Readonly<{ triangle: boolean; fire: boolean; lightning: boolean; ice: boolean }>;
}

const IDENTITY = [256, 0, 0, 256] as const;
const FIRE_BIRTHS = [107, 107, 110, 113, 116, 119, 122, 125] as const;
const FIRE_DELTAS = [[-1, 0], [0, 1], [-1, -1], [2, 1], [1, -1], [-1, 1], [1, -2], [3, 1]] as const;
const LIGHTNING_BIRTHS = [158, 161, 164] as const;
const LIGHTNING_Y = [-48, -16, 16] as const;
const ICE_BIRTHS = [208, 214, 220, 226, 232, 238, 244] as const;
const ICE_OFFSETS = [[-10, -10], [10, 20], [-5, 10], [17, -12], [-15, 15], [0, 0], [20, 2]] as const;
const ICE_LARGE = new Set([0, 2, 6]);

function triangleAngle(age: number): number {
  if (age <= 42) return (age - 4 + 2) * 5 & 255;
  if (age <= 52) return (200 + (age - 42) * 10) & 255;
  if (age <= 62) return (44 + (age - 52) * 15) & 255;
  return (194 + (age - 62) * 20) & 255;
}
function rotationMatrix(angle: number): readonly [number, number, number, number] {
  const sine = GBA_SINE_TABLE_256[angle & 255]!;
  const cosine = GBA_SINE_TABLE_256[(angle + 64) & 255]!;
  return [cosine, -sine, sine, cosine];
}
function fixedDelta(distance: number, duration: number): number {
  const magnitude = Math.trunc(Math.abs(distance) * 256 / duration);
  return distance < 0 ? -(magnitude | 1) : magnitude & ~1;
}
function triangle(age: number, side: TriAttackSide, geometry: Readonly<TriAttackGeometry>, profile: Readonly<TriAttackProfile>): TriAttackSprite | null {
  if (age < 4 || age > 84) return null;
  const data0 = age - 2;
  const translating = age >= 63;
  const callbacks = Math.max(0, Math.min(20, age - 63));
  const startX = geometry.attackerPositionCenter.x + (side === "player" ? 16 : -16);
  const startY = geometry.attackerPositionCenter.y;
  const rawDx = fixedDelta(geometry.targetPictureCenter.x - startX, 20);
  const rawDy = fixedDelta(geometry.targetPictureCenter.y - startY, 20);
  return { kind: "triangle", index: 0, slot: profile.triangleSlot,
    matrixId: profile.triangleMatrixId, x: startX, y: startY,
    x2: translating ? linearTranslationOffsetAfterCallbacks(rawDx, callbacks, 20) : 0,
    y2: translating ? linearTranslationOffsetAfterCallbacks(rawDy, callbacks, 20) : 0,
    frame: 0, invisible: data0 <= 30 && (data0 & 1) === 0,
    matrix: rotationMatrix(triangleAngle(age)), subpriority: profile.effectSubpriority,
    sourceCreationAge: 4 };
}
function impactMatrix(localAge: number): readonly [number, number, number, number] {
  const scale = 211 + Math.min(localAge, 9) * 5;
  const reciprocal = Math.floor(0x10000 / scale);
  return [reciprocal, 0, 0, reciprocal];
}
function targetOffset(age: number): Readonly<{ x2: number; y2: number }> {
  const pattern1 = [-1, 0, 1, 0, -1, 1, 0, -1, 0, 1] as const;
  const pattern0 = [-1, -1, 0, 1, 1, 0, 0, -1, -1, 1] as const;
  if (age >= 129 && age <= 146) return { x2: 0, y2: Math.abs(3 * pattern1[(age - 127) % 10]!) };
  if (age >= 186 && age <= 203) {
    // This source task deliberately rereads gBattleAnimArgs[1] instead of its
    // saved tShakeOffset. The asynchronous invert_screen_color command
    // replaces that shared argument with 0x101 at age 191, so the latter half
    // of the electric shake uses 257 rather than the script's initial 3.
    const liveArgument = age >= 191 ? 0x101 : 3;
    return { x2: 0, y2: Math.abs(liveArgument * pattern0[(age - 184) % 10]!) };
  }
  return { x2: 0, y2: 0 };
}
function blackCoefficient(age: number): number {
  if (age < 89) return 0;
  if (age < 117) return Math.min(16, 2 + Math.floor((age - 89) / 4) * 2);
  if (age < 247) return 16;
  if (age <= 275) return Math.max(0, 14 - Math.floor((age - 247) / 4) * 2);
  return 0;
}

export function triAttackAtAge(age: number, attackerSide: TriAttackSide,
  geometry: Readonly<TriAttackGeometry>, profile: Readonly<TriAttackProfile>): TriAttackState {
  const fireSign = attackerSide === "player" ? -1 : 1;
  const targetArgSign = attackerSide === "player" ? 1 : -1;
  const sprites: TriAttackSprite[] = [];
  const tri = triangle(age, attackerSide, geometry, profile); if (tri) sprites.push(tri);
  for (let index = 0; index < FIRE_BIRTHS.length; index += 1) {
    const birth = FIRE_BIRTHS[index]!, local = age - birth;
    if (local < 0 || local > 28) continue;
    const [dx, dy] = FIRE_DELTAS[index]!;
    sprites.push({ kind: "fire", index, slot: profile.fireSlots[index]!, matrixId: 0,
      x: geometry.targetPictureCenter.x, y: geometry.targetPictureCenter.y,
      x2: fireSign * dx * (local + 1), y2: dy * (local + 1),
      frame: Math.floor((local + 1) / 3) % 8, invisible: false, matrix: IDENTITY,
      subpriority: profile.effectSubpriority, sourceCreationAge: birth });
  }
  for (let index = 0; index < LIGHTNING_BIRTHS.length; index += 1) {
    const birth = LIGHTNING_BIRTHS[index]!, local = age - birth;
    if (local < 0 || local > 27) continue;
    sprites.push({ kind: "lightning", index, slot: profile.lightningSlots[index]!, matrixId: 0,
      x: geometry.targetPictureCenter.x, y: geometry.targetPictureCenter.y + LIGHTNING_Y[index]!,
      x2: 0, y2: 0, frame: thunderPunchLightningFrameAtLocalAge(local), invisible: false,
      matrix: IDENTITY, subpriority: profile.effectSubpriority, sourceCreationAge: birth });
  }
  for (let index = 0; index < ICE_BIRTHS.length; index += 1) {
    const birth = ICE_BIRTHS[index]!, local = age - birth;
    if (local < 0 || local > 36) continue;
    const [ox, oy] = ICE_OFFSETS[index]!;
    sprites.push({ kind: "ice", index, slot: profile.iceSlots[index]!, matrixId: profile.iceMatrixIds[index]!,
      x: geometry.targetPictureCenter.x + targetArgSign * ox, y: geometry.targetPictureCenter.y + oy,
      x2: 0, y2: 0, frame: ICE_LARGE.has(index) ? 0 : 1,
      invisible: local >= 18 && ((local - 17) & 1) === 1, matrix: impactMatrix(local),
      subpriority: profile.effectSubpriority, sourceCreationAge: birth });
  }
  return { age, active: age >= 0 && age < 283, attackerSide, sprites,
    targetOffset: targetOffset(age), backgroundBlackCoefficient: blackCoefficient(age),
    inverted: age >= 158 && age < 190,
    panning: attackerSide === "player" ? [-64, 63, 5] : [63, -63, -5],
    resources: { triangle: age >= 1, fire: age >= 106, lightning: age >= 155, ice: age >= 205 },
  };
}
