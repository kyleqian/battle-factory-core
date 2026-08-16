import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type RolloutCounter = 1 | 2 | 3 | 4 | 5;

export interface RolloutPoint {
  readonly x: number;
  readonly y: number;
}

export interface RolloutMonBgGeometry {
  readonly layer: "bg1" | "bg2";
  /** The target sprite's source x/y, before its current x2/y2 offset. */
  readonly spriteX: number;
  readonly spriteY: number;
  readonly bgX: number;
  readonly bgY: number;
  readonly inBg2: boolean;
  readonly battlerId: 0 | 1;
}

/** Source-owned geometry and hardware-facing presentation inputs only. */
export interface RolloutGeometry {
  readonly side: "player" | "opponent";
  readonly attackerStart: RolloutPoint;
  readonly targetEnd: RolloutPoint;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly targetBaseX2?: number;
  readonly targetBaseY2?: number;
  readonly monbg?: RolloutMonBgGeometry;
  readonly attackerPan?: number;
  readonly targetPan?: number;
}

export interface RolloutParticle {
  readonly slot: number;
  readonly template: "gRolloutMudSpriteTemplate" | "gRolloutRockSpriteTemplate";
  readonly tileOffset: number;
  readonly paletteTag: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: 0;
  readonly affine: false;
  readonly subpriority: 35;
  readonly data: readonly number[];
  readonly age: number;
  readonly lifecycle: "active";
}

export interface RolloutTask {
  readonly callback:
    | "AnimTask_Rollout_Step"
    | "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"
    | "Task_UpdateMonBg"
    | "Task_ClearMonBg";
  readonly slot: number;
  readonly data: readonly number[];
}

export interface RolloutAudioEvent {
  readonly sound: "SE_M_HEADBUTT" | "SE_M_DIG" | "SE_M_MEGA_KICK2";
  readonly pan: number;
}

export interface RolloutRegisters {
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bg1hofs: number;
  readonly bg1vofs: number;
  readonly bg2hofs: number;
  readonly bg2vofs: number;
  readonly monbgLayer: "bg1" | "bg2" | null;
}

export interface RolloutState {
  readonly age: number;
  readonly counter: RolloutCounter;
  readonly active: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_ROLLOUT";
    readonly offset: 0 | 3 | 6 | 9 | 11 | 23 | 60 | 64;
    readonly wait: 0 | 1;
  }>;
  readonly timer: Readonly<{ readonly start: number; readonly remaining: number }>;
  readonly dynamicPower: number;
  readonly defenseCurlPower: number;
  readonly shakeAmplitude: number;
  readonly particles: readonly RolloutParticle[];
  readonly rolloutTask: RolloutTask | null;
  readonly shakeTask: RolloutTask | null;
  readonly monbgTask: RolloutTask | null;
  readonly clearMonBgTask: RolloutTask | null;
  readonly attackerOffset: RolloutPoint;
  readonly targetOffset: RolloutPoint;
  readonly monbg: Readonly<{
    readonly layer: "bg1" | "bg2";
    readonly offset: RolloutPoint;
    readonly taskData: readonly number[];
  }> | null;
  readonly registers: RolloutRegisters;
  readonly audio: readonly RolloutAudioEvent[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly resources: Readonly<{
    readonly tileTags: readonly number[];
    readonly paletteTags: readonly number[];
    readonly loaded: boolean;
  }>;
}

const ANIM_TAG_ROCKS = 10058;
const ANIM_TAG_MUD_SAND = 10074;
const ANIM_TAG_IMPACT = 10135;
const PARTICLE_SLOT_POOL = Array.from({ length: 57 }, (_, index) => index + 3)
  .filter((slot) => slot !== 6 && slot !== 8);
