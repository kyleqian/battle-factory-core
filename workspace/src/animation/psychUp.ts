/**
 * Source-relative Scene-ON reduction for MOVE_PSYCH_UP.
 *
 * This is deliberately a move-owned semantic reducer.  It models the script
 * cursor and the callbacks reached by `Move_PSYCH_UP`; its inputs are live
 * battler, palette, allocation, and painter state.  It has no recording,
 * framebuffer, controller-frame, or gameplay-state dependency.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type PsychUpSide = "player" | "opponent";
export interface PsychUpPoint { readonly x: number; readonly y: number; }
export type PsychUpMatrix = readonly [number, number, number, number];

export interface PsychUpBattlerSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: PsychUpMatrix;
  readonly attr: readonly [number, number, number];
}

export interface PsychUpResourceAllocation {
  readonly tag: number;
  readonly paletteBank: number;
  readonly tileSlot: number;
  readonly tileRange: readonly [number, number];
}

export interface PsychUpLiveInputs {
  readonly attackerSide: PsychUpSide;
  readonly targetSide: PsychUpSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  readonly attackerPictureOrigin: Readonly<PsychUpPoint>;
  readonly targetPictureOrigin: Readonly<PsychUpPoint>;
  readonly attackerSprite: Readonly<PsychUpBattlerSprite>;
  readonly targetSprite: Readonly<PsychUpBattlerSprite>;
  readonly taskSlots: Readonly<{
    readonly blendCycle: number;
    readonly updateMonBg: number;
    readonly loopSound: number;
    readonly sway: number;
    readonly scale: number;
    readonly attackerPalette: number;
    readonly clearMonBg: number;
  }>;
  readonly spiral: Readonly<{
    readonly slot: number;
    readonly matrixSlot: number;
    readonly subpriority: number;
    readonly attr2: number;
    readonly painterInsertionIndex: number;
  }>;
  readonly scaleMatrixSlot: number;
  readonly spriteOrder: readonly number[];
  readonly matrixBitmap: number;
  readonly matrixSlots: readonly PsychUpMatrix[];
  readonly resource: Readonly<PsychUpResourceAllocation>;
  readonly monBg: Readonly<{
    readonly layer: "bg1" | "bg2";
    readonly battlerId: number;
    readonly copyPaletteBank: number;
    readonly baseScroll: Readonly<PsychUpPoint>;
    readonly initialBgCnt: number;
    readonly monBgCnt: number;
    readonly initialHardwareScroll: Readonly<PsychUpPoint>;
  }>;
  readonly palettes: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
    readonly backgroundBanks: readonly [number, number, number];
    readonly attackerBank: number;
    readonly attackerPaletteSelectorHigh: number;
    /** Palette uploaded by `loadspritegfx ANIM_TAG_SPIRAL` at source age 1. */
    readonly resourcePalette: readonly number[];
  }>;
  readonly registers: Readonly<{
    readonly bldcnt: number;
    readonly bldalpha: number;
    readonly bldy: number;
  }>;
  readonly animationRngSeed: number;
  /** Gameplay-owned state is carried through without reads or mutation. */
  readonly gameplayRng: unknown;
}

export const PSYCH_UP_SOURCE_START = 0x082caaea;
export const PSYCH_UP_SOURCE_END_EXCLUSIVE = 0x082cab5c;
export const PSYCH_UP_SPIRAL_TAG = 10196;
export const PSYCH_UP_FIRST_INACTIVE_AGE = 178;

export interface PsychUpSourceCursor {
  readonly owner: "Move_PSYCH_UP";
  readonly pointer: number;
  readonly pointerOffset: 0 | 3 | 5 | 67 | 69 | 109 | 113;
  readonly active: boolean;
  readonly wait: number;
}

