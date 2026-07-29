import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  grantingStarFrameAtLocalAge,
} from "./synthesis.ts";

export const AROMATHERAPY_PLAYER_FRAME_COUNT = 400;
export const AROMATHERAPY_OPPONENT_FRAME_COUNT = 396;

interface FlowerProgram {
  readonly kind: "smallFlower" | "bigFlower";
  readonly slot: number;
  readonly startAge: number;
  readonly y: number;
  readonly amplitude: number;
  readonly initialAngle: number;
  readonly xSpeed: number;
  readonly angleSpeed: number;
  readonly behindAttacker: boolean;
}

const FLOWER_PROGRAMS: readonly FlowerProgram[] = Object.freeze([
  { kind: "smallFlower", slot: 4, startAge: 19, y: 24, amplitude: 16, initialAngle: 0, xSpeed: 2, angleSpeed: 2, behindAttacker: false },
  { kind: "smallFlower", slot: 5, startAge: 19, y: 64, amplitude: 24, initialAngle: 0, xSpeed: 3, angleSpeed: 1, behindAttacker: true },
  { kind: "bigFlower", slot: 7, startAge: 19, y: 16, amplitude: 24, initialAngle: 0, xSpeed: 2, angleSpeed: 1, behindAttacker: false },
  { kind: "smallFlower", slot: 3, startAge: 41, y: 48, amplitude: 12, initialAngle: 0, xSpeed: 4, angleSpeed: 3, behindAttacker: true },
  { kind: "smallFlower", slot: 9, startAge: 41, y: 100, amplitude: 16, initialAngle: 0, xSpeed: 3, angleSpeed: 2, behindAttacker: false },
  { kind: "smallFlower", slot: 10, startAge: 41, y: 74, amplitude: 24, initialAngle: 180, xSpeed: 3, angleSpeed: 2, behindAttacker: false },
  { kind: "smallFlower", slot: 11, startAge: 53, y: 80, amplitude: 30, initialAngle: 0, xSpeed: 4, angleSpeed: 1, behindAttacker: true },
  { kind: "smallFlower", slot: 12, startAge: 53, y: 128, amplitude: 12, initialAngle: 0, xSpeed: 3, angleSpeed: 3, behindAttacker: false },
  { kind: "bigFlower", slot: 13, startAge: 53, y: 90, amplitude: 16, initialAngle: 0, xSpeed: 2, angleSpeed: 1, behindAttacker: false },
]);

export interface AromatherapyFlower {
  readonly kind: "smallFlower" | "bigFlower";
  readonly spawnIndex: number;
  readonly slot: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly matrix: readonly [number, number, number, number];
  readonly behindAttacker: boolean;
}

export interface AromatherapyStar {
  readonly kind: "star";
  readonly spawnIndex: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
}

export interface AromatherapyRing {
  readonly kind: "ring";
  readonly slot: 4;
  readonly x: number;
  readonly y: number;
  readonly localAge: number;
  readonly matrixScale: number;
}

export interface AromatherapyMask {
  readonly active: boolean;
  readonly scrollY: number;
  readonly eva: number;
  readonly evb: number;
}

export interface AromatherapyState {
  readonly active: boolean;
  readonly frameCount: number;
  readonly flowerLoaded: boolean;
  readonly thinRingLoaded: boolean;
  readonly sparkle2Loaded: boolean;
  readonly attackerOnMonBg: boolean;
  readonly backgroundBlendY: number;
  readonly finalAttackerBlendY: number;
  readonly finalAnim1BlendY: number;
  readonly flowers: readonly AromatherapyFlower[];
  readonly stars: readonly AromatherapyStar[];
  readonly ring: AromatherapyRing | null;
  readonly mask: AromatherapyMask;
  readonly sound:
    | "SE_M_PETAL_DANCE"
    | "SE_M_STAT_INCREASE"
    | "SE_M_MORNING_SUN"
    | "SE_SHINY"
    | null;
}

