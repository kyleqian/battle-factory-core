/**
 * Source-relative Scene-ON reducer for MOVE_PSYWAVE.
 *
 * `Move_PSYWAVE` owns the Psychic-background envelope, shared sin timer,
 * twelve BLUE_RING launches, target palette-cycle request, and looped sound
 * command.  The generic palette, OAM, matrix, background, allocator, and
 * sound engines remain live presentation inputs.  Battle resolution and
 * gameplay RNG/state are opaque caller-owned values.
 */

import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type PsywaveSide = "player" | "opponent";
export type PsywaveMatrix = readonly [number, number, number, number];
export type PsywaveOam = readonly [number, number, number];

export interface PsywavePoint {
  readonly x: number;
  readonly y: number;
}

/** Current battler art identity carried by the Scene-ON presentation seam. */
export interface PsywaveBattlerArt {
  readonly slot: number;
  readonly attr: PsywaveOam;
  readonly subpriority: number;
  readonly matrixNum: number;
  readonly matrix: PsywaveMatrix;
}

/** Allocation selected for one source `createsprite gPsywaveRing...` call. */
export interface PsywaveRingAllocation {
  readonly slot: number;
  readonly matrixNum: number;
  readonly sourceCreationOrder: number;
}

/** Current OAM fields owned by a live BLUE_RING sprite slot. */
export interface PsywaveLiveRingOam {
  readonly slot: number;
  readonly attr: PsywaveOam;
  readonly subpriority: number;
}

export interface PsywaveTaskSlots {
  readonly fadeToPsychic: number;
  readonly psychicBackground: number;
  readonly sinTimer: number;
  readonly loopSound: number;
  readonly paletteCycle: number;
  readonly restoreBattle: number;
}

export interface PsywaveLiveInputs {
  readonly attackerSide: PsywaveSide;
  readonly targetSide: PsywaveSide;
  readonly attackerSpecies: string;
  readonly targetSpecies: string;
  /** Source `GetBattlerSpriteCoord(... X_2/Y_PIC_OFFSET)` geometry. */
  readonly attackerPictureCenter: Readonly<PsywavePoint>;
  readonly targetPictureCenter: Readonly<PsywavePoint>;
  /** Current source sprite coordinates retained alongside picture geometry. */
  readonly attackerAnimationCenter: Readonly<PsywavePoint>;
  readonly targetAnimationCenter: Readonly<PsywavePoint>;
  readonly attackerArt: Readonly<PsywaveBattlerArt>;
  readonly targetArt: Readonly<PsywaveBattlerArt>;
  readonly taskSlots: Readonly<PsywaveTaskSlots>;
  /** One live allocation per source-created ring; slot reuse is intentional. */
  readonly ringAllocations: readonly PsywaveRingAllocation[];
  readonly ringOam: readonly PsywaveLiveRingOam[];
  /** Persistent SortSprites order carried from the live sprite system. */
  readonly spriteOrder: readonly number[];
  /** Complete Scene-ON predecessor-transfer buffers. */
  readonly buffers: Readonly<{
    readonly softwareOam: readonly unknown[];
    readonly hardwareOam: readonly unknown[];
    readonly softwareMatrices: readonly PsywaveMatrix[];
    readonly hardwareMatrices: readonly PsywaveMatrix[];
  }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
  }>;
  /** Current target OBJ palette bank, including OBJ bank offset. */
  readonly targetPaletteBank: number;
  readonly registers: Readonly<Record<string, number>>;
  readonly background: Readonly<{
    readonly currentVram: unknown;
    readonly battleVram: unknown;
    readonly psychicVram: unknown;
  }>;
  readonly resources: Readonly<{
    readonly tag: number;
    readonly tileSlot: number;
    readonly paletteSlot: number;
    readonly paletteBank: number;
    readonly tileRange: readonly [number, number];
    readonly allocator: unknown;
  }>;
  /** Generic task data remains caller-owned shared presentation state. */
  readonly sharedTaskData: Readonly<{
    readonly fadeToPsychic: readonly number[];
    readonly paletteCycle: readonly number[];
    readonly restoreBattle: readonly number[];
  }>;
  readonly audio: Readonly<{
    readonly current: unknown;
    readonly attackerPan: number;
    readonly targetPan: number;
  }>;
  readonly liveCounts: Readonly<{
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly matrixBitmap: number;
  }>;
  /** Presentation-only RNG is carried, never advanced here. */
  readonly animationRng: number;
  readonly gameplayRng: unknown;
  readonly gameplayState: unknown;
}

