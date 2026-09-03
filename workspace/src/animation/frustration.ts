/** Pure source-age reducer for Factory friendship-0 Frustration_Strongest. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  swaggerAngerMarkAtAge,
  type SwaggerAngerMark,
  type SwaggerPoint,
  type SwaggerSide,
} from "./swagger.ts";

export const FRUSTRATION_FIRST_INACTIVE_AGE = 228;
export const FRUSTRATION_ANGER_BIRTH_AGES = [71, 89] as const;
export const FRUSTRATION_IMPACT_BIRTH_AGES = [126, 133, 140, 147, 154, 161] as const;

const IMPACT_OFFSETS = [[0, 0], [24, 8], [-24, -16], [8, 4], [-16, 19], [18, -18]] as const;

export interface FrustrationAllocationProfile {
  readonly angerSlot: number;
  readonly angerMatrix: number;
  readonly impactSlots: readonly [number, number];
  readonly impactMatrices: readonly [number, number];
  readonly impactOrders: readonly [number, number];
  readonly impactSubpriority: number;
  readonly attackerSubpriority: number;
  readonly targetSubpriority: number;
}

export interface FrustrationImpact {
  readonly index: number;
  readonly age: number;
  readonly slot: number;
  readonly matrixNum: number;
  readonly order: number;
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly matrix: readonly [256, 0, 0, 256];
}

export interface FrustrationState {
  readonly age: number;
  readonly active: boolean;
  readonly scriptActive: boolean;
  readonly attackerX2: number;
  readonly targetX2: number;
  readonly attackerBlendY: number;
  readonly angerMarks: readonly SwaggerAngerMark[];
  readonly impacts: readonly FrustrationImpact[];
  readonly targetMonbg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly resources: Readonly<{ anger: boolean; impact: boolean }>;
  readonly visualTaskCount: number;
}

function shakeAtAge(age: number, birth: number, amplitude: number, duration: number): number {
  const local = age - birth;
  if (local < 0 || local > duration * 2 - 3) return 0;
  return Math.floor(local / 2) % 2 === 0 ? -amplitude : amplitude;
}

function swayAtAge(age: number, side: SwaggerSide): number {
  const local = age - 119;
  if (local < 0 || local > 41) return 0;
  const index = ((local + 1) * 24) & 0xff;
  const amplitude = side === "player" ? 16 : -16;
  return (GBA_SINE_TABLE_256[index]! * amplitude) >> 8;
}

function attackerBlendAtAge(age: number): number {
  if (age < 16) return 0;
  if (age <= 47) return Math.min(9, Math.floor((age - 16) / 4) + 1);
  if (age < 191) return 9;
  if (age <= 222) return Math.max(1, 8 - Math.floor((age - 191) / 4));
  return 0;
}

function angerAtAge(
  age: number,
  birth: number,
  side: SwaggerSide,
  center: SwaggerPoint,
): SwaggerAngerMark | null {
  // Both strongest-branch creates use x=20,y=-28. Passing spawnIndex 1
  // reuses the literal shared template without importing Swagger timing.
  return swaggerAngerMarkAtAge(age, 1, birth, side, center);
}

function impactAtAge(
  age: number,
  index: number,
  targetSide: SwaggerSide,
  targetCenter: SwaggerPoint,
  profile: FrustrationAllocationProfile,
): FrustrationImpact | null {
  const local = age - FRUSTRATION_IMPACT_BIRTH_AGES[index]!;
  if (local < 0 || local > 8) return null;
  const [sourceX, sourceY] = IMPACT_OFFSETS[index]!;
  const x = targetSide === "player" ? -sourceX : sourceX;
  const lane = index & 1;
  return {
    index,
    age: local,
    slot: profile.impactSlots[lane]!,
    matrixNum: profile.impactMatrices[lane]!,
    order: profile.impactOrders[lane]!,
    x: targetCenter.x + x,
    y: targetCenter.y + sourceY,
    subpriority: profile.impactSubpriority,
    matrix: [256, 0, 0, 256],
  };
}

/** Age zero is the retained Move_FRUSTRATION pointer-entry row. */
export function frustrationAtAge(
  age: number,
  attackerSide: SwaggerSide,
  attackerCenter: SwaggerPoint,
  targetSide: SwaggerSide,
  targetCenter: SwaggerPoint,
  profile: FrustrationAllocationProfile,
  targetInitialX2 = 0,
): FrustrationState {
  const shake = shakeAtAge(age, 10, 1, 15);
  const sway = swayAtAge(age, attackerSide);
  const angerMarks = FRUSTRATION_ANGER_BIRTH_AGES.map((birth) =>
    angerAtAge(age, birth, attackerSide, attackerCenter))
    .filter((mark): mark is SwaggerAngerMark => mark !== null);
  const impacts = FRUSTRATION_IMPACT_BIRTH_AGES.map((_, index) =>
    impactAtAge(age, index, targetSide, targetCenter, profile))
    .filter((impact): impact is FrustrationImpact => impact !== null);
  return {
    age,
    active: age >= 0 && age <= FRUSTRATION_FIRST_INACTIVE_AGE,
    scriptActive: age >= 0 && age < FRUSTRATION_FIRST_INACTIVE_AGE,
    attackerX2: age >= 119 ? sway : shake,
    targetX2: age < 126 ? targetInitialX2 : shakeAtAge(age, 126, 4, 30),
    attackerBlendY: attackerBlendAtAge(age),
    angerMarks,
    impacts,
    targetMonbg: age >= 7 && age <= 226,
    alpha: age >= 10 && age <= 223 ? { eva: 12, evb: 8 } : null,
    resources: { anger: age >= 1 && age < 228, impact: age >= 4 && age < 228 },
    visualTaskCount: Number(age >= 10 && age <= 37)
      + Number(age >= 10 && age <= 47)
      + Number(age >= 119 && age <= 160)
      + Number(age >= 126 && age <= 183)
      + Number(age >= 185 && age <= 222)
      + angerMarks.length + impacts.length,
  };
}
