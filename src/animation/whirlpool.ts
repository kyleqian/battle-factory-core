import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export type WhirlpoolSide = "player" | "opponent";
export type WhirlpoolBody = "main" | "residual";

export interface WhirlpoolOrb {
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: 0 | 1 | 2 | 3;
  readonly matrix: Readonly<{ a: number; b: 0; c: 0; d: number }>;
  readonly localAge: number;
  readonly callback: "AnimParticleInVortex_Step";
}

export interface WhirlpoolState {
  readonly active: boolean;
  readonly body: WhirlpoolBody;
  readonly waterOrbLoaded: boolean;
  readonly targetMonbg: boolean;
  readonly splitTargetPriority: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly registers: Readonly<{ bldcnt: 0 | 16192; bldalpha: 0 | 2060 }>;
  readonly targetPaletteBlendY: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetShakeActive: boolean;
  readonly orbs: readonly WhirlpoolOrb[];
  readonly particleOamSlotsBackToFront: readonly number[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly whirlpoolAudio:
    Readonly<{ pan: number; flags: 0 | 128 | 131 }> | null;
  readonly battlerDisplayAge: number;
}

export const WHIRLPOOL_MAIN_FRAME_COUNT = 133;
export const WHIRLPOOL_RESIDUAL_FRAME_COUNT = 108;

const BURST = [
  { y: 28, speed: 384, duration: 50, phase: 8, amplitude: 50 },
  { y: 32, speed: 240, duration: 40, phase: 11, amplitude: -46 },
  { y: 33, speed: 416, duration: 40, phase: 4, amplitude: 42 },
  { y: 31, speed: 288, duration: 45, phase: 6, amplitude: -42 },
  { y: 28, speed: 448, duration: 45, phase: 11, amplitude: 46 },
  { y: 33, speed: 464, duration: 50, phase: 10, amplitude: -50 },
] as const;

// The allocator topology is source-relative and identical in both legal
// orientations. Slots 0/1/2/6/8 and 60-63 are occupied by field sprites;
// the remaining reuse follows from each vortex's source duration.
const MAIN_OAM_SLOTS = [
  4, 5, 7, 9, 10, 11,
  3, 12, 13, 14, 15, 16,
  5, 4, 7, 9, 10, 17,
] as const;
const RESIDUAL_OAM_SLOTS = [
  4, 5, 7, 9, 10, 11,
  3, 12, 13, 14, 15, 16,
] as const;

const AFFINE_MATRICES = [
  { a: 341, b: 0, c: 0, d: 341 },
  { a: 337, b: 0, c: 0, d: 346 },
  { a: 334, b: 0, c: 0, d: 352 },
  { a: 330, b: 0, c: 0, d: 358 },
  { a: 327, b: 0, c: 0, d: 364 },
  { a: 324, b: 0, c: 0, d: 370 },
  { a: 327, b: 0, c: 0, d: 364 },
  { a: 330, b: 0, c: 0, d: 358 },
  { a: 334, b: 0, c: 0, d: 352 },
  { a: 337, b: 0, c: 0, d: 346 },
] as const;

function orbStartAge(body: WhirlpoolBody, spawnIndex: number): number {
  const first = body === "main" ? 9 : 8;
  return first + Math.floor(spawnIndex / 6) * 24 + (spawnIndex % 6) * 4;
}

function orbAtAge(
  age: number,
  body: WhirlpoolBody,
  spawnIndex: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): WhirlpoolOrb | null {
  const source = BURST[spawnIndex % BURST.length]!;
  const localAge = age - orbStartAge(body, spawnIndex);
  // Status_Whirlpool is entered from the controller animation scheduler one
  // callback pass earlier than Move_WHIRLPOOL. Its creation display therefore
  // exposes the initialized (unstepped) sprite and lasts one display longer.
  const steps = localAge + (body === "main" ? 1 : 0);
  const lastLocalAge = source.duration - (body === "main" ? 1 : 0);
  if (localAge < 0 || localAge > lastLocalAge) return null;
  const angle = steps === 0 ? 0 : (source.phase * (steps - 1)) & 0xff;
  const matrix = AFFINE_MATRICES[steps % AFFINE_MATRICES.length]!;
  return {
    spawnIndex,
    oamSlot: (body === "main" ? MAIN_OAM_SLOTS : RESIDUAL_OAM_SLOTS)[
      spawnIndex
    ]!,
    x: targetCenter.x,
    y: targetCenter.y + source.y,
    x2: steps === 0
      ? 0
      : (GBA_SINE_TABLE_256[angle]! * source.amplitude) >> 8,
    y2: steps === 0 ? 0 : -(source.speed * steps >> 8),
    frame: (steps & 3) as 0 | 1 | 2 | 3,
    matrix,
    localAge,
    callback: "AnimParticleInVortex_Step",
  };
}

function orbsAtAge(
  age: number,
  body: WhirlpoolBody,
  targetCenter: Readonly<{ x: number; y: number }>,
): WhirlpoolOrb[] {
  const count = body === "main" ? 18 : 12;
  return Array.from({ length: count }, (_, spawnIndex) =>
    orbAtAge(age, body, spawnIndex, targetCenter)
  ).filter((orb): orb is WhirlpoolOrb => orb !== null);
}

function particleOamSlotsBackToFrontAtAge(
  age: number,
  body: WhirlpoolBody,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly number[] {
  const slotOrder = Array.from({ length: 64 }, (_, slot) => slot);
  let active = new Map<number, WhirlpoolOrb>();
  for (let currentAge = 0; currentAge <= age; currentAge += 1) {
    active = new Map(orbsAtAge(currentAge, body, targetCenter).map(
      (orb) => [orb.oamSlot, orb],
    ));
    // SortSprites is stable for an equal subpriority/Y pair and retains its
    // preceding sSpriteOrder across reused slots.
    slotOrder.sort((leftSlot, rightSlot) => {
      const left = active.get(leftSlot);
      const right = active.get(rightSlot);
      if (!left && !right) return 0;
      if (!left) return 1;
      if (!right) return -1;
      return right.y + right.y2 - (left.y + left.y2);
    });
  }
  return slotOrder.filter((slot) => active.has(slot)).reverse();
}

function paletteBlendY(age: number, body: WhirlpoolBody):
  WhirlpoolState["targetPaletteBlendY"] {
  if (age < 14) return 0;
  if (age < 18) return 2;
  if (age < 22) return 4;
  if (age < 26) return 6;
  const reverseStart = body === "main" ? 100 : 76;
  if (age < reverseStart) return 7;
  if (age < reverseStart + 4) return 5;
  if (age < reverseStart + 8) return 3;
  if (age < reverseStart + 12) return 1;
  return 0;
}

/**
 * Pure source-relative reducer shared by `Move_WHIRLPOOL` and the later
 * `Status_Whirlpool` controller body. It owns presentation only.
 */
export function whirlpoolAtAge(
  age: number,
  body: WhirlpoolBody,
  targetSide: WhirlpoolSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): WhirlpoolState {
  const main = body === "main";
  const frameCount = main
    ? WHIRLPOOL_MAIN_FRAME_COUNT
    : WHIRLPOOL_RESIDUAL_FRAME_COUNT;
  const shakeStart = main ? 9 : 8;
  const shakeEnd = main ? 106 : 66;
  const paletteControllerActive =
    (age >= shakeStart && age <= 30)
    || (age >= (main ? 95 : 70) && age <= (main ? 116 : 92));
  const orbs = orbsAtAge(age, body, targetCenter);
  const alpha = age >= 7 ? { eva: 12 as const, evb: 8 as const } : null;
  let whirlpoolAudio: WhirlpoolState["whirlpoolAudio"] = null;
  if (age >= shakeStart) {
    const pan = targetSide === "opponent"
      ? 63
      : main ? -63 : -64;
    const flags = age === shakeStart
      ? 131
      : main && age >= 130 ? 0 : 128;
    whirlpoolAudio = { pan, flags };
  }
  return {
    active: age >= 0 && age < frameCount - 1,
    body,
    waterOrbLoaded: main
      ? age >= 1 && age < frameCount - 1
      : age >= 0 && age < frameCount - 1,
    targetMonbg: main
      ? age >= 4 && age <= 130
      : age >= 3 && age <= 106,
    splitTargetPriority: main
      ? age >= 5 && age <= 130
      : age >= 4 && age <= 106,
    alpha,
    registers: alpha
      ? { bldcnt: 16192, bldalpha: 2060 }
      : { bldcnt: 0, bldalpha: 0 },
    targetPaletteBlendY: paletteBlendY(age, body),
    // The task's synchronous creation write happens after the monbg scroll
    // was latched for this display; regular callbacks are visible unchanged.
    targetOffset: age === shakeStart
      ? { x2: 0, y2: 0 }
      : shakeMonOffsetAtTick(
          0,
          2,
          main ? 50 : 30,
          1,
          age - shakeStart - (main ? 0 : 1),
        ),
    targetShakeActive: age >= shakeStart && age <= shakeEnd,
    orbs,
    particleOamSlotsBackToFront: particleOamSlotsBackToFrontAtAge(
      age,
      body,
      targetCenter,
    ),
    visualTaskCount:
      orbs.length
      + (age >= shakeStart && age <= shakeEnd ? 1 : 0)
      + (paletteControllerActive ? 1 : 0),
    soundTaskCount: 0,
    whirlpoolAudio,
    battlerDisplayAge: age - 1,
  };
}
