import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

/**
 * Source-derived presentation state for Move_PETAL_DANCE.
 *
 * This module deliberately models the battle-animation VM / sprite callbacks,
 * rather than a captured framebuffer.  Its cursor offsets are the offsets in
 * data/battle_anim_scripts.s's Move_PETAL_DANCE script (ROM 0x082d281c).
 */

export type PetalDanceSide = "player" | "opponent";
export type PetalDanceFlowerKind = "big" | "small";

export interface PetalDancePoint {
  readonly x: number;
  readonly y: number;
}

export interface PetalDanceMonBgInput {
  readonly layer: "bg1" | "bg2";
  readonly spriteSlot: number;
  readonly spriteX: number;
  readonly spriteY: number;
  readonly bgX: number;
  readonly bgY: number;
  readonly inBg2: boolean;
  readonly battlerId: number;
}

/** Values captured from the source task/sprite allocator at presentation entry. */
export interface PetalDanceLiveInputs {
  readonly attackerSide: PetalDanceSide;
  readonly targetSide: PetalDanceSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** `GetBattlerSpriteCoord(attacker, *_2)` source origin. */
  readonly attackerBattlePositionCenter: PetalDancePoint;
  readonly targetBattlePositionCenter: PetalDancePoint;
  /** Live target OAM origin consumed by Task_UpdateMonBg. */
  readonly targetSpriteOrigin: PetalDancePoint;
  readonly attackerPictureOrigin: PetalDancePoint;
  /** Encoded data[1]/data[2] linear-translation steps, in script spawn order. */
  readonly flowerFixedPointSteps: readonly PetalDancePoint[];
  readonly flowerSpriteSlots: readonly number[];
  readonly flowerMatrixNum: number;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly attackerInitialOffset: PetalDancePoint;
  readonly targetInitialOffset: PetalDancePoint;
  readonly attackerSubpriority: number;
  readonly ellipseTaskSlot: number;
  readonly shakeTaskSlot: number;
  readonly updateMonBgTaskSlot: number;
  readonly clearMonBgTaskSlot: number;
  readonly offsetSlideSpriteSlot: number;
  readonly originalSlideSpriteSlot: number;
  readonly hitSplatSpriteSlot: number;
  readonly hitSplatMatrixSlot: number;
  readonly dummySpriteOrigin: PetalDancePoint;
  readonly slideSubpriority: number;
  readonly hitSplatSubpriority: number;
  readonly baseMatrixBitmap: number;
  /** The live OAM painter order after allocator and priority resolution. */
  readonly spriteOrder: readonly number[];
  readonly monbg: PetalDanceMonBgInput;
}

export interface PetalDanceSourceCursor {
  readonly owner: "Move_PETAL_DANCE";
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly offset: number;
  readonly wait: number;
  readonly active: boolean;
}

export interface PetalDanceSpriteState {
  readonly slot: number;
  readonly kind:
    | "flower-big"
    | "flower-small"
    | "slide-to-offset"
    | "hitsplat"
    | "slide-to-original";
  readonly template:
    | "gPetalDanceBigFlowerSpriteTemplate"
    | "gPetalDanceSmallFlowerSpriteTemplate"
    | "gSlideMonToOffsetSpriteTemplate"
    | "gBasicHitSplatSpriteTemplate"
    | "gSlideMonToOriginalPosSpriteTemplate";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly visible: boolean;
  readonly data: readonly number[];
  readonly callback: string;
}

export interface PetalDanceTaskState {
  readonly slot: number;
  readonly kind: "ellipse" | "shake" | "update-monbg" | "clear-monbg";
  readonly callback:
    | "AnimTask_TranslateMonElliptical_Step"
    | "AnimTask_ShakeMon_Step"
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg";
  readonly data: readonly number[];
}

export interface PetalDanceDisplayTransfer {
  readonly oam: "current" | "predecessor";
  readonly matrices: "current" | "predecessor";
  readonly palette: "current" | "predecessor" | "same-row-monbg-setup";
}