export interface PsywaveSourceCursor {
  readonly owner: "Move_PSYWAVE";
  readonly segment:
    | "root"
    | "set-psychic-background"
    | "psywave-rings"
    | "unset-psychic-background";
  readonly pointer: number;
  readonly pointerOffset: number;
  readonly active: boolean;
  readonly wait: number;
}

export interface PsywaveTask {
  readonly slot: number;
  readonly callback:
    | "Task_FadeToBg"
    | "SetPsychicBackground_Step"
    | "AnimTask_RunSinAnimTimer"
    | "SoundTask_LoopSEAdjustPanning_Step"
    | "AnimTask_BlendColorCycleLoop";
  readonly role:
    | "fade-to-psychic"
    | "psychic-background"
    | "sin-timer"
    | "loop-sound"
    | "target-palette-cycle"
    | "restore-battle";
  readonly data: readonly number[];
}

export interface PsywaveRing {
  readonly slot: number;
  readonly template: "gPsywaveRingSpriteTemplate";
  readonly callback: "AnimToTargetInSinWave_Step";
  readonly sourceCreationOrder: number;
  readonly matrixNum: number;
  readonly matrix: PsywaveMatrix;
  readonly attr: PsywaveOam;
  readonly subpriority: number;
  readonly painterIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  /** Complete source `sprite->data[0..7]` after the current callback. */
  readonly data: readonly [number, number, number, number, number, number, number, number];
  /** The evidence shows source writes scan out through the next transfer. */
  readonly displayedStart: number;
  readonly displayedEnd: number;
}

export interface PsywaveState {
  readonly age: number;
  readonly active: boolean;
  readonly source: PsywaveSourceCursor;
  readonly animArgs: readonly [number, number, number, number, number, number, number, number];
  readonly battlers: Readonly<{
    readonly attacker: Readonly<{
      readonly side: PsywaveSide;
      readonly species: string;
      readonly animationCenter: PsywavePoint;
      readonly pictureCenter: PsywavePoint;
      readonly ringOrigin: PsywavePoint;
      readonly art: PsywaveBattlerArt;
    }>;
    readonly target: Readonly<{
      readonly side: PsywaveSide;
      readonly species: string;
      readonly animationCenter: PsywavePoint;
      readonly pictureCenter: PsywavePoint;
      readonly art: PsywaveBattlerArt;
    }>;
  }>;
  readonly tasks: readonly PsywaveTask[];
  readonly rings: readonly PsywaveRing[];
  readonly paletteBanks: Readonly<{
    readonly target: number;
    readonly blueRing: number | null;
  }>;
  readonly resources: Readonly<{
    readonly loaded: boolean;
    readonly tag: number;
    readonly tileSlot: number | null;
    readonly paletteSlot: number | null;
    readonly paletteBank: number | null;
    readonly tileRange: readonly [number, number] | null;
    readonly matrixBitmap: number;
    readonly allocator: unknown;
  }>;
  readonly painterOrder: readonly number[];
  readonly buffers: PsywaveLiveInputs["buffers"];
  readonly palette: PsywaveLiveInputs["palette"];
  readonly registers: PsywaveLiveInputs["registers"];
  readonly background: Readonly<{
    readonly phase: "battle" | "fading-to-psychic" | "psychic" | "restoring-battle";
    readonly vram: unknown;
    readonly battleVram: unknown;
    readonly psychicVram: unknown;
  }>;
  readonly audio: Readonly<{
    readonly live: unknown;
    readonly events: readonly (
      | Readonly<{ readonly kind: "play"; readonly channel: "SE1"; readonly sound: "SE_M_PSYBEAM"; readonly pan: number }>
      | Readonly<{
        readonly kind: "loop";
        readonly channel: "SE1";
        readonly sound: "SE_M_TELEPORT";
        readonly sourcePan: number;
        readonly targetPan: number;
        readonly panIncrement: number;
        readonly repetitions: 9;
        readonly panDelay: 0;
        readonly soundDelay: 10;
      }>
    )[];
  }>;
  readonly rng: Readonly<{
    readonly animation: number;
    readonly gameplay: unknown;
    readonly gameplayUnchanged: true;
  }>;
  readonly gameplay: unknown;
  readonly displayTransfer: Readonly<{
    readonly oam: "initial" | "preceding-software";
    readonly matrices: "initial" | "preceding-software";
    readonly palette: "initial" | "preceding-faded";
    readonly registers: "current-source";
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly visualTasks: number;
    readonly soundTasks: number;
    readonly ownedTasks: number;
    readonly ownedRings: number;
    readonly resourcesReleased: boolean;
  }>;
}

