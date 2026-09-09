/**
 * Source-derived presentation state for Move_SKY_UPPERCUT.
 *
 * This is a semantic reducer for the pointer-owned move body at
 * `data/battle_anim_scripts.s:9599-9641`; it models the animation VM,
 * move-owned callbacks, and their live allocator inputs. It intentionally
 * does not own a compositor, pixels, battle state, or a global battle tick.
 */

export type SkyUppercutSide = "player" | "opponent";

export interface SkyUppercutPoint {
  readonly x: number;
  readonly y: number;
}

/** The captured task arguments consumed by Task_UpdateMonBg. */
export interface SkyUppercutMonBgInput {
  readonly layer: "bg1" | "bg2";
  readonly spriteSlot: number;
  readonly spriteX: number;
  readonly spriteY: number;
  readonly bgX: number;
  readonly bgY: number;
  readonly inBg2: boolean;
  readonly battlerId: number;
}

/**
 * Live Scene-ON facts sampled at the presentation seam. Slots and origins are
 * inputs because their values belong to the ordinary animation allocator, not
 * to a canonical species, party, or retained evidence carrier.
 */
export interface SkyUppercutLiveInputs {
  readonly attackerSide: SkyUppercutSide;
  readonly targetSide: SkyUppercutSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerCenter: SkyUppercutPoint;
  readonly targetCenter: SkyUppercutPoint;
  /** `InitSpritePosToAnimTarget` origin used by both dummy slides and splats. */
  readonly targetPictureOrigin: SkyUppercutPoint;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly attackerInitialOffset: SkyUppercutPoint;
  readonly targetInitialOffset: SkyUppercutPoint;
  /** Source allocator slots in script spawn order; reuse is intentional. */
  readonly slideSpriteSlots: readonly [number, number, number, number];
  readonly impactSpriteSlots: readonly [number, number, number, number, number];
  readonly impactMatrixSlots: readonly [number, number, number, number, number];
  readonly updateMonBgTaskSlot: number;
  readonly fadeInTaskSlot: number;
  readonly backgroundTaskSlot: number;
  readonly shakeMon2TaskSlot: number;
  readonly shakeMonInPlaceTaskSlot: number;
  readonly clearMonBgTaskSlot: number;
  readonly restoreFadeTaskSlot: number;
  readonly slideSubpriority: number;
  readonly impactSubpriority: number;
  readonly impactPaletteBank: number;
  readonly impactTileSlot: number;
  readonly baseMatrixBitmap: number;
  /** Current OAM painter order, supplied by the normal Scene-ON allocator. */
  readonly spriteOrder: readonly number[];
  readonly monbg: SkyUppercutMonBgInput;
  /** Source `gBattle_BG3_{X,Y}` immediately before the move owns BG3. */
  readonly initialBg3Offset: SkyUppercutPoint;
}

export type SkyUppercutSourceOffset =
  | 0 | 3 | 5 | 9 | 23 | 29 | 48 | 86 | 111 | 132 | 153 | 191 | 210 | 225 | 242 | 247 | 248;

export interface SkyUppercutSourceCursor {
  readonly owner: "Move_SKY_UPPERCUT";
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly offset: SkyUppercutSourceOffset;
  readonly wait: number;
  readonly active: boolean;
}

export interface SkyUppercutSpriteState {
  readonly slot: number;
  readonly kind: "slide-to-offset" | "hitsplat" | "slide-to-original";
  readonly template:
    | "gSlideMonToOffsetSpriteTemplate"
    | "gBasicHitSplatSpriteTemplate"
    | "gSlideMonToOriginalPosSpriteTemplate";
  readonly callback:
    | "TranslateSpriteLinearByIdFixedPoint"
    | "DestroyAnimSprite"
    | "RunStoredCallbackWhenAffineAnimEnds"
    | "SlideMonToOriginalPos_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: readonly [number, number, number, number];
  readonly visible: boolean;
  readonly data: readonly number[];
}

