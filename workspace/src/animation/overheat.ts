/**
 * Pure, source-relative Scene-ON reducer for MOVE_OVERHEAT.
 *
 * This is deliberately only the animation body from `Move_OVERHEAT`: its
 * script cursor, OBJ/task allocation, palette/monbg ownership, sound events
 * and animation RNG.  Damage, battle RNG, turn ownership and the framebuffer
 * are opaque caller concerns.  In particular, this module contains neither
 * recordings nor a battle-tick/species branch.
 */

import { sortGbaSpriteOrder } from "./gbaObjCompositor.ts";

export type OverheatSide = "player" | "opponent";
export interface OverheatPoint { readonly x: number; readonly y: number; }
export type OverheatOam = readonly [number, number, number];
export type OverheatMatrix = readonly [number, number, number, number];

export interface OverheatBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: OverheatOam;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: OverheatMatrix;
  readonly flags: number;
}

export interface OverheatResourceAllocation {
  readonly tag: number;
  readonly tileSlot: number;
  readonly paletteAllocatorSlot: number;
  readonly hardwarePaletteBank: number;
  readonly tileRange: readonly [number, number];
  /** The source asset's live 16-colour OBJ bank, if supplied by the scene. */
  readonly palette?: readonly number[];
}

/**
 * All mutable scene facts are explicit live inputs.  The reducer only
 * transforms these source-shaped inputs; it does not manufacture a battle.
 */
export interface OverheatLiveInputs {
  readonly attackerSide: OverheatSide;
  readonly targetSide: OverheatSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** `GetBattlerSpriteCoord(... X_2/Y_PIC_OFFSET)` at this move's root. */
  readonly attackerPictureOrigin: Readonly<OverheatPoint>;
  readonly targetPictureOrigin: Readonly<OverheatPoint>;
  readonly attackerSprite: Readonly<OverheatBattlerSprite>;
  readonly targetSprite: Readonly<OverheatBattlerSprite>;
  readonly taskSlots: Readonly<{
    readonly monbg: number;
    readonly firstAttackerShake: number;
    readonly targetShake: number;
    readonly lastAttackerShake: number;
    readonly clearMonbg: number;
  }>;
  readonly spriteSlots: Readonly<{
    /** Eight entries per source wave, in `create_overheat_flame_sprite` order. */
    readonly flames: readonly number[];
    readonly hitsplats: readonly number[];
    readonly paletteBlends: readonly number[];
  }>;
  readonly matrixSlots: Readonly<{ readonly hitsplats: readonly number[] }>;
  readonly resources: Readonly<{
    readonly smallEmber: Readonly<OverheatResourceAllocation>;
    readonly impact: Readonly<OverheatResourceAllocation>;
  }>;
  readonly allocator: Readonly<{
    readonly initialOccupiedSprites: readonly number[];
    readonly initialMatrixBitmap: number;
    readonly spriteOrder: readonly number[];
    readonly initialLiveSprites: readonly Readonly<{
      readonly slot: number;
      readonly attr: OverheatOam;
      readonly subpriority: number;
    }>[];
  }>;
  readonly oam: Readonly<{
    readonly flame: OverheatOam;
    readonly hitsplat: OverheatOam;
    readonly paletteBlend: OverheatOam;
  }>;
  readonly palettes: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  readonly background: Readonly<{
    readonly values: Readonly<Record<string, number>>;
    readonly xKey: string;
    readonly yKey: string;
    readonly controlRegister: string;
    readonly horizontalRegister: string;
    readonly verticalRegister: string;
    readonly setupX: number;
    readonly setupY: number;
    readonly setupControl: number;
    readonly clearX: number;
    readonly clearY: number;
    readonly clearControl: number;
    readonly clearHorizontal: number;
    readonly clearVertical: number;
    /** BG bank populated from the hidden target OBJ bank by `monbg`. */
    readonly monbgPaletteBank: number;
  }>;
  readonly registers: Readonly<Record<string, number>>;
  /** Animation-only gRng2 root.  Gameplay RNG is never advanced here. */
  readonly animationRngSeed: number;
  readonly gameplayRng: unknown;
  readonly gameplayState?: unknown;
}

export const OVERHEAT_SOURCE_START = 0x082d6694;
export const OVERHEAT_SOURCE_END_EXCLUSIVE = 0x082d6986;
export const OVERHEAT_FIRST_INACTIVE_AGE = 229;
export const OVERHEAT_RESOURCE_TAGS = { smallEmber: 10029, impact: 10135 } as const;