export const PSYWAVE_SOURCE_START = 0x082d_3212;
export const PSYWAVE_SOURCE_END_EXCLUSIVE = 0x082d_3298;
export const PSYWAVE_SET_PSYCHIC_START = 0x082d_7cd1;
export const PSYWAVE_UNSET_PSYCHIC_START = 0x082d_7cdd;
export const PSYWAVE_BLUE_RING_TAG = 10165;
export const PSYWAVE_FIRST_INACTIVE_AGE = 204;

const RING_DURATION = 30;
const RING_COUNT = 12;
const RING_CADENCE = 6;
const RING_FIRST_AGE = 42;
const RING_AMPLITUDE = 16;
const RING_PHASE_STEP = 3;
const RING_WAVE_STEP = 0xd200 / RING_DURATION;
const TARGET_PALETTE_COLOR = 32351;
const ZERO_ARGS = [0, 0, 0, 0, 0, 0, 0, 0] as const;

function assertSlot(slot: number, label: string, maximum: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= maximum) {
    throw new Error(`invalid Psywave ${label}`);
  }
}

function assertPoint(point: Readonly<PsywavePoint>, label: string): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`invalid Psywave ${label}`);
  }
}

function assertArt(art: Readonly<PsywaveBattlerArt>, label: string): void {
  assertSlot(art.slot, `${label} sprite slot`, 64);
  assertSlot(art.matrixNum, `${label} matrix slot`, 32);
  if (art.attr.length !== 3 || art.matrix.length !== 4) {
    throw new Error(`invalid Psywave ${label} art identity`);
  }
}

function assertInputs(input: Readonly<PsywaveLiveInputs>): void {
  if (input.attackerSide === input.targetSide || !input.attackerSpecies || !input.targetSpecies) {
    throw new Error("Psywave requires opposing named battlers");
  }
  assertPoint(input.attackerPictureCenter, "attacker picture center");
  assertPoint(input.targetPictureCenter, "target picture center");
  assertPoint(input.attackerAnimationCenter, "attacker animation center");
  assertPoint(input.targetAnimationCenter, "target animation center");
  assertArt(input.attackerArt, "attacker");
  assertArt(input.targetArt, "target");
  for (const [label, slot] of Object.entries(input.taskSlots)) assertSlot(slot, label, 16);
  if (input.ringAllocations.length !== RING_COUNT
    || new Set(input.ringAllocations.map((ring) => ring.sourceCreationOrder)).size !== RING_COUNT
    || input.ringAllocations.some((ring) => !Number.isInteger(ring.sourceCreationOrder)
      || ring.sourceCreationOrder < 0 || ring.sourceCreationOrder >= RING_COUNT)) {
    throw new Error(`Psywave requires ${RING_COUNT} source ring allocations`);
  }
  for (const ring of input.ringAllocations) {
    assertSlot(ring.slot, "ring sprite slot", 64);
    assertSlot(ring.matrixNum, "ring matrix slot", 32);
  }
  for (const ring of input.ringOam) {
    assertSlot(ring.slot, "live ring sprite slot", 64);
    if (ring.attr.length !== 3) throw new Error("invalid Psywave live ring OAM");
  }
  if (input.spriteOrder.length !== 64 || new Set(input.spriteOrder).size !== 64
    || input.spriteOrder.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("Psywave requires a live 64-slot painter order");
  }
  if (input.buffers.softwareOam.length !== 128 || input.buffers.hardwareOam.length !== 128
    || input.buffers.softwareMatrices.length !== 32 || input.buffers.hardwareMatrices.length !== 32
    || input.palette.unfaded.length !== 512 || input.palette.faded.length !== 512
    || input.palette.hardware.length !== 512) {
    throw new Error("Psywave requires complete live OAM, matrix, and palette buffers");
  }
  assertSlot(input.resources.tileSlot, "BLUE_RING tile slot", 128);
  assertSlot(input.resources.paletteSlot, "BLUE_RING palette slot", 16);
  if (input.resources.paletteBank !== 16 + input.resources.paletteSlot) {
    throw new Error("Psywave BLUE_RING palette-bank drift");
  }
  if (!Number.isInteger(input.targetPaletteBank) || input.targetPaletteBank < 16 || input.targetPaletteBank >= 32) {
    throw new Error("invalid Psywave target palette bank");
  }
}

