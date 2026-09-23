/**
 * Pure Scene-ON reducer for MOVE_OUTRAGE.
 *
 * The values in this file are the source command cursor and the state of the
 * source-owned sprite/task callbacks.  Geometry, allocator slots and the
 * palette banks are live inputs supplied by the scene.  No battle result,
 * gameplay RNG, framebuffer row, or absolute engine tick is part of the
 * reducer.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { sortGbaSpriteOrder } from "./gbaObjCompositor.ts";

export type OutrageSide = "player" | "opponent";
export interface OutragePoint { readonly x: number; readonly y: number; }
export type OutrageOam = readonly [number, number, number];
export type OutrageMatrix = readonly [number, number, number, number];

export interface OutrageBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: OutrageOam;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: OutrageMatrix;
  readonly flags: number;
}

export interface OutrageResourceAllocation {
  readonly tag: number;
  readonly tileSlot: number;
  readonly paletteAllocatorSlot: number;
  readonly hardwarePaletteBank: number;
  readonly tileRange: readonly [number, number];
  readonly palette?: readonly number[];
}

export interface OutrageLiveInputs {
  readonly attackerSide: OutrageSide;
  readonly targetSide: OutrageSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerPictureOrigin: Readonly<OutragePoint>;
  readonly targetPictureOrigin: Readonly<OutragePoint>;
  readonly attackerSprite: Readonly<OutrageBattlerSprite>;
  readonly targetSprite: Readonly<OutrageBattlerSprite>;
  readonly taskSlots: Readonly<{
    readonly loopSe: number;
    readonly blendColorCycle: number;
    readonly translateMonElliptical: number;
    readonly shakeMon2: number;
  }>;
  readonly spriteSlots: Readonly<{ readonly flames: readonly number[] }>;
  readonly resources: Readonly<{ readonly smallEmber: Readonly<OutrageResourceAllocation> }>;
  readonly allocator: Readonly<{
    readonly initialOccupiedSprites: readonly number[];
    readonly initialMatrixBitmap: number;
    readonly spriteOrder: readonly number[];
    readonly initialLiveSprites: readonly Readonly<{
      readonly slot: number;
      readonly attr: OutrageOam;
      readonly subpriority: number;
    }>[];
  }>;
  readonly oam: Readonly<{ readonly flame: OutrageOam }>;
  readonly palettes: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly animationRngSeed: number;
  readonly gameplayRng: unknown;
  readonly gameplayState?: unknown;
}

export const OUTRAGE_SOURCE_START = 0x082cb908;
export const OUTRAGE_SOURCE_END_EXCLUSIVE = 0x082cbaa3;
export const OUTRAGE_FIRST_INACTIVE_AGE = 119;
export const OUTRAGE_RESOURCE_TAGS = { smallEmber: 10029 } as const;

const IDENTITY: OutrageMatrix = [256, 0, 0, 256];
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const BLEND_COLOR = 430; // RGB(14, 13, 0), as passed to BeginNormalPaletteFade.
const FLAME_BIRTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 27, 29, 31, 33, 35, 37, 39, 44, 46, 48, 50, 52, 54, 56] as const;
const FLAME_VELOCITIES = [
  [5, 0], [-5, 0], [0, 5], [0, -5], [5, 3], [-5, 3], [5, -3], [-5, -3],
  [5, 0], [-5, 0], [0, 5], [0, -5], [5, 3], [-5, 3], [5, -3], [-5, -3],
  [5, 0], [-5, 0], [0, 5], [0, -5], [5, 3], [-5, 3], [5, -3],
] as const;
const FLAME_SLOTS = [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 3, 4, 5, 7, 9, 10, 11, 12] as const;

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0 || age > OUTRAGE_FIRST_INACTIVE_AGE) {
    throw new Error(`MOVE_OUTRAGE age must be an integer in [0, ${OUTRAGE_FIRST_INACTIVE_AGE}], got ${age}`);
  }
}
function words(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16);
}
function spriteWords(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: Math.max(0, 8 - values.length) }, () => 0)].slice(0, 8);
}
function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}
function bank(values: readonly number[], index: number): number[] {
  return values.slice(index * 16, index * 16 + 16);
}
function putBank(values: number[], index: number, replacement: readonly number[]): void {
  values.splice(index * 16, 16, ...replacement.slice(0, 16));
}
function blendColour(source: number, target: number, coefficient: number): number {
  const component = (left: number, right: number): number => ((left * (16 - coefficient)) + right * coefficient) >> 4;
  return component(source & 31, target & 31)
    | (component((source >> 5) & 31, (target >> 5) & 31) << 5)
    | (component((source >> 10) & 31, (target >> 10) & 31) << 10);
}
function blendBank(source: readonly number[], target: number, coefficient: number): number[] {
  return source.map((colour) => blendColour(colour, target, coefficient));
}
function signedOamY(value: number): number {
  const byte = value & 0xff;
  return byte >= 160 ? byte - 256 : byte;
}
function u32(value: number): number { return value >>> 0; }
function nextAnimationRng(value: number): number {
  return u32(Math.imul(value, 0x41c64e6d) + 0x6073);
}
function animationRngAtAge(seed: number, age: number): number {
  let value = u32(seed);
  for (let i = 0; i < age; i += 1) value = nextAnimationRng(value);
  return value;
}

export interface OutrageSourceCursor {
  readonly owner: "Move_OUTRAGE";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly pointerParity: 0 | 1;
  readonly wait: number;
  readonly active: boolean;
}

/**
 * Source command cursor for the complete retained body. The repeated blocks
 * are the two calls to `OutrageFlames`; the long tail is the source's
 * `waitforvisualfinish`, not a presentation hold invented by the renderer.
 */