const IDENTITY: OverheatMatrix = [256, 0, 0, 256];
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const FLAME_ANGLES = [
  [30, 0], [21, 12], [0, 18], [-22, 12],
  [-30, 0], [-22, -13], [0, -18], [21, -13],
] as const;
const FLAME_WAVES = [
  { age: 64, y: -20 }, { age: 72, y: 0 }, { age: 80, y: 10 },
] as const;
const HIT_SPLATS = [
  { age: 107, x: -5, y: 3 }, { age: 115, x: 8, y: -5 },
  { age: 125, x: 10, y: 10 }, { age: 135, x: 0, y: 0 },
] as const;
const PALETTE_PROGRAMS = [
  { age: 10, last: 24, selector: "background", colour: 28, initial: 0, target: 5 },
  { age: 35, last: 61, selector: "attacker", colour: 28, initial: 0, target: 13 },
  { age: 138, last: 153, selector: "attacker", colour: 19026, initial: 0, target: 13 },
  { age: 170, last: 184, selector: "background", colour: 28, initial: 5, target: 0 },
  { age: 208, last: 227, selector: "attacker", colour: 19026, initial: 13, target: 0 },
] as const;

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0 || age > OVERHEAT_FIRST_INACTIVE_AGE) {
    throw new Error(`MOVE_OVERHEAT age must be an integer in [0, ${OVERHEAT_FIRST_INACTIVE_AGE}], got ${age}`);
  }
}
function words(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16);
}
function spriteWords(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: Math.max(0, 8 - values.length) }, () => 0)].slice(0, 8);
}
function bank(values: readonly number[], index: number): number[] { return values.slice(index * 16, index * 16 + 16); }
function putBank(values: number[], index: number, replacement: readonly number[]): void { values.splice(index * 16, 16, ...replacement.slice(0, 16)); }
function blendColour(source: number, target: number, coefficient: number): number {
  const component = (left: number, right: number): number => ((left * (16 - coefficient)) + right * coefficient) >> 4;
  return component(source & 31, target & 31)
    | (component((source >> 5) & 31, (target >> 5) & 31) << 5)
    | (component((source >> 10) & 31, (target >> 10) & 31) << 10);
}
function blendBank(source: readonly number[], target: number, coefficient: number): number[] {
  return source.map((colour) => blendColour(colour, target, coefficient));
}
function signedOamY(value: number): number { const byte = value & 0xff; return byte >= 160 ? byte - 256 : byte; }
function u32(value: number): number { return value >>> 0; }
function nextAnimationRng(value: number): number { return u32(Math.imul(value, 0x41c64e6d) + 0x6073); }

/** `gRng2` is not touched on the three script-created flame latch rows or ClearMonBg's two rows. */
export function overheatAnimationRngDrawsAtAge(age: number): number {
  const skipped = [65, 73, 81, 188, 189].filter((skippedAge) => skippedAge <= age).length;
  return Math.max(0, age - skipped);
}
function animationRngAtAge(seed: number, age: number): number {
  let value = u32(seed);
  for (let index = 0; index < overheatAnimationRngDrawsAtAge(age); index += 1) value = nextAnimationRng(value);
  return value;
}
function attackerPaletteBank(input: Readonly<OverheatLiveInputs>): number {
  return 16 + ((input.attackerSprite.attr[2] >>> 12) & 0xf);
}
function targetPaletteBank(input: Readonly<OverheatLiveInputs>): number {
  return 16 + ((input.targetSprite.attr[2] >>> 12) & 0xf);
}

export interface OverheatSourceCursor {
  readonly owner: "Move_OVERHEAT";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly wait: number;
  readonly active: boolean;
}

/** Exact retained script scheduler, including the two ClearMonBg-held delay rows. */
export function overheatSourceAtAge(age: number): OverheatSourceCursor {
  assertAge(age);
  let pointerOffset = 0;
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { pointerOffset = 6; wait = age === 4 ? 1 : 0; }
  else if (age < 10) { pointerOffset = 8; wait = age === 7 ? 1 : 0; }
  else if (age < 26) { pointerOffset = 28; wait = 1; }
  else if (age < 29) { pointerOffset = 50; wait = age === 26 ? 1 : 0; }
  else if (age < 32) { pointerOffset = 61; wait = age === 29 ? 1 : 0; }
  else if (age < 35) { pointerOffset = 78; wait = age === 32 ? 1 : 0; }
  else if (age < 64) { pointerOffset = 112; wait = 1; }
  else if (age < 72) { pointerOffset = 255; wait = age < 66 ? 5 : Math.max(0, 70 - age); }
  else if (age < 80) { pointerOffset = 393; wait = age < 74 ? 5 : Math.max(0, 78 - age); }
  else if (age < 88) { pointerOffset = 531; wait = age < 82 ? 5 : Math.max(0, 86 - age); }
  else if (age < 107) { pointerOffset = 531; wait = 1; }
  else if (age < 115) { pointerOffset = 570; wait = Math.max(0, 113 - age); }
  else if (age < 125) { pointerOffset = 591; wait = Math.max(0, 123 - age); }
  else if (age < 135) { pointerOffset = 612; wait = Math.max(0, 133 - age); }
  else if (age < 138) { pointerOffset = 642; wait = age === 135 ? 1 : 0; }
  else if (age < 167) { pointerOffset = 676; wait = 1; }
  else if (age < 170) { pointerOffset = 690; wait = age === 167 ? 1 : 0; }
  else if (age < 186) { pointerOffset = 707; wait = 1; }
  else if (age < 205) {
    pointerOffset = 714;
    wait = age === 186 ? 15 : age < 190 ? 14 : Math.max(0, 203 - age);
  } else if (age < 208) { pointerOffset = 727; wait = age === 205 ? 1 : 0; }
  else if (age < 229) { pointerOffset = 744; wait = 1; }
  else { pointerOffset = 753; wait = 0; }
  return { owner: "Move_OVERHEAT", pointer: OVERHEAT_SOURCE_START + pointerOffset, pointerOffset, wait, active: age < OVERHEAT_FIRST_INACTIVE_AGE };
}

