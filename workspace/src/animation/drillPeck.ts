import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type DrillPeckSide = "player" | "opponent";

export interface DrillPeckMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface DrillPeckBowController {
  readonly phase: 0 | 1 | 2;
  readonly active: boolean;
}

export interface DrillPeckImpact {
  readonly spawnAge: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly animation: 3;
  readonly invisible: boolean;
  readonly matrix: DrillPeckMatrix;
}

export interface DrillPeckState {
  readonly attackerSide: DrillPeckSide;
  readonly targetSide: DrillPeckSide;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerMatrix: DrillPeckMatrix;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly controllers: readonly DrillPeckBowController[];
  readonly impacts: readonly DrillPeckImpact[];
  readonly slideActive: boolean;
  readonly slideToOriginalCount: number;
  readonly hitSplatTaskActive: boolean;
  readonly shakeTaskActive: boolean;
  readonly loopAudioActive: boolean;
  readonly loadedTags: readonly ("ANIM_TAG_IMPACT" | "ANIM_TAG_WHIRLWIND_LINES")[];
  /** Drill Peck loads this resource but never creates a line sprite. */
  readonly whirlwindLinesUsed: false;
  readonly sound:
    | Readonly<{
        readonly id: "SE_M_HEADBUTT" | "SE_M_HORN_ATTACK";
        readonly pan: number;
      }>
    | null;
  readonly active: boolean;
}

const IDENTITY: DrillPeckMatrix = { a: 256, b: 0, c: 0, d: 256 };
const IMPACT_MATRIX: DrillPeckMatrix = { a: 512, b: 0, c: 0, d: 512 };
const SPLAT_SPAWNS = [28, 31, 35, 39, 43, 47, 51, 55] as const;
// The normal sprite allocator reuses each completed splat's slot in source
// order; equal-priority OBJ overlap follows this OAM order.
const SPLAT_OAM_SLOTS = [4, 3, 5, 7, 4, 3, 5, 7] as const;

function rotationMatrix(angle: number): DrillPeckMatrix {
  const index = angle >> 8 & 0xff;
  const sin = GBA_SINE_TABLE_256[index]!;
  const cos = GBA_SINE_TABLE_256[index + 64 & 0xff]!;
  return { a: cos, b: -sin, c: sin, d: cos };
}

function signedSine(angle: number, amplitude: number): number {
  return GBA_SINE_TABLE_256[angle & 0xff]! * amplitude >> 8;
}

function bowAngle(age: number, side: -1 | 1): number {
  if (age >= 15 && age <= 18) return side * 0x300 * (age - 14);
  if (age >= 19 && age <= 78) return side * 0x300 * 4;
  if (age >= 79 && age <= 81) return side * 0x400 * (81 - age);
  return 0;
}

function attackerXOffset(age: number, side: -1 | 1): number {
  if (age >= 8 && age <= 13) return side * 2 * (age - 7);
  if (age >= 14 && age <= 24) return side * 12;
  if (age >= 25 && age <= 27) return side * 3 * (28 - age);
  return 0;
}

function targetShake(age: number): Readonly<{ x2: number; y2: number }> {
  if (age < 28 || age > 61) return { x2: 0, y2: 0 };
  return {
    x2: Math.floor((age - 28) / 2) % 2 === 0 ? -4 : 4,
    y2: 0,
  };
}

function impactsAtAge(
  age: number,
  targetSide: DrillPeckSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly DrillPeckImpact[] {
  const horizontalSign = targetSide === "player" ? -1 : 1;
  return SPLAT_SPAWNS.flatMap((spawnAge, index) => {
    const localAge = age - spawnAge;
    if (localAge < 0 || localAge > 12) return [];
    const angle = index * 32;
    return [{
      spawnAge,
      oamSlot: SPLAT_OAM_SLOTS[index]!,
      x: targetCenter.x + horizontalSign * signedSine(angle, -13),
      y: targetCenter.y + signedSine(angle + 64, -13),
      animation: 3 as const,
      // The first allocation is already on its first callback receipt
      // (`data[0]=1`); later task-created allocations are captured at their
      // creation receipt (`data[0]=0`). Each callback toggles before the
      // counter advances, and the final receipt is data[0]=13.
      invisible: index === 0
        ? (localAge + 1) % 2 === 1
        : localAge % 2 === 1,
      matrix: IMPACT_MATRIX,
    }];
  });
}

function controllersAtAge(age: number): readonly DrillPeckBowController[] {
  const controllers: DrillPeckBowController[] = [];
  if (age >= 7 && age <= 18) controllers.push({ phase: 0, active: true });
  if (age >= 24 && age <= 29) controllers.push({ phase: 1, active: true });
  if (age >= 70 && age <= 81) controllers.push({ phase: 2, active: true });
  return controllers;
}

/**
 * Pure source-relative `Move_DRILL_PECK` body.
 *
 * Age zero is the first display after the two resource loads. The returned
 * state is the software receipt for that age; a compositor may apply its
 * ordinary OAM-before-task display latch when it draws the preceding frame.
 * No battle clock, damage, RNG, or controller state enters this reducer.
 */
export function drillPeckAtAge(
  age: number,
  attackerSide: DrillPeckSide,
  targetSide: DrillPeckSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): DrillPeckState {
  const side = attackerSide === "player" ? -1 : 1;
  const angle = bowAngle(age, side);
  const attackerMatrix = angle === 0 ? IDENTITY : rotationMatrix(angle);
  const slideActive = age >= 83 && age <= 88;
  return {
    attackerSide,
    targetSide,
    attackerOffset: {
      x2: attackerXOffset(age, side),
      y2: Math.abs(attackerMatrix.c) >> 3,
    },
    attackerMatrix,
    targetOffset: targetShake(age),
    controllers: controllersAtAge(age),
    impacts: impactsAtAge(age, targetSide, targetCenter),
    slideActive,
    slideToOriginalCount: Number(slideActive),
    hitSplatTaskActive: age >= 28 && age <= 57,
    shakeTaskActive: age >= 28 && age <= 61,
    loopAudioActive: age >= 28 && age <= 61,
    loadedTags: age >= 0 && age <= 89
      ? ["ANIM_TAG_IMPACT", "ANIM_TAG_WHIRLWIND_LINES"]
      : [],
    whirlwindLinesUsed: false,
    sound: age === 7
      ? {
          id: "SE_M_HEADBUTT",
          pan: attackerSide === "player" ? -64 : 63,
        }
      : age === 28
        ? {
            id: "SE_M_HORN_ATTACK",
            pan: targetSide === "player" ? -63 : 63,
          }
        : null,
    active: age >= 0 && age <= 89,
  };
}