export interface SkyUppercutTaskState {
  readonly slot: number;
  readonly kind:
    | "update-monbg"
    | "fade-to-bg"
    | "sky-uppercut-bg"
    | "shake-mon2"
    | "shake-mon-in-place"
    | "clear-monbg";
  readonly callback:
    | "Task_UpdateMonBg"
    | "Task_FadeToBg"
    | "AnimTask_MoveSkyUppercutBg"
    | "AnimTask_ShakeMon2_Step"
    | "AnimTask_ShakeMonInPlace_Step"
    | "Task_ClearMonBg";
  readonly data: readonly number[];
}

export interface SkyUppercutDisplayTransfer {
  readonly oam: "current" | "predecessor";
  readonly matrices: "current" | "predecessor";
  /** Age 4 is the retained same-row Task_UpdateMonBg palette setup. */
  readonly palette: "current" | "predecessor" | "same-row-monbg-setup";
}

export interface SkyUppercutState {
  readonly age: number;
  readonly active: boolean;
  readonly firstInactiveCleanup: boolean;
  readonly source: SkyUppercutSourceCursor;
  readonly battlers: Readonly<{
    attacker: Readonly<{ side: SkyUppercutSide; species: string; center: SkyUppercutPoint }>;
    target: Readonly<{ side: SkyUppercutSide; species: string; center: SkyUppercutPoint }>;
  }>;
  readonly sprites: readonly SkyUppercutSpriteState[];
  readonly tasks: readonly SkyUppercutTaskState[];
  readonly battlerOffsets: Readonly<{
    attacker: SkyUppercutPoint;
    target: SkyUppercutPoint;
  }>;
  readonly resources: Readonly<{
    impactLoaded: boolean;
    impactTag: 10135 | null;
    impactPaletteBank: number | null;
    impactTileSlot: number | null;
    matrixBitmap: number;
  }>;
  readonly monbg: Readonly<{
    sourceActive: boolean;
    displayActive: boolean;
    clearActive: boolean;
    layer: "bg1" | "bg2";
    sourceOffsets: SkyUppercutPoint;
  }>;
  readonly background: Readonly<{
    scene: "battle" | "in-air";
    fade: "none" | "out" | "in" | "restore-out" | "restore-in";
    screenSize: "battle" | "animation";
    bg3: SkyUppercutPoint;
  }>;
  readonly registers: Readonly<{ bldcnt: number; bldalpha: number; bldy: number }>;
  readonly audio: readonly Readonly<{
    event: "SE_M_SKY_UPPERCUT" | "SE_M_VITAL_THROW2";
    pan: number;
  }>[];
  readonly painterSlots: readonly number[];
  readonly displayTransfer: SkyUppercutDisplayTransfer;
}

const MOVE_SKY_UPPERCUT_ROM_START = 0x082d_6ed7;
const IMPACT_TAG = 10135 as const;
const STORED_DESTROY_CALLBACK_LOW = 15357;
const STORED_DESTROY_CALLBACK_HIGH = 2058;
const EMPTY_TASK_DATA = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const;
const IMPACT_PROGRAM = [
  { age: 91, offset: { x: -28, y: 28 } },
  { age: 94, offset: { x: -15, y: 8 } },
  { age: 97, offset: { x: -5, y: -12 } },
  { age: 100, offset: { x: 0, y: -32 } },
  { age: 103, offset: { x: 5, y: -52 } },
] as const;

function validPoint(point: SkyUppercutPoint): boolean {
  return Number.isInteger(point.x) && Number.isInteger(point.y);
}

function validSlot(slot: number, count: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < count;
}