function argsAtAge(age: number): readonly [number, number, number, number, number, number, number, number] {
  if (age < 10) return ZERO_ARGS;
  if (age < 26) return [1, 1, 0, 5, 28, 0, 0, 0];
  if (age < 32) return [0, 1, 0, 5, 28, 0, 0, 0];
  if (age < 35) return [1, 0, 0, 5, 28, 0, 0, 0];
  if (age < 64) return [0, 2, 0, 15, 1, 0, 0, 0];
  if (age < 72) return [1, 224, 30, 25, -20, 0, 0, 0];
  if (age < 80) return [1, 224, 30, 25, 0, 0, 0, 0];
  if (age < 107) return [1, 224, 30, 25, 10, 0, 0, 0];
  if (age < 115) return [1, 10, 0, 25, 1, 0, 0, 0];
  if (age < 125) return [8, -5, 1, 0, 1, 0, 0, 0];
  if (age < 135) return [10, 10, 1, 0, 1, 0, 0, 0];
  if (age < 138) return [1, 0, 1, 0, 1, 0, 0, 0];
  if (age < 167) return [0, 3, 0, 15, 1, 0, 0, 0];
  if (age < 170) return [0, 1, 0, 15, 1, 0, 0, 0];
  if (age < 205) return [1, 1, 5, 0, 28, 0, 0, 0];
  if (age < 208) return [1, 0, 5, 0, 28, 0, 0, 0];
  return [2, 0, 13, 0, 19026, 0, 0, 0];
}

export interface OverheatTask {
  readonly slot: number;
  readonly callback: "Task_UpdateMonBg" | "Task_ClearMonBg" | "AnimTask_ShakeMon_Step";
  readonly role: "monbg" | "clear-monbg" | "attacker-shake" | "target-shake";
  readonly data: readonly number[];
}

interface OverheatSpriteBase {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly attr: OverheatOam;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: OverheatMatrix;
  readonly flags: number;
  readonly data: readonly number[];
  readonly animNum: number;
  readonly animCmdIndex: number;
  readonly animDelayCounter: number;
  readonly sourceCreationOrder: number;
}
export interface OverheatFlameSprite extends OverheatSpriteBase {
  readonly kind: "flame";
  readonly template: "gOverheatFlameSpriteTemplate";
  readonly callback: "AnimOverheatFlame_Step";
  readonly birthAge: number;
  readonly wave: 0 | 1 | 2;
  readonly angle: number;
}
export interface OverheatHitSplatSprite extends OverheatSpriteBase {
  readonly kind: "hitsplat";
  readonly template: "gBasicHitSplatSpriteTemplate";
  readonly callback: "RunStoredCallbackWhenAffineAnimEnds" | "DestroyAnimSprite";
  readonly birthAge: number;
}
export interface OverheatPaletteSprite extends OverheatSpriteBase {
  readonly kind: "palette-blend";
  readonly template: "gSimplePaletteBlendSpriteTemplate";
  readonly callback: "AnimSimplePaletteBlend_Step";
  readonly birthAge: number;
  readonly program: "opening-background" | "opening-attacker" | "gray-attacker" | "restore-background" | "restore-attacker";
}
export type OverheatSprite = OverheatFlameSprite | OverheatHitSplatSprite | OverheatPaletteSprite;