export function outrageSourceAtAge(age: number): OutrageSourceCursor {
  assertAge(age);
  let pointerOffset: number;
  let pointerParity: 0 | 1;
  let wait: number;
  if (age === 0) [pointerOffset, pointerParity, wait] = [0, 0, 0];
  else if (age === 1) [pointerOffset, pointerParity, wait] = [3, 1, 1];
  else if (age <= 3) [pointerOffset, pointerParity, wait] = [3, 1, 0];
  else if (age === 4) [pointerOffset, pointerParity, wait] = [47, 1, -1];
  else if (age === 5) [pointerOffset, pointerParity, wait] = [47, 1, 0];
  else if (age === 6) [pointerOffset, pointerParity, wait] = [68, 0, -1];
  else if (age === 7) [pointerOffset, pointerParity, wait] = [68, 0, 0];
  else if (age === 8) [pointerOffset, pointerParity, wait] = [89, 1, -1];
  else if (age === 9) [pointerOffset, pointerParity, wait] = [89, 1, 0];
  else if (age === 10) [pointerOffset, pointerParity, wait] = [110, 0, -1];
  else if (age === 11) [pointerOffset, pointerParity, wait] = [110, 0, 0];
  else if (age === 12) [pointerOffset, pointerParity, wait] = [131, 1, -1];
  else if (age === 13) [pointerOffset, pointerParity, wait] = [131, 1, 0];
  else if (age === 14) [pointerOffset, pointerParity, wait] = [169, 1, -1];
  else if (age === 15) [pointerOffset, pointerParity, wait] = [169, 1, 0];
  else if (age === 16) [pointerOffset, pointerParity, wait] = [190, 0, -1];
  else if (age === 17) [pointerOffset, pointerParity, wait] = [190, 0, 0];
  else if (age === 18) [pointerOffset, pointerParity, wait] = [211, 1, -1];
  else if (age === 19) [pointerOffset, pointerParity, wait] = [211, 1, 0];
  else if (age === 20) [pointerOffset, pointerParity, wait] = [232, 0, -1];
  else if (age === 21) [pointerOffset, pointerParity, wait] = [232, 0, 0];
  else if (age === 22) [pointerOffset, pointerParity, wait] = [265, 1, 3];
  else if (age === 23) [pointerOffset, pointerParity, wait] = [265, 1, 2];
  else if (age === 24) [pointerOffset, pointerParity, wait] = [265, 1, 1];
  else if (age <= 26) [pointerOffset, pointerParity, wait] = [265, 1, 0];
  else if (age === 27) [pointerOffset, pointerParity, wait] = [286, 0, -1];
  else if (age === 28) [pointerOffset, pointerParity, wait] = [286, 0, 0];
  else if (age === 29) [pointerOffset, pointerParity, wait] = [307, 1, -1];
  else if (age === 30) [pointerOffset, pointerParity, wait] = [307, 1, 0];
  else if (age === 31) [pointerOffset, pointerParity, wait] = [328, 0, -1];
  else if (age === 32) [pointerOffset, pointerParity, wait] = [328, 0, 0];
  else if (age === 33) [pointerOffset, pointerParity, wait] = [349, 1, -1];
  else if (age === 34) [pointerOffset, pointerParity, wait] = [349, 1, 0];
  else if (age === 35) [pointerOffset, pointerParity, wait] = [370, 0, -1];
  else if (age === 36) [pointerOffset, pointerParity, wait] = [370, 0, 0];
  else if (age === 37) [pointerOffset, pointerParity, wait] = [391, 1, -1];
  else if (age === 38) [pointerOffset, pointerParity, wait] = [391, 1, 0];
  else if (age === 39) [pointerOffset, pointerParity, wait] = [265, 1, 3];
  else if (age === 40) [pointerOffset, pointerParity, wait] = [265, 1, 2];
  else if (age === 41) [pointerOffset, pointerParity, wait] = [265, 1, 1];
  else if (age <= 43) [pointerOffset, pointerParity, wait] = [265, 1, 0];
  else if (age === 44) [pointerOffset, pointerParity, wait] = [286, 0, -1];
  else if (age === 45) [pointerOffset, pointerParity, wait] = [286, 0, 0];
  else if (age === 46) [pointerOffset, pointerParity, wait] = [307, 1, -1];
  else if (age === 47) [pointerOffset, pointerParity, wait] = [307, 1, 0];
  else if (age === 48) [pointerOffset, pointerParity, wait] = [328, 0, -1];
  else if (age === 49) [pointerOffset, pointerParity, wait] = [328, 0, 0];
  else if (age === 50) [pointerOffset, pointerParity, wait] = [349, 1, -1];
  else if (age === 51) [pointerOffset, pointerParity, wait] = [349, 1, 0];
  else if (age === 52) [pointerOffset, pointerParity, wait] = [370, 0, -1];
  else if (age === 53) [pointerOffset, pointerParity, wait] = [370, 0, 0];
  else if (age === 54) [pointerOffset, pointerParity, wait] = [391, 1, -1];
  else if (age === 55) [pointerOffset, pointerParity, wait] = [391, 1, 0];
  else if (age <= 93) [pointerOffset, pointerParity, wait] = [261, 1, 1];
  else [pointerOffset, pointerParity, wait] = [262, 0, 1];
  return { owner: "Move_OUTRAGE", pointer: OUTRAGE_SOURCE_START + pointerOffset, pointerOffset, pointerParity, wait, active: age < OUTRAGE_FIRST_INACTIVE_AGE };
}