function assertInputs(input: Readonly<SkyUppercutLiveInputs>): void {
  const spriteSlots = [input.attackerSpriteSlot, input.targetSpriteSlot,
    ...input.slideSpriteSlots, ...input.impactSpriteSlots];
  const taskSlots = [input.updateMonBgTaskSlot, input.fadeInTaskSlot,
    input.backgroundTaskSlot, input.shakeMon2TaskSlot, input.shakeMonInPlaceTaskSlot,
    input.clearMonBgTaskSlot, input.restoreFadeTaskSlot];
  const points = [input.attackerCenter, input.targetCenter, input.targetPictureOrigin,
    input.attackerInitialOffset, input.targetInitialOffset, input.initialBg3Offset];
  if (input.attackerSide === input.targetSide || !input.attackerSpecies || !input.targetSpecies
    || spriteSlots.some((slot) => !validSlot(slot, 64))
    || taskSlots.some((slot) => !validSlot(slot, 16))
    || input.impactMatrixSlots.some((slot) => !validSlot(slot, 32))
    || !validSlot(input.impactPaletteBank, 16) || !validSlot(input.impactTileSlot, 64)
    || !Number.isInteger(input.baseMatrixBitmap)
    || !Number.isInteger(input.slideSubpriority) || !Number.isInteger(input.impactSubpriority)
    || points.some((point) => !validPoint(point))
    || input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64
    || input.spriteOrder.some((slot) => !validSlot(slot, 64))
    || !validSlot(input.monbg.spriteSlot, 64)
    || !Number.isInteger(input.monbg.spriteX) || !Number.isInteger(input.monbg.spriteY)
    || !Number.isInteger(input.monbg.bgX) || !Number.isInteger(input.monbg.bgY)
    || !Number.isInteger(input.monbg.battlerId)
    || input.monbg.inBg2 !== (input.monbg.layer === "bg2")
    || input.monbg.layer !== (input.targetSide === "player" ? "bg2" : "bg1")) {
    throw new Error("invalid live Sky Uppercut inputs");
  }
}

function sourceAt(offset: SkyUppercutSourceOffset, wait: number, active: boolean): SkyUppercutSourceCursor {
  const pointer = MOVE_SKY_UPPERCUT_ROM_START + offset;
  return {
    owner: "Move_SKY_UPPERCUT", pointer,
    pointerParity: (pointer & 1) as 0 | 1, offset, wait, active,
  };
}

/** Cursor state after the animation VM has advanced for this source age. */
export function skyUppercutSourceAtAge(age: number): SkyUppercutSourceCursor {
  if (age < 0) return sourceAt(0, 0, false);
  if (age === 0) return sourceAt(0, 0, true);
  if (age <= 3) return sourceAt(3, age === 1 ? 1 : 0, true);
  if (age <= 6) return sourceAt(5, age === 4 ? 1 : 0, true);
  if (age <= 25) return sourceAt(9, 1, true);
  if (age <= 44) return sourceAt(23, 1, true);
  if (age <= 84) return sourceAt(29, Math.max(0, 83 - age), true);
  if (age <= 90) return sourceAt(48, Math.max(0, 89 - age), true);
  if (age <= 93) return sourceAt(86, age === 91 ? 1 : 0, true);
  if (age <= 96) return sourceAt(111, age === 94 ? 1 : 0, true);
  if (age <= 99) return sourceAt(132, age === 97 ? 1 : 0, true);
  if (age <= 102) return sourceAt(153, age === 100 ? 1 : 0, true);
  if (age <= 108) return sourceAt(191, Math.max(0, 107 - age), true);
  if (age <= 140) return sourceAt(210, Math.max(0, 139 - age), true);
  if (age <= 146) return sourceAt(225, Math.max(0, 145 - age), true);
  if (age <= 167) return sourceAt(242, 1, true);
  if (age <= 186) return sourceAt(247, 1, true);
  return sourceAt(248, 0, false);
}

function pauseCountAtCleanup(age: number): number {
  // ClearMonBg's two teardown rows retain but do not advance these callbacks.
  if (age >= 150) return 2;
  if (age >= 149) return 1;
  return 0;
}

function signedFixedPoint(value: number): number {
  return value >> 8;
}

function fixedStep(delta: number, duration: number): number {
  return Math.trunc((delta * 256) / duration);
}

function impactMatrixAtAge(
  age: number,
  matrixNum: number,
  input: Readonly<SkyUppercutLiveInputs>,
): readonly [number, number, number, number] {
  const occupiedByImpact = IMPACT_PROGRAM.some((program, index) =>
    age >= program.age && age <= program.age + 9 && input.impactMatrixSlots[index] === matrixNum);
  return occupiedByImpact ? [303, 0, 0, 303] : [256, 0, 0, 256];
}