function flameCounter(age: number, wave: number, index: number, side: OverheatSide): number | null {
  const birth = FLAME_WAVES[wave]!;
  if (age < birth.age) return null;
  // These are not hand-tuned visual holds.  The source command interpreter
  // creates its next eight sprites between sprite callback passes at ages 72
  // and 80.  The trailing already-live callback therefore lands one source
  // row later; the retained `data[0]` timeline below is the direct scheduler
  // consequence for the three source waves.
  let counter: number;
  if (wave === 0) {
    if (age <= 65) counter = 1;
    else if (age <= 72) counter = age - 64 - (age === 72 && side === "player" && index === 7 ? 1 : 0);
    else if (age <= 81) counter = age === 81 ? 15 : age - 65;
    else counter = age - 66;
  } else if (wave === 1) {
    if (age === 72) counter = side === "opponent" && index < 4 ? 1 : 0;
    else if (age <= 79) counter = age - 72;
    else if (age === 80) counter = side === "opponent" ? (index < 2 ? 8 : 7) : (index === 0 ? 8 : 7);
    else if (age === 81) counter = 8;
    else counter = age - 73;
  } else {
    counter = age - 80;
  }
  return counter <= 25 ? counter : null;
}
function flameAt(age: number, wave: 0 | 1 | 2, index: number, input: Readonly<OverheatLiveInputs>): OverheatFlameSprite | null {
  const counter = flameCounter(age, wave, index, input.attackerSide);
  if (counter === null) return null;
  const [dx, dy] = FLAME_ANGLES[index]!;
  const birth = FLAME_WAVES[wave]!;
  const slot = input.spriteSlots.flames[wave * 8 + index];
  if (slot === undefined) throw new Error("MOVE_OVERHEAT requires 24 live flame allocation slots");
  const x = input.attackerPictureOrigin.x + dx;
  const y = input.attackerPictureOrigin.y + birth.y + dy;
  // The source writes data[4]/[5] before its final `data[0]` callback count
  // at the wave-three creation hand-off for slot 14.  Keep that observable
  // split rather than pretending the sprite state is a single scalar age.
  const splitWaveHandoff = age === 80 && input.attackerSide === "player" && wave === 1 && index === 1;
  const motionCounter = splitWaveHandoff ? counter + 1 : counter;
  const x2 = Math.trunc((dx * motionCounter) / 10);
  const y2 = Math.trunc((dy * (splitWaveHandoff ? counter : motionCounter)) / 10);
  // At the two subsequent create-eight command rows, coordinates still feed
  // BuildOam from the preceding sprite callback while tile animation already
  // exposes its current command.  This is the source's OAM sequencing, not a
  // screen-age special case.
  const positionCounter = (age === 72 || age === 80) && age > birth.age
    ? flameCounter(age - 1, wave, index, input.attackerSide)!
    : counter;
  const oamX2 = Math.trunc((dx * positionCounter) / 10);
  const oamY2 = Math.trunc((dy * positionCounter) / 10);
  const frame = Math.floor(counter / 4) % 5;
  const delay = counter % 4 === 0 ? 3 : 3 - (counter % 4);
  // The seventh first-wave callback crosses the script command hand-off one
  // instruction later, retaining its previous tile frame at age 72 while its
  // data/animation cursor has already advanced.  This is the one per-sprite
  // OAM animation latch in the source scheduler.
  const delayedTileFrame = (age === 72 && input.attackerSide === "player" && wave === 0 && index === 6)
    || (age === 80 && input.attackerSide === "opponent" && wave === 1 && index === 1);
  const oamFrame = delayedTileFrame
    ? Math.floor((flameCounter(age - 1, wave, index, input.attackerSide) ?? counter) / 4) % 5
    : frame;
  const attr: OverheatOam = counter === 0 || (wave > 0 && age === birth.age)
    ? [0, 0x8000, input.oam.flame[2]]
    : [
      (y + oamY2 - 16) & 0xff,
      (input.oam.flame[1] & ~0x1ff) | ((x + oamX2 - 16) & 0x1ff),
      (input.oam.flame[2] & ~0x3ff) | ((input.oam.flame[2] + oamFrame * 16) & 0x3ff),
    ];
  const highBand = index < 5 ? -2 : 2;
  return {
    kind: "flame", slot, template: "gOverheatFlameSpriteTemplate", callback: "AnimOverheatFlame_Step",
    birthAge: birth.age, wave, angle: index * 32, x, y, x2, y2, attr,
    subpriority: input.attackerSprite.subpriority + highBand,
    oamPriority: ((input.oam.flame[2] >>> 10) & 3) as 0 | 1 | 2 | 3,
    matrixNum: 0, matrix: IDENTITY, flags: 1,
    data: spriteWords(counter, dx, dy, 25, dx * motionCounter, dy * motionCounter),
    animNum: 0, animCmdIndex: frame, animDelayCounter: delay, sourceCreationOrder: wave * 8 + index,
  };
}
function hitSplatAt(age: number, index: number, input: Readonly<OverheatLiveInputs>): OverheatHitSplatSprite | null {
  const spec = HIT_SPLATS[index]!;
  if (age < spec.age || age > spec.age + 8) return null;
  const slot = input.spriteSlots.hitsplats[index], matrixNum = input.matrixSlots.hitsplats[index];
  if (slot === undefined || matrixNum === undefined) throw new Error("MOVE_OVERHEAT requires four hit-splat sprite and matrix slots");
  const x = input.targetPictureOrigin.x + (input.attackerSide === "player" ? spec.x : -spec.x);
  const y = input.targetPictureOrigin.y + spec.y;
  return {
    kind: "hitsplat", slot, template: "gBasicHitSplatSpriteTemplate",
    callback: age === spec.age + 8 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds",
    birthAge: spec.age, x, y, x2: 0, y2: 0,
    attr: [
      (input.oam.hitsplat[0] & ~0xff) | ((y - 16) & 0xff),
      (input.oam.hitsplat[1] & ~0x1ff) | (matrixNum << 9) | ((x - 16) & 0x1ff),
      input.oam.hitsplat[2],
    ],
    subpriority: input.targetSprite.subpriority - 3,
    oamPriority: ((input.oam.hitsplat[2] >>> 10) & 3) as 0 | 1 | 2 | 3,
    matrixNum, matrix: IDENTITY, flags: 1, data: spriteWords(0, 0, 0, 0, 0, 0, 15357, 2058),
    animNum: 0, animCmdIndex: 0, animDelayCounter: 0, sourceCreationOrder: 24 + index,
  };
}
function paletteSpriteAt(age: number, index: number, input: Readonly<OverheatLiveInputs>): OverheatPaletteSprite | null {
  const spec = PALETTE_PROGRAMS[index]!;
  if (age < spec.age || age > spec.last) return null;
  const slot = input.spriteSlots.paletteBlends[index];
  if (slot === undefined) throw new Error("MOVE_OVERHEAT requires five palette-blend sprite slots");
  const program = ["opening-background", "opening-attacker", "gray-attacker", "restore-background", "restore-attacker"][index] as OverheatPaletteSprite["program"];
  return {
    kind: "palette-blend", slot, template: "gSimplePaletteBlendSpriteTemplate", callback: "AnimSimplePaletteBlend_Step",
    birthAge: spec.age, program, x: input.targetPictureOrigin.x, y: input.targetPictureOrigin.y,
    x2: 0, y2: 0, attr: input.oam.paletteBlend,
    subpriority: input.attackerSprite.subpriority - 2,
    oamPriority: ((input.oam.paletteBlend[2] >>> 10) & 3) as 0 | 1 | 2 | 3,
    matrixNum: 0, matrix: IDENTITY, flags: 5, data: spriteWords(), animNum: 0, animCmdIndex: 0, animDelayCounter: 0,
    sourceCreationOrder: 28 + index,
  };
}
function spritesAt(age: number, input: Readonly<OverheatLiveInputs>): readonly OverheatSprite[] {
  if (age >= OVERHEAT_FIRST_INACTIVE_AGE) return [];
  const sprites: OverheatSprite[] = [];
  for (let wave = 0 as 0 | 1 | 2; wave < 3; wave = (wave + 1) as 0 | 1 | 2) {
    for (let index = 0; index < 8; index += 1) { const sprite = flameAt(age, wave, index, input); if (sprite) sprites.push(sprite); }
  }
  for (let index = 0; index < 4; index += 1) { const sprite = hitSplatAt(age, index, input); if (sprite) sprites.push(sprite); }
  for (let index = 0; index < 5; index += 1) { const sprite = paletteSpriteAt(age, index, input); if (sprite) sprites.push(sprite); }
  return sprites.sort((left, right) => left.slot - right.slot);
}

