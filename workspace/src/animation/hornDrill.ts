/** Pure source-relative reducer for Move_HORN_DRILL's presentation body. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type HornDrillSide = "player" | "opponent";
export interface HornDrillProfile {
  readonly hornSlot: number;
  readonly hornMatrixId: number;
  readonly impactSlots: readonly number[];
  readonly impactMatrixIds: readonly number[];
  readonly spriteOrderSeed: readonly number[];
  readonly effectSubpriority: number;
}
export interface HornDrillGeometry {
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
  readonly attackerRestOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
}
export interface HornDrillImpact {
  readonly kind: "impact";
  readonly index: number;
  readonly slot: number;
  readonly matrixId: number;
  readonly x: number;
  readonly y: number;
  readonly invisible: boolean;
  readonly matrix: readonly [number, number, number, number];
  readonly animation: 2 | 3;
}
export interface HornDrillHorn {
  readonly kind: "horn";
  readonly slot: number;
  readonly matrixId: number;
  readonly x: number;
  readonly y: number;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
}
export interface HornDrillState {
  readonly age: number;
  readonly active: boolean;
  readonly attackerSide: HornDrillSide;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerMatrix: readonly [number, number, number, number];
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly horn: HornDrillHorn | null;
  readonly impacts: readonly HornDrillImpact[];
  readonly background: Readonly<{ active: boolean; hofs: number; vofs: number }>;
  readonly fadeY: number;
  readonly alpha: readonly [12, 8] | null;
  readonly resources: Readonly<{ impact: boolean; horn: boolean; freed: boolean }>;
  readonly audio: Readonly<{ id: string; pan: number }> | null;
  readonly cleanup: Readonly<{ sourceRestore: boolean; hardwareRestore: boolean; firstInactive: boolean }>;
}

const IDENTITY = [256, 0, 0, 256] as const;
const IMPACT_ARGS = [
  [0, 0, 3], [0, 2, 3], [-4, 3, 3], [-8, -5, 3], [4, -12, 3],
  [16, 0, 3], [5, 18, 3], [-17, 12, 2], [-21, -15, 2], [8, -27, 2],
  [32, 0, 2],
] as const;

function rotationMatrix(angle: number): readonly [number, number, number, number] {
  const index = angle >> 8 & 0xff;
  const sin = GBA_SINE_TABLE_256[index]!;
  const cos = GBA_SINE_TABLE_256[index + 64 & 0xff]!;
  return [cos, -sin, sin, cos];
}

function bowState(age: number, side: -1 | 1): {
  offset: { x2: number; y2: number };
  matrix: readonly [number, number, number, number];
} {
  let x2 = 0;
  if (age >= 46 && age <= 51) x2 = side * 2 * (age - 45);
  else if (age >= 52 && age <= 62) x2 = side * 12;
  else if (age >= 63 && age <= 65) x2 = side * 3 * (66 - age);
  let angle = 0;
  if (age >= 53 && age <= 148) angle = side * 0x300 * Math.min(age - 52, 4);
  else if (age >= 149 && age <= 150) angle = side * 0x400 * (151 - age);
  const matrix = angle === 0 ? IDENTITY : rotationMatrix(angle);
  return { offset: { x2, y2: Math.abs(matrix[2]) >> 3 }, matrix };
}

function longShake(age: number, amplitude: number): number {
  if (age < 74 || age > 150) return 0;
  const block = Math.floor((age - 74 + 1) / 2);
  return block % 2 === 0 ? -amplitude : amplitude;
}

function fadeAtAge(age: number, side: HornDrillSide): number {
  if (age < 9) return 0;
  if (age <= 24) return age - 8;
  if (age <= 27) return 16;
  if (age <= 43) return 43 - age;
  if (age < 155) return 0;
  if (age <= 170) return age - 154;
  const downStart = side === "player" ? 175 : 174;
  if (age < downStart) return 16;
  return Math.max(0, 16 - (age - downStart + 1));
}

function impactsAtAge(
  age: number,
  target: Readonly<{ x: number; y: number }>,
  attackerSide: HornDrillSide,
  profile: Readonly<HornDrillProfile>,
): readonly HornDrillImpact[] {
  return IMPACT_ARGS.flatMap(([dx, dy, animation], index) => {
    const spawnAge = 74 + index * 6;
    const local = age - spawnAge;
    if (local < 0 || local > 12) return [];
    return [{
      kind: "impact" as const, index,
      slot: profile.impactSlots[index]!, matrixId: profile.impactMatrixIds[index]!,
      x: target.x + dx * (attackerSide === "player" ? 1 : -1), y: target.y + dy,
      invisible: local % 2 === 0,
      matrix: animation === 3 ? [512, 0, 0, 512] as const : [372, 0, 0, 372] as const,
      animation,
    }];
  });
}

export function hornDrillAtAge(
  age: number,
  attackerSide: HornDrillSide,
  geometry: Readonly<HornDrillGeometry>,
  profile: Readonly<HornDrillProfile>,
): HornDrillState {
  const side = attackerSide === "player" ? -1 : 1;
  const bow = bowState(age, side);
  const shakeActive = age >= 74 && age <= 150;
  const attackerOffset = shakeActive
    ? { x2: longShake(age, 2), y2: bow.offset.y2 }
    : age >= 151 ? { x2: 0, y2: bow.offset.y2 } : bow.offset;
  const targetOffset = shakeActive
    ? { x2: longShake(age, 10), y2: 0 }
    : { x2: 0, y2: 0 };
  const hornLocal = age - 62;
  const target = geometry.targetPictureCenter;
  const hornStartX = target.x + side * 40;
  const hornStartY = target.y - side * 20;
  const hornDxQ7 = Math.trunc((-side * 0x1400) / 12);
  const hornDyQ7 = Math.trunc((side * 0x0a00) / 12);
  const horn = hornLocal >= 0 && hornLocal <= 10 ? {
    kind: "horn" as const, slot: profile.hornSlot, matrixId: profile.hornMatrixId,
    x: hornLocal === 10 ? target.x : ((hornStartX << 7) + hornDxQ7 * (hornLocal + 1)) >> 7,
    y: hornLocal === 10 ? target.y : ((hornStartY << 7) + hornDyQ7 * (hornLocal + 1)) >> 7,
    hFlip: attackerSide === "opponent", vFlip: attackerSide === "opponent",
  } : null;
  const scrollAge = Math.max(0, Math.min(age - 25, 146));
  const scrollSign = attackerSide === "player" ? -1 : 1;
  const backgroundActive = age >= 26 && age <= 171;
  const impactIndex = Math.floor((age - 74) / 6);
  const audio = age === 45
    ? { id: "SE_M_HEADBUTT", pan: attackerSide === "player" ? -64 : 63 }
    : age === 74
      ? { id: "SE_BANG", pan: 0 }
      : impactIndex >= 0 && impactIndex < 11 && age === 74 + impactIndex * 6
        ? { id: "SE_M_HORN_ATTACK", pan: attackerSide === "player" ? 63 : -63 }
        : null;
  return {
    age, active: age >= 0 && age < (attackerSide === "player" ? 192 : 191), attackerSide,
    attackerOffset, attackerMatrix: bow.matrix, targetOffset,
    horn, impacts: impactsAtAge(age, target, attackerSide, profile),
    background: {
      active: backgroundActive,
      hofs: backgroundActive ? (scrollSign * 9 * scrollAge) & 0x1ff : 0,
      vofs: backgroundActive ? (-scrollSign * 3 * scrollAge) & 0x1ff : 0,
    },
    fadeY: fadeAtAge(age, attackerSide),
    alpha: age >= 45 && age <= 153 ? [12, 8] : null,
    resources: { impact: age >= 0 && age <= 190, horn: age >= 1 && age <= 190, freed: age >= 191 },
    audio,
    cleanup: { sourceRestore: age === 172, hardwareRestore: age === 173,
      firstInactive: age >= (attackerSide === "player" ? 192 : 191) },
  };
}