function sideMirroredOffset(
  side: SkyUppercutSide,
  point: SkyUppercutPoint,
): SkyUppercutPoint {
  return side === "player" ? point : { x: -point.x, y: -point.y };
}

function firstSlideOffset(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutPoint | null {
  if (age < 85 || age > 146) return null;
  const delta = sideMirroredOffset(input.attackerSide, { x: 28, y: 0 });
  const step = fixedStep(delta.x, 5);
  const callbacks = Math.min(Math.max(age - 84, 0), 5);
  return { x: signedFixedPoint(step * callbacks), y: 0 };
}

function targetSlideOffset(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutPoint | null {
  if (age < 103 || age > 146) return null;
  const delta = sideMirroredOffset(input.targetSide, { x: -26, y: 16 });
  const stepX = fixedStep(delta.x, 4);
  const stepY = fixedStep(delta.y, 4);
  const callbacks = Math.min(Math.max(age - 102, 0), 4);
  return {
    x: signedFixedPoint(stepX * callbacks),
    y: signedFixedPoint(stepY * callbacks),
  };
}

function shakeMon2Offset(age: number): SkyUppercutPoint | null {
  if (age < 91 || age > 100) return null;
  const polarity = Math.floor((age - 91) / 2) & 1;
  return { x: polarity === 0 ? -4 : 4, y: 0 };
}

function shakeInPlaceDelta(age: number): SkyUppercutPoint | null {
  if (age < 109 || age > 117) return null;
  const local = age - 109;
  // The creation callback executes immediately, then its one-frame delay
  // retains each alternating displacement for a second source age.
  const positive = local > 0 && Math.floor((local + 1) / 2) % 2 === 1;
  return { x: 0, y: positive ? 3 : -3 };
}

function targetOffsetAtAge(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutPoint {
  if (age < 91) return input.targetInitialOffset;
  const shake2 = shakeMon2Offset(age);
  if (shake2) return shake2;
  if (age <= 102) return { x: 0, y: 0 };
  const targetSlide = targetSlideOffset(age, input)!;
  const shakeInPlace = shakeInPlaceDelta(age);
  if (shakeInPlace) return { x: targetSlide.x + shakeInPlace.x, y: targetSlide.y + shakeInPlace.y };
  if (age <= 146) return targetSlide;
  if (age <= 154) {
    const heldTargetSlide = targetSlideOffset(146, input)!;
    const pauses = pauseCountAtCleanup(age);
    const callbacks = age - 146 - pauses;
    const stepX = fixedStep(-heldTargetSlide.x, 6);
    const stepY = fixedStep(-heldTargetSlide.y, 6);
    return {
      x: heldTargetSlide.x + signedFixedPoint(stepX * callbacks),
      y: heldTargetSlide.y + signedFixedPoint(stepY * callbacks),
    };
  }
  return { x: 0, y: 0 };
}

function attackerOffsetAtAge(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutPoint {
  if (age < 85) return input.attackerInitialOffset;
  const first = firstSlideOffset(age, input)!;
  if (age <= 140) return first;
  if (age <= 146) {
    const callbacks = age - 140;
    const stepX = fixedStep(-first.x, 6);
    return { x: first.x + signedFixedPoint(stepX * callbacks), y: 0 };
  }
  return { x: 0, y: 0 };
}

function offsetSlideSprite(
  age: number,
  input: Readonly<SkyUppercutLiveInputs>,
  index: 0 | 1,
): SkyUppercutSpriteState | null {
  const startAge = index === 0 ? 85 : 103;
  const duration = index === 0 ? 5 : 4;
  const finishAge = index === 0 ? 90 : 107;
  if (age < startAge || age > finishAge) return null;
  const delta = index === 0
    ? sideMirroredOffset(input.attackerSide, { x: 28, y: 0 })
    : sideMirroredOffset(input.targetSide, { x: -26, y: 16 });
  const callbackCount = Math.min(age - startAge + 1, duration);
  const stepX = fixedStep(delta.x, duration);
  const stepY = fixedStep(delta.y, duration);
  return {
    slot: input.slideSpriteSlots[index], kind: "slide-to-offset",
    template: "gSlideMonToOffsetSpriteTemplate",
    callback: age === finishAge ? "DestroyAnimSprite" : "TranslateSpriteLinearByIdFixedPoint",
    x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, x2: 0, y2: 0,
    subpriority: input.slideSubpriority, matrixNum: 0, matrix: impactMatrixAtAge(age, 0, input),
    visible: false,
    data: [duration - callbackCount, stepX, stepY,
      stepX * callbackCount, stepY * callbackCount,
      index === 0 ? input.attackerSpriteSlot : input.targetSpriteSlot,
      STORED_DESTROY_CALLBACK_LOW, STORED_DESTROY_CALLBACK_HIGH],
  };
}

function impactSprite(
  age: number,
  index: number,
  input: Readonly<SkyUppercutLiveInputs>,
): SkyUppercutSpriteState | null {
  const program = IMPACT_PROGRAM[index]!;
  const local = age - program.age;
  if (local < 0 || local > 9) return null;
  const xDirection = input.targetSide === "opponent" ? 1 : -1;
  return {
    slot: input.impactSpriteSlots[index]!, kind: "hitsplat",
    template: "gBasicHitSplatSpriteTemplate",
    callback: local === 9 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
    x: input.targetPictureOrigin.x + program.offset.x * xDirection,
    y: input.targetPictureOrigin.y + program.offset.y,
    x2: 0, y2: 0, subpriority: input.impactSubpriority,
    matrixNum: input.impactMatrixSlots[index]!, matrix: [303, 0, 0, 303], visible: true,
    data: [0, 0, 0, 0, 0, 0, STORED_DESTROY_CALLBACK_LOW, STORED_DESTROY_CALLBACK_HIGH],
  };
}

function originalSlideSprite(
  age: number,
  input: Readonly<SkyUppercutLiveInputs>,
  index: 0 | 1,
): SkyUppercutSpriteState | null {
  const startAge = index === 0 ? 141 : 147;
  const endAge = index === 0 ? 146 : 154;
  if (age < startAge || age > endAge) return null;
  const start = index === 0
    ? firstSlideOffset(140, input)!
    : targetSlideOffset(146, input)!;
  const callbacks = index === 0
    ? age - 140
    : age - 146 - pauseCountAtCleanup(age);
  const stepX = fixedStep(-start.x, 6);
  const stepY = fixedStep(-start.y, 6);
  const slot = index === 0 ? input.attackerSpriteSlot : input.targetSpriteSlot;
  return {
    slot: input.slideSpriteSlots[index + 2], kind: "slide-to-original",
    template: "gSlideMonToOriginalPosSpriteTemplate", callback: "SlideMonToOriginalPos_Step",
    x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y, x2: 0, y2: 0,
    subpriority: input.slideSubpriority, matrixNum: 0, matrix: impactMatrixAtAge(age, 0, input),
    visible: false,
    data: [6 - callbacks, stepX, stepY, stepX * callbacks, stepY * callbacks,
      start.x, start.y, slot << 8],
  };
}

function updateMonBgTask(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutTaskState | null {
  if (age < 4 || age > 149) return null;
  const monbg = input.monbg;
  return {
    slot: input.updateMonBgTaskSlot, kind: "update-monbg", callback: "Task_UpdateMonBg",
    data: [monbg.spriteSlot, monbg.spriteX, monbg.spriteY, monbg.bgX, monbg.bgY,
      monbg.inBg2 ? 1 : 0, monbg.battlerId, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}

function fadeTask(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutTaskState | null {
  if (age >= 7 && age <= 43) {
    const state = age <= 24 ? 1 : age === 25 ? 2 : 3;
    return { slot: input.fadeInTaskSlot, kind: "fade-to-bg", callback: "Task_FadeToBg",
      data: [17, ...EMPTY_TASK_DATA.slice(1, 10), state, ...EMPTY_TASK_DATA.slice(11)] };
  }
  if (age >= 147 && age <= 185) {
    const state = age <= 166 ? 1 : age === 167 ? 2 : 3;
    return { slot: input.restoreFadeTaskSlot, kind: "fade-to-bg", callback: "Task_FadeToBg",
      data: [-1, ...EMPTY_TASK_DATA.slice(1, 10), state, ...EMPTY_TASK_DATA.slice(11)] };
  }
  return null;
}

function backgroundTask(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutTaskState | null {
  if (age < 26 || age > 167) return null;
  const state = age <= 80 ? 1 : 2;
  const countdown = age <= 80 ? 80 - age : -1;
  return { slot: input.backgroundTaskSlot, kind: "sky-uppercut-bg", callback: "AnimTask_MoveSkyUppercutBg",
    data: [state, 0, 0, 0, 0, 0, 0, 0, countdown, 0, 0, 0, 0, 0, 0, 0] };
}

function shakeMon2Task(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutTaskState | null {
  if (age < 91 || age > 100) return null;
  const local = age - 91;
  return { slot: input.shakeMon2TaskSlot, kind: "shake-mon2", callback: "AnimTask_ShakeMon2_Step",
    data: [input.targetSpriteSlot, 5 - Math.floor(local / 2), 1,
      local % 2 === 0 ? 1 : 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
}

function shakeInPlaceTask(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutTaskState | null {
  if (age < 109 || age > 117) return null;
  const local = age - 109;
  const shakes = 1 + Math.floor((local + 1) / 2);
  return { slot: input.shakeMonInPlaceTaskSlot, kind: "shake-mon-in-place",
    callback: "AnimTask_ShakeMonInPlace_Step",
    data: [input.targetSpriteSlot, shakes, 6, local % 2 === 0 ? 0 : 1, 1, 0, 6,
      0, 0, 0, 0, 0, 0, 0, 0, 0] };
}

function clearMonBgTask(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutTaskState | null {
  if (age < 147 || age > 149) return null;
  return { slot: input.clearMonBgTaskSlot, kind: "clear-monbg", callback: "Task_ClearMonBg",
    data: [0, age === 147 ? 1 : 2, input.monbg.battlerId,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
}

function monbgOffsets(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutPoint {
  if (age < 4 || age >= 150) return { x: 0, y: 0 };
  const sampledAge = age >= 148 ? 147 : age;
  const target = targetOffsetAtAge(sampledAge, input);
  return {
    x: input.monbg.spriteX - (input.targetCenter.x + target.x) + input.monbg.bgX,
    y: input.monbg.spriteY - (input.targetCenter.y + target.y) + input.monbg.bgY,
  };
}

function bg3Offset(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutPoint {
  if (age < 26) return input.initialBg3Offset;
  if (age > 167) return { x: 0, y: 0 };
  const pauses = pauseCountAtCleanup(age);
  const callbackCount = age - 24 - pauses;
  const horizontalSteps = Math.max(0, age - 81 - pauses);
  const direction = input.targetSide === "player" ? 1 : -1;
  return {
    x: input.initialBg3Offset.x + direction * horizontalSteps * 5,
    y: input.initialBg3Offset.y + callbackCount * 11,
  };
}

function displayTransfer(age: number): SkyUppercutDisplayTransfer {
  if (age <= 0) return { oam: "current", matrices: "current", palette: "current" };
  return {
    oam: "predecessor",
    matrices: "predecessor",
    palette: age === 4 ? "same-row-monbg-setup" : "predecessor",
  };
}

function paletteFadeBldy(age: number): number {
  if (age >= 9 && age <= 23) return age - 8;
  if (age >= 24 && age <= 27) return 16;
  if (age >= 28 && age <= 43) return 43 - age;
  // The ClearMonBg teardown stalls the hardware-fade cadence for its two
  // retained callback rows, just as it stalls the BG3/return callbacks.
  if (age >= 149 && age <= 151) return 1;
  if (age >= 152 && age <= 165) return age - 150;
  if (age >= 166 && age <= 169) return 16;
  if (age >= 170 && age <= 185) return 185 - age;
  return 0;
}

function audioAtAge(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutState["audio"] {
  if (age === 26) return [{ event: "SE_M_SKY_UPPERCUT", pan: input.attackerSide === "player" ? -64 : 63 }];
  if (IMPACT_PROGRAM.some((program) => program.age === age)) {
    return [{ event: "SE_M_VITAL_THROW2", pan: input.targetSide === "player" ? -64 : 63 }];
  }
  return [];
}

/**
 * Reduces one source age of Move_SKY_UPPERCUT from ordinary live Scene-ON
 * inputs. No retained map, screenshot, RGB archive, canonical party, or
 * absolute battle tick enters this function.
 */
export function skyUppercutAtAge(age: number, input: Readonly<SkyUppercutLiveInputs>): SkyUppercutState {
  assertInputs(input);
  const source = skyUppercutSourceAtAge(age);
  const sprites: SkyUppercutSpriteState[] = [];
  const firstSlide = offsetSlideSprite(age, input, 0);
  if (firstSlide) sprites.push(firstSlide);
  for (let index = 0; index < IMPACT_PROGRAM.length; index += 1) {
    const impact = impactSprite(age, index, input);
    if (impact) sprites.push(impact);
  }
  const targetSlide = offsetSlideSprite(age, input, 1);
  if (targetSlide) sprites.push(targetSlide);
  const attackerReturn = originalSlideSprite(age, input, 0);
  if (attackerReturn) sprites.push(attackerReturn);
  const targetReturn = originalSlideSprite(age, input, 1);
  if (targetReturn) sprites.push(targetReturn);
  sprites.sort((left, right) => left.slot - right.slot);

  const tasks = [
    updateMonBgTask(age, input), fadeTask(age, input), backgroundTask(age, input),
    shakeMon2Task(age, input), shakeInPlaceTask(age, input), clearMonBgTask(age, input),
  ].filter((task): task is SkyUppercutTaskState => task !== null)
    .sort((left, right) => left.slot - right.slot);
  const impactLoaded = age >= 1 && age <= 186;
  const activeImpactMatrices = sprites.filter((sprite) => sprite.kind === "hitsplat")
    .reduce((bitmap, sprite) => bitmap | (1 << sprite.matrixNum), input.baseMatrixBitmap);

  const fade = age >= 7 && age <= 24 ? "out"
    : age >= 25 && age <= 43 ? "in"
    : age >= 147 && age <= 166 ? "restore-out"
    : age >= 167 && age <= 185 ? "restore-in" : "none";
  return {
    age, active: source.active, firstInactiveCleanup: age === 187, source,
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, center: input.attackerCenter },
      target: { side: input.targetSide, species: input.targetSpecies, center: input.targetCenter },
    },
    sprites, tasks,
    battlerOffsets: {
      attacker: attackerOffsetAtAge(age, input), target: targetOffsetAtAge(age, input),
    },
    resources: {
      impactLoaded, impactTag: impactLoaded ? IMPACT_TAG : null,
      impactPaletteBank: impactLoaded ? input.impactPaletteBank : null,
      impactTileSlot: impactLoaded ? input.impactTileSlot : null,
      matrixBitmap: activeImpactMatrices,
    },
    monbg: {
      sourceActive: age >= 4 && age <= 149,
      displayActive: age >= 5 && age <= 150,
      clearActive: age >= 147 && age <= 149,
      layer: input.monbg.layer, sourceOffsets: monbgOffsets(age, input),
    },
    background: {
      scene: age >= 26 && age <= 167 ? "in-air" : "battle",
      fade, screenSize: age >= 26 && age <= 167 ? "animation" : "battle",
      bg3: bg3Offset(age, input),
    },
    registers: {
      bldcnt: age >= 8 && age <= 43 ? 232
        : age >= 45 && age <= 146 ? 16192
        : age >= 148 && age <= 185 ? 232 : 0,
      bldalpha: age >= 45 && age <= 146 ? 2060 : 0,
      bldy: paletteFadeBldy(age),
    },
    audio: audioAtAge(age, input),
    painterSlots: input.spriteOrder.filter((slot) => sprites.some((sprite) => sprite.slot === slot)),
    displayTransfer: displayTransfer(age),
  };
}