export interface PsychUpTask {
  readonly slot: number;
  readonly callback:
    | "AnimTask_BlendColorCycleExcludeLoop"
    | "Task_UpdateMonBg"
    | "Task_LoopAndPlaySE"
    | "AnimTask_SwayMonStep"
    | "AnimTask_ScaleMonAndRestore_Step"
    | "AnimTask_BlendSpriteColor_Step2"
    | "Task_ClearMonBg";
  readonly role: "background-palette" | "monbg" | "loop-sound" | "sway" | "scale" | "attacker-palette" | "clear-monbg";
  /** The complete source task data array, always 16 signed halfwords. */
  readonly data: readonly number[];
}

export interface PsychUpSpiralSprite {
  readonly kind: "spiral";
  readonly slot: number;
  readonly template: "gPsychUpSpiralSpriteTemplate";
  readonly callback: "AnimSpriteOnMonPos";
  readonly affine: "gSpriteAffineAnimTable_PsychUpSpiral";
  readonly cell: 0;
  readonly oam: readonly [number, number, number];
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly animNum: 0;
  readonly animCmdIndex: 0;
  readonly animDelayCounter: 0;
  readonly subpriority: number;
  readonly oamPriority: number;
  readonly matrixNum: number;
  readonly matrix: PsychUpMatrix;
  readonly data: readonly [number, number, number, number, number, number, number, number];
  readonly sourceCreationOrder: 0;
}

export interface PsychUpState {
  readonly age: number;
  readonly active: boolean;
  readonly source: PsychUpSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{ readonly side: PsychUpSide; readonly species: string; readonly sprite: PsychUpBattlerSprite }>;
    readonly target: Readonly<{ readonly side: PsychUpSide; readonly species: string; readonly sprite: PsychUpBattlerSprite }>;
  }>;
  readonly tasks: readonly PsychUpTask[];
  readonly spiral: PsychUpSpiralSprite | null;
  readonly painterOrder: readonly number[];
  readonly background: Readonly<{
    readonly layer: "bg1" | "bg2";
    readonly monBgActive: boolean;
    readonly softwareScroll: Readonly<PsychUpPoint>;
    readonly hardwareScroll: Readonly<PsychUpPoint>;
    readonly bgCnt: number;
    readonly vram: "initial" | "copied" | "cleared" | "released";
  }>;
  readonly palettes: Readonly<{
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
    readonly backgroundCycle: Readonly<{ readonly callback: "AnimTask_BlendColorCycleExcludeLoop"; readonly mask: number; readonly banks: readonly number[]; readonly coefficient: number | null }>;
    readonly attackerYellow: Readonly<{ readonly callback: "AnimTask_BlendSpriteColor_Step2"; readonly maskLow: number; readonly maskHigh: number; readonly banks: readonly number[]; readonly coefficient: number | null }>;
  }>;
  readonly registers: Readonly<{ readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number; readonly blendOff: boolean }>;
  readonly resources: Readonly<{
    readonly spiral: Readonly<{ readonly tag: number | null; readonly loaded: boolean; readonly allocation: PsychUpResourceAllocation | null }>;
    readonly allocator: Readonly<{ readonly matrixBitmap: number; readonly matrixSlots: readonly PsychUpMatrix[]; readonly spiralMatrixAllocated: boolean; readonly scaleMatrixAllocated: boolean }>;
  }>;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software" | "scale-start-hold" | "two-source-rows-scale";
    readonly palette: "initial" | "preceding-faded" | "same-row-monbg-setup";
    readonly selectedBgScroll: "initial" | "preceding-software";
  }>;
  readonly audio: Readonly<{
    readonly looping: Readonly<{ readonly sound: "SE_M_PSYBEAM2"; readonly pan: number; readonly interval: 5; readonly requestedPlays: 10; readonly remaining: number; readonly task: readonly number[] }> | null;
    readonly oneShot: Readonly<{ readonly sound: "SE_M_PSYBEAM"; readonly pan: number }> | null;
    readonly events: readonly Readonly<{ readonly sound: "SE_M_PSYBEAM2" | "SE_M_PSYBEAM"; readonly pan: number }>[];
  }>;
  readonly rng: Readonly<{ readonly animation: number; readonly sourceDraws: number; readonly gameplay: unknown; readonly gameplayUnchanged: true }>;
  readonly cleanup: Readonly<{ readonly firstInactive: boolean; readonly visualTasks: number; readonly soundTasks: number; readonly ownedSprites: number; readonly resourcesReleased: boolean }>;
}