function sourceFlameArgs(age: number, side: OutrageSide): readonly [number, number, number, number, number, number, number, number] {
  if (age < 6) return ZERO_ARGS;
  const index = FLAME_BIRTHS.reduce((selected, birth, i) => age >= birth ? i : selected, 0);
  const [x, y] = FLAME_VELOCITIES[index]!;
  const direction = side === "player" ? 1 : -1;
  return [0, 0, 30, x * direction * 256, y * direction * 256, 3, 0, 0];
}

function argsAtAge(age: number, side: OutrageSide): readonly [number, number, number, number, number, number, number, number] {
  if (age < 4) return ZERO_ARGS;
  if (age === 4 || age === 5) return [0, side === "player" ? 12 : -12, 6, 5, 4, BLEND_COLOR, 0, 0];
  return sourceFlameArgs(age, side);
}

export interface OutrageTask {
  readonly slot: number;
  readonly callback: "Task_LoopAndPlaySE" | "AnimTask_BlendColorCycleLoop" | "AnimTask_TranslateMonElliptical_Step" | "AnimTask_ShakeMon2_Step";
  readonly role: "sound" | "blend-color-cycle" | "translate-mon-elliptical" | "shake-mon2";
  readonly data: readonly number[];
}

interface OutrageSpriteBase {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: OutrageOam;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: OutrageMatrix;
  readonly flags: number;
  readonly data: readonly number[];
  readonly animNum: number;
  readonly animCmdIndex: number;
  readonly animDelayCounter: number;
  readonly sourceCreationOrder: number;
}
export interface OutrageFlameSprite extends OutrageSpriteBase {
  readonly kind: "flame";
  readonly template: "gOutrageFlameSpriteTemplate";
  readonly callback: "TranslateSpriteLinearAndFlicker" | "DestroySpriteAndMatrix";
  readonly birthAge: number;
  readonly velocity: readonly [number, number];
}
export type OutrageSprite = OutrageFlameSprite;