export interface PetalDanceState {
  readonly age: number;
  readonly active: boolean;
  readonly firstInactiveCleanup: boolean;
  readonly source: PetalDanceSourceCursor;
  readonly battlers: {
    readonly attacker: {
      readonly side: PetalDanceSide;
      readonly species: string;
      readonly center: PetalDancePoint;
    };
    readonly target: {
      readonly side: PetalDanceSide;
      readonly species: string;
      readonly center: PetalDancePoint;
    };
  };
  readonly sprites: readonly PetalDanceSpriteState[];
  readonly tasks: readonly PetalDanceTaskState[];
  readonly battlerOffsets: {
    readonly attacker: PetalDancePoint;
    readonly target: PetalDancePoint;
  };
  readonly resources: {
    readonly flowerLoaded: boolean;
    readonly impactLoaded: boolean;
    readonly flowerTag: 10159 | null;
    readonly impactTag: 10135 | null;
    readonly matrixBitmap: number;
  };
  readonly monbg: {
    readonly sourceActive: boolean;
    readonly displayActive: boolean;
    readonly clearActive: boolean;
    readonly layer: "bg1" | "bg2";
    readonly registers: {
      readonly bg1hofs: number;
      readonly bg1vofs: number;
      readonly bg2hofs: number;
      readonly bg2vofs: number;
    };
  };
  readonly registers: {
    readonly bldcnt: number;
    readonly bldalpha: number;
  };
  readonly audio: {
    readonly petalDance: {
      readonly onset: boolean;
      readonly event: "SE_M_PETAL_DANCE";
      readonly pan: number;
    };
    readonly impact: {
      readonly onset: boolean;
      readonly event: "SE_M_MEGA_KICK2";
      readonly pan: number;
    };
  };
  readonly painterSlots: readonly number[];
  readonly displayTransfer: PetalDanceDisplayTransfer;
}

interface FlowerProgram {
  readonly kind: PetalDanceFlowerKind;
  readonly startAge: number;
  readonly duration: number;
  readonly initialX: number;
  readonly initialY: number;
}

const MOVE_PETAL_DANCE_ROM_START = 0x082d281c;
const STORED_LINEAR_CALLBACK_LOW = 15357;
const STORED_LINEAR_CALLBACK_HIGH = 2058;
const HFLIP_MATRIX_BIT = 8;

// The order is the source script's createvisualtask / createsprite order.
const FLOWER_PROGRAMS: readonly FlowerProgram[] = [
  { kind: "big", startAge: 10, duration: 140, initialX: 0, initialY: -24 },
  { kind: "small", startAge: 10, duration: 100, initialX: 16, initialY: -24 },
  { kind: "small", startAge: 10, duration: 100, initialX: -16, initialY: -24 },
  { kind: "big", startAge: 27, duration: 140, initialX: 0, initialY: -24 },
  { kind: "small", startAge: 27, duration: 100, initialX: 32, initialY: -24 },
  { kind: "small", startAge: 27, duration: 100, initialX: -32, initialY: -24 },
  { kind: "big", startAge: 44, duration: 140, initialX: 0, initialY: -24 },
  { kind: "small", startAge: 44, duration: 100, initialX: 24, initialY: -24 },
  { kind: "small", startAge: 44, duration: 100, initialX: -24, initialY: -24 },
  { kind: "small", startAge: 76, duration: 100, initialX: 16, initialY: -24 },
  { kind: "small", startAge: 76, duration: 100, initialX: -16, initialY: -24 },
  { kind: "small", startAge: 108, duration: 80, initialX: 20, initialY: -16 },
  { kind: "small", startAge: 108, duration: 80, initialX: -20, initialY: -14 },
];

function assertInputs(input: PetalDanceLiveInputs): void {
  const points = [input.attackerBattlePositionCenter, input.targetBattlePositionCenter,
    input.targetSpriteOrigin, input.attackerPictureOrigin, input.attackerInitialOffset, input.targetInitialOffset,
    input.dummySpriteOrigin, ...input.flowerFixedPointSteps];
  const spriteSlots = [...input.flowerSpriteSlots, input.attackerSpriteSlot,
    input.targetSpriteSlot, input.offsetSlideSpriteSlot, input.originalSlideSpriteSlot,
    input.hitSplatSpriteSlot];
  const taskSlots = [input.ellipseTaskSlot, input.shakeTaskSlot,
    input.updateMonBgTaskSlot, input.clearMonBgTaskSlot];
  if (input.attackerSide === input.targetSide || !input.attackerSpecies || !input.targetSpecies
    || input.flowerFixedPointSteps.length !== FLOWER_PROGRAMS.length
    || input.flowerSpriteSlots.length !== FLOWER_PROGRAMS.length
    || new Set(input.flowerSpriteSlots).size !== FLOWER_PROGRAMS.length
    || spriteSlots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || taskSlots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 16)
    || !Number.isInteger(input.flowerMatrixNum) || input.flowerMatrixNum < 0 || input.flowerMatrixNum >= 32
    || !Number.isInteger(input.hitSplatMatrixSlot) || input.hitSplatMatrixSlot < 0 || input.hitSplatMatrixSlot >= 32
    || input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64
    || input.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)
    || points.some((point) => !Number.isInteger(point.x) || !Number.isInteger(point.y))
    || !Number.isInteger(input.attackerSubpriority) || !Number.isInteger(input.slideSubpriority)
    || !Number.isInteger(input.hitSplatSubpriority) || !Number.isInteger(input.baseMatrixBitmap)
    || input.monbg.layer !== (input.targetSide === "player" ? "bg2" : "bg1")) {
    throw new Error("invalid live Petal Dance inputs");
  }
}