const SCHEDULES: Readonly<Record<RolloutCounter, readonly number[]>> = {
  1: [55, 58, 61, 64, 67, 70, 73, 76, 79, 82],
  2: [55, 58, 61, 64, 67, 70, 73, 76, 79, 82],
  3: [54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76],
  4: [53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68],
  5: [53, 54, 55, 56, 57, 58, 59, 60],
};
const TILE_OFFSETS: Readonly<Record<RolloutCounter, number>> = {
  1: 0,
  2: 80,
  3: 80,
  4: 64,
  5: 48,
};
const TASK_LAST: Readonly<Record<RolloutCounter, number>> = {
  1: 100,
  2: 100,
  3: 94,
  4: 86,
  5: 78,
};

export const ROLLOUT_DYNAMIC_POWERS: Readonly<Record<RolloutCounter, number>> = {
  1: 30,
  2: 60,
  3: 120,
  4: 240,
  5: 480,
};

export const ROLLOUT_DEFENSE_CURL_POWERS: Readonly<Record<RolloutCounter, number>> = {
  1: 60,
  2: 120,
  3: 240,
  4: 480,
  5: 960,
};

export const ROLLOUT_SHAKE_AMPLITUDES: Readonly<Record<RolloutCounter, number>> = {
  1: 2,
  2: 5,
  3: 10,
  4: 16,
  5: 16,
};

export const ROLLOUT_PARTICLE_CREATION_COUNTS: Readonly<Record<RolloutCounter, number>> = {
  1: 10,
  2: 10,
  3: 12,
  4: 16,
  5: 8,
};

function floorDiv8(value: number): number {
  return value >> 3;
}

