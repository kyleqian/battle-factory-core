import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type HeadbuttSide = "player" | "opponent";

export interface HeadbuttMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface HeadbuttController {
  readonly phase: 0 | 1 | 2;
  readonly active: boolean;
}

export interface HeadbuttImpact {
  readonly x: number;
  readonly y: number;
  readonly animation: 1;
  readonly invisible: boolean;
  readonly matrix: HeadbuttMatrix;
}

export interface HeadbuttState {
  readonly attackerSide: HeadbuttSide;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerMatrix: HeadbuttMatrix;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly controllers: readonly HeadbuttController[];
  readonly impacts: readonly HeadbuttImpact[];
  readonly sound:
    | Readonly<{ id: "SE_M_HEADBUTT" | "SE_M_VITAL_THROW2"; pan: number }>
    | null;
  readonly active: boolean;
}

const IDENTITY: HeadbuttMatrix = { a: 256, b: 0, c: 0, d: 256 };

function rotationMatrix(angle: number): HeadbuttMatrix {
  const index = angle >> 8 & 0xff;
  const sin = GBA_SINE_TABLE_256[index]!;
  const cos = GBA_SINE_TABLE_256[index + 64 & 0xff]!;
  return { a: cos, b: -sin, c: sin, d: cos };
}

/**
 * Source-relative `Move_HEADBUTT` body.
 *
 * Age zero is `loadspritegfx ANIM_TAG_IMPACT` becoming active. The first two
 * script/BowMon dispatch ticks precede the first displayed translation.
 * The task creation display at age 28 is kept separate from the ordinary
 * RunTasks cadence: this is the shared script/task scheduling rule visible
 * in both legal attacker orientations, not an absolute-frame adjustment.
 */
export function headbuttAtAge(
  age: number,
  attackerSide: HeadbuttSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): HeadbuttState {
  const side = attackerSide === "player" ? -1 : 1;
  let x2 = 0;
  let angle = 0;
  if (age >= 5 && age <= 10) x2 = side * 2 * (age - 4);
  else if (age >= 11 && age <= 21) x2 = side * 12;
  else if (age >= 22 && age <= 24) x2 = side * 3 * (25 - age);
  if (age >= 12 && age <= 36) {
    angle = side * 0x300 * Math.min(age - 11, 4);
  } else if (age >= 37 && age <= 38) {
    angle = side * 0x400 * (39 - age);
  }
  const attackerMatrix = angle === 0 ? IDENTITY : rotationMatrix(angle);
  let attackerShakeX2 = 0;
  if (age === 28 || age === 31 || age === 32) attackerShakeX2 = -2;
  if (age === 29 || age === 30) attackerShakeX2 = 2;
  const attackerY2 = Math.abs(attackerMatrix.c) >> 3;
  // This call is created by the animation script after the ordinary task
  // pass. Its displayed RunTasks cadence therefore holds each state for two
  // frames (unlike call sites that can reuse shakeMonOffsetAtTick directly).
  const targetShakeBlock = Math.floor((age - 30) / 2);
  const targetOffset = age >= 30 && age <= 37
    ? { x2: targetShakeBlock % 2 === 0 ? 5 : 0, y2: 0 }
    : { x2: 0, y2: 0 };
  const controllers: HeadbuttController[] = [];
  if (age >= 4 && age <= 15) controllers.push({ phase: 0, active: true });
  if (age >= 21 && age <= 26) controllers.push({ phase: 1, active: true });
  if (age >= 28 && age <= 39) controllers.push({ phase: 2, active: true });
  const impactAge = age - 28;
  const impacts = impactAge >= 0 && impactAge <= 12
    ? [{
        x: targetCenter.x,
        y: targetCenter.y,
        animation: 1 as const,
        invisible: impactAge % 2 === 0,
        matrix: { a: 303, b: 0, c: 0, d: 303 },
      }]
    : [];
  const sound = age === 4
    ? {
        id: "SE_M_HEADBUTT" as const,
        pan: attackerSide === "player" ? -64 : 63,
      }
    : age === 28
      ? {
          id: "SE_M_VITAL_THROW2" as const,
          pan: attackerSide === "player" ? 63 : -63,
        }
      : null;
  return {
    attackerSide,
    attackerOffset: { x2: x2 + attackerShakeX2, y2: attackerY2 },
    attackerMatrix,
    targetOffset,
    controllers,
    impacts,
    sound,
    active: age >= 0 && age <= 46,
  };
}
