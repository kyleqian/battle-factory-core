/**
 * Source-relative presentation reducer for Move_DIG.
 *
 * Dig is two separate source bodies.  The reducer deliberately keeps that
 * distinction: setup owns the underground bounce and its five four-particle
 * dirt emissions, while unleash owns the rise, impact and shake.  All
 * coordinates, slots, matrices and background facts are supplied by the
 * Scene-ON caller; no recording is needed to select an animation.
 */
import moundAsset from "./assets/dig-dirt-mound.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { sortGbaSpriteOrder } from "./gbaObjCompositor.ts";

export type DigBody = "setup" | "unleash";
export type DigSide = "player" | "opponent";
export interface DigPoint { readonly x: number; readonly y: number; }

export interface DigResourceAllocation {
  readonly tileSlot: number;
  readonly paletteBank: number;
  readonly tileRange: readonly [number, number];
}

/** Facts sampled from the live animation allocator and battler scene. */
export interface DigLiveInputs {
  readonly body: DigBody;
  readonly attackerSide: DigSide;
  readonly targetSide: DigSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** `GetBattlerSpriteCoord(..., X_2)` / sprite primary coordinates. */
  readonly attackerCenter: Readonly<DigPoint>;
  readonly targetCenter: Readonly<DigPoint>;
  /** `CreateSpriteAndAnimate`'s live target origin (`X_2`, `Y_PIC_OFFSET`). */
  readonly targetAnimationOrigin?: Readonly<DigPoint>;
  /** `GetBattlerYCoordWithElevation` (distinct from the OAM sprite y). */
  readonly attackerElevationY: number;
  readonly attackerInitialOffset: Readonly<DigPoint>;
  readonly targetInitialOffset: Readonly<DigPoint>;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly attackerSubpriority: number;
  readonly targetSubpriority: number;
  readonly attackerInitialVisible?: boolean;
  readonly targetInitialVisible?: boolean;
  readonly attackerInitialMatrixNum?: number;
  readonly targetInitialMatrixNum?: number;
  readonly attackerCleanupMatrixNum?: number;
  readonly targetCleanupMatrixNum?: number;
  readonly attackerInitialMatrix?: readonly [number, number, number, number];
  readonly targetInitialMatrix?: readonly [number, number, number, number];

  /** Mound halves are allocated in left/right script order. */
  readonly moundSlots: readonly [number, number];
  /** Twenty slots in five groups of four, in DigThrowDirt script order. */
  readonly plumeSlots: readonly number[];
  readonly impactSpriteSlot: number;
  readonly impactMatrixNum: number;
  readonly moundMatrixNum?: number;
  readonly plumeMatrixNum?: number;
  readonly digTaskSlot: number;
  readonly updateMonBgTaskSlot: number;
  readonly clearMonBgTaskSlot: number;
  readonly shakeTaskSlot: number;
  readonly spriteOrder: readonly number[];

  readonly mudSand: Readonly<DigResourceAllocation>;
  readonly dirtMound: Readonly<DigResourceAllocation>;
  readonly impact: Readonly<DigResourceAllocation>;
  readonly initialMatrixBitmap: number;

  /** The selected BG before each body starts to move it. */
  readonly setupBgOffset: Readonly<DigPoint>;
  readonly monBg: Readonly<{
    readonly layer: "bg1" | "bg2";
    readonly layerId: number;
    /** Snapshot taken by Task_InitUpdateMonBg. */
    readonly snapshot: Readonly<DigPoint>;
    readonly baseScroll: Readonly<DigPoint>;
    readonly activeCnt: number;
    readonly inactiveCnt: number;
  }>;
  /** The animation-only stream is passed through; Dig makes no RNG calls. */
  readonly animationRngSeed: number;
}

export const DIG_SETUP_FIRST_INACTIVE_AGE = 194;
export const DIG_UNLEASH_FIRST_INACTIVE_AGE = 67;
export const DIG_SOURCE_START = 0x082ccca1;
export const DIG_MUD_SAND_TAG = 10074;
export const DIG_IMPACT_TAG = 10135;
export const DIG_DIRT_MOUND_TAG = moundAsset.dirtMound.tag;
/** MUD_SAND and IMPACT are deliberately source-identity reuse, not copies. */
export const DIG_MUD_SAND_TILE_BYTES = 32;
export const DIG_DIRT_MOUND_TILE_BYTES = moundAsset.dirtMound.tileBytes;
export const DIG_IMPACT_TILE_BYTES = 512;