function cDiv(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

function encodedDelta(delta: number): number {
  const magnitude = Math.abs(cDiv(delta * 256, 18));
  return delta < 0 ? magnitude | 1 : magnitude & ~1;
}

function defaultMonBg(geometry: RolloutGeometry): RolloutMonBgGeometry {
  if (geometry.side === "player") {
    const baseX2 = geometry.targetBaseX2 ?? 0;
    return {
      layer: "bg1",
      spriteX: 176 + baseX2,
      spriteY: 42 + (geometry.targetBaseY2 ?? 0),
      bgX: -144 - baseX2,
      bgY: -10 - (geometry.targetBaseY2 ?? 0),
      inBg2: false,
      battlerId: 1,
    };
  }
  const baseX2 = geometry.targetBaseX2 ?? 0;
  return {
    layer: "bg2",
    spriteX: 72 + baseX2,
    spriteY: 80 + (geometry.targetBaseY2 ?? 0),
    bgX: -40 - baseX2,
    bgY: -48 - (geometry.targetBaseY2 ?? 0),
    inBg2: true,
    battlerId: 0,
  };
}

function monBgGeometry(geometry: RolloutGeometry): RolloutMonBgGeometry {
  return geometry.monbg ?? defaultMonBg(geometry);
}

function schedule(counter: RolloutCounter): readonly number[] {
  return SCHEDULES[counter];
}

function taskDuration(counter: RolloutCounter): number {
  return counter === 1 ? 32 : 48 - counter * 8;
}

function particlePosition(
  age: number,
  counter: RolloutCounter,
  geometry: RolloutGeometry,
  creationIndex: number,
): Readonly<{ x: number; y: number; deltaX: number; deltaY: number }> {
  const duration = taskDuration(counter);
  const dx = cDiv((geometry.targetEnd.x - geometry.attackerStart.x) * 8, duration);
  const dy = cDiv((geometry.targetEnd.y - geometry.attackerStart.y) * 8, duration);
  const x = floorDiv8(geometry.attackerStart.x * 8 + dx * (age - 52));
  const y = floorDiv8(geometry.attackerStart.y * 8 + dy * (age - 52));
  const direction = creationIndex % 2 === 0 ? 1 : -1;
  const displayX = x + direction * 4;
  const destinationX = displayX + direction * 20 + counter * 3;
  return {
    x: displayX,
    y,
    deltaX: encodedDelta(destinationX - displayX),
    deltaY: -16 - counter * 2,
  };
}

function particleSlotsAtAge(
  counter: RolloutCounter,
  age: number,
): ReadonlyMap<number, number> {
  const slots = new Map<number, number>();
  for (const [creationIndex, creationAge] of schedule(counter).entries()) {
    if (creationAge > age) break;
    for (const [slot, particleCreation] of slots) {
      if (creationAge >= schedule(counter)[particleCreation]! + 19) slots.delete(slot);
    }
    const slot = PARTICLE_SLOT_POOL.find((candidate) => !slots.has(candidate));
    if (slot !== undefined) slots.set(slot, creationIndex);
  }
  for (const [slot, creationIndex] of slots) {
    if (age >= schedule(counter)[creationIndex]! + 19) slots.delete(slot);
  }
  return slots;
}

function particleAtAge(
  counter: RolloutCounter,
  age: number,
  geometry: RolloutGeometry,
): readonly RolloutParticle[] {
  const slots = particleSlotsAtAge(counter, age);
  const rows: RolloutParticle[] = [];
  for (const [slot, creationIndex] of slots) {
    const creationAge = schedule(counter)[creationIndex]!;
    const particleAge = age - creationAge;
    const position = particlePosition(creationAge, counter, geometry, creationIndex);
    const deltaX = position.deltaX;
    const x2 = (deltaX & 1) === 1
      ? -((deltaX * particleAge) >> 8)
      : (deltaX * particleAge) >> 8;
    const phase = (1820 * particleAge) >> 8;
    const y2 = (GBA_SINE_TABLE_256[phase & 0xff]! * position.deltaY) >> 8;
    rows.push({
      slot,
      template: counter === 1 ? "gRolloutMudSpriteTemplate" : "gRolloutRockSpriteTemplate",
      tileOffset: TILE_OFFSETS[counter],
      paletteTag: counter === 1 ? ANIM_TAG_MUD_SAND : ANIM_TAG_ROCKS,
      x: position.x,
      y: position.y,
      x2,
      y2,
      frame: 0,
      affine: false,
      subpriority: 35,
      data: [
        18 - particleAge,
        deltaX,
        0,
        deltaX * particleAge,
        0,
        position.deltaY,
        1820,
        1820 * particleAge,
      ],
      age: particleAge,
      lifecycle: "active",
    });
  }
  return rows.sort((left, right) => left.slot - right.slot);
}

function taskInitialData(counter: RolloutCounter, geometry: RolloutGeometry): number[] {
  const duration = taskDuration(counter);
  const pan1 = geometry.attackerPan ?? (geometry.side === "player" ? -64 : 63);
  const pan2 = geometry.targetPan ?? (geometry.side === "player" ? 63 : -64);
  return [
    0,
    counter,
    geometry.attackerStart.x * 8,
    geometry.attackerStart.y * 8,
    cDiv((geometry.targetEnd.x - geometry.attackerStart.x) * 8, duration),
    cDiv((geometry.targetEnd.y - geometry.attackerStart.y) * 8, duration),
    0,
    0,
    duration,
    0,
    duration / 8 - 1,
    0,
    1,
    pan1,
    cDiv(pan2 - pan1, duration),
    geometry.attackerSpriteSlot,
  ];
}

function rolloutTaskAtAge(
  counter: RolloutCounter,
  age: number,
  geometry: RolloutGeometry,
): Readonly<{ task: RolloutTask | null; offset: RolloutPoint; audio: readonly RolloutAudioEvent[] }> {
  const last = TASK_LAST[counter];
  if (age < 13 || age > last) return { task: null, offset: { x: 0, y: 0 }, audio: [] };
  const data = taskInitialData(counter, geometry);
  const creationAges = schedule(counter);
  const audio: RolloutAudioEvent[] = [];
  let attackerOffset: RolloutPoint = { x: 0, y: 0 };
  let state = 0;
  for (let tick = 13; tick <= age; tick += 1) {
    const destroyed = creationAges.filter((creationAge) => creationAge + 19 === tick).length;
    data[11] = Math.max(0, data[11]! - destroyed);
    switch (state) {
      case 0:
        data[6]! -= data[4]!;
        data[7]! -= data[5]!;
        attackerOffset = { x: data[6]! >> 3, y: data[7]! >> 3 };
        data[9]! += 1;
        if (data[9] === 10) {
          data[11] = 20;
          state = 1;
        }
        data[0] = state;
        audio.push({ sound: "SE_M_HEADBUTT", pan: data[13]! });
        break;
      case 1:
        data[11]! -= 1;
        if (data[11] === 0) state = 2;
        data[0] = state;
        break;
      case 2:
        data[9]! -= 1;
        if (data[9] !== 0) {
          data[6]! += data[4]!;
          data[7]! += data[5]!;
          attackerOffset = { x: data[6]! >> 3, y: data[7]! >> 3 };
        } else {
          data[6] = 0;
          data[7] = 0;
          attackerOffset = { x: 0, y: 0 };
          state = 3;
        }
        data[0] = state;
        break;
      case 3:
        data[2]! += data[4]!;
        data[3]! += data[5]!;
        data[9]! += 1;
        if (data[9]! >= data[10]!) {
          data[9] = 0;
          data[12]! = data[12]! * -1;
          data[13]! += data[14]!;
          audio.push({ sound: "SE_M_DIG", pan: data[13]! });
          data[11]! += 1;
        }
        data[8]! -= 1;
        if (data[8] === 0) state = 4;
        data[0] = state;
        break;
      case 4:
        if (data[11] === 0) state = 5;
        data[0] = state;
        break;
      default:
        break;
    }
  }
  const creationCount = creationAges.filter((creationAge) => creationAge <= age).length;
  const basePan = geometry.attackerPan ?? (geometry.side === "player" ? -64 : 63);
  const panStep = geometry.side === "player"
    ? cDiv((geometry.targetPan ?? 63) - basePan, taskDuration(counter))
    : cDiv((geometry.targetPan ?? -64) - basePan, taskDuration(counter));
  if (state >= 3) data[11] = particleAtAge(counter, age, geometry).length;
  data[12] = creationCount % 2 === 0 ? 1 : -1;
  data[13] = basePan + creationCount * panStep;
  return {
    task: {
      callback: "AnimTask_Rollout_Step",
      slot: 0,
      data,
    },
    offset: attackerOffset,
    audio,
  };
}

function shakeTaskAtAge(
  counter: RolloutCounter,
  age: number,
  geometry: RolloutGeometry,
): Readonly<{ task: RolloutTask | null; offset: RolloutPoint; audio: readonly RolloutAudioEvent[] }> {
  const start = TASK_LAST[counter] + 2;
  const end = start + 58;
  if (age < start || age > end) return { task: null, offset: { x: 0, y: 0 }, audio: [] };
  const amplitude = ROLLOUT_SHAKE_AMPLITUDES[counter];
  const phase = age - start;
  const half = Math.floor(amplitude / 2);
  const ceilHalf = amplitude - half;
  const signPhase = Math.floor((phase - 1) / 2);
  const positive = phase > 0 && signPhase % 2 === 0;
  const signedOffset = phase === 0 ? 0 : positive ? ceilHalf : -half;
  const remaining = 30 - Math.floor((phase + 1) / 2);
  const data = [
    phase % 2 === 0 ? 1 : 0,
    1,
    remaining,
    0,
    0,
    0,
    0,
    geometry.targetSpriteSlot,
    geometry.targetBaseX2 ?? 0,
    geometry.targetBaseY2 ?? 0,
    1,
    0,
    positive ? 1 : 0,
    ceilHalf,
    half,
    amplitude,
  ];
  return {
    task: {
      callback: "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
      slot: 1,
      data,
    },
    offset: { x: signedOffset, y: 0 },
    audio: phase === 0
      ? [{ sound: "SE_M_MEGA_KICK2", pan: geometry.targetPan ?? (geometry.side === "player" ? 63 : -64) }]
      : [],
  };
}

function sourceAtAge(
  age: number,
  taskLast: number,
  cleanupAge: number,
): RolloutState["source"] {
  if (age >= cleanupAge) return { owner: "Move_ROLLOUT", offset: 64, wait: 1 };
  if (age >= cleanupAge - 4) return { owner: "Move_ROLLOUT", offset: 64, wait: 1 };
  if (age >= taskLast + 2) return { owner: "Move_ROLLOUT", offset: 60, wait: 1 };
  if (age >= 13) return { owner: "Move_ROLLOUT", offset: 23, wait: 1 };
  if (age >= 10) return { owner: "Move_ROLLOUT", offset: 11, wait: age === 10 ? 1 : 0 };
  if (age >= 7) return { owner: "Move_ROLLOUT", offset: 9, wait: age === 7 ? 1 : 0 };
  if (age >= 4) return { owner: "Move_ROLLOUT", offset: 6, wait: age === 4 ? 1 : 0 };
  if (age >= 1) return { owner: "Move_ROLLOUT", offset: 3, wait: age === 1 ? 1 : 0 };
  return { owner: "Move_ROLLOUT", offset: 0, wait: 0 };
}

function rawRegisterOffset(offset: number): number {
  return ((offset % 512) + 512) % 512;
}

export function rolloutAtAge(
  age: number,
  counter: RolloutCounter,
  geometry: RolloutGeometry,
): RolloutState {
  const taskLast = TASK_LAST[counter];
  const shakeStart = taskLast + 2;
  const cleanupAge = taskLast + 66;
  const targetBaseX2 = geometry.targetBaseX2 ?? 0;
  const targetBaseY2 = geometry.targetBaseY2 ?? 0;
  const rollout = rolloutTaskAtAge(counter, age, geometry);
  const shake = shakeTaskAtAge(counter, age, geometry);
  const monbgSpec = monBgGeometry(geometry);
  const monbgActive = age >= 10 && age <= cleanupAge - 2;
  const clearActive = age >= cleanupAge - 4 && age < cleanupAge - 1;
  const targetOffset = age < shakeStart
    ? { x: targetBaseX2, y: targetBaseY2 }
    : shake.task === null
      ? { x: 0, y: 0 }
      : { x: targetBaseX2 + shake.offset.x, y: targetBaseY2 + shake.offset.y };
  const priorShake = shakeTaskAtAge(counter, age - 1, geometry);
  const priorTargetOffset = age - 1 < shakeStart
    ? { x: targetBaseX2, y: targetBaseY2 }
    : priorShake.task === null
      ? { x: 0, y: 0 }
      : { x: targetBaseX2 + priorShake.offset.x, y: targetBaseY2 + priorShake.offset.y };
  const baseSpriteX = monbgSpec.spriteX - targetBaseX2;
  const baseSpriteY = monbgSpec.spriteY - targetBaseY2;
  const monbgOffset = {
    x: monbgSpec.bgX + monbgSpec.spriteX - (baseSpriteX + targetOffset.x),
    y: monbgSpec.bgY + monbgSpec.spriteY - (baseSpriteY + targetOffset.y),
  };
  const scanoutMonbgOffset = {
    x: monbgSpec.bgX + monbgSpec.spriteX - (baseSpriteX + priorTargetOffset.x),
    y: monbgSpec.bgY + monbgSpec.spriteY - (baseSpriteY + priorTargetOffset.y),
  };
  const monbgData = [
    geometry.targetSpriteSlot,
    monbgSpec.spriteX,
    monbgSpec.spriteY,
    monbgSpec.bgX,
    monbgSpec.bgY,
    monbgSpec.inBg2 ? 1 : 0,
    monbgSpec.battlerId,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  const bldActive = age >= 13 && age < cleanupAge - 4;
  const registers: RolloutRegisters = {
    bldcnt: bldActive ? 16192 : 0,
    bldalpha: bldActive ? 2060 : 0,
    bg1hofs: age >= 11 && age < cleanupAge && monbgSpec.layer === "bg1" ? rawRegisterOffset(scanoutMonbgOffset.x) : 0,
    bg1vofs: age >= 11 && age < cleanupAge && monbgSpec.layer === "bg1" ? rawRegisterOffset(scanoutMonbgOffset.y) : 0,
    bg2hofs: age >= 11 && age < cleanupAge && monbgSpec.layer === "bg2" ? rawRegisterOffset(scanoutMonbgOffset.x) : 0,
    bg2vofs: age >= 11 && age < cleanupAge && monbgSpec.layer === "bg2" ? rawRegisterOffset(scanoutMonbgOffset.y) : 0,
    monbgLayer: age >= 11 && age < cleanupAge ? monbgSpec.layer : null,
  };
  const audio: RolloutAudioEvent[] = [];
  if (age === 13) {
    audio.push({
      sound: "SE_M_HEADBUTT",
      pan: geometry.attackerPan ?? (geometry.side === "player" ? -64 : 63),
    });
  }
  const creationIndex = schedule(counter).indexOf(age);
  if (creationIndex >= 0) {
    const pan1 = geometry.attackerPan ?? (geometry.side === "player" ? -64 : 63);
    const pan2 = geometry.targetPan ?? (geometry.side === "player" ? 63 : -64);
    audio.push({
      sound: "SE_M_DIG",
      pan: pan1 + (creationIndex + 1) * cDiv(pan2 - pan1, taskDuration(counter)),
    });
  }
  if (age === shakeStart) {
    audio.push({
      sound: "SE_M_MEGA_KICK2",
      pan: geometry.targetPan ?? (geometry.side === "player" ? 63 : -64),
    });
  }
  return {
    age,
    counter,
    active: age < cleanupAge,
    source: sourceAtAge(age, taskLast, cleanupAge),
    timer: { start: 5, remaining: 5 - counter },
    dynamicPower: ROLLOUT_DYNAMIC_POWERS[counter],
    defenseCurlPower: ROLLOUT_DEFENSE_CURL_POWERS[counter],
    shakeAmplitude: ROLLOUT_SHAKE_AMPLITUDES[counter],
    particles: age >= 0 && age < cleanupAge ? particleAtAge(counter, age, geometry) : [],
    rolloutTask: rollout.task,
    shakeTask: shake.task,
    monbgTask: monbgActive ? { callback: "Task_UpdateMonBg", slot: 1, data: monbgData } : null,
    clearMonBgTask: clearActive
      ? { callback: "Task_ClearMonBg", slot: 0, data: [0, Math.min(2, age - (cleanupAge - 4) + 1), monbgSpec.layer === "bg1" ? 1 : 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
      : null,
    attackerOffset: rollout.offset,
    targetOffset,
    monbg: monbgActive ? { layer: monbgSpec.layer, offset: monbgOffset, taskData: monbgData } : null,
    registers,
    audio,
    visualTaskCount: rollout.task !== null
      ? 1
      : shake.task !== null
        ? age < shakeStart + 10 ? 2 : 1
        : 0,
    soundTaskCount: 0,
    resources: {
      tileTags: age < 1 || age >= cleanupAge
        ? []
        : age < 9
          ? [ANIM_TAG_IMPACT]
          : [ANIM_TAG_IMPACT, ANIM_TAG_MUD_SAND, ANIM_TAG_ROCKS],
      paletteTags: age < 1 || age >= cleanupAge
        ? []
        : age < 9
          ? [ANIM_TAG_IMPACT]
          : [ANIM_TAG_IMPACT, ANIM_TAG_MUD_SAND, ANIM_TAG_ROCKS],
      loaded: age >= 1 && age < cleanupAge,
    },
  };
}