function signedSine(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function flowerAtAge(
  program: FlowerProgram,
  spawnIndex: number,
  age: number,
  side: "player" | "opponent",
): AromatherapyFlower | null {
  const localAge = age - program.startAge;
  if (localAge < 0) return null;
  const direction = side === "player" ? -1 : 1;
  const baseX = side === "player" ? 256 : -16;
  const x2 = direction * program.xSpeed * localAge;
  const x = baseX + x2;
  if (
    (side === "player" && x <= -16)
    || (side === "opponent" && x >= 248)
  ) return null;
  const angleBeforeCallback = localAge === 0
    ? program.initialAngle
    : program.angleSpeed * (localAge - 1);
  const data0 = program.angleSpeed * localAge & 0xff;
  const rotation = 4 * (localAge + 1) & 0xff;
  const sin = GBA_SINE_TABLE_256[rotation]!;
  const cos = GBA_SINE_TABLE_256[(rotation + 64) & 0xff]!;
  return {
    kind: program.kind,
    spawnIndex,
    slot: program.slot,
    localAge,
    x: baseX,
    y: program.y,
    x2,
    y2: signedSine(angleBeforeCallback, program.amplitude),
    data: [
      data0,
      program.amplitude,
      direction * program.xSpeed,
      program.angleSpeed,
      side === "player" ? 1 : 0,
      0,
      0,
      localAge + 1,
    ],
    matrix: program.kind === "bigFlower"
      ? [cos, -sin, sin, cos]
      : [256, 0, 0, 256],
    behindAttacker: program.behindAttacker,
  };
}

function initialBackgroundBlendY(age: number): number {
  if (age < 11) return 0;
  return Math.min(7, 2 * (Math.floor((age - 11) / 2) + 1));
}

function reverseBackgroundBlendY(age: number, side: "player" | "opponent"): number {
  const start = side === "player" ? 195 : 191;
  if (age < start) return initialBackgroundBlendY(age);
  return Math.max(0, 7 - 2 * (Math.floor((age - start) / 2) + 1));
}

function finalBlendY(age: number, side: "player" | "opponent"): number {
  const start = side === "player" ? 364 : 360;
  if (age < start) return 0;
  return Math.max(0, 10 - 2 * Math.floor((age - start + 1) / 5));
}

function statusMaskAtAge(
  age: number,
  side: "player" | "opponent",
): AromatherapyMask {
  const start = side === "player" ? 198 : 194;
  const local = age - start;
  if (local < 0 || local > 92) {
    return { active: false, scrollY: 0, eva: 0, evb: 16 };
  }
  const callbacks = Math.max(0, local - 1);
  const scrollY = local >= 92 ? 0 : Math.floor(callbacks * 0x1a0 / 0x100);
  let eva = 0;
  if (callbacks <= 30) {
    eva = Math.min(10, Math.floor(callbacks / 3));
  } else if (callbacks <= 60) {
    eva = 10;
  } else {
    eva = Math.max(0, 10 - Math.floor((callbacks - 60) / 3));
  }
  return { active: true, scrollY, eva, evb: 16 - eva };
}

function starsAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): readonly AromatherapyStar[] {
  const first = side === "player" ? 292 : 288;
  const starts = [first, first + 10] as const;
  const args = [{ x: -15, y: 0 }, { x: 12, y: -5 }] as const;
  return starts.flatMap((start, spawnIndex) => {
    const local = age - start;
    const frame = grantingStarFrameAtLocalAge(local);
    if (frame === null) return [];
    const callbacks = Math.min(local + 1, 60);
    const arg = args[spawnIndex]!;
    return [{
      kind: "star" as const,
      spawnIndex,
      slot: 3 + spawnIndex,
      x: center.x + (side === "player" ? arg.x : -arg.x),
      y: center.y + arg.y + Math.floor(callbacks * 32 / 256),
      frame,
    }];
  });
}

function ringAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): AromatherapyRing | null {
  const start = side === "player" ? 364 : 360;
  const localAge = age - start;
  if (localAge < 0 || localAge > 30) return null;
  const sourceScale = 16 + 16 * Math.min(localAge + 1, 30);
  return {
    kind: "ring",
    slot: 4,
    x: center.x,
    y: center.y,
    localAge,
    matrixScale: Math.floor(0x10000 / sourceScale),
  };
}

/** Complete source-relative Move_AROMATHERAPY body through first cleanup. */
export function aromatherapyAtAge(
  age: number,
  side: "player" | "opponent",
  animationCenter: Readonly<{ x: number; y: number }>,
  battlePositionCenter: Readonly<{ x: number; y: number }>,
): AromatherapyState {
  const frameCount = side === "player"
    ? AROMATHERAPY_PLAYER_FRAME_COUNT
    : AROMATHERAPY_OPPONENT_FRAME_COUNT;
  const flowers = FLOWER_PROGRAMS.flatMap((program, index) => {
    const flower = flowerAtAge(program, index, age, side);
    return flower ? [flower] : [];
  });
  const ring = ringAtAge(age, side, battlePositionCenter);
  return {
    active: age >= 0 && age < frameCount - 1,
    frameCount,
    flowerLoaded: age >= 4,
    thinRingLoaded: age >= 7,
    sparkle2Loaded: age >= 10,
    attackerOnMonBg: age >= 13 && age < (side === "player" ? 193 : 189),
    backgroundBlendY: reverseBackgroundBlendY(age, side),
    finalAttackerBlendY: finalBlendY(age, side),
    finalAnim1BlendY: finalBlendY(age, side),
    flowers,
    stars: starsAtAge(age, side, animationCenter),
    ring,
    mask: statusMaskAtAge(age, side),
    sound: age === 0
      ? "SE_M_PETAL_DANCE"
      : age === (side === "player" ? 198 : 194)
        ? "SE_M_STAT_INCREASE"
        : age === (side === "player" ? 292 : 288)
          ? "SE_M_MORNING_SUN"
          : age === (side === "player" ? 364 : 360)
            ? "SE_SHINY"
            : null,
  };
}