function data16(values: readonly number[]): readonly number[] {
  return [...values, ...Array(Math.max(0, 16 - values.length)).fill(0)].slice(0, 16);
}

function signed16(value: number): number {
  const word = value & 0xffff;
  return word & 0x8000 ? word - 0x10000 : word;
}

function unsigned16(value: number): number {
  return value & 0xffff;
}

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

function initialXOffset(input: Readonly<PsywaveLiveInputs>): number {
  const attackerX = input.attackerPictureCenter.x;
  const targetX = input.targetPictureCenter.x;
  if (attackerX > targetX) return -10;
  if (attackerX < targetX) return 10;
  return input.attackerSide === "player" ? 10 : -10;
}

function ringOrigin(input: Readonly<PsywaveLiveInputs>): PsywavePoint {
  return {
    x: input.attackerPictureCenter.x + initialXOffset(input),
    y: input.attackerPictureCenter.y + 10,
  };
}

/** Exact source cursor through Psywave's observed first inactive cleanup. */
export function psywaveSourceAtAge(age: number): PsywaveSourceCursor {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Psywave source age ${age}`);
  if (age === 0) return { owner: "Move_PSYWAVE", segment: "root", pointer: PSYWAVE_SOURCE_START, pointerOffset: 0, active: true, wait: 0 };
  if (age <= 3) return { owner: "Move_PSYWAVE", segment: "root", pointer: PSYWAVE_SOURCE_START + 3, pointerOffset: 3, active: true, wait: age === 1 ? 1 : 0 };
  if (age <= 22) return { owner: "Move_PSYWAVE", segment: "set-psychic-background", pointer: PSYWAVE_SET_PSYCHIC_START + 2, pointerOffset: 2, active: true, wait: 1 };
  if (age <= 41) return { owner: "Move_PSYWAVE", segment: "set-psychic-background", pointer: PSYWAVE_SET_PSYCHIC_START + 10, pointerOffset: 10, active: true, wait: 1 };
  if (age <= 113) {
    const ringBlock = Math.floor((age - RING_FIRST_AGE) / RING_CADENCE);
    const elapsed = (age - RING_FIRST_AGE) % RING_CADENCE;
    const pointerOffset = ringBlock & 1 ? 133 : 116;
    return {
      owner: "Move_PSYWAVE",
      segment: "psywave-rings",
      pointer: PSYWAVE_SOURCE_START + pointerOffset,
      pointerOffset,
      active: true,
      wait: elapsed < 5 ? 4 - elapsed : 0,
    };
  }
  if (age <= 161) return { owner: "Move_PSYWAVE", segment: "root", pointer: PSYWAVE_SOURCE_START + 90, pointerOffset: 90, active: true, wait: 1 };
  if (age === 162) return { owner: "Move_PSYWAVE", segment: "root", pointer: PSYWAVE_SOURCE_START + 93, pointerOffset: 93, active: true, wait: 1 };
  if (age <= 164) return { owner: "Move_PSYWAVE", segment: "root", pointer: PSYWAVE_SOURCE_START + 93, pointerOffset: 93, active: true, wait: 0 };
  if (age <= 183) return { owner: "Move_PSYWAVE", segment: "unset-psychic-background", pointer: PSYWAVE_UNSET_PSYCHIC_START + 1, pointerOffset: 1, active: true, wait: 1 };
  if (age < PSYWAVE_FIRST_INACTIVE_AGE) return { owner: "Move_PSYWAVE", segment: "unset-psychic-background", pointer: PSYWAVE_UNSET_PSYCHIC_START + 6, pointerOffset: 6, active: true, wait: 1 };
  return { owner: "Move_PSYWAVE", segment: "root", pointer: PSYWAVE_SOURCE_START + 98, pointerOffset: 98, active: false, wait: 0 };
}

function argsAtAge(age: number): PsywaveState["animArgs"] {
  if (age < RING_FIRST_AGE) return ZERO_ARGS;
  const phase = age >= 184 ? -1 : age <= 140 ? (RING_PHASE_STEP * (age - 41)) & 0xff : 44;
  return [10, 10, 0, 16, age >= 66 ? 12 : 9, age >= 66 ? TARGET_PALETTE_COLOR : 0, 10, phase];
}

function psychicTaskAtAge(age: number, slot: number): PsywaveTask | null {
  if (age < 23 || age > 183) return null;
  return {
    slot,
    callback: "SetPsychicBackground_Step",
    role: "psychic-background",
    data: data16([0, 0, 0, 0, 0, (age - 22) & 3]),
  };
}

function sinTaskAtAge(age: number, slot: number): PsywaveTask | null {
  if (age < RING_FIRST_AGE || age > 140) return null;
  return {
    slot,
    callback: "AnimTask_RunSinAnimTimer",
    role: "sin-timer",
    data: data16([141 - age]),
  };
}

function panIncrement(sourcePan: number, targetPan: number): number {
  return sourcePan < targetPan ? 2 : sourcePan > targetPan ? -2 : 0;
}

function loopSoundDataAtAge(age: number, input: Readonly<PsywaveLiveInputs>): readonly number[] | null {
  if (age < RING_FIRST_AGE || age > 128) return null;
  const sourcePan = input.audio.attackerPan;
  const targetPan = input.audio.targetPan;
  const data = data16([203, sourcePan, targetPan, panIncrement(sourcePan, targetPan), 9, 0, 10, 0, 0, 0, 0, sourcePan, 10]).slice();
  const calls = age - RING_FIRST_AGE + 2;
  for (let call = 0; call < calls; call += 1) {
    if (data[12]++ === data[6]) {
      data[12] = 0;
      if (--data[4] === 0) return null;
    }
    if (data[10]++ === data[5]) {
      data[10] = 0;
      data[11] = Math.max(-64, Math.min(63, data[11]! + data[3]!));
    }
  }
  return data;
}

function sourceRingAllocation(order: number, input: Readonly<PsywaveLiveInputs>): PsywaveRingAllocation {
  const found = input.ringAllocations.find((allocation) => allocation.sourceCreationOrder === order);
  if (!found) throw new Error(`missing Psywave ring allocation ${order}`);
  return found;
}

function liveRingOam(slot: number, input: Readonly<PsywaveLiveInputs>): PsywaveLiveRingOam {
  const found = input.ringOam.find((ring) => ring.slot === slot);
  if (!found) throw new Error(`missing live Psywave ring OAM for slot ${slot}`);
  return found;
}

function ringAtAge(
  age: number,
  order: number,
  input: Readonly<PsywaveLiveInputs>,
): PsywaveRing | null {
  const spawnAge = RING_FIRST_AGE + order * RING_CADENCE;
  const elapsed = age - spawnAge;
  if (elapsed < 0 || elapsed > RING_DURATION - 2) return null;
  const allocation = sourceRingAllocation(order, input);
  const liveOam = liveRingOam(allocation.slot, input);
  const matrix = input.buffers.softwareMatrices[allocation.matrixNum];
  if (!matrix) throw new Error(`missing live Psywave affine matrix ${allocation.matrixNum}`);
  const origin = ringOrigin(input);
  const xDistance = input.targetPictureCenter.x - origin.x;
  const yDistance = input.targetPictureCenter.y - origin.y;
  const xDelta = (Math.trunc(Math.abs(xDistance) * 256 / RING_DURATION) & ~1) | Number(xDistance < 0);
  const yDelta = (Math.trunc(Math.abs(yDistance) * 256 / RING_DURATION) & ~1) | Number(yDistance < 0);
  const initialPhase = (order * RING_CADENCE * RING_PHASE_STEP) & 0xff;
  let data0 = RING_DURATION;
  let data3 = 0;
  let data4 = 0;
  let data6 = initialPhase > 127 ? (initialPhase - 127) * 256 : initialPhase * 256;
  let amplitude = initialPhase > 127 ? -RING_AMPLITUDE : RING_AMPLITUDE;
  let x2 = 0;
  let y2 = 0;
  // `AnimToTargetInSinWave` calls its step once during initialization and
  // once again in that source row's sprite update.
  for (let call = 0; call < elapsed + 2; call += 1) {
    if (data0 !== 0) {
      const nextX = (unsigned16(data3) + xDelta) & 0xffff;
      const nextY = (unsigned16(data4) + yDelta) & 0xffff;
      x2 = xDelta & 1 ? -(nextX >> 8) : nextX >> 8;
      y2 = yDelta & 1 ? -(nextY >> 8) : nextY >> 8;
      data3 = signed16(nextX);
      data4 = signed16(nextY);
      data0 -= 1;
    }
    y2 += gbaSin(data6 >> 8, amplitude);
    if ((data6 + RING_WAVE_STEP) >> 8 > 127) {
      data6 = 0;
      amplitude = -amplitude;
    } else {
      data6 = signed16(data6 + RING_WAVE_STEP);
    }
  }
  return {
    slot: allocation.slot,
    template: "gPsywaveRingSpriteTemplate",
    callback: "AnimToTargetInSinWave_Step",
    sourceCreationOrder: order,
    matrixNum: allocation.matrixNum,
    matrix,
    attr: liveOam.attr,
    subpriority: liveOam.subpriority,
    painterIndex: input.spriteOrder.indexOf(allocation.slot),
    x: origin.x,
    y: origin.y,
    x2,
    y2,
    data: [data0, xDelta, yDelta, data3, data4, RING_WAVE_STEP, data6, amplitude],
    displayedStart: spawnAge + 1,
    displayedEnd: spawnAge + RING_DURATION - 1,
  };
}

function backgroundPhase(age: number): PsywaveState["background"]["phase"] {
  if (age < 4 || age >= 184) return "battle";
  if (age < 23) return "fading-to-psychic";
  if (age < 165) return "psychic";
  return "restoring-battle";
}

/** Pure source-relative reduction through Psywave's first inactive cleanup. */
export function psywaveAtAge(age: number, input: Readonly<PsywaveLiveInputs>): PsywaveState {
  if (!Number.isInteger(age) || age < 0) throw new Error(`invalid Psywave source age ${age}`);
  assertInputs(input);
  const source = psywaveSourceAtAge(age);
  const loopSoundData = loopSoundDataAtAge(age, input);
  const rings = Array.from({ length: RING_COUNT }, (_, order) => ringAtAge(age, order, input))
    .filter((ring): ring is PsywaveRing => ring !== null);
  const tasks: PsywaveTask[] = [
    age >= 4 && age <= 40 ? {
      slot: input.taskSlots.fadeToPsychic,
      callback: "Task_FadeToBg",
      role: "fade-to-psychic",
      data: input.sharedTaskData.fadeToPsychic,
    } : null,
    psychicTaskAtAge(age, input.taskSlots.psychicBackground),
    sinTaskAtAge(age, input.taskSlots.sinTimer),
    loopSoundData === null ? null : {
      slot: input.taskSlots.loopSound,
      callback: "SoundTask_LoopSEAdjustPanning_Step",
      role: "loop-sound",
      data: loopSoundData,
    },
    age >= 66 && age <= 160 ? {
      slot: input.taskSlots.paletteCycle,
      callback: "AnimTask_BlendColorCycleLoop",
      role: "target-palette-cycle",
      data: input.sharedTaskData.paletteCycle,
    } : null,
    age >= 165 && age <= 202 ? {
      slot: input.taskSlots.restoreBattle,
      callback: "Task_FadeToBg",
      role: "restore-battle",
      data: input.sharedTaskData.restoreBattle,
    } : null,
  ].filter((task): task is PsywaveTask => task !== null)
    .sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));
  const loaded = age >= 1 && age < PSYWAVE_FIRST_INACTIVE_AGE;
  const sourceRingOrigin = ringOrigin(input);
  const audioEvents: PsywaveState["audio"]["events"] = [
    ...(age === 4 ? [{ kind: "play" as const, channel: "SE1" as const, sound: "SE_M_PSYBEAM" as const, pan: input.audio.attackerPan }] : []),
    ...(age === RING_FIRST_AGE ? [{
      kind: "loop" as const,
      channel: "SE1" as const,
      sound: "SE_M_TELEPORT" as const,
      sourcePan: input.audio.attackerPan,
      targetPan: input.audio.targetPan,
      panIncrement: panIncrement(input.audio.attackerPan, input.audio.targetPan),
      repetitions: 9 as const,
      panDelay: 0 as const,
      soundDelay: 10 as const,
    }] : []),
  ];
  return {
    age,
    active: source.active,
    source,
    animArgs: argsAtAge(age),
    battlers: {
      attacker: {
        side: input.attackerSide,
        species: input.attackerSpecies,
        animationCenter: input.attackerAnimationCenter,
        pictureCenter: input.attackerPictureCenter,
        ringOrigin: sourceRingOrigin,
        art: input.attackerArt,
      },
      target: {
        side: input.targetSide,
        species: input.targetSpecies,
        animationCenter: input.targetAnimationCenter,
        pictureCenter: input.targetPictureCenter,
        art: input.targetArt,
      },
    },
    tasks,
    rings,
    paletteBanks: {
      target: input.targetPaletteBank,
      blueRing: loaded ? input.resources.paletteBank : null,
    },
    resources: {
      loaded,
      tag: input.resources.tag,
      tileSlot: loaded ? input.resources.tileSlot : null,
      paletteSlot: loaded ? input.resources.paletteSlot : null,
      paletteBank: loaded ? input.resources.paletteBank : null,
      tileRange: loaded ? input.resources.tileRange : null,
      matrixBitmap: input.liveCounts.matrixBitmap,
      allocator: input.resources.allocator,
    },
    painterOrder: input.spriteOrder,
    buffers: input.buffers,
    palette: input.palette,
    registers: input.registers,
    background: {
      phase: backgroundPhase(age),
      vram: input.background.currentVram,
      battleVram: input.background.battleVram,
      psychicVram: input.background.psychicVram,
    },
    audio: { live: input.audio.current, events: audioEvents },
    rng: { animation: input.animationRng, gameplay: input.gameplayRng, gameplayUnchanged: true },
    gameplay: input.gameplayState,
    displayTransfer: {
      oam: age === 0 ? "initial" : "preceding-software",
      matrices: age === 0 ? "initial" : "preceding-software",
      palette: age === 0 ? "initial" : "preceding-faded",
      registers: "current-source",
    },
    cleanup: {
      firstInactive: age === PSYWAVE_FIRST_INACTIVE_AGE,
      visualTasks: input.liveCounts.visualTasks,
      soundTasks: input.liveCounts.soundTasks,
      ownedTasks: tasks.length,
      ownedRings: rings.length,
      resourcesReleased: age >= PSYWAVE_FIRST_INACTIVE_AGE,
    },
  };
}