function shakeTaskAt(
  age: number, start: number, amplitude: number, repetitions: number, slot: number, battlerSlot: number, role: OverheatTask["role"],
): OverheatTask | null {
  const local = age - start;
  if (local < 0 || local > repetitions * 2 - 3) return null;
  return {
    slot, callback: "AnimTask_ShakeMon_Step", role,
    data: words(battlerSlot, repetitions - 1 - Math.floor(local / 2), 1, local % 2 === 0 ? 1 : 0, amplitude, 0),
  };
}
function shakeOffsetAt(age: number, start: number, amplitude: number, repetitions: number): number {
  const local = age - start;
  if (local < 2 || local > repetitions * 2 - 3) return 0;
  return Math.floor(local / 2) % 2 === 1 ? amplitude : 0;
}
function tasksAt(age: number, input: Readonly<OverheatLiveInputs>): readonly OverheatTask[] {
  if (age >= OVERHEAT_FIRST_INACTIVE_AGE) return [];
  const tasks: OverheatTask[] = [];
  if (age >= 7 && age <= 188) tasks.push({
    slot: input.taskSlots.monbg, callback: "Task_UpdateMonBg", role: "monbg",
    data: words(input.targetSprite.slot, input.targetSprite.x, input.targetSprite.y, input.background.setupX, input.background.setupY, input.targetSide === "player" ? 1 : 0, input.targetSide === "opponent" ? 1 : 0),
  });
  const first = shakeTaskAt(age, 35, 2, 15, input.taskSlots.firstAttackerShake, input.attackerSprite.slot, "attacker-shake"); if (first) tasks.push(first);
  const target = shakeTaskAt(age, 107, 10, 25, input.taskSlots.targetShake, input.targetSprite.slot, "target-shake"); if (target) tasks.push(target);
  const last = shakeTaskAt(age, 138, 3, 15, input.taskSlots.lastAttackerShake, input.attackerSprite.slot, "attacker-shake"); if (last) tasks.push(last);
  if (age >= 186 && age <= 188) tasks.push({
    slot: input.taskSlots.clearMonbg, callback: "Task_ClearMonBg", role: "clear-monbg",
    data: words(0, Math.min(2, age - 185), input.targetSide === "opponent" ? 1 : 0),
  });
  return tasks.sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));
}

function openingBackgroundCoefficient(age: number): number {
  if (age < 12) return 0;
  if (age < 15) return 2;
  if (age < 18) return 4;
  if (age < 172) return 5;
  if (age < 175) return 3;
  if (age < 178) return 1;
  return 0;
}
function firstAttackerCoefficient(age: number): number {
  if (age < 38) return 0;
  if (age < 41) return 2;
  if (age < 44) return 4;
  if (age < 47) return 6;
  if (age < 50) return 8;
  if (age < 53) return 10;
  if (age < 56) return 12;
  return 13;
}
function grayAttackerCoefficient(age: number): number {
  if (age < 140) return 0;
  if (age < 142) return 3;
  if (age < 144) return 6;
  if (age < 146) return 9;
  if (age < 148) return 12;
  return 13;
}
function restoreAttackerCoefficient(age: number): number {
  if (age < 210) return 13;
  if (age < 212) return 11;
  if (age < 214) return 9;
  if (age < 216) return 7;
  if (age < 218) return 5;
  if (age < 220) return 3;
  if (age < 222) return 1;
  return 0;
}