export interface DigSourceCursor {
  readonly owner: "Move_DIG";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly scriptOffset: number;
  readonly pointerParity: 0 | 1;
  readonly wait: number;
  readonly active: boolean;
}

export interface DigSprite {
  readonly kind: "dirt-mound" | "dirt-plume" | "impact";
  readonly slot: number;
  readonly template:
    | "gDirtMoundSpriteTemplate"
    | "gDirtPlumeSpriteTemplate"
    | "gBasicHitSplatSpriteTemplate";
  readonly callback:
    | "WaitAnimForDuration"
    | "DestroyAnimSprite"
    | "AnimDirtPlumeParticle_Step"
    | "RunStoredCallbackWhenAffineAnimEnds";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: readonly [number, number, number, number];
  readonly visible: boolean;
  readonly frame: number;
  readonly oam: Readonly<{
    readonly shape: "8x8" | "32x16" | "32x32";
    readonly affine: boolean;
    readonly priority: 1 | 2;
  }>;
}

export interface DigTask {
  readonly slot: number;
  readonly callback:
    | "AnimTask_DigBounceMovement"
    | "AnimTask_DigRiseUpFromHole"
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg"
    | "Task_ClearMonBgStatic"
    | "AnimTask_ShakeMon_Step";
  readonly data: readonly number[];
}

export interface DigState {
  readonly age: number;
  readonly body: DigBody;
  readonly active: boolean;
  readonly source: DigSourceCursor;
  readonly sprites: readonly DigSprite[];
  readonly tasks: readonly DigTask[];
  readonly attacker: Readonly<{
    readonly slot: number;
    readonly x: number;
    readonly y: number;
    readonly x2: number;
    readonly y2: number;
    readonly visible: boolean;
    readonly matrixNum: number;
    readonly matrix: readonly [number, number, number, number];
  }>;
  readonly target: Readonly<{
    readonly slot: number;
    readonly x: number;
    readonly y: number;
    readonly x2: number;
    readonly y2: number;
    readonly visible: boolean;
    readonly matrixNum: number;
    readonly matrix: readonly [number, number, number, number];
  }>;
  readonly order: Readonly<{ readonly callerBaseline: readonly number[]; readonly ownedSlots: readonly number[] }>;
  readonly background: Readonly<{
    readonly layer: "bg1" | "bg2";
    readonly vram: "battle" | "mon-bg" | "clear-pending";
    readonly vramEvent: "none" | "load-mon-bg" | "clear-mon-bg" | "restore-battle";
    readonly scroll: Readonly<DigPoint>;
    readonly monbg: boolean;
  }>;
  readonly registers: Readonly<{
    readonly layer: "bg1" | "bg2";
    readonly hardwareCnt: number;
    readonly hardwareScroll: Readonly<DigPoint>;
    readonly transfer: "current" | "preceding-software";
  }>;
  readonly scanline: Readonly<{
    readonly state: 0 | 1 | 3;
    readonly srcBuffer: 0 | 1;
    readonly dmaDest: number;
    readonly dmaControl: number;
    readonly startY: number;
    readonly endY: number;
    readonly bgX: number;
    readonly buffers: readonly [readonly number[], readonly number[]];
  }>;
  readonly resources: Readonly<{
    readonly mudSand: Readonly<DigResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly dirtMound: Readonly<DigResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly impact: Readonly<DigResourceAllocation & { readonly tag: number | null; readonly loaded: boolean }>;
    readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly releasedAtFirstInactive: boolean }>;
  }>;
  readonly audio: Readonly<{ readonly events: readonly Readonly<{
    readonly channel: "SE1";
    readonly sound: "SE_M_DIG" | "SE_M_MEGA_KICK2";
    readonly sourcePan: "SOUND_PAN_ATTACKER";
    readonly pan: -64 | 63;
  }>[] }>;
  readonly rng: Readonly<{ readonly gameplay: "untouched"; readonly animation: "caller-scheduled"; readonly before: number; readonly after: number; readonly advances: 0 }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly ownedSprites: number;
    readonly ownedTasks: number;
    readonly resourcesReleased: boolean;
  }>;
}