function flameInvisible(localAge: number): boolean {
  if (localAge < 2) return true;
  let invisible = true;
  for (let callbackAge = 2; callbackAge <= Math.min(localAge, 29); callbackAge += 1) {
    if ((29 - callbackAge) % 3 === 0) invisible = !invisible;
  }
  return invisible;
}
function flameFrame(localAge: number): { readonly index: number; readonly delay: number } {
  return { index: Math.floor((localAge + 1) / 4) % 5, delay: ((2 - localAge) % 4 + 4) % 4 };
}
function flameAt(age: number, index: number, input: Readonly<OutrageLiveInputs>): OutrageFlameSprite | null {
  const birthAge = FLAME_BIRTHS[index]!;
  const localAge = age - birthAge;
  if (localAge < 0 || localAge > 30 || age >= OUTRAGE_FIRST_INACTIVE_AGE) return null;
  const [sourceX, sourceY] = FLAME_VELOCITIES[index]!;
  const direction = input.attackerSide === "player" ? 1 : -1;
  const velocity: readonly [number, number] = [sourceX * direction, sourceY * direction];
  const x = input.attackerPictureOrigin.x;
  const y = input.attackerPictureOrigin.y;
  const x2 = velocity[0] * localAge;
  const y2 = velocity[1] * localAge;
  const animation = flameFrame(localAge);
  const attr: OutrageOam = localAge < 2
    ? input.oam.flame
    : [
      (input.oam.flame[0] & ~0xff) | ((y - 16 + y2) & 0xff),
      (input.oam.flame[1] & ~0x1ff) | ((x - 16 + x2) & 0x1ff),
      (input.oam.flame[2] & ~0x3ff) | ((input.oam.flame[2] + animation.index * 16) & 0x3ff),
    ];
  const invisible = flameInvisible(localAge);
  return {
    kind: "flame", slot: input.spriteSlots.flames[index]!, template: "gOutrageFlameSpriteTemplate",
    callback: localAge === 30 ? "DestroySpriteAndMatrix" : "TranslateSpriteLinearAndFlicker",
    birthAge, velocity, x, y, x2, y2, attr,
    subpriority: input.targetSprite.subpriority - 2,
    oamPriority: ((input.oam.flame[2] >>> 10) & 3) as 0 | 1 | 2 | 3,
    matrixNum: 0, matrix: IDENTITY, flags: invisible ? 5 : 1,
    data: spriteWords(Math.max(0, 29 - localAge), velocity[0] * 256, velocity[0] * (localAge + 1) * 256, velocity[1] * 256, velocity[1] * (localAge + 1) * 256, 3, 26445, 2058),
    animNum: 0, animCmdIndex: animation.index, animDelayCounter: animation.delay,
    sourceCreationOrder: index,
  };
}
function spritesAt(age: number, input: Readonly<OutrageLiveInputs>): readonly OutrageSprite[] {
  if (age >= OUTRAGE_FIRST_INACTIVE_AGE) return [];
  return FLAME_BIRTHS.map((_, index) => flameAt(age, index, input)).filter((sprite): sprite is OutrageFlameSprite => sprite !== null).sort((left, right) => left.slot - right.slot);
}