export interface OverheatPaletteState {
  readonly unfaded: readonly number[];
  readonly faded: readonly number[];
  readonly hardware: readonly number[];
  readonly banks: readonly number[];
  readonly backgroundCoefficient: number;
  readonly openingAttackerCoefficient: number;
  readonly grayAttackerCoefficient: number;
  readonly restoreAttackerCoefficient: number;
  readonly backup: Readonly<{
    readonly allocated: boolean;
    readonly allocatorSlot: 26;
    readonly backgroundCopiedAt: number | null;
    readonly attackerCopiedAt: number | null;
    readonly backgroundRestoredAt: number | null;
    readonly attackerRestoredAt: number | null;
    readonly freed: boolean;
  }>;
}

function paletteAtAge(age: number, input: Readonly<OverheatLiveInputs>): Omit<OverheatPaletteState, "hardware"> {
  const unfaded = input.palettes.unfaded.slice();
  const faded = input.palettes.faded.slice();
  const attackerBank = attackerPaletteBank(input);
  const targetBank = targetPaletteBank(input);
  if (age >= 1 && age < OVERHEAT_FIRST_INACTIVE_AGE && input.resources.smallEmber.palette) {
    putBank(unfaded, input.resources.smallEmber.hardwarePaletteBank, input.resources.smallEmber.palette);
    putBank(faded, input.resources.smallEmber.hardwarePaletteBank, input.resources.smallEmber.palette);
  }
  if (age >= 4 && age < OVERHEAT_FIRST_INACTIVE_AGE && input.resources.impact.palette) {
    putBank(unfaded, input.resources.impact.hardwarePaletteBank, input.resources.impact.palette);
    putBank(faded, input.resources.impact.hardwarePaletteBank, input.resources.impact.palette);
  }
  if (age >= 7 && age < OVERHEAT_FIRST_INACTIVE_AGE) {
    putBank(unfaded, input.background.monbgPaletteBank, bank(input.palettes.unfaded, targetBank));
    putBank(faded, input.background.monbgPaletteBank, bank(input.palettes.unfaded, targetBank));
  }
  const originalBackgroundBanks = [1, 2, 3].map((index) => bank(input.palettes.unfaded, index));
  const originalAttacker = bank(input.palettes.unfaded, attackerBank);
  const redAttacker = blendBank(originalAttacker, 28, 13);
  // `AnimTask_CopyPalFadedToUnfaded, 5, 0` is the source's selected BG
  // palette copy, not a broad F_PAL_BG fade: it copies bank 1 only.
  if (age >= 29 && age < 167) putBank(unfaded, 1, blendBank(originalBackgroundBanks[0]!, 28, 5));
  if (age >= 135 && age < 205) putBank(unfaded, attackerBank, redAttacker);
  const backgroundCoefficient = openingBackgroundCoefficient(age);
  for (let index = 0; index < 3; index += 1) putBank(faded, index + 1, blendBank(originalBackgroundBanks[index]!, 28, backgroundCoefficient));
  const openingAttackerCoefficient = firstAttackerCoefficient(age);
  const grayCoefficient = grayAttackerCoefficient(age);
  const restoreCoefficient = restoreAttackerCoefficient(age);
  if (age < 135) putBank(faded, attackerBank, blendBank(originalAttacker, 28, openingAttackerCoefficient));
  else if (age < 208) putBank(faded, attackerBank, blendBank(redAttacker, 19026, grayCoefficient));
  else putBank(faded, attackerBank, blendBank(originalAttacker, 19026, restoreCoefficient));
  const changed = new Set<number>([1, 2, 3, attackerBank]);
  if (age >= 1 && age < OVERHEAT_FIRST_INACTIVE_AGE) changed.add(input.resources.smallEmber.hardwarePaletteBank);
  if (age >= 4 && age < OVERHEAT_FIRST_INACTIVE_AGE) changed.add(input.resources.impact.hardwarePaletteBank);
  if (age >= 7 && age < OVERHEAT_FIRST_INACTIVE_AGE) changed.add(input.background.monbgPaletteBank);
  return {
    unfaded, faded, banks: [...changed].sort((left, right) => left - right),
    backgroundCoefficient, openingAttackerCoefficient, grayAttackerCoefficient: grayCoefficient, restoreAttackerCoefficient: restoreCoefficient,
    backup: {
      allocated: age >= 26 && age < OVERHEAT_FIRST_INACTIVE_AGE, allocatorSlot: 26,
      backgroundCopiedAt: age >= 29 ? 29 : null, attackerCopiedAt: age >= 135 ? 135 : null,
      backgroundRestoredAt: age >= 167 ? 167 : null, attackerRestoredAt: age >= 205 ? 205 : null,
      freed: age >= OVERHEAT_FIRST_INACTIVE_AGE,
    },
  };
}
function paletteStateAtAge(age: number, input: Readonly<OverheatLiveInputs>): OverheatPaletteState {
  const current = paletteAtAge(age, input);
  const hardware = age === 0
    ? input.palettes.hardware.slice()
    // `monbg` writes the target BG palette before the first regular palette
    // DMA; this is the one same-row hardware exception in this move.
    : age === 7 ? current.faded.slice() : paletteAtAge(age - 1, input).faded.slice();
  return { ...current, hardware };
}