const ZERO_MATRIX = [256, 0, 0, 256] as const;
const IMPACT_MATRIX = [372, 0, 0, 372] as const;
const DIG_DMA_CONTROL = 0xa2580001;
const DIG_DMA_BG1 = 0x04000014;
const DIG_DMA_BG2 = 0x04000018;
const DISPLAY_HEIGHT = 160;
const DISPLAY_WIDTH = 240;
const PLUME_SPECS = [
  { side: 0 as const, targetX: 12, wave: -16 },
  { side: 0 as const, targetX: 16, wave: -10 },
  { side: 1 as const, targetX: 14, wave: -18 },
  { side: 1 as const, targetX: 12, wave: -16 },
] as const;
const PLUME_GROUPS = [18, 52, 86, 120, 154] as const;

function point(value: Readonly<DigPoint>): DigPoint { return { x: value.x, y: value.y }; }
function inRange(age: number, first: number, last: number): boolean { return age >= first && age <= last; }
function signedDelta(value: number, duration: number): number {
  const magnitude = Math.trunc((Math.abs(value) << 8) / duration);
  return value < 0 ? magnitude | 1 : magnitude & ~1;
}
function signedFixed(value: number, encoded: number): number {
  return encoded & 1 ? -(value >> 8) : value >> 8;
}