function gbaSin(phase: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[phase & 0xff]! * amplitude) >> 8;
}

function signedFixedPoint(value: number): number {
  return value >> 8;
}

function sourceTranslationOffset(step: number, callbackCount: number): number {
  const accumulated = Math.abs(step) * callbackCount;
  const offset = accumulated >> 8;
  // InitAnimLinearTranslation marks a negative speed with bit zero.
  return step & 1 ? -offset : offset;
}

function flowerSprite(
  age: number,
  program: FlowerProgram,
  index: number,
  input: PetalDanceLiveInputs,
): PetalDanceSpriteState | null {
  const callbackCount = age - program.startAge + 2;
  if (callbackCount < 2 || callbackCount > program.duration) return null;

  const step = input.flowerFixedPointSteps[index]!;
  const phaseBefore = (0x40 + (callbackCount - 1) * 5) & 0xff;
  const translationX = sourceTranslationOffset(step.x, callbackCount);
  const translationY = sourceTranslationOffset(step.y, callbackCount);
  const base = program.kind === "big"
    ? input.attackerBattlePositionCenter
    : input.attackerPictureOrigin;
  const small = program.kind === "small";
  const initialX = input.attackerSide === "player"
    ? program.initialX
    : -program.initialX;
  let matrixNum = input.flowerMatrixNum;

  if (small) {
    // The callback toggles the OAM h-flip bit on the two source phase windows.
    for (let callback = 1; callback <= callbackCount; callback += 1) {
      const phase = (0x40 + (callback - 1) * 5) & 0xff;
      if ((phase >= 59 && phase <= 63) || (phase >= 187 && phase <= 191)) {
        matrixNum ^= HFLIP_MATRIX_BIT;
      }
    }
  }

  return {
    slot: input.flowerSpriteSlots[index]!,
    kind: small ? "flower-small" : "flower-big",
    template: small
      ? "gPetalDanceSmallFlowerSpriteTemplate"
      : "gPetalDanceBigFlowerSpriteTemplate",
    x: base.x + initialX,
    y: base.y + program.initialY,
    x2: translationX + gbaSin(phaseBefore, small ? 8 : 32),
    y2: translationY + (small ? 0 : gbaSin((phaseBefore + 64) & 0xff, -5)),
    subpriority: small
      ? input.attackerSubpriority - 2
      : ((phaseBefore - 0x40) & 0xff) >= 0x80
      ? input.attackerSubpriority + 1
      : input.attackerSubpriority - 1,
    matrixNum,
    matrix: [256, 0, 0, 256],
    visible: true,
    data: [
      program.duration - callbackCount,
      step.x,
      step.y,
      callbackCount * Math.abs(step.x),
      callbackCount * Math.abs(step.y),
      (phaseBefore + 5) & 0xff,
      0,
      0,
    ],
    callback: small ? "AnimPetalDanceSmallFlower_Step" : "AnimPetalDanceBigFlower_Step",
  };
}

function ellipseTask(age: number, input: PetalDanceLiveInputs): PetalDanceTaskState | null {
  if (age < 10 || age > 199) return null;
  const callbackCount = age - 10 + 2;
  const phaseBefore = ((callbackCount - 1) * 8) & 0xff;
  const width = input.attackerSide === "player" ? 12 : -12;
  const height = 6;
  const loops = 6 - Math.floor((callbackCount * 8) / 256);
  return {
    slot: input.ellipseTaskSlot,
    kind: "ellipse",
    callback: "AnimTask_TranslateMonElliptical_Step",
    data: [
      input.attackerSpriteSlot,
      width,
      height,
      loops,
      8,
      (phaseBefore + 8) & 0xff,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ],
  };
}