function tasksAt(age: number, input: Readonly<OutrageLiveInputs>): readonly OutrageTask[] {
  if (age >= OUTRAGE_FIRST_INACTIVE_AGE) return [];
  const tasks: OutrageTask[] = [];
  if (age >= 4 && age <= 20) {
    const local = age - 4;
    tasks.push({ slot: input.taskSlots.loopSe, callback: "Task_LoopAndPlaySE", role: "sound", data: words(171, input.attackerSide === "player" ? -64 : 63, 8, age < 12 ? 2 : 1, 0, 0, 0, 0, age < 12 ? local + 1 : local - 8) });
  }
  if (age >= 4 && age <= 92) {
    const numBlends = age < 25 ? 4 : age < 43 ? 3 : age < 61 ? 2 : age < 79 ? 1 : 0;
    tasks.push({ slot: input.taskSlots.blendColorCycle, callback: "AnimTask_BlendColorCycleLoop", role: "blend-color-cycle", data: words(7, 2, numBlends, 3, 8, BLEND_COLOR, 0, 0, 1) });
  }
  if (age >= 4 && age <= 81) {
    const angle = ((age - 2) * 16) & 0xff;
    tasks.push({ slot: input.taskSlots.translateMonElliptical, callback: "AnimTask_TranslateMonElliptical_Step", role: "translate-mon-elliptical", data: words(input.attackerSprite.slot, input.attackerSide === "player" ? 12 : -12, 6, 5 - Math.floor((age - 2) / 16), 16, angle) });
  }
  if (age >= 14 && age <= 91) {
    const local = age - 14;
    tasks.push({ slot: input.taskSlots.shakeMon2, callback: "AnimTask_ShakeMon2_Step", role: "shake-mon2", data: words(input.targetSprite.slot, 39 - Math.floor(local / 2), 1, local % 2 === 0 ? 1 : 0, 2, 0) });
  }
  return tasks.sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));
}

function blendCoefficientAtAge(age: number): number {
  if (age < 7) return 0;
  if (age < 11) return 2;
  if (age < 15) return 4;
  if (age < 19) return 6;
  if (age < 29) return 8;
  if (age < 33) return 6;
  if (age < 37) return 4;
  if (age < 47) return 3;
  if (age < 51) return 5;
  if (age < 55) return 7;
  if (age < 65) return 8;
  if (age < 69) return 6;
  if (age < 73) return 4;
  if (age < 83) return 3;
  if (age < 87) return 1;
  return 0;
}
function paletteAtAge(age: number, input: Readonly<OutrageLiveInputs>): Omit<OutragePaletteState, "hardware"> {
  const unfaded = input.palettes.unfaded.slice();
  const faded = input.palettes.faded.slice();
  const resource = input.resources.smallEmber;
  if (age >= 1 && age < OUTRAGE_FIRST_INACTIVE_AGE && resource.palette) {
    putBank(unfaded, resource.hardwarePaletteBank, resource.palette);
    putBank(faded, resource.hardwarePaletteBank, resource.palette);
  }
  if (age < OUTRAGE_FIRST_INACTIVE_AGE) {
    const bgY = blendCoefficientAtAge(age);
    const objY = blendCoefficientAtAge(age - 1);
    for (const paletteBank of [1, 2, 3]) putBank(faded, paletteBank, blendBank(bank(input.palettes.unfaded, paletteBank), BLEND_COLOR, bgY));
    for (const paletteBank of [16, 17]) putBank(faded, paletteBank, blendBank(bank(input.palettes.unfaded, paletteBank), BLEND_COLOR, objY));
  }
  return { unfaded, faded, blendY: blendCoefficientAtAge(age), objectBlendY: blendCoefficientAtAge(age - 1), banks: [1, 2, 3, 16, 17, resource.hardwarePaletteBank] };
}