function battlersAtAge(age: number, input: Readonly<OverheatLiveInputs>) {
  const attackerShake = age >= 138 ? shakeOffsetAt(age, 138, 3, 15) : shakeOffsetAt(age, 35, 2, 15);
  const targetShake = shakeOffsetAt(age, 107, 10, 25);
  const targetHidden = age >= 7 && age < 186;
  const attacker = { ...input.attackerSprite, x2: attackerShake, y2: 0, visible: (input.attackerSprite.flags & 4) === 0 };
  const target = { ...input.targetSprite, x2: targetShake, y2: 0, flags: targetHidden ? input.targetSprite.flags | 4 : input.targetSprite.flags, visible: !targetHidden && (input.targetSprite.flags & 4) === 0 };
  return { attacker, target, attackerShake: { x: attackerShake, y: 0 }, targetShake: { x: targetShake, y: 0 }, targetHidden };
}

function backgroundAtAge(age: number, input: Readonly<OverheatLiveInputs>, targetShake: number) {
  const values = { ...input.background.values };
  const active = age >= 7 && age < 189;
  if (active) {
    values[input.background.xKey] = input.background.setupX - targetShake;
    values[input.background.yKey] = input.background.setupY;
  }
  if (age >= 189) {
    values[input.background.xKey] = input.background.clearX;
    values[input.background.yKey] = input.background.clearY;
  }
  return { values, active, transfer: age === 7 || (targetShake !== 0 && age % 2 === 1) ? "current" as const : "preceding-software" as const };
}
function registersAtAge(age: number, input: Readonly<OverheatLiveInputs>): Record<string, number> {
  const registers = { ...input.registers };
  if (age >= 8 && age < 190) {
    registers[input.background.controlRegister] = input.background.setupControl;
    // Task_UpdateMonBg writes software scroll on this row; BGxHOFS/VOFS
    // scan out that preceding software state one row later.
    const priorTargetShake = shakeOffsetAt(age - 1, 107, 10, 25);
    registers[input.background.horizontalRegister] = (input.background.setupX - priorTargetShake) & 0x1ff;
    registers[input.background.verticalRegister] = input.background.setupY & 0x1ff;
  } else if (age >= 190) {
    registers[input.background.controlRegister] = input.background.clearControl;
    registers[input.background.horizontalRegister] = input.background.clearHorizontal;
    registers[input.background.verticalRegister] = input.background.clearVertical;
  }
  registers.bldcnt = age >= 10 && age < 186 ? 16192 : 0;
  registers.bldalpha = age >= 10 && age < 186 ? 4620 : 0;
  return registers;
}

const painterCache = new WeakMap<object, number[][]>();
function painterOrderAtAge(age: number, input: Readonly<OverheatLiveInputs>): readonly number[] {
  let cached = painterCache.get(input);
  if (!cached) { cached = []; painterCache.set(input, cached); }
  let order = cached.at(-1)?.slice() ?? input.allocator.spriteOrder.slice();
  const external = input.allocator.initialLiveSprites.filter((entry) => entry.slot !== input.attackerSprite.slot && entry.slot !== input.targetSprite.slot);
  for (let tick = cached.length; tick <= age; tick += 1) {
    const battlers = battlersAtAge(tick, input);
    const sprites = spritesAt(tick, input);
    // `create_overheat_flame_sprite` runs after this source frame's
    // SortSprites pass.  The eight new slots therefore retain their dummy
    // sort keys until the next age; script-created palette sprites do not.
    const sortableSprites = sprites.filter((sprite) => sprite.kind !== "flame" || sprite.birthAge < tick);
    const keys = new Map<number, { readonly priority: 0 | 1 | 2 | 3; readonly subpriority: number; readonly y: number }>();
    for (const entry of external) keys.set(entry.slot, { priority: ((entry.attr[2] >>> 10) & 3) as 0 | 1 | 2 | 3, subpriority: entry.subpriority, y: signedOamY(entry.attr[0]) });
    for (const battler of [battlers.attacker, battlers.target]) keys.set(battler.slot, { priority: battler.oamPriority as 0 | 1 | 2 | 3, subpriority: battler.subpriority, y: signedOamY(battler.attr[0]) });
    for (const sprite of sortableSprites) keys.set(sprite.slot, { priority: sprite.oamPriority as 0 | 1 | 2 | 3, subpriority: sprite.subpriority, y: signedOamY(sprite.attr[0]) });
    order = sortGbaSpriteOrder(order, order.map((slot) => ({ slot, ...(keys.get(slot) ?? { priority: 3 as const, subpriority: 255, y: -96 }) })));
    cached.push(order);
  }
  return cached[age]!;
}