function ellipseOffset(age: number, input: PetalDanceLiveInputs): PetalDancePoint | null {
  if (age < 10 || age > 199) return null;
  const callbackCount = age - 10 + 2;
  const phaseBefore = ((callbackCount - 1) * 8) & 0xff;
  const width = input.attackerSide === "player" ? 12 : -12;
  return {
    x: gbaSin(phaseBefore, width),
    y: -gbaSin((phaseBefore + 64) & 0xff, 6) + 6,
  };
}

function shakeTask(age: number, input: PetalDanceLiveInputs): PetalDanceTaskState | null {
  if (age < 206 || age > 219) return null;
  const localAge = age - 206;
  return {
    slot: input.shakeTaskSlot,
    kind: "shake",
    callback: "AnimTask_ShakeMon_Step",
    data: [
      input.targetSpriteSlot,
      7 - Math.floor(localAge / 2),
      1,
      localAge % 2 === 0 ? 1 : 0,
      6,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ],
  };
}

function shakeOffset(age: number): number | null {
  if (age < 206 || age > 219) return null;
  const localAge = age - 206;
  if (localAge < 2) return 0;
  return Math.floor(localAge / 2) % 2 === 1 ? 6 : 0;
}

function offsetSlide(age: number, input: PetalDanceLiveInputs): PetalDanceSpriteState | null {
  if (age < 201 || age > 206) return null;
  const callbacks = Math.min(age - 201 + 1, 5);
  const step = Math.trunc((input.attackerSide === "player" ? 24 : -24) * 256 / 5);
  const accumulated = step * callbacks;
  return {
    slot: input.offsetSlideSpriteSlot,
    kind: "slide-to-offset",
    template: "gSlideMonToOffsetSpriteTemplate",
    x: input.dummySpriteOrigin.x,
    y: input.dummySpriteOrigin.y,
    x2: 0,
    y2: 0,
    subpriority: input.slideSubpriority,
    matrixNum: 0,
    matrix: [256, 0, 0, 256],
    visible: false,
    data: [
      5 - callbacks,
      step,
      0,
      accumulated,
      0,
      input.attackerSpriteSlot,
      STORED_LINEAR_CALLBACK_LOW,
      STORED_LINEAR_CALLBACK_HIGH,
    ],
    callback: age === 206
      ? "DestroyAnimSprite"
      : "TranslateSpriteLinearByIdFixedPoint",
  };
}

function offsetSlidePosition(age: number, input: PetalDanceLiveInputs): number | null {
  if (age < 201 || age > 206) return null;
  const callbacks = Math.min(age - 201 + 1, 5);
  const step = Math.trunc((input.attackerSide === "player" ? 24 : -24) * 256 / 5);
  return signedFixedPoint(step * callbacks);
}

function heldOffsetSlidePosition(age: number, input: PetalDanceLiveInputs): number | null {
  if (age < 201 || age > 230) return null;
  return offsetSlidePosition(Math.min(age, 205), input);
}

function targetOffsetBeforeMonBgTask(age: number, input: PetalDanceLiveInputs): PetalDancePoint {
  if (age <= 206) return input.targetInitialOffset;
  const priorShake = shakeOffset(age - 1);
  if (priorShake !== null) return { x: priorShake, y: 0 };
  return { x: 0, y: 0 };
}

function hitSplat(age: number, input: PetalDanceLiveInputs): PetalDanceSpriteState | null {
  if (age < 206 || age > 214) return null;
  return {
    slot: input.hitSplatSpriteSlot,
    kind: "hitsplat",
    template: "gBasicHitSplatSpriteTemplate",
    x: input.dummySpriteOrigin.x,
    y: input.dummySpriteOrigin.y,
    x2: 0,
    y2: 0,
    subpriority: input.hitSplatSubpriority,
    matrixNum: input.hitSplatMatrixSlot,
    matrix: [256, 0, 0, 256],
    visible: true,
    data: [0, 0, 0, 0, 0, 0, STORED_LINEAR_CALLBACK_LOW, STORED_LINEAR_CALLBACK_HIGH],
    callback: age === 214 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
  };
}