export interface OutragePaletteState {
  readonly unfaded: readonly number[];
  readonly faded: readonly number[];
  readonly hardware: readonly number[];
  readonly blendY: number;
  readonly objectBlendY: number;
  readonly banks: readonly number[];
}
function paletteStateAtAge(age: number, input: Readonly<OutrageLiveInputs>): OutragePaletteState {
  const current = paletteAtAge(age, input);
  return { ...current, hardware: age === 0 ? input.palettes.hardware.slice() : paletteAtAge(age - 1, input).faded.slice() };
}

function targetShakeAtAge(age: number, input: Readonly<OutrageLiveInputs>): OutragePoint {
  if (age < 14) return { x: input.targetSprite.x2, y: input.targetSprite.y2 };
  if (age >= 92) return { x: 0, y: 0 };
  const local = age - 14 + 1;
  return { x: local % 4 < 2 ? -2 : 2, y: 0 };
}
function attackerEllipseAtAge(age: number, input: Readonly<OutrageLiveInputs>): OutragePoint {
  if (age < 4 || age > 81) return { x: 0, y: 0 };
  const angle = (age - 3) * 16;
  const width = input.attackerSide === "player" ? 12 : -12;
  return { x: gbaSin(angle, width), y: -gbaSin(angle + 64, 6) + 6 };
}
function battlerAttr(base: Readonly<OutrageBattlerSprite>, current: Readonly<OutragePoint>, previous: Readonly<OutragePoint>): OutrageOam {
  const x2 = previous.x - base.x2;
  const y2 = previous.y - base.y2;
  return [
    (base.attr[0] & ~0xff) | ((base.attr[0] + y2) & 0xff),
    (base.attr[1] & ~0x1ff) | ((base.attr[1] + x2) & 0x1ff),
    base.attr[2],
  ];
}
function battlersAtAge(age: number, input: Readonly<OutrageLiveInputs>) {
  const attackerOffset = attackerEllipseAtAge(age, input);
  const targetOffset = targetShakeAtAge(age, input);
  const previousAttacker = attackerEllipseAtAge(age - 1, input);
  const previousTarget = targetShakeAtAge(age - 1, input);
  return {
    attacker: { ...input.attackerSprite, x2: attackerOffset.x, y2: attackerOffset.y, attr: age === 0 ? input.attackerSprite.attr : battlerAttr(input.attackerSprite, attackerOffset, previousAttacker) },
    target: { ...input.targetSprite, x2: targetOffset.x, y2: targetOffset.y, attr: age === 0 ? input.targetSprite.attr : battlerAttr(input.targetSprite, targetOffset, previousTarget) },
    attackerOffset, targetOffset,
  };
}

const painterCache = new WeakMap<object, number[][]>();
function painterOrderAtAge(age: number, input: Readonly<OutrageLiveInputs>): readonly number[] {
  let cached = painterCache.get(input);
  if (!cached) { cached = []; painterCache.set(input, cached); }
  let order = cached.at(-1)?.slice() ?? input.allocator.spriteOrder.slice();
  const external = input.allocator.initialLiveSprites.filter((entry) => entry.slot !== input.attackerSprite.slot && entry.slot !== input.targetSprite.slot);
  for (let tick = cached.length; tick <= age; tick += 1) {
    const battlers = battlersAtAge(tick, input);
    const sprites = spritesAt(tick, input);
    const keys = new Map<number, { readonly slot: number; readonly priority: 0 | 1 | 2 | 3; readonly subpriority: number; readonly y: number }>();
    for (const entry of external) keys.set(entry.slot, { slot: entry.slot, priority: ((entry.attr[2] >>> 10) & 3) as 0 | 1 | 2 | 3, subpriority: entry.subpriority, y: signedOamY(entry.attr[0]) });
    for (const battler of [battlers.attacker, battlers.target]) keys.set(battler.slot, { slot: battler.slot, priority: battler.oamPriority as 0 | 1 | 2 | 3, subpriority: battler.subpriority, y: signedOamY(battler.attr[0]) });
    for (const sprite of sprites) keys.set(sprite.slot, { slot: sprite.slot, priority: sprite.oamPriority as 0 | 1 | 2 | 3, subpriority: sprite.subpriority, y: signedOamY(sprite.attr[0]) });
    const complete = order.map((slot) => keys.get(slot) ?? { slot, priority: 3 as const, subpriority: 255, y: -96 });
    order = sortGbaSpriteOrder(order, complete);
    cached.push(order);
  }
  return cached[age]!;
}