function sourceAtAge(age: number, body: DigBody): DigSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Dig source age ${age}`);
  const start = DIG_SOURCE_START;
  const inactive = body === "setup" ? DIG_SETUP_FIRST_INACTIVE_AGE : DIG_UNLEASH_FIRST_INACTIVE_AGE;
  let offset = 9, wait = 0, active = age < inactive;
  if (body === "setup") {
    if (age === 0) offset = 0;
    else if (age <= 3) { offset = 13; wait = age === 1 ? 1 : 0; }
    else if (age <= 6) { offset = 16; wait = age === 4 ? 1 : 0; }
    else if (age <= 9) { offset = 46; wait = age === 7 ? 1 : 0; }
    else if (age <= 17) { offset = 57; wait = age <= 16 ? 16 - age : 0; }
    else if (age <= 187) {
      offset = 283;
      const cycleStart = 18 + Math.floor((age - 18) / 34) * 34;
      wait = age >= cycleStart && age <= cycleStart + 32 ? cycleStart + 32 - age : 0;
    } else if (age === 188) { offset = 82; wait = 1; }
    else if (age <= 193) { offset = 87; wait = age === 189 ? 1 : 0; }
  } else {
    if (age === 0) offset = 0;
    else if (age <= 3) { offset = 104; wait = age === 1 ? 1 : 0; }
    else if (age <= 6) { offset = 107; wait = age === 4 ? 1 : 0; }
    else if (age === 7) { offset = 116; wait = 1; }
    else if (age <= 10) { offset = 119; wait = age === 8 ? 1 : 0; }
    else if (age <= 13) { offset = 147; wait = age === 11 ? 1 : 0; }
    else if (age <= 31) { offset = 158; wait = age <= 30 ? 30 - age : 0; }
    else { wait = 1; }
  }
  const pointer = start + offset;
  return { owner: "Move_DIG", pointer, pointerOffset: offset, scriptOffset: offset,
    pointerParity: (pointer & 1) as 0 | 1, wait, active };
}

function bounceData(age: number, input: DigLiveInputs): readonly number[] {
  const n = age - 10;
  const data = Array<number>(16).fill(0);
  const rank = input.monBg.layer === "bg1" ? 1 : 2;
  const endY = input.attackerElevationY + 32;
  const startY = Math.max(0, input.attackerElevationY - 32);
  let state = n >= 156 ? (n === 156 ? 3 : 4) : 2;
  const motionN = Math.min(n, 156);
  let phase = (motionN * 6) & 0x7f;
  let group = Math.floor(motionN / 3);
  let phaseInGroup = motionN % 3;
  let height = group + (GBA_SINE_TABLE_256[phase]! >> 4);
  if (height > 63) height = 120 - startY;
  data[0] = state; data[2] = phase; data[3] = group; data[4] = phaseInGroup; data[5] = height;
  data[10] = input.attackerSpriteSlot; data[11] = rank;
  data[12] = input.setupBgOffset.x; data[13] = input.setupBgOffset.y;
  data[14] = startY; data[15] = endY;
  return data;
}

function bounceHeight(age: number, input: DigLiveInputs): number {
  if (age < 10) return 0;
  const n = Math.min(156, age - 10);
  let result = Math.floor(n / 3) + (GBA_SINE_TABLE_256[(n * 6) & 0x7f]! >> 4);
  if (result > 63) result = 120 - Math.max(0, input.attackerElevationY - 32);
  return result;
}

function plumeAtAge(age: number, group: number, specIndex: number, input: DigLiveInputs): DigSprite | null {
  const local = age - PLUME_GROUPS[group]!;
  if (local < 0 || local > 17) return null;
  const spec = PLUME_SPECS[specIndex]!
  const callbacks = local + 1;
  const direction = spec.side === 0 ? 1 : -1;
  const startX = input.attackerCenter.x + direction * 24;
  const startY = input.attackerElevationY + 30;
  const dx = signedDelta(direction * spec.targetX, 18);
  const dy = signedDelta(4, 18);
  const xAccum = dx * callbacks;
  const yAccum = dy * callbacks;
  const phaseAccumulator = Math.trunc(0x8000 / 18) * callbacks;
  const x2 = signedFixed(xAccum, dx);
  const y2 = signedFixed(yAccum, dy)
    + ((GBA_SINE_TABLE_256[(phaseAccumulator >> 8) & 0xff]! * spec.wave) >> 8);
  const data = [18 - callbacks, Math.abs(dx), Math.abs(dy), xAccum, yAccum,
    spec.wave, Math.trunc(0x8000 / 18), phaseAccumulator];
  const slot = input.plumeSlots[group * 4 + specIndex];
  if (slot === undefined) throw new Error("Dig plume allocator has fewer than twenty slots");
  return { kind: "dirt-plume", slot, template: "gDirtPlumeSpriteTemplate",
    callback: "AnimDirtPlumeParticle_Step", x: startX, y: startY, x2, y2, data,
    subpriority: input.attackerSubpriority - 2,
    matrixNum: input.plumeMatrixNum ?? input.moundMatrixNum ?? 0, matrix: ZERO_MATRIX,
    visible: true, frame: 0, oam: { shape: "8x8", affine: false, priority: 1 } };
}

function moundAtAge(age: number, body: DigBody, input: DigLiveInputs): DigSprite[] {
  const start = body === "setup" ? 7 : 11;
  const duration = body === "setup" ? 180 : 48;
  // The unleash callback is paused for two scheduler ticks while the
  // affine impact owns the shared matrix.  The mound therefore receives its
  // destroy callback two ticks after its nominal duration.
  const cleanupDelay = body === "unleash" ? 2 : 0;
  if (age < start || age > start + duration + cleanupDelay) return [];
  const elapsed = age - start;
  // Creating the affine impact and its two callbacks temporarily prevents
  // the ordinary mound callback from running.  This is a source scheduling
  // effect, not an evidence-row table.
  const callbackPause = body === "unleash"
    ? Math.min(2, Math.max(0, elapsed - 22))
    : 0;
  const remaining = Math.max(0, duration - 1 - elapsed + callbackPause);
  const destroying = elapsed === duration + cleanupDelay;
  const matrix = body === "unleash" && inRange(age, 32, 43)
    && (input.impactMatrixNum === (input.moundMatrixNum ?? 0)) ? IMPACT_MATRIX :
    (input.attackerInitialMatrix ?? ZERO_MATRIX);
  return input.moundSlots.map((slot, half) => ({
    kind: "dirt-mound" as const, slot, template: "gDirtMoundSpriteTemplate" as const,
    callback: destroying ? "DestroyAnimSprite" as const : "WaitAnimForDuration" as const,
    x: input.attackerCenter.x - 16 + half * 32, y: input.attackerElevationY + 32,
    x2: 0, y2: 0, data: [destroying ? 0 : remaining, 0, 0, 0, 0, 0, 15357, 2058],
    subpriority: input.attackerSubpriority - 1, matrixNum: input.moundMatrixNum ?? 0,
    matrix, visible: true, frame: 0, oam: { shape: "32x16", affine: false, priority: 2 },
  }));
}

function impactAtAge(age: number, input: DigLiveInputs): DigSprite | null {
  if (!inRange(age, 32, 43)) return null;
  const origin = input.targetAnimationOrigin ?? input.targetCenter;
  // AnimHitSplatBasic calls SetAnimSpriteInitialXOffset with x=-8.  The
  // helper flips that offset from the attacker/target horizontal ordering.
  const xOffset = input.attackerCenter.x > input.targetCenter.x
    ? 8 : input.attackerCenter.x < input.targetCenter.x
      ? -8 : input.attackerSide === "opponent" ? 8 : -8;
  return { kind: "impact", slot: input.impactSpriteSlot,
    template: "gBasicHitSplatSpriteTemplate", callback: age === 43 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
    x: origin.x + xOffset, y: origin.y, x2: 0, y2: 0,
    data: [0, 0, 0, 0, 0, 0, 15357, 2058],
    subpriority: input.attackerSubpriority - 2, matrixNum: input.impactMatrixNum,
    matrix: IMPACT_MATRIX, visible: true, frame: 0, oam: { shape: "32x32", affine: true, priority: 1 } };
}

function updateTask(age: number, input: DigLiveInputs, attackerY2: number): DigTask | null {
  if (!inRange(age, 8, 34)) return null;
  const data = Array<number>(16).fill(0);
  data[0] = input.attackerSpriteSlot; data[1] = input.attackerCenter.x; data[2] = input.monBg.snapshot.y;
  data[3] = input.monBg.baseScroll.x; data[4] = input.monBg.baseScroll.y;
  data[5] = input.monBg.layer === "bg2" ? 1 : 0; data[6] = input.monBg.layer === "bg1" ? 1 : 0;
  void attackerY2;
  return { slot: input.updateMonBgTaskSlot, callback: "Task_UpdateMonBg", data };
}

function clearTask(age: number, input: DigLiveInputs): DigTask | null {
  if (!inRange(age, 32, 34)) return null;
  const data = Array<number>(16).fill(0);
  data[0] = 0; data[1] = Math.min(2, age - 31); data[2] = input.attackerSide === "opponent" ? 1 : 0;
  return { slot: input.clearMonBgTaskSlot, callback: "Task_ClearMonBg", data };
}

function shakeTask(age: number, input: DigLiveInputs): DigTask | null {
  if (!inRange(age, 32, 43)) return null;
  const data = Array<number>(16).fill(0);
  const step = age - 32;
  data[0] = input.targetSpriteSlot;
  data[1] = 5 - Math.floor(Math.max(0, step - 2) / 2);
  data[2] = 1; data[3] = step === 0 || (step >= 4 && step % 2 === 0) ? 1 : 0;
  data[4] = 5; data[5] = 0;
  return { slot: input.shakeTaskSlot, callback: "AnimTask_ShakeMon_Step", data };
}

function scanlineFor(body: DigBody, age: number, input: DigLiveInputs): DigState["scanline"] {
  const setup = body === "setup";
  const state: 0 | 1 | 3 = setup
    ? (inRange(age, 10, 166) ? 1 : age === 167 ? 3 : 0)
    : (inRange(age, 14, 26) ? 1 : age === 27 ? 3 : 0);
  const startY = setup ? Math.max(0, input.attackerElevationY - 32) : 0;
  const endY = input.attackerElevationY + 32;
  const bgX = setup ? input.setupBgOffset.x : input.monBg.baseScroll.x;
  const values = Array.from({ length: DISPLAY_HEIGHT }, (_, y) => y < endY && y >= startY ? bgX : bgX + DISPLAY_WIDTH);
  const bufferSet = setup ? age >= 10 && age < 168 : age >= 14 && age < 28;
  const stable = bufferSet ? values : Array<number>(DISPLAY_HEIGHT).fill(0);
  let srcBuffer: 0 | 1;
  if (setup) {
    srcBuffer = age < 10 ? 1 : age <= 166 ? (age % 2 === 0 ? 1 : 0) : 0;
  } else {
    srcBuffer = age < 14 ? 0 : age <= 27 ? (age % 2) as 0 | 1 : 1;
  }
  const selectedDest = input.monBg.layer === "bg1" ? DIG_DMA_BG1 : DIG_DMA_BG2;
  return { state, srcBuffer, dmaDest: state === 0 ? 0x0400001c : selectedDest,
    dmaControl: DIG_DMA_CONTROL, startY, endY, bgX, buffers: [stable, stable] };
}

function sourceScroll(body: DigBody, age: number, input: DigLiveInputs, attackerY2: number): DigPoint {
  if (body === "setup") {
    if (age < 7) return { x: 0, y: 0 };
    if (age >= 192) return { x: 0, y: 0 };
    const height = age >= 11 ? bounceHeight(age, input) : 0;
    return { x: input.setupBgOffset.x, y: age >= 11 ? input.setupBgOffset.y - height : input.setupBgOffset.y };
  }
  if (age < 8 || age >= 35) return { x: 0, y: 0 };
  return { x: input.monBg.baseScroll.x + input.monBg.snapshot.x - (input.attackerCenter.x),
    y: input.monBg.baseScroll.y + input.monBg.snapshot.y - (input.attackerCenter.y + attackerY2) };
}

function hardwareScrollFor(body: DigBody, age: number, input: DigLiveInputs,
  softwareScroll: DigPoint): DigPoint {
  if (body === "setup") {
    if (age < 8) return { x: 0, y: 0 };
    if (age <= 10) return point(softwareScroll);
    if (age <= 166) return { x: 0, y: sourceScroll(body, age - 1, input, 0).y };
    if (age === 167) return { x: 0, y: softwareScroll.y };
    if (age <= 191) return point(softwareScroll);
    if (age === 192) return sourceScroll(body, 191, input, 0);
    return { x: 0, y: 0 };
  }
  if (age < 9) return { x: 0, y: 0 };
  if (age <= 14) return point(softwareScroll);
  if (age <= 26) {
    return { x: 0, y: sourceScroll(body, age - 1, input,
      attackerAtAge(age - 1, body, input).y2).y };
  }
  if (age === 27) {
    return { x: 0, y: sourceScroll(body, 26, input,
      attackerAtAge(26, body, input).y2).y };
  }
  if (age <= 34) return point(softwareScroll);
  if (age === 35) return sourceScroll(body, 34, input, 0);
  return { x: 0, y: 0 };
}

function attackerAtAge(age: number, body: DigBody, input: DigLiveInputs) {
  const initialVisible = input.attackerInitialVisible ?? true;
  const firstInactive = body === "setup" ? DIG_SETUP_FIRST_INACTIVE_AGE : DIG_UNLEASH_FIRST_INACTIVE_AGE;
  const matrixNum = age >= firstInactive
    ? input.attackerCleanupMatrixNum ?? input.attackerInitialMatrixNum ?? 0
    : input.attackerInitialMatrixNum ?? 0;
  const matrix = body === "unleash" && inRange(age, 32, 43)
    ? IMPACT_MATRIX : input.attackerInitialMatrix ?? ZERO_MATRIX;
  if (body === "setup") {
    const visible = age < 10 || (age >= 189 && age < DIG_SETUP_FIRST_INACTIVE_AGE);
    const x2 = age >= 166 && age < DIG_SETUP_FIRST_INACTIVE_AGE
      ? DISPLAY_WIDTH + 32 - input.attackerCenter.x : 0;
    return { slot: input.attackerSpriteSlot, x: input.attackerCenter.x, y: input.attackerCenter.y,
      x2, y2: 0, visible: age < 0 ? initialVisible : visible, matrixNum, matrix };
  }
  let y2 = 0, visible = false;
  if (age === 7 || age === 8 || age === 9 || age === 10 || age === 11 || age === 12 || age === 13 || age === 14) y2 = DISPLAY_HEIGHT - input.attackerCenter.y;
  if (age >= 15 && age <= 27) y2 = Math.max(0, 96 - (age - 15) * 8);
  visible = age === 7 || age >= 32;
  if (age >= 8 && age <= 31) visible = false;
  if (age >= 67) visible = true;
  return { slot: input.attackerSpriteSlot, x: input.attackerCenter.x, y: input.attackerCenter.y,
    x2: 0, y2, visible, matrixNum, matrix };
}

function targetAtAge(age: number, body: DigBody, input: DigLiveInputs) {
  const firstInactive = body === "setup" ? DIG_SETUP_FIRST_INACTIVE_AGE : DIG_UNLEASH_FIRST_INACTIVE_AGE;
  const matrixNum = age >= firstInactive
    ? input.targetCleanupMatrixNum ?? input.targetInitialMatrixNum ?? 0
    : input.targetInitialMatrixNum ?? 0;
  const matrix = body === "unleash" && inRange(age, 32, 43)
    ? IMPACT_MATRIX : input.targetInitialMatrix ?? ZERO_MATRIX;
  const x2 = body === "unleash" && inRange(age, 36, 37) || body === "unleash" && inRange(age, 40, 41) ? 5 : input.targetInitialOffset.x;
  return { slot: input.targetSpriteSlot, x: input.targetCenter.x, y: input.targetCenter.y, x2,
    y2: input.targetInitialOffset.y, visible: input.targetInitialVisible ?? true, matrixNum, matrix };
}

function makeScanlineBuffers(scanline: DigState["scanline"]): DigState["scanline"] {
  return scanline;
}

function spritesAtAge(age: number, input: DigLiveInputs): DigSprite[] {
  const sprites: DigSprite[] = [];
  if (input.body === "setup") {
    sprites.push(...moundAtAge(age, input.body, input));
    for (let group = 0; group < 5; group += 1) for (let member = 0; member < 4; member += 1) {
      const sprite = plumeAtAge(age, group, member, input);
      if (sprite) sprites.push(sprite);
    }
  } else {
    sprites.push(...moundAtAge(age, input.body, input));
    const impact = impactAtAge(age, input);
    if (impact) sprites.push(impact);
  }
  return sprites.sort((left, right) => left.slot - right.slot);
}

function spriteOrderKeys(sprites: readonly DigSprite[]) {
  return sprites.map((sprite) => ({
    slot: sprite.slot,
    priority: sprite.oam.priority,
    subpriority: sprite.subpriority,
    y: sprite.y + sprite.y2,
  }));
}

/** Replays the persistent `sSpriteOrder` tie state up to this source age. */
function ownedSpriteOrder(age: number, input: DigLiveInputs): number[] {
  let preceding: number[] = [];
  for (let tick = 0; tick <= age; tick += 1) {
    const current = spritesAtAge(tick, input);
    if (current.length === 0) {
      preceding = [];
      continue;
    }
    const currentSlots = new Set(current.map((sprite) => sprite.slot));
    const retained = preceding.filter((slot) => currentSlots.has(slot));
    const newlyAllocated = input.spriteOrder.filter((slot) =>
      currentSlots.has(slot) && !retained.includes(slot));
    preceding = sortGbaSpriteOrder([...retained, ...newlyAllocated], spriteOrderKeys(current));
  }
  return preceding;
}

/** Replays either retained Dig body through its first inactive row. */
export function digAtAge(age: number, input: DigLiveInputs): DigState {
  const source = sourceAtAge(age, input.body);
  const firstInactive = input.body === "setup" ? DIG_SETUP_FIRST_INACTIVE_AGE : DIG_UNLEASH_FIRST_INACTIVE_AGE;
  const active = age < firstInactive;
  const attacker = attackerAtAge(age, input.body, input);
  const target = targetAtAge(age, input.body, input);
  const sprites = spritesAtAge(age, input);
  const tasks: DigTask[] = [];
  if (input.body === "setup") {
    if (inRange(age, 10, 167)) tasks.push({ slot: input.digTaskSlot, callback: "AnimTask_DigBounceMovement", data: bounceData(age, input) });
    if (inRange(age, 189, 191)) {
      const data = Array<number>(16).fill(0); data[0] = 0; data[1] = Math.min(2, age - 188); data[2] = input.attackerSide === "opponent" ? 1 : 0;
      tasks.push({ slot: input.digTaskSlot, callback: "Task_ClearMonBgStatic", data });
    }
  } else {
    if (inRange(age, 14, 27)) {
      const data = Array<number>(16).fill(0);
      const rank = input.monBg.layer === "bg1" ? 1 : 2;
      data[0] = age === 14 ? 2 : age === 27 ? 4 : 3; data[10] = input.attackerSpriteSlot; data[11] = rank;
      data[12] = input.monBg.baseScroll.x; data[14] = input.attackerElevationY - 32; data[15] = input.attackerElevationY + 32;
      tasks.push({ slot: input.digTaskSlot, callback: "AnimTask_DigRiseUpFromHole", data });
    }
    const update = updateTask(age, input, attacker.y2); if (update) tasks.push(update);
    const clear = clearTask(age, input); if (clear) tasks.push(clear);
    const shake = shakeTask(age, input); if (shake) tasks.push(shake);
  }
  tasks.sort((a, b) => a.slot - b.slot);
  const scroll = sourceScroll(input.body, age, input, attacker.y2);
  const scanline = makeScanlineBuffers(scanlineFor(input.body, age, input));
  const setup = input.body === "setup";
  const moundLoaded = setup ? inRange(age, 4, 193) : inRange(age, 4, 66);
  const mudLoaded = setup && inRange(age, 1, 193);
  const impactLoaded = !setup && inRange(age, 1, 66);
  const impactLive = !setup && inRange(age, 32, 43);
  const matrixBitmap = active ? input.initialMatrixBitmap | (impactLive ? (1 << input.impactMatrixNum) : 0) : input.initialMatrixBitmap;
  const layer = input.monBg.layer;
  const selectedOffset = scroll;
  const vram = setup
    ? age < 8 || age >= 193 ? "battle" as const : age === 191 || age === 192 ? "clear-pending" as const : "mon-bg" as const
    : age < 9 || age >= 36 ? "battle" as const : age === 34 || age === 35 ? "clear-pending" as const : "mon-bg" as const;
  const vramEvent = setup
    ? age === 8 ? "load-mon-bg" as const : age === 191 ? "clear-mon-bg" as const : age === 193 ? "restore-battle" as const : "none" as const
    : age === 9 ? "load-mon-bg" as const : age === 34 ? "clear-mon-bg" as const : age === 36 ? "restore-battle" as const : "none" as const;
  const pan: -64 | 63 = input.attackerSide === "player" ? -64 : 63;
  const audio = setup && [18, 52, 86, 120, 154].includes(age)
    ? { events: [{ channel: "SE1" as const, sound: "SE_M_DIG" as const, sourcePan: "SOUND_PAN_ATTACKER" as const, pan }] }
    : !setup && age === 32
      ? { events: [{ channel: "SE1" as const, sound: "SE_M_MEGA_KICK2" as const, sourcePan: "SOUND_PAN_ATTACKER" as const, pan }] }
      : { events: [] };
  const ownedSlots = ownedSpriteOrder(age, input);
  const visualTasks = input.body === "setup"
    ? sprites.length + (inRange(age, 10, 167) ? 1 : 0)
    : sprites.length + (inRange(age, 14, 27) || inRange(age, 32, 43) ? 1 : 0);
  const hardwareScroll = hardwareScrollFor(input.body, age, input, selectedOffset);
  return {
    age, body: input.body, active, source, sprites, tasks,
    attacker, target, order: { callerBaseline: [...input.spriteOrder], ownedSlots },
    background: { layer, vram, vramEvent, scroll, monbg: setup ? inRange(age, 7, 191) : inRange(age, 8, 34) },
    registers: { layer, hardwareCnt: age >= (setup ? 8 : 9) && age <= firstInactive ? input.monBg.activeCnt : input.monBg.inactiveCnt,
      hardwareScroll, transfer: age === 0 ? "current" : "preceding-software" },
    scanline,
    resources: {
      mudSand: { ...input.mudSand, tag: mudLoaded ? DIG_MUD_SAND_TAG : null, loaded: mudLoaded },
      dirtMound: { ...input.dirtMound, tag: moundLoaded ? DIG_DIRT_MOUND_TAG : null, loaded: moundLoaded },
      impact: { ...input.impact, tag: impactLoaded ? DIG_IMPACT_TAG : null, loaded: impactLoaded },
      allocator: { matrixBitmap, releasedAtFirstInactive: !active },
    },
    audio,
    rng: { gameplay: "untouched", animation: "caller-scheduled", before: input.animationRngSeed, after: input.animationRngSeed, advances: 0 },
    cleanup: { firstInactive: age === firstInactive, visualTasks: active ? visualTasks : 0,
      soundTasks: 0, ownedSprites: active ? sprites.length : 0, ownedTasks: active ? tasks.length : 0, resourcesReleased: !active },
  };
}

/** Explicit aliases make the two source bodies convenient at typed call sites. */
export function digSetupAtAge(age: number, input: Omit<DigLiveInputs, "body">): DigState {
  return digAtAge(age, { ...input, body: "setup" });
}
export function digUnleashAtAge(age: number, input: Omit<DigLiveInputs, "body">): DigState {
  return digAtAge(age, { ...input, body: "unleash" });
}