function originalSlide(age: number, input: PetalDanceLiveInputs): PetalDanceSpriteState | null {
  if (age < 231 || age > 237) return null;
  const start = offsetSlidePosition(205, input)!;
  const callbackCount = age - 231 + 1;
  const step = Math.trunc((-start * 256) / 7);
  return {
    slot: input.originalSlideSpriteSlot,
    kind: "slide-to-original",
    template: "gSlideMonToOriginalPosSpriteTemplate",
    x: input.dummySpriteOrigin.x,
    y: input.dummySpriteOrigin.y,
    x2: 0,
    y2: 0,
    subpriority: input.slideSubpriority,
    matrixNum: 0,
    matrix: [256, 0, 0, 256],
    visible: false,
    data: [
      7 - callbackCount,
      step,
      0,
      step * callbackCount,
      0,
      start,
      input.attackerInitialOffset.y,
      input.attackerSpriteSlot << 8,
    ],
    callback: "SlideMonToOriginalPos_Step",
  };
}

function originalSlidePosition(age: number, input: PetalDanceLiveInputs): number | null {
  if (age < 231 || age > 237) return null;
  const start = offsetSlidePosition(205, input)!;
  const callbackCount = age - 231 + 1;
  const step = Math.trunc((-start * 256) / 7);
  return start + signedFixedPoint(step * callbackCount);
}

function updateMonBgTask(age: number, input: PetalDanceLiveInputs): PetalDanceTaskState | null {
  if (age < 7 || age > 241) return null;
  const monbg = input.monbg;
  return {
    slot: input.updateMonBgTaskSlot,
    kind: "update-monbg",
    callback: "Task_UpdateMonBg",
    data: [
      monbg.spriteSlot,
      monbg.spriteX,
      monbg.spriteY,
      monbg.bgX,
      monbg.bgY,
      monbg.inBg2 ? 1 : 0,
      monbg.battlerId,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ],
  };
}