export interface OutrageState {
  readonly age: number;
  readonly active: boolean;
  readonly source: OutrageSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ side: OutrageSide; species: string; sprite: ReturnType<typeof battlersAtAge>["attacker"]; offset: OutragePoint }>;
    readonly target: Readonly<{ side: OutrageSide; species: string; sprite: ReturnType<typeof battlersAtAge>["target"]; offset: OutragePoint }>;
  }>;
  readonly sprites: readonly OutrageSprite[];
  readonly tasks: readonly OutrageTask[];
  readonly resources: Readonly<{ readonly tags: Readonly<{ readonly smallEmber: Readonly<OutrageResourceAllocation & { readonly loaded: boolean }> }>; readonly matrixBitmap: number }>;
  readonly palette: OutragePaletteState;
  readonly registers: Readonly<Record<string, number>>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{ readonly sound: "se_m_dragon_rage"; readonly pan: -64 | 63 }> [];
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayState: unknown; readonly gameplayUnchanged: true }>;
  readonly latches: Readonly<{ readonly oamAndMatrices: "initial" | "preceding-software"; readonly palette: "initial" | "preceding-faded"; readonly registers: "initial" | "preceding-software" }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: number; readonly ownedSprites: number; readonly ownedTasks: number; readonly resourcesReleased: boolean }>;
}

/** Reduce one source-relative MOVE_OUTRAGE age. */
export function outrageAtAge(age: number, input: Readonly<OutrageLiveInputs>): OutrageState {
  assertAge(age);
  if (input.spriteSlots.flames.length !== FLAME_BIRTHS.length) throw new Error("MOVE_OUTRAGE requires 23 live flame allocation slots");
  const source = outrageSourceAtAge(age);
  const battlers = battlersAtAge(age, input);
  const sprites = spritesAt(age, input);
  const tasks = tasksAt(age, input);
  const palette = paletteStateAtAge(age, input);
  const visualTasks = sprites.length + tasks.filter((task) => task.role !== "sound").length;
  return {
    age, active: source.active, source, animArgs: argsAtAge(age, input.attackerSide),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: battlers.attacker, offset: battlers.attackerOffset },
      target: { side: input.targetSide, species: input.targetSpecies, sprite: battlers.target, offset: battlers.targetOffset },
    },
    sprites, tasks,
    resources: { tags: { smallEmber: { ...input.resources.smallEmber, loaded: age >= 1 && age < OUTRAGE_FIRST_INACTIVE_AGE } }, matrixBitmap: input.allocator.initialMatrixBitmap },
    palette, registers: { ...input.registers }, painterOrder: painterOrderAtAge(age, input),
    audio: age === 4 ? [{ sound: "se_m_dragon_rage", pan: input.attackerSide === "player" ? -64 : 63 }] : [],
    rng: { animation: animationRngAtAge(input.animationRngSeed, age), sourceDraws: age, gameplay: input.gameplayRng, gameplayState: input.gameplayState, gameplayUnchanged: true },
    latches: { oamAndMatrices: age === 0 ? "initial" : "preceding-software", palette: age === 0 ? "initial" : "preceding-faded", registers: age === 0 ? "initial" : "preceding-software" },
    cleanup: { firstInactive: age === OUTRAGE_FIRST_INACTIVE_AGE, visualTasks, soundTasks: tasks.filter((task) => task.role === "sound").length, ownedSprites: sprites.length, ownedTasks: tasks.length, resourcesReleased: age === OUTRAGE_FIRST_INACTIVE_AGE },
  };
}