export interface OverheatState {
  readonly age: number;
  readonly active: boolean;
  readonly source: OverheatSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: OverheatSide; readonly species: string; readonly sprite: ReturnType<typeof battlersAtAge>["attacker"]; readonly shake: OverheatPoint }>;
    readonly target: Readonly<{ readonly side: OverheatSide; readonly species: string; readonly sprite: ReturnType<typeof battlersAtAge>["target"]; readonly shake: OverheatPoint; readonly hiddenByMonbg: boolean }>;
  }>;
  readonly sprites: readonly OverheatSprite[];
  readonly tasks: readonly OverheatTask[];
  readonly resources: Readonly<{
    readonly tags: Readonly<Record<keyof typeof OVERHEAT_RESOURCE_TAGS, Readonly<OverheatResourceAllocation & { readonly loaded: boolean }>>>;
    readonly matrixBitmap: number;
  }>;
  readonly palette: OverheatPaletteState;
  readonly background: Readonly<{
    readonly values: Readonly<Record<string, number>>;
    readonly monbg: boolean;
    readonly selectedBgTransfer: "current" | "preceding-software";
  }>;
  readonly registers: Readonly<Record<string, number>>;
  readonly painterOrder: readonly number[];
  readonly audio: readonly Readonly<{ readonly sound: "se_m_dragon_rage" | "se_m_flame_wheel2" | "se_m_fire_punch"; readonly pan: -64 | -63 | 63; readonly sourcePan: "attacker" | "target" }> [];
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayState: unknown; readonly gameplayUnchanged: true }>;
  readonly latches: Readonly<{
    readonly oamAndMatrices: "initial" | "preceding-software";
    readonly palette: "initial" | "current-monbg" | "preceding-faded";
    readonly registers: "initial" | "preceding-software";
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly ownedSprites: number;
    readonly ownedTasks: number;
    readonly resourcesReleased: boolean;
    readonly backupFreed: boolean;
  }>;
}

function audioAtAge(age: number, input: Readonly<OverheatLiveInputs>): OverheatState["audio"] {
  const attackerPan = input.attackerSide === "player" ? -64 : 63;
  const targetPan = input.targetSide === "player" ? -63 : 63;
  if (age === 32) return [{ sound: "se_m_dragon_rage", pan: attackerPan, sourcePan: "attacker" }];
  if (age === 64) return [{ sound: "se_m_flame_wheel2", pan: attackerPan, sourcePan: "attacker" }];
  if (HIT_SPLATS.some((spec) => spec.age === age)) return [{ sound: "se_m_fire_punch", pan: targetPan, sourcePan: "target" }];
  return [];
}

/** Reduce one retained MOVE_OVERHEAT source age without touching gameplay. */
export function overheatAtAge(age: number, input: Readonly<OverheatLiveInputs>): OverheatState {
  assertAge(age);
  if (input.spriteSlots.flames.length !== 24 || input.spriteSlots.hitsplats.length !== 4 || input.spriteSlots.paletteBlends.length !== 5 || input.matrixSlots.hitsplats.length !== 4) {
    throw new Error("MOVE_OVERHEAT requires 24 flame, 4 hit-splat, 5 palette and 4 matrix live allocations");
  }
  const source = overheatSourceAtAge(age);
  const battlerState = battlersAtAge(age, input);
  const sprites = spritesAt(age, input);
  const tasks = tasksAt(age, input);
  const palette = paletteStateAtAge(age, input);
  const backgroundState = backgroundAtAge(age, input, battlerState.targetShake.x);
  const registers = registersAtAge(age, input);
  const active = source.active;
  const resources = {
    tags: {
      smallEmber: { ...input.resources.smallEmber, loaded: age >= 1 && active },
      impact: { ...input.resources.impact, loaded: age >= 4 && active },
    },
    matrixBitmap: active ? input.allocator.initialMatrixBitmap | sprites.filter((sprite): sprite is OverheatHitSplatSprite => sprite.kind === "hitsplat").reduce((bitmap, sprite) => bitmap | (1 << sprite.matrixNum), 0) : input.allocator.initialMatrixBitmap,
  } as const;
  const visualTasks = sprites.length + tasks.filter((task) => task.role === "attacker-shake" || task.role === "target-shake").length;
  return {
    age, active, source, animArgs: argsAtAge(age),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: battlerState.attacker, shake: battlerState.attackerShake },
      target: { side: input.targetSide, species: input.targetSpecies, sprite: battlerState.target, shake: battlerState.targetShake, hiddenByMonbg: battlerState.targetHidden },
    },
    sprites, tasks, resources, palette,
    background: { values: backgroundState.values, monbg: age >= 7 && age < 186, selectedBgTransfer: backgroundState.transfer },
    registers, painterOrder: painterOrderAtAge(age, input), audio: audioAtAge(age, input),
    rng: { animation: animationRngAtAge(input.animationRngSeed, age), sourceDraws: overheatAnimationRngDrawsAtAge(age), gameplay: input.gameplayRng, gameplayState: input.gameplayState, gameplayUnchanged: true },
    latches: {
      oamAndMatrices: age === 0 ? "initial" : "preceding-software",
      palette: age === 0 ? "initial" : age === 7 ? "current-monbg" : "preceding-faded",
      registers: age === 0 ? "initial" : "preceding-software",
    },
    cleanup: { firstInactive: age === OVERHEAT_FIRST_INACTIVE_AGE, visualTasks, soundTasks: 0, ownedSprites: sprites.length, ownedTasks: tasks.length, resourcesReleased: !active, backupFreed: !active },
  };
}