function clearMonBgTask(age: number, input: PetalDanceLiveInputs): PetalDanceTaskState | null {
  if (age < 239 || age > 241) return null;
  return {
    slot: input.clearMonBgTaskSlot,
    kind: "clear-monbg",
    callback: "Task_ClearMonBg",
    data: [0, age === 239 ? 1 : 2, input.monbg.battlerId, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

/** Cursor state after the animation VM has advanced for this source age. */
export function petalDanceSourceAtAge(age: number): PetalDanceSourceCursor {
  if (age < 0) {
    return sourceAt(0, 0, false);
  }
  if (age === 0) return sourceAt(0, 0, true);
  if (age <= 3) return sourceAt(3, age === 1 ? 1 : 0, true);
  if (age <= 6) return sourceAt(6, age === 4 ? 1 : 0, true);
  if (age <= 9) return sourceAt(8, age === 7 ? 1 : 0, true);
  if (age <= 26) return sourceAt(79, Math.max(0, 25 - age), true);
  if (age <= 43) return sourceAt(126, Math.max(0, 42 - age), true);
  if (age <= 75) return sourceAt(173, Math.max(0, 74 - age), true);
  if (age <= 107) return sourceAt(205, Math.max(0, 106 - age), true);
  if (age <= 200) return sourceAt(235, 1, true);
  if (age <= 205) return sourceAt(255, Math.max(0, 204 - age), true);
  if (age <= 220) return sourceAt(291, 1, true);
  if (age <= 230) return sourceAt(294, Math.max(0, 229 - age), true);
  if (age <= 238) return sourceAt(307, 1, true);
  return sourceAt(311, 1, age < 243);
}

function sourceAt(offset: number, wait: number, active: boolean): PetalDanceSourceCursor {
  const pointer = MOVE_PETAL_DANCE_ROM_START + offset;
  return {
    owner: "Move_PETAL_DANCE", pointer, pointerParity: (pointer & 1) as 0 | 1,
    offset, wait, active,
  };
}

function displayTransfer(age: number): PetalDanceDisplayTransfer {
  if (age === 7) {
    return { oam: "predecessor", matrices: "predecessor", palette: "same-row-monbg-setup" };
  }
  if (age > 0 && age <= 243) {
    return { oam: "predecessor", matrices: "predecessor", palette: "predecessor" };
  }
  return { oam: "current", matrices: "current", palette: "current" };
}

/**
 * Reduces one source age of Move_PETAL_DANCE from live presentation inputs.
 * No trace, framebuffer, raw-RGB, scenario, or absolute emulator tick enters
 * this reducer.
 */
export function petalDanceAtAge(age: number, input: PetalDanceLiveInputs): PetalDanceState {
  assertInputs(input);
  const source = petalDanceSourceAtAge(age);
  const sprites: PetalDanceSpriteState[] = [];
  for (let index = 0; index < FLOWER_PROGRAMS.length; index += 1) {
    const sprite = flowerSprite(age, FLOWER_PROGRAMS[index]!, index, input);
    if (sprite) sprites.push(sprite);
  }
  const toOffset = offsetSlide(age, input);
  if (toOffset) sprites.push(toOffset);
  const splat = hitSplat(age, input);
  if (splat) sprites.push(splat);
  const toOriginal = originalSlide(age, input);
  if (toOriginal) sprites.push(toOriginal);

  const tasks: PetalDanceTaskState[] = [];
  const ellipse = ellipseTask(age, input);
  if (ellipse) tasks.push(ellipse);
  const shake = shakeTask(age, input);
  if (shake) tasks.push(shake);
  const clear = clearMonBgTask(age, input);
  if (clear) tasks.push(clear);
  const update = updateMonBgTask(age, input);
  if (update) tasks.push(update);

  const ellipsePosition = ellipseOffset(age, input);
  const offsetPosition = heldOffsetSlidePosition(age, input);
  const originalPosition = originalSlidePosition(age, input);
  const shakePosition = shakeOffset(age);
  const slideX = originalPosition ?? offsetPosition;
  const attacker = slideX === null
    ? ellipsePosition ?? input.attackerInitialOffset
    : { x: slideX, y: input.attackerInitialOffset.y };
  const target = shakePosition === null
    ? (age >= 220 ? { x: 0, y: 0 } : input.targetInitialOffset)
    : { x: shakePosition, y: 0 };

  const monbgSourceActive = age >= 7 && age <= 241;
  const monbgDisplayActive = age >= 8 && age <= 242;
  const monbgClearActive = age >= 239 && age <= 241;
  const monbg = input.monbg;
  const monbgTargetOffset = targetOffsetBeforeMonBgTask(age, input);
  const bgX = (monbg.spriteX - (input.targetSpriteOrigin.x + monbgTargetOffset.x) + monbg.bgX) & 0x1ff;
  const bgY = (monbg.spriteY - (input.targetSpriteOrigin.y + monbgTargetOffset.y) + monbg.bgY) & 0x1ff;
  const monbgRegisters = monbgDisplayActive
    ? monbg.layer === "bg1"
      ? { bg1hofs: bgX, bg1vofs: bgY, bg2hofs: 0, bg2vofs: 0 }
      : { bg1hofs: 0, bg1vofs: 0, bg2hofs: bgX, bg2vofs: bgY }
    : { bg1hofs: 0, bg1vofs: 0, bg2hofs: 0, bg2vofs: 0 };

  const flowerOrImpactLive = age >= 1 && age <= 242;
  return {
    age,
    active: source.active,
    firstInactiveCleanup: age === 243,
    source,
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies,
        center: input.attackerBattlePositionCenter },
      target: { side: input.targetSide, species: input.targetSpecies,
        center: input.targetBattlePositionCenter },
    },
    sprites,
    tasks,
    battlerOffsets: { attacker, target },
    resources: {
      flowerLoaded: flowerOrImpactLive,
      impactLoaded: age >= 4 && age <= 242,
      flowerTag: flowerOrImpactLive ? 10159 : null,
      impactTag: age >= 4 && age <= 242 ? 10135 : null,
      matrixBitmap: input.baseMatrixBitmap | (age >= 206 && age <= 214 ? 1 << input.hitSplatMatrixSlot : 0),
    },
    monbg: {
      sourceActive: monbgSourceActive, displayActive: monbgDisplayActive,
      clearActive: monbgClearActive, layer: monbg.layer, registers: monbgRegisters,
    },
    registers: {
      bldcnt: age >= 10 && age <= 238 ? 16192 : 0,
      bldalpha: age >= 10 && age <= 238 ? 2060 : 0,
    },
    audio: {
      petalDance: { onset: age === 10, event: "SE_M_PETAL_DANCE",
        pan: input.attackerSide === "player" ? -64 : 63 },
      impact: { onset: age === 206, event: "SE_M_MEGA_KICK2",
        pan: input.targetSide === "player" ? -63 : 63 },
    },
    painterSlots: input.spriteOrder.filter((slot) => sprites.some((sprite) => sprite.slot === slot)),
    displayTransfer: displayTransfer(age),
  };
}