function assertAge(age: number): void {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Psych Up source age ${age}`);
}

function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) throw new Error(`invalid Psych Up ${label}`);
}

function assertInputs(input: Readonly<PsychUpLiveInputs>): void {
  if (input.attackerSide === input.targetSide) throw new Error("Psych Up requires opposing live battler sides");
  for (const [label, slot] of Object.entries(input.taskSlots)) assertSlot(slot, label, 16);
  assertSlot(input.spiral.slot, "spiral sprite", 64);
  assertSlot(input.spiral.matrixSlot, "spiral matrix", input.matrixSlots.length || 32);
  assertSlot(input.scaleMatrixSlot, "scale matrix", input.matrixSlots.length || 32);
  assertSlot(input.monBg.copyPaletteBank, "copy palette", 16);
  assertSlot(input.palettes.attackerBank, "attacker palette", 32);
  if (input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64 || input.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("Psych Up requires a live 64-slot painter order seed");
  }
  if (input.spiral.painterInsertionIndex < 0 || input.spiral.painterInsertionIndex > input.spriteOrder.length) throw new Error("invalid Psych Up spiral painter insertion index");
  if (input.palettes.unfaded.length !== 512 || input.palettes.faded.length !== 512 || input.palettes.hardware.length !== 512 || input.palettes.resourcePalette.length !== 16) throw new Error("Psych Up requires live 32-bank palette memory");
}

function taskData(...values: number[]): readonly number[] {
  return [...values, ...Array.from({ length: Math.max(0, 16 - values.length) }, () => 0)].slice(0, 16);
}

function toS16(value: number): number {
  const word = value & 0xffff;
  return word >= 0x8000 ? word - 0x10000 : word;
}

function toU16(value: number): number { return value & 0xffff; }

function panFor(side: PsychUpSide): number { return side === "player" ? -64 : 63; }

export function psychUpSourceAtAge(age: number): PsychUpSourceCursor {
  assertAge(age);
  let pointerOffset: PsychUpSourceCursor["pointerOffset"];
  let wait = 0;
  if (age === 0) pointerOffset = 0;
  else if (age < 4) { pointerOffset = 3; wait = age === 1 ? 1 : 0; }
  else if (age < 7) { pointerOffset = 5; wait = age === 4 ? 1 : 0; }
  else if (age < 136) { pointerOffset = 67; wait = Math.max(0, 134 - age); }
  else if (age < 142) { pointerOffset = 69; wait = Math.max(0, 140 - age); }
  else if (age < 174) { pointerOffset = 109; wait = Math.max(0, 172 - age); }
  else pointerOffset = 113, wait = 1;
  return {
    owner: "Move_PSYCH_UP",
    pointer: PSYCH_UP_SOURCE_START + pointerOffset,
    pointerOffset,
    active: age < PSYCH_UP_FIRST_INACTIVE_AGE,
    wait,
  };
}

function animArgsAtAge(age: number, input: Readonly<PsychUpLiveInputs>): PsychUpState["animArgs"] {
  if (age < 7) return [0, 0, 0, 0, 0, 0, 0, 0];
  if (age < 142) return [0, input.attackerSide === "player" ? 5 : -5, 2560, 8, 0, 0, 0, 0];
  return [2, 2, 10, 0, 1023, 0, 0, 0];
}

function spiralMatrixAtAge(age: number): PsychUpMatrix {
  // The 120-tick relative affine command reaches its terminal matrix on the
  // preceding source row; the sprite survives one final held row before free.
  const step = Math.min(age, 126) - 6;
  const scale = 256 - 2 * step;
  const reciprocalScale = Math.trunc(0x10000 / scale) / 256;
  const theta = -10 * step / 128 * Math.PI;
  // The source routes this affine command through ObjAffineSet.  mGBA's
  // source implementation multiplies the reciprocal Q8.8 scale by its
  // rotation float and truncates each destination halfword toward zero.
  const cosine = Math.trunc(Math.cos(theta) * reciprocalScale * 256);
  const sine = Math.trunc(Math.sin(theta) * reciprocalScale * 256);
  return [cosine, -sine, sine, cosine];
}

interface SwayState { readonly x2: number; readonly data: readonly number[]; }

function swayAtAge(age: number, input: Readonly<PsychUpLiveInputs>): SwayState | null {
  if (age < 7 || age > 108) return null;
  let amplitude = input.attackerSide === "player" ? 5 : -5;
  let sways = 8;
  let sineIndex = 0;
  const direction = 0;
  let crossing = 0;
  let armed = 1;
  let x2 = 0;
  for (let current = 7; current <= age; current += 1) {
    sineIndex = toS16(toU16(sineIndex) + 2560);
    const waveIndex = (toU16(sineIndex) >> 8) & 0xff;
    const sine = (GBA_SINE_TABLE_256[waveIndex]! * amplitude) >> 8;
    x2 = direction === 0 ? sine : 0;
    if ((waveIndex >= 0x80 && crossing === 0 && armed === 1)
      || (waveIndex < 0x7f && crossing === 1 && armed === 0)) {
      crossing ^= 1;
      armed ^= 1;
      sways -= 1;
      if (sways === 0) return null;
    }
  }
  return { x2, data: taskData(direction, amplitude, 2560, sways, input.attackerSprite.slot, input.monBg.battlerId, 0, 0, 0, 0, sineIndex, crossing, armed, 0, 0, 0) };
}

interface ScaleState { readonly matrix: PsychUpMatrix; readonly data: readonly number[]; }

function scaleAtAge(age: number, input: Readonly<PsychUpLiveInputs>): ScaleState | null {
  if (age < 142 || age > 160) return null;
  const local = age - 142;
  const ascending = local <= 8;
  const scale = ascending ? 251 - local * 5 : 206 + (local - 9) * 5;
  const remaining = ascending ? 9 - local : 19 - local;
  return {
    matrix: [scale, 0, 0, scale],
    data: taskData(ascending ? -5 : 5, ascending ? -5 : 5, remaining, ascending ? 10 : 0, input.attackerSprite.slot, 0, 0, 0, 0, 0, scale, scale),
  };
}

function cyclePhase(age: number): { readonly initial: number; readonly target: number; readonly started: number; readonly firstDelta: number } | null {
  if (age < 7 || age > 169) return null;
  // The task records `initial_blend_y = 1`, while the fade buffer remains at
  // its untouched coefficient zero until the first task cadence at age 10.
  if (age < 36) return { initial: 0, target: 11, started: 7, firstDelta: 3 };
  if (age < 62) return { initial: 11, target: 1, started: 36, firstDelta: 4 };
  if (age < 88) return { initial: 1, target: 11, started: 62, firstDelta: 4 };
  if (age < 114) return { initial: 11, target: 1, started: 88, firstDelta: 4 };
  if (age < 140) return { initial: 1, target: 11, started: 114, firstDelta: 4 };
  return { initial: 11, target: 0, started: 140, firstDelta: 4 };
}

function fadeCoefficient(age: number, phase: NonNullable<ReturnType<typeof cyclePhase>>): number {
  if (age < phase.started + phase.firstDelta) return phase.initial;
  const steps = Math.floor((age - (phase.started + phase.firstDelta)) / 4) + 1;
  return phase.target >= phase.initial ? Math.min(phase.target, phase.initial + steps * 2) : Math.max(phase.target, phase.initial - steps * 2);
}

function backgroundCoefficientAtAge(age: number): number | null {
  const phase = cyclePhase(age);
  return phase === null ? null : fadeCoefficient(age, phase);
}

function attackerCoefficientAtAge(age: number): number | null {
  if (age < 142 || age > 172) return null;
  return age < 143 ? 0 : Math.max(0, 10 - Math.floor((age - 143) / 3));
}

function blendColor(source: number, target: number, coefficient: number): number {
  const blend = (component: number, targetComponent: number): number => ((component * (16 - coefficient)) + targetComponent * coefficient) >> 4;
  const r = blend(source & 0x1f, target & 0x1f);
  const g = blend((source >> 5) & 0x1f, (target >> 5) & 0x1f);
  const b = blend((source >> 10) & 0x1f, (target >> 10) & 0x1f);
  return r | (g << 5) | (b << 10);
}

function paletteAtAge(age: number, input: Readonly<PsychUpLiveInputs>): readonly number[] {
  const palette = input.palettes.faded.slice();
  if (age >= 1) {
    const resourceStart = (16 + input.resource.paletteBank) * 16;
    for (let color = 0; color < 16; color += 1) palette[resourceStart + color] = input.palettes.resourcePalette[color]!;
  }
  const bgCoefficient = backgroundCoefficientAtAge(age);
  if (bgCoefficient !== null) {
    for (const bank of input.palettes.backgroundBanks) {
      for (let color = 0; color < 16; color += 1) {
        const index = bank * 16 + color;
        palette[index] = blendColor(input.palettes.unfaded[index]!, 0, bgCoefficient);
      }
    }
  }
  const attackerCoefficient = attackerCoefficientAtAge(age);
  if (attackerCoefficient !== null) {
    for (let color = 0; color < 16; color += 1) {
      const index = input.palettes.attackerBank * 16 + color;
      palette[index] = blendColor(input.palettes.unfaded[index]!, 1023, attackerCoefficient);
    }
  }
  // Clearing the mon BG releases its copied pixels, not the copied palette
  // contents; the final update remains visible through root cleanup.
  if (age >= 4) {
    for (let color = 0; color < 16; color += 1) {
      const destination = input.monBg.copyPaletteBank * 16 + color;
      const source = input.palettes.attackerBank * 16 + color;
      palette[destination] = palette[source]!;
    }
  }
  return palette;
}

function loopSoundAtAge(age: number, input: Readonly<PsychUpLiveInputs>): { readonly data: readonly number[]; readonly events: readonly Readonly<{ readonly sound: "SE_M_PSYBEAM2"; readonly pan: number }>[] } | null {
  if (age < 7 || age > 59) return null;
  let remaining = 10;
  let counter = 5;
  const events: Readonly<{ readonly sound: "SE_M_PSYBEAM2"; readonly pan: number }>[] = [];
  const invoke = (emit: boolean): void => {
    if (counter++ >= 5) {
      counter = 0;
      remaining -= 1;
      if (emit) events.push({ sound: "SE_M_PSYBEAM2", pan: panFor(input.attackerSide) });
    }
  };
  for (let current = 7; current <= age; current += 1) {
    invoke(current === age);
    if (current === 7) invoke(current === age); // command invocation then the row's task pass
  }
  return { data: taskData(200, panFor(input.attackerSide), 5, remaining, 0, 0, 0, 0, counter), events };
}

function audioAtAge(age: number, input: Readonly<PsychUpLiveInputs>): PsychUpState["audio"] {
  const loop = loopSoundAtAge(age, input);
  const finalLoop = age === 60 ? [{ sound: "SE_M_PSYBEAM2" as const, pan: panFor(input.attackerSide) }] : [];
  const oneShot = age === 142 ? { sound: "SE_M_PSYBEAM" as const, pan: panFor(input.attackerSide) } : null;
  return {
    looping: loop === null ? null : { sound: "SE_M_PSYBEAM2", pan: panFor(input.attackerSide), interval: 5, requestedPlays: 10, remaining: loop.data[3]!, task: loop.data },
    oneShot,
    events: [...(loop?.events ?? []), ...finalLoop, ...(oneShot === null ? [] : [oneShot])],
  };
}

function tasksAtAge(age: number, input: Readonly<PsychUpLiveInputs>): PsychUpTask[] {
  if (age >= PSYCH_UP_FIRST_INACTIVE_AGE) return [];
  const tasks: PsychUpTask[] = [];
  const phase = cyclePhase(age);
  if (phase !== null) {
    const phaseIndex = phase.started === 7 ? 0 : phase.started === 36 ? 1 : phase.started === 62 ? 2 : phase.started === 88 ? 3 : phase.started === 114 ? 4 : 5;
    tasks.push({ slot: input.taskSlots.blendCycle, callback: "AnimTask_BlendColorCycleExcludeLoop", role: "background-palette", data: taskData(1, 2, 5 - phaseIndex, 1, 11, 0, 0, 0, phaseIndex % 2 === 0 ? 1 : 0, 0, 14) });
  }
  if (age >= 4 && age <= 176) tasks.push({ slot: input.taskSlots.updateMonBg, callback: "Task_UpdateMonBg", role: "monbg", data: taskData(input.attackerSprite.slot, input.attackerSprite.x, input.attackerSprite.y, input.monBg.baseScroll.x, input.monBg.baseScroll.y, input.monBg.layer === "bg2" ? 1 : 0, input.monBg.battlerId) });
  const loop = loopSoundAtAge(age, input);
  if (loop !== null) tasks.push({ slot: input.taskSlots.loopSound, callback: "Task_LoopAndPlaySE", role: "loop-sound", data: loop.data });
  const sway = swayAtAge(age, input);
  if (sway !== null) tasks.push({ slot: input.taskSlots.sway, callback: "AnimTask_SwayMonStep", role: "sway", data: sway.data });
  const scale = scaleAtAge(age, input);
  if (scale !== null) tasks.push({ slot: input.taskSlots.scale, callback: "AnimTask_ScaleMonAndRestore_Step", role: "scale", data: scale.data });
  const attackerCoefficient = attackerCoefficientAtAge(age);
  if (attackerCoefficient !== null) {
    // StartBlendAnimSpriteColor invokes its callback immediately, followed by
    // the row's task pass, so the delay counter is already two at birth.
    const local = age - 142;
    const delayCounter = local === 0 ? 2 : (local - 1) % 3;
    const storedCoefficient = local === 0 ? 10 : Math.max(0, 9 - Math.floor((local - 1) / 3));
    tasks.push({ slot: input.taskSlots.attackerPalette, callback: "AnimTask_BlendSpriteColor_Step2", role: "attacker-palette", data: taskData(0, input.palettes.attackerPaletteSelectorHigh, 2, 10, 0, 1023, 0, 0, 0, delayCounter, storedCoefficient) });
  }
  if (age >= 174 && age <= 176) tasks.push({ slot: input.taskSlots.clearMonBg, callback: "Task_ClearMonBg", role: "clear-monbg", data: taskData(0, age === 174 ? 1 : 2, input.monBg.battlerId) });
  return tasks.sort((left, right) => left.slot - right.slot || left.role.localeCompare(right.role));
}

function spiralAtAge(age: number, input: Readonly<PsychUpLiveInputs>): PsychUpSpiralSprite | null {
  if (age < 7 || age > 127) return null;
  const x = input.attackerPictureOrigin.x;
  const y = input.attackerPictureOrigin.y;
  return {
    kind: "spiral", slot: input.spiral.slot, template: "gPsychUpSpiralSpriteTemplate", callback: "AnimSpriteOnMonPos", affine: "gSpriteAffineAnimTable_PsychUpSpiral", cell: 0,
    oam: [0x500 | ((y - 32) & 0xff), 0xc000 | ((x - 32) & 0x1ff), input.spiral.attr2],
    x, y, x2: 0, y2: 0, animNum: 0, animCmdIndex: 0, animDelayCounter: 0,
    subpriority: input.spiral.subpriority, oamPriority: input.attackerSprite.oamPriority, matrixNum: input.spiral.matrixSlot, matrix: spiralMatrixAtAge(age),
    data: [1, 0, 0, 0, 0, 0, 0, 0], sourceCreationOrder: 0,
  };
}

function sourceDrawsAtAge(age: number): number {
  if (age <= 175) return age;
  if (age <= 177) return 175;
  return 176;
}

function animationRngAtAge(seed: number, draws: number): number {
  let result = seed >>> 0;
  for (let draw = 0; draw < draws; draw += 1) result = (Math.imul(result, 1103515245) + 24691) >>> 0;
  return result;
}

function visualTaskCountAtAge(age: number): number {
  if (age < 7) return 0;
  if (age < 109) return 3;
  if (age < 128) return 2;
  if (age < 142) return 1;
  if (age < 161) return 3;
  if (age < 170) return 2;
  if (age < 173) return 1;
  return 0;
}

function painterOrderAtAge(spiral: PsychUpSpiralSprite | null, input: Readonly<PsychUpLiveInputs>): readonly number[] {
  if (spiral === null) return input.spriteOrder.slice();
  const order = input.spriteOrder.filter((slot) => slot !== input.spiral.slot);
  order.splice(input.spiral.painterInsertionIndex, 0, input.spiral.slot);
  return order;
}

/** Complete MOVE_PSYCH_UP source-root reduction through the cleanup row. */
export function psychUpAtAge(age: number, input: Readonly<PsychUpLiveInputs>): PsychUpState {
  assertAge(age); assertInputs(input);
  const source = psychUpSourceAtAge(age);
  const spiral = source.active ? spiralAtAge(age, input) : null;
  const sway = source.active ? swayAtAge(age, input) : null;
  const scale = source.active ? scaleAtAge(age, input) : null;
  const spiralMatrixActive = spiral !== null;
  const scaleMatrixActive = scale !== null;
  const attackerMatrix = scaleMatrixActive ? scale!.matrix : spiralMatrixActive ? spiral!.matrix : input.attackerSprite.matrix;
  const attackerMatrixNum = age >= 142 ? input.scaleMatrixSlot : input.attackerSprite.matrixNum;
  const attackerSprite: PsychUpBattlerSprite = {
    ...input.attackerSprite,
    x2: sway?.x2 ?? 0,
    y2: 0,
    matrixNum: attackerMatrixNum,
    matrix: attackerMatrix,
    attr: age >= 142 ? [input.attackerSprite.attr[0] | 0x100, input.attackerSprite.attr[1] | 0x200, input.attackerSprite.attr[2]] : input.attackerSprite.attr,
  };
  const matrixSlots = input.matrixSlots.map((matrix, index) => index === input.spiral.matrixSlot && spiral !== null ? spiral.matrix : index === input.scaleMatrixSlot && scale !== null ? scale.matrix : matrix);
  const loaded = age >= 1 && age <= 177;
  const monBgActive = age >= 4 && age <= 176;
  const softwareScroll = age < 4 ? input.monBg.initialHardwareScroll : monBgActive
    ? { x: input.monBg.baseScroll.x - attackerSprite.x2, y: input.monBg.baseScroll.y - attackerSprite.y2 }
    : { x: 0, y: 0 };
  const previousSway = age > 0 ? swayAtAge(age - 1, input)?.x2 ?? 0 : 0;
  const previousAge = age - 1;
  const previousScroll = age === 0 ? input.monBg.initialHardwareScroll : previousAge < 4
    ? input.monBg.initialHardwareScroll
    : previousAge <= 176 ? { x: input.monBg.baseScroll.x - previousSway, y: input.monBg.baseScroll.y }
      : { x: 0, y: 0 };
  const faded = paletteAtAge(age, input);
  const hardware = age === 0 ? input.palettes.hardware : age === 4 ? faded : paletteAtAge(age - 1, input);
  const bgCoefficient = backgroundCoefficientAtAge(age);
  const attackerCoefficient = attackerCoefficientAtAge(age);
  const audio = audioAtAge(age, input);
  const sourceDraws = sourceDrawsAtAge(age);
  return {
    age, active: source.active, source, animArgs: animArgsAtAge(age, input),
    battlers: {
      attacker: { side: input.attackerSide, species: input.attackerSpecies, sprite: attackerSprite },
      target: { side: input.targetSide, species: input.targetSpecies, sprite: input.targetSprite },
    },
    tasks: tasksAtAge(age, input), spiral,
    painterOrder: painterOrderAtAge(spiral, input),
    background: {
      layer: input.monBg.layer, monBgActive,
      softwareScroll,
      hardwareScroll: age === 0 ? input.monBg.initialHardwareScroll : {
        x: ((previousScroll.x % 512) + 512) % 512,
        y: ((previousScroll.y % 512) + 512) % 512,
      },
      bgCnt: age >= 5 ? input.monBg.monBgCnt : input.monBg.initialBgCnt,
      vram: age < 5 ? "initial" : age < 176 ? "copied" : age < 178 ? "cleared" : "released",
    },
    palettes: {
      faded, hardware,
      backgroundCycle: { callback: "AnimTask_BlendColorCycleExcludeLoop", mask: 14, banks: input.palettes.backgroundBanks, coefficient: bgCoefficient },
      attackerYellow: { callback: "AnimTask_BlendSpriteColor_Step2", maskLow: 0, maskHigh: input.palettes.attackerPaletteSelectorHigh, banks: [input.palettes.attackerBank, input.monBg.copyPaletteBank], coefficient: attackerCoefficient },
    },
    registers: age >= 7 && age < 174 ? { bldcnt: 16192, bldalpha: 2060, bldy: 0, blendOff: false } : age >= 174 ? { bldcnt: 0, bldalpha: 0, bldy: 0, blendOff: true } : { ...input.registers, blendOff: false },
    resources: {
      spiral: { tag: loaded ? input.resource.tag : null, loaded, allocation: loaded ? input.resource : null },
      allocator: { matrixBitmap: input.matrixBitmap | (spiralMatrixActive ? (1 << input.spiral.matrixSlot) : 0), matrixSlots, spiralMatrixAllocated: spiralMatrixActive, scaleMatrixAllocated: scaleMatrixActive },
    },
    displayTransfer: {
      oam: age === 0 ? "initial" : "preceding-software",
      matrices: age === 0 ? "initial" : age === 143 ? "scale-start-hold" : age >= 144 && age <= 162 ? "two-source-rows-scale" : "preceding-software",
      palette: age === 0 ? "initial" : age === 4 ? "same-row-monbg-setup" : "preceding-faded",
      selectedBgScroll: age === 0 ? "initial" : "preceding-software",
    },
    audio,
    rng: { animation: animationRngAtAge(input.animationRngSeed, sourceDraws), sourceDraws, gameplay: input.gameplayRng, gameplayUnchanged: true },
    cleanup: { firstInactive: age === PSYCH_UP_FIRST_INACTIVE_AGE, visualTasks: visualTaskCountAtAge(age), soundTasks: age >= 7 && age <= 59 ? 1 : 0, ownedSprites: spiral === null ? 0 : 1, resourcesReleased: age >= PSYCH_UP_FIRST_INACTIVE_AGE },
  };
}
